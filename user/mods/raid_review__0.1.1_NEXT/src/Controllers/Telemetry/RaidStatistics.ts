
import * as _ from 'lodash';
import { Database } from "sqlite";
import sqlite3 from 'sqlite3'

import { TrackingRaidData, TrackingRaidDataPlayers } from "../../Server/Client/src/types/api_types";
import { positional_data__grouped } from "../PositionalData/CompileRaidPositionalData";
import { calculateTotalDistance } from "../PositionalData/CalculateDistancesTravelled";
import { getRaidData } from '../Collection/GetRaidData';
import { Logger } from '../../Utils/logger';

export interface StatisticsPayload {
    raidId: string,
    location: string
    status: string
    time: number
    players: {
      total: number
      usec: number
      bear: number
      savage: number
    }
    kills: {
      total: number
      usec: number
      bear: number
      savage: number
    }
    distanceTravelled: number
}

export async function sendStatistics(db: Database<sqlite3.Database, sqlite3.Statement>, logger: Logger, raidId: string, positions: positional_data__grouped): Promise<void> {
    const raidData = await getRaidData(db, logger, raidId);
    logger.log(`Generating statistics payload.`)

    const payload = await generateStatisticsPayload(logger, raidData, positions);
    logger.log(`Sending statistics payload.`)

    await sendStatisticsPayload(payload, logger);
    logger.log(`Statistics payload recieved.`)
}

async function generateStatisticsPayload(logger: Logger, raid: TrackingRaidData, positions: positional_data__grouped) : Promise<StatisticsPayload> {

    // Data points
    let players = {
        total: 0,
        usec: 0,
        bear: 0,
        savage: 0
    }

    let kills = {
        total: 0,
        usec: 0,
        bear: 0,
        savage: 0
    }

    // Should speed up data reads
    let playerDic = _.groupBy(raid.players ,'playerId') as unknown as { [key:string] : TrackingRaidDataPlayers };

    // Iterations
    let lootingsLen = raid.looting.length;

    players.total = raid.players.length;
    raid.players.forEach(player => {
        if (player && player.team) {
            let lowercaseTeam = player.team.toLowerCase();
            if (!players[lowercaseTeam] !== undefined) {
                players[lowercaseTeam]++;
            }
        }
    });

    
    // Iterating through kills to count kills per team
    kills.total = raid.kills.length;
    raid.kills.forEach(kill => {
        let killedPlayer = playerDic[kill.killedId];
        if (killedPlayer && killedPlayer.team) {
            let lowercaseTeam = killedPlayer.team.toLowerCase();
            if (kills[lowercaseTeam] !== undefined) {
                kills[lowercaseTeam]++;
            }
        }
    });

    
    // Final Payload
    const data = {
        raidId: raid.raidId,
        location: raid.location,
        status: raid.exitStatus,
        time: Number(raid.timeInRaid),
        players,
        kills,
        lootings: lootingsLen,
        positions: _.chain(positions).valuesIn().flatMapDeep().value().length,
        distanceTravelled : calculateTotalDistance(positions, logger)
    }

    return data;
}

async function sendStatisticsPayload(statisticsPayload : StatisticsPayload, logger: Logger) : Promise<void> {

    try {
        await fetch(`https://telemetry.raid-review.online/`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(statisticsPayload)
        });
    } catch (error) {
        logger.log(`There was an issue sending statistics to 'raid-review' server.`);
        logger.log(error);
    }

}