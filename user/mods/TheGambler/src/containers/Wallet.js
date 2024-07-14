"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wallet = void 0;
class Wallet {
    parent = "wallet";
    rarities = [
        "_extremely_rare",
        "_rare",
        "_kinda_rare",
        "_uncommon",
        "_common",
        "_extra_common"
    ];
    stackable = [true, true, true, true, true, true];
    reward_amount = [
        1000000,
        500000,
        300000,
        100000,
        50000,
        25000
    ];
    rewards = [
        ['5449016a4bdc2d6f028b456f'],
        ['5449016a4bdc2d6f028b456f'],
        ['5449016a4bdc2d6f028b456f'],
        ['5449016a4bdc2d6f028b456f'],
        ['5449016a4bdc2d6f028b456f'],
        ['5449016a4bdc2d6f028b456f']
    ];
}
exports.Wallet = Wallet;
//# sourceMappingURL=Wallet.js.map