"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Price = void 0;
const MysteryContainer_1 = require("./MysteryContainer");
class Price {
    container;
    config;
    logger;
    randomUtil;
    MysteryContainer;
    constructor(container, config, logger) {
        this.container = container;
        this.config = config;
        this.logger = logger;
        this.MysteryContainer = new MysteryContainer_1.MysteryContainer(config, logger);
        this.randomUtil = this.container.resolve("RandomUtil");
    }
    // This is where all Mystery Ammo containers are price generated during postDBLoad
    generateMysteryAmmoPrices() {
        this.logger.info("[TheGambler] Generating Mystery Ammo Prices...");
        let ammo = this.MysteryContainer.items.ammo;
        let mysteryAmmoPrices = {};
        for (let i = 0; i < ammo.names.length; i++) {
            const current = ammo.names[i];
            const amount = ((this.config.odds[current + '_min'] + this.config.odds[current + '_max']) / 2);
            const odds = this.MysteryContainer.getOdds(current);
            const rarities = this.MysteryContainer.getRarities(current);
            const items = this.MysteryContainer.items['ammo'].items[current];
            let currentContainerPrice = this.config.price_stock[current + "_case_price"];
            let currentPrices = this.getMysteryContainerPrices(current, current, rarities, items, amount);
            currentContainerPrice = this.runSimulation(currentContainerPrice, odds, currentPrices, -1, this.MysteryContainer.getProfitPercentage(current));
            mysteryAmmoPrices[current + "_case_price"] = currentContainerPrice;
        }
        this.logger.info("[TheGambler] Finished Generating Mystery Ammo Prices!");
        return mysteryAmmoPrices;
    }
    generateMysteryContainerPrices() {
        this.logger.info("[TheGambler] Generating Mystery Container Prices...");
        let mysteryAmmoPrices = {};
        const mysteryContainerNames = this.MysteryContainer.simulation;
        for (let i = 0; i < mysteryContainerNames.length; i++) {
            //console.log("Container Name!!")
            //console.log(mysteryContainerNames[i])
            const current = this.MysteryContainer.getName(mysteryContainerNames[i]);
            const name = mysteryContainerNames[i];
            const parent = this.MysteryContainer.getParent(name);
            const rarities = this.MysteryContainer.getRarities(name);
            const odds = this.MysteryContainer.getOdds(name);
            const items = this.MysteryContainer.items[this.MysteryContainer.getName(name)];
            let currentPrices = this.getMysteryContainerPrices(current, parent, rarities, items);
            let currentContainerPrice = this.config.price_stock[current + "_case_price"];
            currentContainerPrice = this.runSimulation(currentContainerPrice, odds, currentPrices, -1, this.MysteryContainer.getProfitPercentage(name));
            mysteryAmmoPrices[name + "_case_price"] = currentContainerPrice;
        }
        this.logger.info("[TheGambler] Finished Generating Mystery Container Prices!");
        return mysteryAmmoPrices;
    }
    getItemPrice(name, parent, rarities, items, amount = 1, currentRarityIndex, currentItemIndex) {
        const itemHelper = this.container.resolve("ItemHelper");
        //console.log([items.rewards[currentRarityIndex][currentItemIndex]])
        //console.log('Parent!!')
        //console.log(parent)
        const override = this.MysteryContainer.getOverride(parent, items.rewards[currentRarityIndex][currentItemIndex]);
        let currentPrice = 0;
        if (override && this.config['mystery_container_override_enable']) {
            currentPrice = override * amount;
        }
        else {
            if (Number.isInteger(items.rewards[currentRarityIndex][currentItemIndex])) { // Override exists for current item
                currentPrice = items.rewards[currentRarityIndex][currentItemIndex];
            }
            else { // No override exists for current item
                // Thinking: We always want to use flea price as this is most accurate, but if there is no flea price we must fallback to handbook
                const fleaPrice = itemHelper.getDynamicItemPrice(items.rewards[currentRarityIndex][currentItemIndex]);
                if (fleaPrice == 0) {
                    currentPrice = itemHelper.getItemMaxPrice(items.rewards[currentRarityIndex][currentItemIndex]) * amount;
                }
                else {
                    currentPrice = fleaPrice * amount;
                }
            }
        }
        return currentPrice;
    }
    // Generates the average income for a Mystery Container sorted by rarity
    getMysteryContainerPrices(name, parent, rarities, items, amount = 1) {
        let prices = [];
        let sum = 0;
        for (let i = 0; i < rarities.length; i++) {
            let count = 0;
            for (let j = 0; j < items.rewards[i].length; j++) {
                const currentPrice = this.getItemPrice(name, parent, rarities, items, amount, i, j);
                sum = sum + currentPrice;
                count++;
            }
            sum = sum / count;
            prices.push(sum);
            sum = 0;
        }
        this.MysteryContainer.setRarityAverageProfit(name, prices);
        return prices;
    }
    // Runs a simulation of a Mystery Container that generates the most optimal price for a desired profit percentage
    runSimulation(containerPrice, odds, prices, basePercentage, desiredPercentage) {
        let currentContainerPrice = containerPrice;
        let currentPercentage = basePercentage;
        const iterations = 50000; // 50,000 Mystery Containers simulated
        let checker = [];
        while (currentPercentage != desiredPercentage) {
            let spent = 0;
            let sum = 0;
            let profit = 0;
            for (let j = 0; j < iterations; j++) {
                const roll = this.randomUtil.getFloat(0, 100);
                for (let k = 0; k < odds.length; k++) {
                    if (roll <= odds[k]) {
                        sum += prices[k]; // odds and prices have to be indexed by rarity order [rarest,... ->, common] or else KABOOM
                        break; // This caused me soo much pain :(
                    }
                }
                profit = sum - spent;
                spent = iterations * currentContainerPrice;
                currentPercentage = Math.floor((sum * 100) / spent);
            }
            if (checker.includes(currentContainerPrice)) {
                break; // The final profit percentage may be a little off by up to 1% by doing this... Look into in the future...
            }
            else {
                checker.push(currentContainerPrice);
                if (currentPercentage < desiredPercentage) {
                    currentContainerPrice -= 50;
                }
                else if (currentPercentage > desiredPercentage) {
                    currentContainerPrice += 50;
                }
            }
            //console.log(`Current Container Price: ${currentContainerPrice} Current Percentage: ${currentPercentage} Desired Percentage: ${desiredPercentage}`);
        }
        return currentContainerPrice;
    }
}
exports.Price = Price;
//# sourceMappingURL=Price.js.map