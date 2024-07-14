"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemCreator = void 0;
const WeaponPresets_1 = require("./presets/WeaponPresets");
const ArmorPresets_1 = require("./presets/ArmorPresets");
const HelmetPresets_1 = require("./presets/HelmetPresets");
class ItemCreator {
    Weapons;
    Helmets;
    Armors;
    caliber;
    magazine;
    magazineMaxAmmo;
    weaponType;
    hashUtil;
    itemHelper;
    constructor(container) {
        this.Weapons = new WeaponPresets_1.WeaponPresets();
        this.Helmets = new HelmetPresets_1.HelmetPresets();
        this.Armors = new ArmorPresets_1.ArmorPresets();
        this.hashUtil = container.resolve("HashUtil");
        this.itemHelper = container.resolve("ItemHelper");
    }
    // getRandomInt(3) returns 0, 1, or 2
    getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }
    createPreset(name, rarity) {
        let itemPreset = [];
        //console.log('createPreset ' + name + ' ' + rarity)
        switch (name) {
            case 'helmet':
                itemPreset = this.createHelmet(rarity);
                break;
            case 'armor':
                itemPreset = this.createArmor(rarity);
                break;
            case 'weapon':
                itemPreset = this.createGun(rarity);
                break;
        }
        return itemPreset;
    }
    // Returns a random helmet from Helmets
    createHelmet(which) {
        let baseHelmet;
        if (which == "common") {
            baseHelmet = this.Helmets.helmet_common;
        }
        else if (which == "uncommon") {
            baseHelmet = this.Helmets.helmet_uncommon;
        }
        else if (which == "rare") {
            baseHelmet = this.Helmets.helmet_rare;
        }
        else if (which == "extremely_rare") {
            baseHelmet = this.Helmets.helmet_extremely_rare;
        }
        const randomHelmet = this.getRandomInt(baseHelmet.length);
        let getItem = baseHelmet[randomHelmet];
        return this.generateItem(getItem);
    }
    // Returns a random Armor from Armors
    createArmor(which) {
        let baseArmor;
        if (which == "common") {
            baseArmor = this.Armors.commonArmor;
        }
        else if (which == "uncommon") {
            baseArmor = this.Armors.uncommonArmor;
        }
        else if (which == "rare") {
            baseArmor = this.Armors.rareArmor;
        }
        const randomArmor = this.getRandomInt(baseArmor.length);
        let getItem = baseArmor[randomArmor];
        return this.generateItem(getItem);
    }
    // Returns a random gun from Weapons
    createGun(which) {
        let weaponBuilds;
        //console.log('WHICH = ' + which)
        if (which == "base") {
            weaponBuilds = this.Weapons.weaponBaseBuilds;
        }
        else if (which == "scav") {
            weaponBuilds = this.Weapons.weaponScavBuilds;
        }
        else if (which == "decent") {
            weaponBuilds = this.Weapons.weaponDecentBuilds;
        }
        else if (which == "meme") {
            weaponBuilds = this.Weapons.weaponMemeBuilds;
        }
        else if (which == "meta") {
            weaponBuilds = this.Weapons.weaponMetaBuilds;
        }
        const randomBuild = this.getRandomInt(weaponBuilds.length);
        let getItem = weaponBuilds[randomBuild];
        this.weaponType = which;
        return this.generateItem(getItem);
    }
    generateItem(build) {
        const item = [];
        // We map every build[i]._id to a newly generated _id inside of parenIdMap. We HAVE to do this as if we have two duplicate items they would have the same _id which will brick the player inventory.
        const parentIdMap = {};
        const _randomId = this.hashUtil.generate(); // New Item baseId;
        const weapon_name = build['Name'] ? build['Name'] : undefined;
        build = build.Items;
        let baseId;
        for (let i = 0; i < build.length; i++) {
            if (i == 0) { // item base
                baseId = build[i]._id; // Need the base to reference in attachments
                parentIdMap[baseId] = _randomId; // base id = _randomId
                item.push({
                    _id: _randomId,
                    _tpl: build[i]._tpl
                });
            }
            else { // Children Attachments  
                const newId = this.hashUtil.generate();
                // Every _id is mapped to a newly generated _id, so every item is unique and doesn"t _id collide
                if (parentIdMap[build[i]._id] == undefined) {
                    parentIdMap[build[i]._id] = newId;
                }
                if (build[i].parentId != baseId) { // Attachments with parents that are not the base Item
                    item.push({
                        _id: newId,
                        _tpl: build[i]._tpl,
                        parentId: parentIdMap[build[i].parentId],
                        slotId: build[i].slotId,
                        upd: build[i].upd?.Togglable ? ({
                            Togglable: {
                                On: true,
                            }
                        }) : {}
                    });
                }
                else {
                    if (build[i].slotId == "mod_magazine") {
                        // Save magazine
                        this.magazine = build[i]._tpl;
                        // Maximum rounds in saved magazine
                        const magInfo = this.itemHelper.getItem(this.magazine);
                        this.magazineMaxAmmo = magInfo[1]._props.Cartridges[0]._max_count;
                    }
                    item.push({
                        _id: newId,
                        _tpl: build[i]._tpl,
                        parentId: _randomId,
                        slotId: build[i].slotId,
                        upd: build[i].upd?.Togglable ? ({
                            Togglable: {
                                On: true,
                            }
                        }) : {}
                    });
                }
            }
        }
        const itemInfo = this.itemHelper.getItem(item[0]._tpl);
        this.caliber = itemInfo[1]._props.ammoCaliber; // save caliber
        return item;
    }
}
exports.ItemCreator = ItemCreator;
//# sourceMappingURL=itemCreator.js.map