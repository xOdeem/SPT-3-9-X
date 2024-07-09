"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
const constant_1 = require("../../constant");
/**
 * The role of the session manager is to keep track of:
 * - Raids
 * - Active Profiles
 */
class SessionManager {
    raids;
    profiles;
    timeoutIntervals;
    logger;
    constructor(logger) {
        this.raids = new Map;
        this.profiles = new Map;
        this.timeoutIntervals = new Map;
        this.logger = logger;
    }
    addTimeoutInterval(timeoutId, target) {
        if (this.timeoutIntervals.has(timeoutId)) {
            this.removeTimeoutInterval(timeoutId);
        }
        this.timeoutIntervals.set(timeoutId, setInterval(() => {
            if (target === 'raid') {
                // timeoutId would be the 'guid' of the raid
                const raid = this.getRaid(timeoutId);
                raid.timeout++;
                // If raid times out after 2 minutes, remove the raid.
                if (raid.timeout >= 2) {
                    this.removeRaid(timeoutId, constant_1.CONSTANTS.REASON_RAID_REMOVAL__TIMEOUT);
                }
            }
            if (target === 'player') {
                // timeoutId would be the 'guid' of the player
                const player = this.getProfile(timeoutId);
                player.timeout++;
                // If player times out after 240 minutes, remove the profile.
                if (player.timeout >= 240) {
                    if (player.raidId) {
                        this.removePlayerFromRaid(player.raidId, timeoutId);
                    }
                    this.removeProfile(timeoutId);
                }
            }
        }, 60 * 1000));
    }
    removeTimeoutInterval(timeoutId) {
        if (!this.timeoutIntervals.has(timeoutId)) {
            return;
        }
        clearInterval(this.timeoutIntervals.get(timeoutId));
        this.timeoutIntervals.delete(timeoutId);
    }
    // Profile Handlers
    addProfile(profileId, data) {
        this.profiles.set(profileId, data);
        this.logger.log(`Registered player '${profileId}' to the session manager.`);
    }
    removeProfile(profileId) {
        this.profiles.delete(profileId);
    }
    getProfiles() {
        return this.profiles;
    }
    getProfile(profileId) {
        return this.profiles.get(profileId);
    }
    pingProfile(profileId) {
        if (!this.profiles.has(profileId)) {
            return;
        }
        this.getProfile(profileId).timeout = 0;
    }
    // Raid Handlers
    addRaid(raidId, raidData) {
        this.raids.set(raidId, raidData);
        this.addTimeoutInterval(raidId, 'raid');
        this.logger.log(`Registered raid '${raidId}' for player(s) '${Array.from(raidData.players.keys()).join(',')}'.`);
    }
    removeRaid(raidId, removalReason) {
        this.removeTimeoutInterval(raidId);
        const raid = this.getRaid(raidId);
        // Remove all players from the raid, and reset Ids for profiles.
        const playersInRaid = Array.from(raid.players.keys());
        for (let i = 0; i < playersInRaid.length; i++) {
            this.removePlayerFromRaid(raidId, playersInRaid[i]);
        }
        // Delete Raid
        this.raids.delete(raidId);
        this.logger.log(`Deregistered raid '${raidId}', REASON: ${removalReason}`);
        // Create a new log file if all raids are over.
        if (this.raids.size === 0) {
            this.logger.init();
        }
    }
    getRaids() {
        return this.raids;
    }
    getRaid(raidId) {
        return this.raids.get(raidId);
    }
    pingRaid(raidId) {
        if (!this.raids.has(raidId)) {
            return;
        }
        this.getRaid(raidId).timeout = 0;
    }
    // Player To Raid Handler
    addPlayerToRaid(raidId, profileId) {
        const player = this.getProfile(profileId);
        player.raidId = raidId;
        const raid = this.getRaid(raidId);
        raid.players.set(profileId, profileId);
    }
    removePlayerFromRaid(raidId, profileId) {
        const player = this.getProfile(profileId);
        player.raidId = null;
        const raid = this.getRaid(raidId);
        raid.players.delete(profileId);
    }
}
exports.SessionManager = SessionManager;
//# sourceMappingURL=sessionManager.js.map