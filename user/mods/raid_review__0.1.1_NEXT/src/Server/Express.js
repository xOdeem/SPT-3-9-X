"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const lodash_1 = __importDefault(require("lodash"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_basic_auth_1 = __importDefault(require("express-basic-auth"));
const compression_1 = __importDefault(require("compression"));
const config_json_1 = __importDefault(require("../../config.json"));
const DataSaver_1 = require("../Controllers/FileSystem/DataSaver");
const CompileRaidPositionalData_1 = __importDefault(require("../Controllers/PositionalData/CompileRaidPositionalData"));
const utils_1 = require("../Utils/utils");
const GetRaidData_1 = require("../Controllers/Collection/GetRaidData");
const RaidStatistics_1 = require("../Controllers/Telemetry/RaidStatistics");
const app = (0, express_1.default)();
const port = config_json_1.default.web_client_port || 7829;
function isUserAdmin(req, res, next, logger) {
    if (config_json_1.default.authentication && req.auth) {
        res.status(401).json({ status: 'ERROR', message: 'You are not authorised.' });
        logger.log(`Someone tried to login that wasn't authroised.`);
    }
    return next();
}
function StartWebServer(saveServer, profileServer, db, intl, logger) {
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use((0, cookie_parser_1.default)());
    app.use((0, compression_1.default)());
    const basicAuthUsers = {};
    Object.values(profileServer.getProfiles()).map((p) => basicAuthUsers[p.info.username] = p.info.password);
    // Basic Auth has been implemented for people who host Fika remotely.
    // It's not the greatest level of protection, but I cannot be arsed to implement oAuth for sucha niche use case.
    if (config_json_1.default.authentication) {
        app.use((0, express_basic_auth_1.default)({
            users: basicAuthUsers,
            challenge: true,
        }));
        // Cookie Setter, currently used for the following:
        // - is_auth_configured : used to determine if 'is_admin' should even be considered to toggle visbility.
        // - is_admin : used to show/hide buttons that should only be visible to admins if 'Basic Auth' is enabled.
        app.use((req, res, next) => {
            // is_auth_configured
            if (config_json_1.default.authentication) {
                var is_auth_configured = req.cookies.is_auth_configured;
                if (is_auth_configured === undefined) {
                    res.cookie('is_auth_configured', 'true', { maxAge: 900000 });
                }
            }
            else {
                var is_auth_configured = req.cookies.is_auth_configured;
                if (is_auth_configured === undefined) {
                    res.cookie('is_auth_configured', 'false', { maxAge: 900000 });
                }
            }
            return next();
        });
    }
    const publicFolder = path_1.default.join(__dirname, '/public/');
    app.use(express_1.default.static(publicFolder));
    app.get('/', (req, res) => {
        return res.sendFile(path_1.default.join(__dirname, '/public/index.html'));
    });
    app.get('/api/intl', async (req, res) => {
        try {
            const intl_all = intl.getLocaleDb();
            res.json(intl_all);
        }
        catch (error) {
            res.json(null);
        }
    });
    app.get('/api/server/settings', (req, res, next) => isUserAdmin(req, res, next, logger), async (req, res) => {
        try {
            const sqlSettingsQuery = `SELECT * FROM setting ORDER BY id ASC`;
            const data = (await db.all(sqlSettingsQuery).catch((e) => logger.error(`[API:SETTINGS] `, e)));
            const settings = lodash_1.default.groupBy(data, 'key');
            res.json(settings);
        }
        catch (error) {
            res.json(null);
        }
    });
    app.put('/api/server/settings', (req, res, next) => isUserAdmin(req, res, next, logger), async (req, res) => {
        try {
            const settingsToUpdate = req.body();
            // Could improve this into a single query...
            for (let i = 0; i < settingsToUpdate.length; i++) {
                const setting = settingsToUpdate[i];
                const sqlSettingsQuery = `UPDATE setting * SET value = ? WHERE key = ?`;
                const sqlSettingsValues = [setting.key, setting.value];
                await db.all(sqlSettingsQuery, sqlSettingsValues).catch((e) => logger.error(`[API:SETTINGS] `, e));
            }
            // I'm not too worried about performance, I just need it to work right now...
            const sqlSettingsQuery = `SELECT * FROM setting ORDER BY id ASC`;
            const data = (await db.all(sqlSettingsQuery).catch((e) => logger.error(`[API:SETTINGS] `, e)));
            const settings = lodash_1.default.groupBy(data, 'key');
            res.json(settings);
        }
        catch (error) {
            res.json(null);
        }
    });
    app.get('/api/server/deleteAllData', (req, res, next) => isUserAdmin(req, res, next, logger), async (req, res) => {
        try {
            // Burn it all
            const keys = ['raid', 'kills', 'looting', 'player'];
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const sqlKeyQuery = `DELETE FROM ${key}`;
                await db.all(sqlKeyQuery).catch((e) => logger.error(`[API:SETTINGS] `, e));
                (0, fs_1.rmSync)(`${__dirname}/../../../data/positions`, { force: true, recursive: true });
                (0, fs_1.mkdirSync)(`${__dirname}/../../../data/positions`);
            }
            res.json(true);
        }
        catch (error) {
            res.json(true);
        }
    });
    app.get('/api/profile/all', (req, res) => {
        let profiles = saveServer.getProfiles();
        for (const profile_k in profiles) {
            let profile = profiles[profile_k];
            if (typeof profile?.characters?.pmc?.Info?.Side !== 'string') {
                logger.log(`It appears that profile id '${profile_k}' is using an old data structure not compatible with RAID-REVIEW.`);
                delete profiles[profile_k];
            }
        }
        return res.json(profiles);
    });
    app.get('/api/profile/:profileId', (req, res) => {
        const profiles = saveServer.getProfiles();
        return res.json(profiles[req.params.profileId]);
    });
    app.get('/api/profile/:profileId/raids/all', async (req, res) => {
        let { profileId } = req.params;
        const sqlRaidQuery = `SELECT * FROM raid WHERE profileId = '${profileId}' AND timeInRaid > 10 ORDER BY id DESC`;
        const data = await db.all(sqlRaidQuery).catch((e) => logger.error(`[API:RAIDS-ALL] `, e));
        res.json(data);
    });
    app.post('/api/profile/:profileId/raids/deleteAllData', (req, res, next) => isUserAdmin(req, res, next, logger), async (req, res) => {
        const deletedRaids = [];
        try {
            let { raidIds } = req.body;
            for (let i = 0; i < raidIds.length; i++) {
                const raidId = raidIds[i];
                const keys = ['raid', 'kills', 'looting', 'player'];
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];
                    const sqlKeyQuery = `DELETE FROM ${key} WHERE raidId = ?`;
                    const sqlKeyValues = [raidId];
                    await db.all(sqlKeyQuery, sqlKeyValues).catch((e) => logger.error(`[API:DELETE-ALL] `, e));
                }
                (0, DataSaver_1.DeleteFile)('positions', '', '', `${raidId}_positions`);
                (0, DataSaver_1.DeleteFile)('positions', '', '', `${raidId}_V2_positions.json`);
                deletedRaids.push(raidId);
            }
            res.json(deletedRaids);
        }
        catch (error) {
            logger.log(error);
            res.json(deletedRaids);
        }
    });
    app.post('/api/profile/:profileId/raids/deleteTempFiles', (req, res, next) => isUserAdmin(req, res, next, logger), async (req, res) => {
        const deletedTempFiles = [];
        try {
            let { raidIds } = req.body;
            for (let i = 0; i < raidIds.length; i++) {
                const raidId = raidIds[i];
                logger.log(`Deleting temp files for Raid Id: '${raidId}'.`);
                (0, DataSaver_1.DeleteFile)('positions', '', '', `${raidId}_positions`);
                deletedTempFiles.push(raidId);
            }
            res.json(deletedTempFiles);
        }
        catch (error) {
            logger.log(error);
            res.json(deletedTempFiles);
        }
    });
    app.get('/api/profile/:profileId/raids/:raidId', async (req, res) => {
        try {
            let { raidId } = req.params;
            const raid = await (0, GetRaidData_1.getRaidData)(db, logger, raidId);
            if (raid.positionsTracked === 'RAW') {
                let positional_data = (0, CompileRaidPositionalData_1.default)(raidId, logger);
                let telemetryEnabled = config_json_1.default.telemetry;
                if (telemetryEnabled) {
                    logger.log(`Telemetry is enabled.`);
                    await (0, RaidStatistics_1.sendStatistics)(db, logger, raidId, positional_data);
                }
                else {
                    logger.log(`Telemetry is disabled.`);
                }
                raid.positionsTracked = 'COMPILED';
            }
            return res.json(raid);
        }
        catch (error) {
            logger.log(error);
            return res.json(null);
        }
    });
    app.get('/api/profile/:profileId/raids/:raidId/tempFiles', async (req, res) => {
        let { raidId } = req.params;
        const tempFiles = (0, DataSaver_1.ReadFile)(logger, 'positions', '', '', `${raidId}_positions`);
        if (tempFiles) {
            return res.json(true);
        }
        return res.json(false);
    });
    app.get('/api/profile/:profileId/raids/:raidId/positions', async (req, res) => {
        let { raidId } = req.params;
        const positionalDataRaw = (0, DataSaver_1.ReadFile)(logger, 'positions', '', '', `${raidId}_V2_positions.json`);
        if (positionalDataRaw) {
            let positionalData = JSON.parse(positionalDataRaw);
            positionalData = (0, utils_1.generateInterpolatedFramesBezier)(positionalData, 5, 24);
            return res.json(positionalData);
        }
        return [];
    });
    app.get('/api/profile/:profileId/raids/:raidId/positions/heatmap', async (req, res) => {
        let { raidId } = req.params;
        try {
            const positionalDataRaw = (0, DataSaver_1.ReadFile)(logger, 'positions', '', '', `${raidId}_V2_positions.json`);
            let positionalData = JSON.parse(positionalDataRaw);
            positionalData = (0, utils_1.generateInterpolatedFramesBezier)(positionalData, 5, 24);
            const flattenedData = lodash_1.default.chain(positionalData).valuesIn().flatMapDeep().value();
            const points = flattenedData.map(entry => [entry.z, entry.x, 1]);
            const pointMap = new Map();
            points.forEach(([z, x, intensity]) => {
                const key = `${z},${x}`;
                if (pointMap.has(key)) {
                    if (pointMap.get(key)[2] < 1) {
                        pointMap.get(key)[2] += 1;
                    }
                }
                else {
                    pointMap.set(key, [z, x, 1]);
                }
            });
            const aggregatedPoints = Array.from(pointMap.values());
            return res.json(aggregatedPoints);
        }
        catch (error) {
            console.error('Error processing heatmap data:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
    app.get('/api/profile/:profileId/raids/:raidId/positions/compile', async (req, res) => {
        let { raidId } = req.params;
        (0, CompileRaidPositionalData_1.default)(raidId, logger);
        res.json({ message: 'OK' });
    });
    app.get('*', (req, res) => {
        return res.sendFile(path_1.default.join(__dirname, '/public/index.html'));
    });
    app.listen(port, () => {
        return logger.log(`Web Server is running at 'http://127.0.0.1:${port}'.`);
    });
}
exports.default = StartWebServer;
//# sourceMappingURL=Express.js.map