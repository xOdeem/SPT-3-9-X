"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorPacketHandler = exports.messagePacketHandler = void 0;
const utils_1 = require("../../Utils/utils");
const DataSaver_1 = require("../FileSystem/DataSaver");
const NoOneLeftBehind_1 = require("../DataIntegrity/NoOneLeftBehind");
const constant_1 = require("../../constant");
const CheckForMissingMainPlayer_1 = require("../DataIntegrity/CheckForMissingMainPlayer");
async function messagePacketHandler(rawData, db, sessionManager, modDetector, logger, profiles, post_raid_processing) {
    try {
        // Convert RawData to string if it's a buffer
        let str;
        if (typeof rawData === 'string') {
            str = rawData;
        }
        else if (rawData instanceof Buffer) {
            str = rawData.toString('utf-8');
        }
        else {
            logger.error(`Unsupported message format received.`, rawData);
            return;
        }
        if (str.includes('WS_CONNECTED')) {
            logger.log(`Web Socket Client Connected`);
            return;
        }
        let data = JSON.parse(str);
        let filename = "";
        if (data && data.Action && data.Payload) {
            const payload_object = JSON.parse(data.Payload);
            // Debug payloads
            if (data.Action !== "POSITION") {
                logger.debug(`${data.Action}|${JSON.stringify(payload_object)}`);
            }
            // "sessionId" is the profileId of the player we're getting the data from
            let sessionManagerProfile = sessionManager.getProfile(payload_object.sessionId);
            if (!sessionManagerProfile)
                return;
            // "raidId" is pulled from the 'raidId' property against a 'RaidManagerPlayer'
            let raidId = sessionManagerProfile.raidId;
            // Keeps the raid and profile alive (...takes approx. 3 minutes to timeout).
            if (raidId) {
                sessionManager.pingRaid(raidId);
                sessionManager.pingProfile(payload_object.sessionId);
            }
            else if (!raidId && data.Action !== "START") {
                // Throw away statements without a RAID Id, should catch random errors too.
                logger.debug(`[MISSING_VALUE:'raidId'] ${data.Action}|${JSON.stringify(payload_object)}`);
                return;
            }
            // Fika Check
            const isFikaInstalled = modDetector.isModInstalled(constant_1.CONSTANTS.MOD_SIGNATURES.FIKA);
            const { keys, values } = (0, utils_1.ExtractKeysAndValues)(payload_object);
            switch (data.Action) {
                case "START":
                    logger.log(`Recieved 'START' trigger.`);
                    // FIKA Raid Handler
                    if (isFikaInstalled.server) {
                        logger.debug(`[START:RAID_GENERATOR] IS_FIKA_RAID: TRUE`);
                        raidId = crypto.randomUUID();
                        logger.debug(`[START:RAID_GENERATOR] RAID_ID: '${raidId}'`);
                        // Add RaidId to player
                        let player = sessionManager.getProfile(payload_object.sessionId);
                        player.raidId = raidId;
                        // Create Player Map, and register raid
                        const players = new Map();
                        players.set(payload_object.sessionId, sessionManagerProfile.profile.info.id);
                        sessionManager.addRaid(raidId, { raidId, players, timeout: 0 });
                    }
                    // SPT Raid Start Handler
                    else {
                        logger.debug(`[START:RAID_GENERATOR] IS_FIKA_RAID: FALSE`);
                        raidId = crypto.randomUUID();
                        logger.debug(`[START:RAID_GENERATOR] RAID_ID: '${raidId}'`);
                        // Add RaidId to player
                        let player = sessionManager.getProfile(payload_object.sessionId);
                        player.raidId = raidId;
                        // Create Player Map, and register raid
                        const players = new Map();
                        players.set(payload_object.sessionId, sessionManagerProfile.profile.info.id);
                        sessionManager.addRaid(raidId, { raidId, players, timeout: 0 });
                    }
                    logger.debug(`[START:RAIDS] ` + JSON.stringify(Array.from(sessionManager.getRaids().entries())));
                    post_raid_processing.stop();
                    logger.log(`Disabled Post Processing: Raid Started`);
                    const start_raid_sql = `INSERT INTO raid (raidId, profileId, location, time, timeInRaid, type, exitName, exitStatus, detectedMods) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                    db.run(start_raid_sql, [
                        raidId,
                        payload_object.profileId,
                        payload_object.location,
                        payload_object.time,
                        payload_object.timeInRaid,
                        payload_object.type,
                        "",
                        "",
                        payload_object.detectedMods || "",
                    ]).catch((e) => logger.error(`[SQL_ERR:START_RAID]`, e));
                    break;
                case "END":
                    logger.debug(`[END:RAIDS] ` + JSON.stringify(Array.from(sessionManager.getRaids().entries())));
                    logger.debug(`[END:PROFILES] ` + JSON.stringify(Array.from(sessionManager.getProfiles().entries()).map(p => p[1].profile = null)));
                    const end_raid_sql = `INSERT INTO raid (raidId, profileId, location, time, timeInRaid, type, exitName, exitStatus, detectedMods) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                    db
                        .run(end_raid_sql, [
                        raidId,
                        payload_object.profileId,
                        payload_object.location,
                        payload_object.time,
                        payload_object.timeInRaid,
                        payload_object.type,
                        payload_object.exitName || "",
                        payload_object.exitStatus || -1,
                        payload_object.detectedMods || "",
                    ])
                        .catch((e) => logger.error(`[SQL_ERR:END_RAID]`, e));
                    // FIKA Raid Handler
                    if (isFikaInstalled.client && isFikaInstalled.server) {
                        sessionManager.removeRaid(raidId, constant_1.CONSTANTS.REASON_RAID_REMOVAL__CLIENT_PACKET);
                    }
                    // SPT Raid End Handler
                    if (raidId) {
                        sessionManager.removeRaid(raidId, constant_1.CONSTANTS.REASON_RAID_REMOVAL__CLIENT_PACKET);
                    }
                    (0, CheckForMissingMainPlayer_1.CheckForMissingMainPlayer)(db, logger, profiles);
                    post_raid_processing.start();
                    logger.log(`Enabled Post Processing: Raid Finished`);
                    break;
                case "PLAYER_CHECK":
                    await (0, NoOneLeftBehind_1.NoOneLeftBehind)(db, logger, raidId, payload_object);
                    break;
                case "PLAYER_UPDATE":
                    const player_update_sql = "UPDATE player SET mod_SAIN_brain = ?, mod_SAIN_difficulty = ?, type = ? WHERE raidId = ? AND profileId = ?";
                    db.run(player_update_sql, [
                        payload_object.mod_SAIN_brain,
                        payload_object.mod_SAIN_difficulty,
                        payload_object.type,
                        raidId,
                        payload_object.profileId
                    ])
                        .catch((e) => logger.error(`[SQL_ERR:UPDATE_PLAYER]`, e));
                    break;
                case "PLAYER":
                    const playerExists_sql = `SELECT * FROM player WHERE raidId = ? AND profileId = ?`;
                    const playerExists = await db.all(playerExists_sql, [
                        raidId,
                        payload_object.profileId
                    ])
                        .catch((e) => logger.error(`[SQL_ERR:ADD_PLAYER_EXISTS]`, e));
                    // Stops duplicates, it's hacky, but it's working...
                    if (playerExists && playerExists.length) {
                        return;
                    }
                    const player_sql = `INSERT INTO player (raidId, profileId, level, team, name, "group", spawnTime, type, mod_SAIN_brain, mod_SAIN_difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                    db.run(player_sql, [
                        raidId,
                        payload_object.profileId,
                        payload_object.level,
                        payload_object.team,
                        payload_object.name,
                        payload_object.group,
                        payload_object.spawnTime,
                        payload_object.type,
                        payload_object.mod_SAIN_brain,
                        payload_object.mod_SAIN_difficulty
                    ])
                        .catch((e) => logger.error(`[SQL_ERR:ADD_PLAYER_INSERT]`, e));
                    ;
                    break;
                case "KILL":
                    const kill_sql = `INSERT INTO kills (raidId, time, profileId, killedId, weapon, distance, bodyPart, positionKiller, positionKilled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                    db
                        .run(kill_sql, [
                        raidId,
                        payload_object.time,
                        payload_object.profileId,
                        payload_object.killedId,
                        payload_object.weapon,
                        payload_object.distance,
                        payload_object.bodyPart,
                        payload_object.positionKiller,
                        payload_object.positionKilled,
                    ])
                        .catch((e) => logger.error(`[SQL_ERR:ADD_KILL]`, e));
                    break;
                case "POSITION":
                    if (raidId) {
                        filename = `${raidId}_positions`;
                        (0, DataSaver_1.WriteLineToFile)(logger, "positions", "", "", filename, keys, values);
                    }
                    break;
                case "LOOT":
                    const loot_sql = `INSERT INTO looting (raidId, profileId, time, qty, itemId, itemName, added) VALUES (?, ?, ?, ?, ?, ?, ?)`;
                    db
                        .run(loot_sql, [
                        raidId,
                        payload_object.profileId,
                        payload_object.time,
                        payload_object.qty,
                        payload_object.itemId,
                        payload_object.itemName,
                        payload_object.added
                    ])
                        .catch((e) => logger.error(`[SQL_ERR:ADD_LOOTING]`, e));
                    break;
                default:
                    break;
            }
        }
    }
    catch (err) {
        logger.error(`[WS_DATA_ERR]`, err);
        logger.error(`[WS_DATA_ERR]`, rawData);
    }
}
exports.messagePacketHandler = messagePacketHandler;
async function errorPacketHandler(error, logger) {
    logger.error(`[WS_ERR]`, error);
}
exports.errorPacketHandler = errorPacketHandler;
//# sourceMappingURL=packetHandler.js.map