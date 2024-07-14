"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gamble = void 0;
const itemCreator_1 = require("./itemCreator");
const MysteryContainer_1 = require("./MysteryContainer");
class Gamble {
    newItemsRequest;
    name;
    count;
    mysteryContainer;
    currentID;
    currentCaliber;
    currentMagazine;
    currentMagazineMaxAmmo;
    currentWeaponType;
    container;
    hashUtil;
    logger;
    randomUtil;
    config;
    constructor(container, config, logger, name) {
        this.name = name.replace('gambling_', '');
        this.logger = logger;
        this.container = container;
        this.config = config;
        this.count = 0;
        this.randomUtil = container.resolve("RandomUtil");
        this.hashUtil = container.resolve("HashUtil");
        this.mysteryContainer = new MysteryContainer_1.MysteryContainer(config, logger);
        this.newItemsRequest = {
            itemsWithModsToAdd: [],
            foundInRaid: true,
            useSortingTable: true
        };
    }
    newGamble(name = this.name, roll = this.randomUtil.getFloat(0, 100)) {
        //console.log('NEW GAMBLE: Creating ' + name + ' roll = ' + roll)
        switch (name) {
            case 'wallet':
            case 'roubles':
            case 'bitcoin':
            case 'gpcoin':
            case 'keycard':
            case 'key':
            case 'stim':
            case 'medical':
            case 'food':
            case 'loadout_food':
            case 'loadout_drink':
            case 'loadout_light_bleed':
            case 'loadout_heavy_bleed':
            case 'loadout_healing':
            case 'melee':
            case 'headset':
            case 'backpack':
            case 'rig':
            case '7.62x25':
            case '9x18':
            case '9x19':
            case '9x21':
            case '.357':
            case '.45':
            case '4.6x30':
            case '5.7x28':
            case '5.45x39':
            case '5.56x45':
            case '.300':
            case '7.62x39':
            case '7.62x51':
            case '7.62x54':
            case '.338':
            case '9x39':
            case '.366':
            case '12.7x55':
            case '12/70':
            case '20/70':
            case '23x75':
                this.openReward(name, roll);
                break;
            case 'weapon':
            case 'premium_weapon':
            case 'helmet':
            case 'armor':
            case 'premium_armor':
                this.openPreset(name, roll);
                break;
            case 'loadout':
                this.openLoadoutContainer(name, roll);
                break;
            default:
                this.logger.error(`[TheGambler] This Mystery Container Doesn't exist! Contact Author!`);
        }
        return this.newItemsRequest;
    }
    // Opens all rewards from the loadout container
    openLoadoutContainer(name = this.name, roll = this.randomUtil.getFloat(0, 100)) {
        this.logger.info(`[TheGambler][${name}] The container roll is: ${roll}!`);
        const rewards = this.mysteryContainer.getGuaranteedRewards(name);
        const randomness = this.mysteryContainer.getGuaranteedRandomness(name);
        let curerntID;
        let currentCaliber, currentMagazine, currentMagazineMaxAmmo, currentWeaponType;
        for (let i = 0; i < rewards.length; i++) {
            const current = rewards[i];
            if (this.mysteryContainer.getName(current)) { // Rewards is a container
                if (this.currentWeaponType == 'meme') { // Generated Weapon is meme all rewards are random now
                    this.newGamble(current);
                }
                else {
                    if (randomness[i]) {
                        this.newGamble(current);
                    }
                    else {
                        this.newGamble(current, roll);
                    }
                }
                if (current === 'armor') {
                    const currentID = this.currentID;
                    let truth = false;
                    if (currentID) {
                        truth = true;
                    }
                    if (currentID && this.mysteryContainer.items['armor'].armor_rigs.includes(currentID)) {
                        i++; // Skip the rig reward
                    }
                }
                if (current === 'weapon' || current === 'premium_weapon') { // Ammo and Magazine generation
                    currentCaliber = this.currentCaliber;
                    currentMagazine = this.currentMagazine;
                    currentMagazineMaxAmmo = this.currentMagazineMaxAmmo;
                    currentWeaponType = this.currentWeaponType;
                    let magazineCount = 3;
                    const badMagazines = [
                        '633ec6ee025b096d320a3b15', // RSh-12 12.7x55 5-round cylinder
                        '5ae0973a5acfc4001562206c' // Mosin Rifle 7.62x54R 5-round magazine
                    ];
                    //push magazines and ammo
                    const caliber = this.mysteryContainer.items['ammo'].BSGCalibers[currentCaliber];
                    if (caliber != '20x70' && caliber != '23x75' && caliber != '12/70' && caliber != '.357' && !badMagazines.includes(currentMagazine)) {
                        this.openReward(caliber, roll, this.currentMagazine, false, 1);
                        this.openReward(caliber, roll, this.currentMagazine, false, 1);
                    }
                    let tempRoll;
                    // Depending on the ammo type, we want to generate a different rarity of ammo from the temproll
                    switch (currentWeaponType) {
                        case 'meme':
                            tempRoll = this.randomUtil.getFloat(0, 30);
                            break;
                        case 'decent':
                            tempRoll = this.randomUtil.getFloat(10, 50);
                            break;
                        case 'meta':
                            tempRoll = this.randomUtil.getFloat(0, 35);
                            break;
                        default:
                            tempRoll = roll;
                            break;
                    }
                    for (let i = 0; i < magazineCount; i++) {
                        this.openReward(caliber, tempRoll, 'NaN', true, currentMagazineMaxAmmo);
                    }
                }
            }
            else { // Reward  is a item
                // Finish.........
                const reward_amount = this.mysteryContainer.getRewardAmount(name, i);
                const stackable = this.mysteryContainer.getStackable(name, i);
                if (!stackable) {
                    //console.log('OPEN GUARANTEED REWARDS: Item exists and NOT stackable... Adding to newItemsRequest...')
                    for (let i = 0; i < reward_amount; i++) {
                        this.newItemsRequest.itemsWithModsToAdd[this.count] = [this.newItemFormat(current)];
                        this.newItemsRequest.foundInRaid = true;
                        this.count++;
                    }
                }
                else {
                    //console.log('OPEN GUARANTEED REWARDS: Item exists and is stackable... Adding to newItemsRequest...')
                    this.newItemsRequest.itemsWithModsToAdd[this.count] = [this.newItemFormat(current, reward_amount)];
                    this.newItemsRequest.foundInRaid = true;
                    this.count++;
                }
            }
        }
    }
    openReward(name = this.name, roll = this.randomUtil.getFloat(0, 100), id = 'NaN', stackable = false, reward_amount = undefined) {
        this.logger.info(`[TheGambler][${name}] The container roll is: ${roll}!`);
        const odds = this.mysteryContainer.getOdds(name);
        let guaranteed_rewards = this.mysteryContainer.getGuaranteedRewards(name);
        let reward_rolls = this.mysteryContainer.getRewardRolls(name);
        let generatedRewards = [];
        /* // Not Implemented Yet...
        if (guaranteed_rewards) {
            this.openGuaranteedRewards(name, roll);
            return;
            }
            */
        if (id === "NaN" && reward_rolls) {
            const rewards = this.mysteryContainer.getRewards(name);
            for (let i = 0; i < rewards.length; i++) {
                for (let j = 0; j < reward_rolls[i]; j++) {
                    const item = this.mysteryContainer.getReward(name, i);
                    this.currentID = item;
                    this.newItemsRequest.itemsWithModsToAdd[this.count] = [this.newItemFormat(item)];
                    this.newItemsRequest.foundInRaid = true;
                    this.count++;
                }
            }
        }
        if (id === "NaN" && !reward_rolls) {
            // console.log('ID is NaN... Searching for ID...')
            for (let i = 0; i < odds.length; i++) {
                if (roll <= odds[i]) {
                    //console.log('WIN! Creating ' + name + ' index = ' + i + ' rewards = ' +  this.mysteryContainer.getReward(name, i))
                    id = this.mysteryContainer.getReward(name, i);
                    this.currentID = id;
                    if (reward_amount === undefined) {
                        reward_amount = this.mysteryContainer.getRewardAmount(name, i);
                    }
                    if (stackable === false) {
                        stackable = this.mysteryContainer.getStackable(name, i);
                    }
                    break;
                }
            }
        }
        if (this.config.debug) {
            this.logger.info("[TheGambler] Weapon Mystery Box Information...");
            this.logger.info(id);
        }
        if (id !== "NaN" && !reward_rolls) {
            if (!reward_amount) { // ammo has min and max amount instead of a fixed amount
                reward_amount = this.mysteryContainer.getRandomAmount(name);
            }
            if (!stackable) {
                for (let i = 0; i < reward_amount; i++) {
                    this.newItemsRequest.itemsWithModsToAdd[this.count] = [this.newItemFormat(id)];
                    this.newItemsRequest.foundInRaid = true;
                    this.count++;
                }
            }
            else {
                this.newItemsRequest.itemsWithModsToAdd[this.count] = [this.newItemFormat(id, reward_amount)];
                this.newItemsRequest.foundInRaid = true;
                this.count++;
            }
        }
        else {
            this.logger.info(`[TheGambler][${name}] Case Opened... Received Nothing... Better luck next time :)`);
        }
    }
    openPreset(name = this.name, roll = this.randomUtil.getFloat(0, 100)) {
        //console.log('\nopenPreset()');
        // ItemCreator stores all preset creation functions
        let item = new itemCreator_1.ItemCreator(this.container);
        let preset = [];
        this.logger.info(`[TheGambler][${name}] The container roll is: ${roll}!`);
        const odds = this.mysteryContainer.getOdds(name);
        for (let i = 0; i < odds.length; i++) {
            if (roll <= odds[i]) {
                const parent = this.mysteryContainer.getParent(name);
                preset = item.createPreset(parent, this.mysteryContainer.getPreset(parent, i));
                this.currentID = preset[0]._tpl;
                if (name === 'weapon' || name === 'premium_weapon') {
                    // Store values for possible future use
                    this.currentCaliber = item.caliber;
                    this.currentMagazine = item.magazine;
                    this.currentWeaponType = item.weaponType;
                    this.currentMagazineMaxAmmo = item.magazineMaxAmmo;
                }
                break;
            }
        }
        if (this.config.debug) {
            this.logger.info("[TheGambler] Weapon Mystery Box Information...");
            this.logger.info(preset);
        }
        if (preset.length != 0) {
            this.newItemsRequest.itemsWithModsToAdd[this.count] = [...preset];
            if (name === 'weapon' || name === 'premium_weapon') {
                this.newItemsRequest.foundInRaid = false;
            }
            else {
                this.newItemsRequest.foundInRaid = true;
            }
            this.count++;
        }
        else {
            this.logger.info(`[TheGambler][Weapon] Case Opened... Received Nothing... Better luck next time :)`);
        }
    }
    newItemFormat(tpl, count = undefined) {
        const item = {
            _id: this.hashUtil.generate(),
            _tpl: tpl,
            parentId: "hideout",
            slotId: "hideout",
            upd: { StackObjectsCount: count ? count : 1 }
        };
        return item;
    }
}
exports.Gamble = Gamble;
//# sourceMappingURL=Gamble.js.map