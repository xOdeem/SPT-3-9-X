/* license: NCSA *
* copyright: Fin *
* website: Nada	*
* authors:		 *
* 	- Fin 		*/

const modName = "Fin-AutomaticallyBalanceLevelsToEqualSkills"

//Added by CausingAphid01
//=======================================================================
import type { DependencyContainer } from "tsyringe";

import { IPostSptLoadMod } from "@spt/models/external/IPostSptLoadMod";
//=======================================================================
class LevelBalance implements IPostSptLoadMod
{
	postSptLoad(container)
	//Changed /\
	{
		LevelBalance.setupInitialValues(container)
	}
	
	static balanceSkills(sessionID, pmc)
	{
		let mult = config.Level_multiplier_for_skills
		let pmcData = ProfileHelper.getPmcProfile(sessionID)
		let scavData = ProfileHelper.getScavProfile(sessionID)
		if (!pmcData.Info)
			return
		let level = Math.ceil(pmcData.Info.Level * 1)
		let XP = level * 100 * mult
		
		// let a = (((level - 9) * 100) / 2)
		// let b = Math.sqrt(a * a)
		// let levelsAbove9 = a + b
		
		// let levelsBelow9 = level - levelsAbove9
		// let XP = ((((levelsBelow9 * (levelsBelow9 + 1)) / 2) * 10) + (levelsAbove9 * 100)) * 10
		
		for (let skill in pmcData.Skills.Common)
        {
			//Thanks to Vampyrn for pointing out the problem here, and providing a fix <3<3<3
            let currentId = pmcData.Skills.Common[skill].Id
            if (config.Skills_to_level_normally.includes(currentId))
                continue
            //Bot-only skills can be included if specifically added to the Multiplier_for_specific_skills list
            else if (!pmcData.Skills.Common[skill].Id.includes("Bot") || config.Multiplier_for_specific_skills[currentId])
            {
                let indivMult = config.Multiplier_for_specific_skills[pmcData.Skills.Common[skill].Id]
                indivMult ? null : indivMult = 1
                pmcData.Skills.Common[skill].Progress = XP * indivMult
            }
            else
                pmcData.Skills.Common[skill].Progress = 0
        }
		for (let skill in config.Skills_to_set_to_specific_level)
		{
			let skillEntry = {
				"Id": skill,
				"Progress": config.Skills_to_set_to_specific_level[skill] * 100,
				"PointsEarnedDuringSession": 0,
				"LastAccess": 0
			}			
			let skillIndex = pmcData.Skills.Common.findIndex(i => i.Id == skill)
			if (skillIndex >= 0)
				pmcData.Skills.Common[skillIndex] = skillEntry
			else
				pmcData.Skills.Common.push(skillEntry)
			console.log(pmcData.Skills.Common)
		}
		
		if (config.Affect_scav_skills == true)
			scavData.Skills = JsonUtil.clone(pmcData.Skills)
	}
	
	static onGameStart(url, info, sessionId)
	{
		LevelBalance.balanceSkills(sessionId)
	}
	
	static onRaidStart(url, info, sessionId)
	{
		LevelBalance.balanceSkills(sessionId)
	}
	
	static onRaidEnd(url, info, sessionId)
	{
		LevelBalance.balanceSkills(sessionId)
	}
	
	static setupInitialValues(container)
	{
		RandomUtil = container.resolve("RandomUtil")
		HashUtil = container.resolve("HashUtil")
		JsonUtil = container.resolve("JsonUtil")
		VFS = container.resolve("VFS")
		
		ProfileHelper = container.resolve("ProfileHelper")
		
		database = container.resolve("DatabaseServer")
		configServer = container.resolve("ConfigServer")
		database = database.getTables()
		itemdb = database.templates.items
		handbook = database.templates.handbook
		locations = database.locations
		botTypes = database.bots.types
		let dir = __dirname;
		let dirArray = dir.split("\\");
		modFolder = (`${dirArray[dirArray.length - 4]}/${dirArray[dirArray.length - 3]}/${dirArray[dirArray.length - 2]}/`);

		config = require("../config/config.json")

		Logger = container.resolve("WinstonLogger")
	}
	
	static saveToFile(data, filePath)
	{
		var fs = require('fs');
				fs.writeFile(modFolder + filePath, JSON.stringify(data, null, 4), function (err) {
				if (err) throw err;
			});
	}
	
	//Changed \/
	preSptLoad(container: DependencyContainer): void
	{
		containerC = container
		const dynamicRouterModService = container.resolve<DynamicRouterModService>("DynamicRouterModService");
		const staticRouterModService = container.resolve<StaticRouterModService>("StaticRouterModService");
		
		//Raid Saving (End of raid)
		staticRouterModService.registerStaticRouter(`StaticSptRaidSave${modName}`,[{url: "/raid/profile/save",
			action: (url, info, sessionId, output) =>{
				LevelBalance.onRaidEnd(url, info, sessionId, output);
				return output
			}}],"spt");
		//Game start
		staticRouterModService.registerStaticRouter(`StaticSptGameStart${modName}`,[{url: "/client/game/start",
			action: (url, info, sessionId, output) =>{
				LevelBalance.onGameStart(url, info, sessionId, output);
				return output
		}}],"spt");
		//Local Loot
		dynamicRouterModService.registerDynamicRouter(`DynamicSptLocalLoot${modName}`,[{url: "/client/location/getLocalloot",
			action: (url, info, sessionId, output) =>{
				LevelBalance.onRaidStart(url, info, sessionId, output);
				return output
		}}],"spt");
		//Replaced Aki/aki with Spt/spt with matching case /\
	}
}

//I'm sure this is bad. 100% sure of it. But it works.
//So this is where I pre-declare all the things that will be global, but that I can't define just yet. Weeee....
let RandomUtil
let HashUtil
let JsonUtil
let VFS
let Logger

let ProfileHelper

let database
let configServer
let itemdb
let handbook
let locations
let botTypes
let modFolder

let config
let advSConfig
let advIConfig
let advAIConfig
let progDiff
let debugHash

let containerC

var fs = require('fs');
import { IMod } from "../types/models/external/mod";
import type { DatabaseServer } from "../types/servers/DatabaseServer";
import { DependencyContainer } from "tsyringe";
import { ILogger } from "../types/models/spt/utils/ILogger";
import {DynamicRouterModService} from "../types/services/mod/dynamicRouter/DynamicRouterModService";
import {StaticRouterModService} from "../types/services/mod/staticRouter/StaticRouterModService";

//I now know this is Javascript. Huzzah! Thanks Pomaranczowy, this mod's fungus-like expansion is now partially your fault!

module.exports = { mod: new LevelBalance() }