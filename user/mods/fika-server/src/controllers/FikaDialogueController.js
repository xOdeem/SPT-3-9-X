"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d, _e, _f, _g, _h, _j;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FikaDialogueController = void 0;
const tsyringe_1 = require("C:/snapshot/project/node_modules/tsyringe");
const ProfileHelper_1 = require("C:/snapshot/project/obj/helpers/ProfileHelper");
const BackendErrorCodes_1 = require("C:/snapshot/project/obj/models/enums/BackendErrorCodes");
const ConfigTypes_1 = require("C:/snapshot/project/obj/models/enums/ConfigTypes");
const ConfigServer_1 = require("C:/snapshot/project/obj/servers/ConfigServer");
const FikaFriendRequestsHelper_1 = require("../helpers/FikaFriendRequestsHelper");
const FikaPlayerRelationsHelper_1 = require("../helpers/FikaPlayerRelationsHelper");
const DialogueController_1 = require("C:/snapshot/project/obj/controllers/DialogueController");
const SaveServer_1 = require("C:/snapshot/project/obj/servers/SaveServer");
const MessageType_1 = require("C:/snapshot/project/obj/models/enums/MessageType");
const HashUtil_1 = require("C:/snapshot/project/obj/utils/HashUtil");
const TimeUtil_1 = require("C:/snapshot/project/obj/utils/TimeUtil");
const SptWebSocketConnectionHandler_1 = require("C:/snapshot/project/obj/servers/ws/SptWebSocketConnectionHandler");
let FikaDialogueController = class FikaDialogueController {
    dialogueChatBots;
    profileHelper;
    configServer;
    fikaFriendRequestsHelper;
    fikaPlayerRelationsHelper;
    dialogController;
    saveServer;
    hashUtil;
    timeUtil;
    webSocketHandler;
    constructor(dialogueChatBots, profileHelper, configServer, fikaFriendRequestsHelper, fikaPlayerRelationsHelper, dialogController, saveServer, hashUtil, timeUtil, webSocketHandler) {
        this.dialogueChatBots = dialogueChatBots;
        this.profileHelper = profileHelper;
        this.configServer = configServer;
        this.fikaFriendRequestsHelper = fikaFriendRequestsHelper;
        this.fikaPlayerRelationsHelper = fikaPlayerRelationsHelper;
        this.dialogController = dialogController;
        this.saveServer = saveServer;
        this.hashUtil = hashUtil;
        this.timeUtil = timeUtil;
        this.webSocketHandler = webSocketHandler;
        // empty
    }
    getFriendList(sessionID) {
        const core = this.configServer.getConfig(ConfigTypes_1.ConfigTypes.CORE);
        let botsAndFriends = this.dialogueChatBots.map((v) => v.getChatBot());
        if (!core.features.chatbotFeatures.commandoEnabled) {
            botsAndFriends = botsAndFriends.filter(u => u._id != "sptCommando");
        }
        if (!core.features.chatbotFeatures.sptFriendEnabled) {
            botsAndFriends = botsAndFriends.filter(u => u._id != "sptFriend");
        }
        const friendsIds = this.fikaPlayerRelationsHelper.getFriendsList(sessionID);
        for (const friendId of friendsIds) {
            const profile = this.profileHelper.getPmcProfile(friendId);
            botsAndFriends.push({
                _id: profile._id,
                aid: profile.aid,
                Info: {
                    Nickname: profile.Info.Nickname,
                    Level: profile.Info.Level,
                    Side: profile.Info.Side,
                    MemberCategory: profile.Info.MemberCategory,
                    SelectedMemberCategory: profile.Info.SelectedMemberCategory,
                },
            });
        }
        return {
            Friends: botsAndFriends,
            Ignore: this.fikaPlayerRelationsHelper.getIgnoreList(sessionID),
            InIgnoreList: this.fikaPlayerRelationsHelper.getInIgnoreList(sessionID),
        };
    }
    sendMessage(sessionID, request) {
        const receiverProfile = this.saveServer.getProfile(request.dialogId);
        if (!receiverProfile) {
            // if it's not to another player let Aki handle it
            return DialogueController_1.DialogueController.prototype.sendMessage.call(this.dialogController, sessionID, request);
        }
        const senderProfile = this.saveServer.getProfile(sessionID);
        if (!(request.dialogId in senderProfile.dialogues)) {
            senderProfile.dialogues[request.dialogId] = {
                attachmentsNew: 0,
                new: 0,
                pinned: false,
                type: MessageType_1.MessageType.USER_MESSAGE,
                messages: [],
                Users: [],
                _id: request.dialogId
            };
        }
        const senderDialog = senderProfile.dialogues[request.dialogId];
        senderDialog.Users = [
            {
                _id: receiverProfile.info.id,
                aid: receiverProfile.info.aid,
                Info: {
                    Nickname: receiverProfile.characters.pmc.Info.Nickname,
                    Side: receiverProfile.characters.pmc.Info.Side,
                    Level: receiverProfile.characters.pmc.Info.Level,
                    MemberCategory: receiverProfile.characters.pmc.Info.MemberCategory
                }
            },
            {
                _id: senderProfile.info.id,
                aid: senderProfile.info.aid,
                Info: {
                    Nickname: senderProfile.characters.pmc.Info.Nickname,
                    Side: senderProfile.characters.pmc.Info.Side,
                    Level: senderProfile.characters.pmc.Info.Level,
                    MemberCategory: senderProfile.characters.pmc.Info.MemberCategory
                }
            }
        ];
        if (!(sessionID in receiverProfile.dialogues)) {
            receiverProfile.dialogues[sessionID] = {
                attachmentsNew: 0,
                new: 0,
                pinned: false,
                type: MessageType_1.MessageType.USER_MESSAGE,
                messages: [],
                _id: sessionID,
                Users: []
            };
        }
        const receiverDialog = receiverProfile.dialogues[sessionID];
        receiverDialog.new++;
        receiverDialog.Users = [
            {
                _id: senderProfile.info.id,
                aid: senderProfile.info.aid,
                Info: {
                    Nickname: senderProfile.characters.pmc.Info.Nickname,
                    Side: senderProfile.characters.pmc.Info.Side,
                    Level: senderProfile.characters.pmc.Info.Level,
                    MemberCategory: senderProfile.characters.pmc.Info.MemberCategory
                }
            },
            {
                _id: receiverProfile.info.id,
                aid: receiverProfile.info.aid,
                Info: {
                    Nickname: receiverProfile.characters.pmc.Info.Nickname,
                    Side: receiverProfile.characters.pmc.Info.Side,
                    Level: receiverProfile.characters.pmc.Info.Level,
                    MemberCategory: receiverProfile.characters.pmc.Info.MemberCategory
                }
            }
        ];
        const message = {
            _id: this.hashUtil.generate(),
            uid: sessionID,
            type: request.type,
            Member: {
                Nickname: senderProfile.characters.pmc.Info.Nickname,
                Side: senderProfile.characters.pmc.Info.Side,
                Level: senderProfile.characters.pmc.Info.Level,
                MemberCategory: senderProfile.characters.pmc.Info.MemberCategory,
                Ignored: this.fikaPlayerRelationsHelper.getInIgnoreList(sessionID).includes(request.dialogId),
                Banned: false
            },
            dt: this.timeUtil.getTimestamp(),
            text: request.text,
            rewardCollected: false
        };
        senderDialog.messages.push(message);
        receiverDialog.messages.push(message);
        this.webSocketHandler.sendMessage(receiverProfile.info.id, {
            type: "new_message",
            eventId: "new_message",
            EventId: "new_message",
            dialogId: sessionID,
            message: message
        });
        return message._id;
    }
    listOutbox(sessionID) {
        const sentFriendRequests = this.fikaFriendRequestsHelper.getSentFriendRequests(sessionID);
        for (const sentFriendRequest of sentFriendRequests) {
            const profile = this.profileHelper.getPmcProfile(sentFriendRequest.to);
            sentFriendRequest.profile = {
                _id: profile._id,
                aid: profile.aid,
                Info: {
                    Nickname: profile.Info.Nickname,
                    Side: profile.Info.Side,
                    Level: profile.Info.Level,
                    MemberCategory: profile.Info.MemberCategory,
                },
            };
        }
        return sentFriendRequests;
    }
    listInbox(sessionID) {
        const receivedFriendRequests = this.fikaFriendRequestsHelper.getReceivedFriendRequests(sessionID);
        for (const receivedFriendRequest of receivedFriendRequests) {
            const profile = this.profileHelper.getPmcProfile(receivedFriendRequest.from);
            receivedFriendRequest.profile = {
                _id: profile._id,
                aid: profile.aid,
                Info: {
                    Nickname: profile.Info.Nickname,
                    Side: profile.Info.Side,
                    Level: profile.Info.Level,
                    MemberCategory: profile.Info.MemberCategory,
                },
            };
        }
        return receivedFriendRequests;
    }
    sendFriendRequest(from, to) {
        this.fikaFriendRequestsHelper.addFriendRequest(from, to);
        return {
            status: BackendErrorCodes_1.BackendErrorCodes.NONE,
            requestId: from,
            retryAfter: 0,
        };
    }
    acceptAllFriendRequests(sessionID) {
        const receivedFriendRequests = this.fikaFriendRequestsHelper.getReceivedFriendRequests(sessionID);
        for (const friendRequest of receivedFriendRequests) {
            this.acceptFriendRequest(friendRequest.from, friendRequest.to);
        }
    }
    acceptFriendRequest(from, to) {
        this.fikaFriendRequestsHelper.removeFriendRequest(from, to, "accept");
        this.fikaPlayerRelationsHelper.addFriend(from, to);
    }
    cancelFriendRequest(from, to) {
        this.fikaFriendRequestsHelper.removeFriendRequest(from, to, "cancel");
    }
    declineFriendRequest(from, to) {
        this.fikaFriendRequestsHelper.removeFriendRequest(from, to, "decline");
    }
    deleteFriend(fromId, friendId) {
        this.fikaPlayerRelationsHelper.removeFriend(fromId, friendId);
    }
    ignoreFriend(fromId, friendId) {
        this.fikaPlayerRelationsHelper.addToIgnoreList(fromId, friendId);
    }
    unIgnoreFriend(fromId, friendId) {
        this.fikaPlayerRelationsHelper.removeFromIgnoreList(fromId, friendId);
    }
};
exports.FikaDialogueController = FikaDialogueController;
exports.FikaDialogueController = FikaDialogueController = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.injectAll)("DialogueChatBot")),
    __param(1, (0, tsyringe_1.inject)("ProfileHelper")),
    __param(2, (0, tsyringe_1.inject)("ConfigServer")),
    __param(3, (0, tsyringe_1.inject)("FikaFriendRequestsHelper")),
    __param(4, (0, tsyringe_1.inject)("FikaPlayerRelationsHelper")),
    __param(5, (0, tsyringe_1.inject)("DialogueController")),
    __param(6, (0, tsyringe_1.inject)("SaveServer")),
    __param(7, (0, tsyringe_1.inject)("HashUtil")),
    __param(8, (0, tsyringe_1.inject)("TimeUtil")),
    __param(9, (0, tsyringe_1.inject)("SptWebSocketConnectionHandler")),
    __metadata("design:paramtypes", [Array, typeof (_a = typeof ProfileHelper_1.ProfileHelper !== "undefined" && ProfileHelper_1.ProfileHelper) === "function" ? _a : Object, typeof (_b = typeof ConfigServer_1.ConfigServer !== "undefined" && ConfigServer_1.ConfigServer) === "function" ? _b : Object, typeof (_c = typeof FikaFriendRequestsHelper_1.FikaFriendRequestsHelper !== "undefined" && FikaFriendRequestsHelper_1.FikaFriendRequestsHelper) === "function" ? _c : Object, typeof (_d = typeof FikaPlayerRelationsHelper_1.FikaPlayerRelationsHelper !== "undefined" && FikaPlayerRelationsHelper_1.FikaPlayerRelationsHelper) === "function" ? _d : Object, typeof (_e = typeof DialogueController_1.DialogueController !== "undefined" && DialogueController_1.DialogueController) === "function" ? _e : Object, typeof (_f = typeof SaveServer_1.SaveServer !== "undefined" && SaveServer_1.SaveServer) === "function" ? _f : Object, typeof (_g = typeof HashUtil_1.HashUtil !== "undefined" && HashUtil_1.HashUtil) === "function" ? _g : Object, typeof (_h = typeof TimeUtil_1.TimeUtil !== "undefined" && TimeUtil_1.TimeUtil) === "function" ? _h : Object, typeof (_j = typeof SptWebSocketConnectionHandler_1.SptWebSocketConnectionHandler !== "undefined" && SptWebSocketConnectionHandler_1.SptWebSocketConnectionHandler) === "function" ? _j : Object])
], FikaDialogueController);
//# sourceMappingURL=FikaDialogueController.js.map