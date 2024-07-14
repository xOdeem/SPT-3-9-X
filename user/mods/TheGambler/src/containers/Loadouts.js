"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Loadouts = void 0;
class Loadouts {
    parent = "loadout";
    rarities = [
        "_rare",
        "_uncommon",
        "_common"
    ];
    guaranteed_stackable = [false, false, false];
    guaranteed_reward_amount = [1, 1, 1];
    guaranteed_randomness = [false, false, true, false, false, false, true, true, true, true];
    guaranteed_rewards = [
        'weapon', 'helmet', 'headset', 'armor', 'rig', 'backpack', 'loadout_food', 'loadout_drink', 'loadout_light_bleed', 'loadout_light_bleed', 'loadout_heavy_bleed', 'loadout_heavy_bleed', 'loadout_healing', 'stim'
    ];
    rewards = undefined;
}
exports.Loadouts = Loadouts;
//# sourceMappingURL=Loadouts.js.map