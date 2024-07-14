"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MysteryContainer = void 0;
const Ammo_1 = require("./containers/Ammo");
const Armors_1 = require("./containers/Armors");
const Backpacks_1 = require("./containers/Backpacks");
const Foods_1 = require("./containers/Foods");
const Headsets_1 = require("./containers/Headsets");
const Helmets_1 = require("./containers/Helmets");
const Keycard_1 = require("./containers/Keycard");
const Melees_1 = require("./containers/Melees");
const PremiumArmors_1 = require("./containers/PremiumArmors");
const PremiumWeapons_1 = require("./containers/PremiumWeapons");
const Rigs_1 = require("./containers/Rigs");
const Stims_1 = require("./containers/Stims");
const Wallet_1 = require("./containers/Wallet");
const Weapons_1 = require("./containers/Weapons");
const keys_1 = require("./containers/keys");
const FlipRouble_1 = require("./containers/FlipRouble");
const FlipGPCoin_1 = require("./containers/FlipGPCoin");
const FlipBitcoin_1 = require("./containers/FlipBitcoin");
const Loadouts_1 = require("./containers/Loadouts");
const Medical_1 = require("./containers/Medical");
const LoadoutFood_1 = require("./containers/LoadoutFood");
const LoadoutDrink_1 = require("./containers/LoadoutDrink");
const LoadoutLightBleed_1 = require("./containers/LoadoutLightBleed");
const LoadoutHeavyBleed_1 = require("./containers/LoadoutHeavyBleed");
const LoadoutHealing_1 = require("./containers/LoadoutHealing");
class Container {
    name;
    parent;
    rarities;
    odds;
    stackable;
    min;
    max;
    override;
    rarity_average_profit;
    profit_percentage;
    guaranteed_rewards;
    guaranteed_stackable;
    guaranteed_reward_amount;
    guaranteed_randomness;
    reward_amount;
    reward_rolls;
    rewards;
    presets;
    constructor(name) {
        this.name = name;
        this.parent = '';
        this.rarities = [];
        this.odds = [];
        this.stackable = [];
        this.override = {};
        this.rarity_average_profit = [];
        this.profit_percentage = 0;
        this.reward_amount = [];
        this.rewards = [];
        this.presets = [];
    }
}
class MysteryContainer {
    config;
    logger;
    containers;
    names;
    items;
    simulation;
    override;
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        //this.container  = this.setData(this.containersData) Old Way
        this.names = [
            'wallet', 'keycard', 'key', 'stim', 'medical', 'food', 'melee',
            'backpack', 'rig', 'weapon', 'premium_weapon', 'helmet',
            'headset', 'armor', 'premium_armor', 'roubles', 'bitcoin', 'gpcoin',
            'loadout', 'loadout_food', 'loadout_drink', 'loadout_light_bleed', 'loadout_heavy_bleed', 'loadout_healing', 'ammo'
        ];
        this.simulation = ['armor', 'premium_armor', 'headset', 'rig', 'backpack', 'key', 'melee', 'stim', 'food'];
        this.override = ['ammo', 'armor'];
        this.items = {
            wallet: new Wallet_1.Wallet(),
            keycard: new Keycard_1.Keycard(),
            key: new keys_1.Keys(),
            stim: new Stims_1.Stims(),
            medical: new Medical_1.Medical(),
            food: new Foods_1.Foods(),
            melee: new Melees_1.Melees(),
            backpack: new Backpacks_1.Backpacks(),
            rig: new Rigs_1.Rigs(),
            helmet: new Helmets_1.Helmets(),
            headset: new Headsets_1.Headsets(),
            weapon: new Weapons_1.Weapons(),
            premium_weapon: new PremiumWeapons_1.PremiumWeapons(),
            armor: new Armors_1.Armors(),
            premium_armor: new PremiumArmors_1.PremiumArmors(),
            ammo: new Ammo_1.Ammo(),
            roubles: new FlipRouble_1.FlipRouble(),
            bitcoin: new FlipBitcoin_1.FlipBitcoin(),
            gpcoin: new FlipGPCoin_1.FlipGPCoin(),
            loadout: new Loadouts_1.Loadouts(),
            loadout_food: new LoadoutFood_1.LoadoutFood(),
            loadout_drink: new LoadoutDrink_1.Loadoutdrink(),
            loadout_light_bleed: new LoadoutLightBleed_1.LoadoutLightBleed(),
            loadout_heavy_bleed: new LoadoutHeavyBleed_1.LoadoutHeavyBleed(),
            loadout_healing: new LoadoutHealing_1.LoadoutHealing()
        };
        this.containers = this.setContainers();
    }
    setContainers() {
        const containers = {};
        const generateAmount = (length, value) => new Array(length).fill(value);
        const calculateOddsAndRewards = (container, item) => {
            for (let j = 0; j < container.rarities.length; j++) {
                const key = `${container.name}${container.rarities[j]}`;
                if (j == 0) {
                    container.odds[j] = this.config.odds[key];
                }
                else {
                    container.odds[j] = this.config.odds[key] + container.odds[j - 1];
                }
                container.rewards[j] = item.rewards ? [...item.rewards[j]] : [];
            }
        };
        const applyOverrides = (container, item, isAmmo) => {
            if (this.override.includes(container.name) || isAmmo) {
                container.override = this.config.mystery_container_override_price[container.parent];
                container.stackable = item.stackable || generateAmount(container.rarities.length, true);
            }
            if (!isAmmo) {
                container.reward_amount = item.reward_amount || generateAmount(container.rarities.length, 1);
                container.stackable = item.stackable || generateAmount(container.rarities.length, false);
            }
        };
        const setContainerProperties = (container, name, item) => {
            container.min = this.config.odds[`${name}_min`] || 1;
            container.max = this.config.odds[`${name}_max`] || 1;
            container.profit_percentage = this.config.odds[`${name}_profit_percentage`];
            container.presets = item.presets ? [...item.presets] : [];
            container.guaranteed_stackable = item.guaranteed_stackable ? item.guaranteed_stackable : undefined;
            container.guaranteed_reward_amount = item.guaranteed_reward_amount ? item.guaranteed_reward_amount : undefined;
            container.guaranteed_rewards = item.guaranteed_rewards ? item.guaranteed_rewards : undefined;
            container.guaranteed_randomness = item.guaranteed_randomness ? item.guaranteed_randomness : undefined;
            container.reward_rolls = item.reward_rolls ? item.reward_rolls : undefined;
        };
        const createAndConfigureContainer = (name, item, isAmmo) => {
            const container = new Container(name);
            //console.log(container.name)
            container.rarities = [...item.rarities];
            container.parent = item.parent;
            calculateOddsAndRewards(container, item);
            applyOverrides(container, item, isAmmo);
            setContainerProperties(container, name, item);
            containers[name] = container;
        };
        this.names.forEach(name => createAndConfigureContainer(name, this.items[name], false));
        this.items.ammo.names.forEach(name => createAndConfigureContainer(name, this.items.ammo.items[name], true));
        //console.log('THE CONTAINER!!!');
        return containers;
    }
    // getRandomInt(3) returns 0, 1, or 2
    getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }
    getName(name) {
        return this.containers[name].name;
    }
    getParent(name) {
        return this.containers[name].parent;
    }
    getOdds(name) {
        return this.containers[name].odds;
    }
    getRarities(name) {
        return this.containers[name].rarities;
    }
    /*
        public getOpenAll(name: string): boolean{
            return this.containers[name].openAll? this.containers[name].openAll : false;
        }
    */
    getGuaranteedRewards(name) {
        return this.containers[name].guaranteed_rewards ? this.containers[name].guaranteed_rewards : undefined;
    }
    getGuaranteedRewardAmount(name, rarityIndex) {
        return this.containers[name].guaranteed_reward_amount[rarityIndex];
    }
    getGuaranteedStackable(name, rarityIndex) {
        return this.containers[name].guaranteed_stackable[rarityIndex];
    }
    getGuaranteedRandomness(name) {
        return this.containers[name].guaranteed_randomness;
    }
    getPreset(name, rarityIndex) {
        return this.containers[name].presets[rarityIndex];
    }
    // Returns random Reward from possible Rewards
    getReward(name, rarityIndex) {
        const rewards = this.containers[name].rewards[rarityIndex];
        const randomNumber = this.getRandomInt(rewards.length);
        return rewards[randomNumber];
    }
    // Returns the amount of rolls for each set of items in rewards
    getRewardRolls(name) {
        return this.containers[name].reward_rolls ? this.containers[name].reward_rolls : undefined;
    }
    // Returns all rewards from possible rewards
    getRewards(name) {
        return this.containers[name].rewards;
    }
    getRewardAmount(name, rarityIndex) {
        return this.containers[name].reward_amount[rarityIndex];
    }
    getStackable(name, rarityIndex) {
        return this.containers[name].stackable[rarityIndex];
    }
    getRandomAmount(name) {
        const min = this.containers[name].min;
        const max = this.containers[name].max;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    getRarityAverageProfit(name) {
        return this.containers[name].rarity_average_profit;
    }
    getProfitPercentage(name) {
        return this.containers[name].profit_percentage;
    }
    getOverride(name, item) {
        return this.containers[name].override[item];
    }
    setRarityAverageProfit(name, profit) {
        //return this.containers[name]['override'][item];
        this.containers[name].rarity_average_profit = profit;
    }
}
exports.MysteryContainer = MysteryContainer;
//# sourceMappingURL=MysteryContainer.js.map