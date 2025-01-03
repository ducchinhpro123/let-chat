"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocket = initializeSocket;
var socket_io_1 = require("socket.io");
var jsonwebtoken_1 = require("jsonwebtoken");
var user_1 = require("../models/user");
var conversation_1 = require("../models/conversation");
var message_1 = require("../models/message");
var friend_relationship_1 = require("../models/friend_relationship");
var mongoose_1 = require("mongoose");
function initializeSocket(server) {
    var _this = this;
    var userSockets = new Map();
    var io = new socket_io_1.Server(server, {
        connectionStateRecovery: {},
    });
    io.use(function (socket, next) { return __awaiter(_this, void 0, void 0, function () {
        var token, decoded, user, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    token = socket.handshake.auth.token;
                    if (!token) {
                        return [2 /*return*/, next(new Error('Authentication error'))];
                    }
                    decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                    return [4 /*yield*/, user_1.User.findById(decoded.user_id)];
                case 1:
                    user = _a.sent();
                    if (!user) {
                        return [2 /*return*/, next(new Error('User not found'))];
                    }
                    socket.user = user;
                    next();
                    return [3 /*break*/, 3];
                case 2:
                    e_1 = _a.sent();
                    console.error(e_1);
                    if (e_1.name === 'TokenExpiredError') {
                        socket.emit('session_expired', '/users/login');
                    }
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    io.on('connection', function (socket) { return __awaiter(_this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            console.log("".concat(socket.user.username, " is connected"));
            socket.on('user:connect', function (userId) {
                userSockets.set(userId, socket.id);
                console.log(userSockets);
            });
            socket.on('give me my conversations', function (_data, callback) { return __awaiter(_this, void 0, void 0, function () {
                var conversations, e_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, conversation_1.Conversation.find({
                                    'participants.user': socket.user._id
                                }).sort({ updatedAt: -1 })
                                    .populate('latestMessage')
                                    .populate({
                                    path: 'latestMessage',
                                    populate: {
                                        path: 'sender',
                                        select: 'username'
                                    }
                                })
                                    .lean()];
                        case 1:
                            conversations = _a.sent();
                            return [2 /*return*/, callback({ status: 'ok', conversations: conversations })];
                        case 2:
                            e_2 = _a.sent();
                            console.error(e_2);
                            return [2 /*return*/, callback({ status: 'error', error: 'Failed to fetch resources' })];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            socket.on('add my friend to this conversation', function (data, callback) { return __awaiter(_this, void 0, void 0, function () {
                var userId_1, conversationId, userObjectId, user, conversation, updatedConversation, e_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 4, , 5]);
                            userId_1 = data.userId, conversationId = data.conversationId;
                            userObjectId = new mongoose_1.default.Types.ObjectId(userId_1);
                            return [4 /*yield*/, user_1.User.findById(userObjectId).select('username')];
                        case 1:
                            user = _a.sent();
                            if (!user) {
                                return [2 /*return*/, callback({ status: 'error', error: 'User not found' })];
                            }
                            return [4 /*yield*/, conversation_1.Conversation
                                    .findById(conversationId)
                                    .populate('participants', 'username')];
                        case 2:
                            conversation = _a.sent();
                            if (!conversation) {
                                return [2 /*return*/, callback({ status: 'error', error: 'Conversation not found' })];
                            }
                            if (conversation.participants.some(function (p) { return p._id.toString() === userId_1; })) {
                                return [2 /*return*/, callback({
                                        status: 'error',
                                        error: "".concat(user.username, " is already in this conversation")
                                    })];
                            }
                            return [4 /*yield*/, conversation_1.Conversation.findByIdAndUpdate(conversation._id, {
                                    $addToSet: {
                                        participants: {
                                            user: userId_1,
                                            role: 'member',
                                            joinedAt: new Date()
                                        },
                                    },
                                }, {
                                    new: true,
                                    populate: {
                                        path: 'participants.user',
                                        select: 'username'
                                    }
                                })];
                        case 3:
                            updatedConversation = _a.sent();
                            socket.to(userSockets.get(userId_1)).emit('One of you friend has added you to a conversation', updatedConversation);
                            return [2 /*return*/, callback({ status: 'ok', message: "Added ".concat(user.username, " to ").concat(conversation.name, " successfully") })];
                        case 4:
                            e_3 = _a.sent();
                            console.error(e_3);
                            console.error(e_3.message);
                            return [2 /*return*/, callback({ status: 'error', error: e_3.message })];
                        case 5: return [2 /*return*/];
                    }
                });
            }); });
            socket.on('delete message', function (data, callback) { return __awaiter(_this, void 0, void 0, function () {
                var messageId, conversationId, e_4;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            messageId = data.messageId, conversationId = data.conversationId;
                            if (!messageId || !conversationId) {
                                return [2 /*return*/, callback({ status: 'error', error: 'Message or conversation invalid' })];
                            }
                            return [4 /*yield*/, message_1.Message.findByIdAndDelete(messageId)];
                        case 1:
                            _a.sent();
                            io.to(conversationId).emit('remove message', { messageId: messageId });
                            return [2 /*return*/, callback({ status: 'ok' })];
                        case 2:
                            e_4 = _a.sent();
                            console.error(e_4);
                            return [2 /*return*/, callback({ status: 'error', error: 'Internal Server Error' })];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            socket.on('here is conversation_id, give me my messages', function (conversation_id, callback) { return __awaiter(_this, void 0, void 0, function () {
                var conversation, messages, formattedMessages, e_5;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 4]);
                            if (!conversation_id) {
                                return [2 /*return*/, callback({ status: 'error', error: 'Conversation Id is invalid' })];
                            }
                            return [4 /*yield*/, conversation_1.Conversation.findOne({
                                    _id: conversation_id,
                                    'participants.user': socket.user._id // Ensure user is a participant
                                })];
                        case 1:
                            conversation = _a.sent();
                            // const membersCount = ;
                            if (!conversation) {
                                return [2 /*return*/, callback({ status: 'error', error: 'Conversation not found' })];
                            }
                            return [4 /*yield*/, message_1.Message.find({ conversation: conversation_id })
                                    .populate('sender', 'username')];
                        case 2:
                            messages = _a.sent();
                            formattedMessages = messages.map(function (message) { return ({
                                _id: message._id,
                                content: message.content,
                                sender: {
                                    _id: message.sender._id,
                                    username: message.sender.username
                                },
                                isCurrentUser: message.sender._id.toString() === socket.user._id.toString(),
                                createdAt: new Date(message.createdAt).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                }),
                            }); });
                            // Join to a conversation
                            socket.join(conversation_id);
                            return [2 /*return*/, callback({
                                    status: 'ok',
                                    data: {
                                        conversation: {
                                            _id: conversation._id,
                                            name: conversation.name,
                                            type: conversation.type,
                                            participants: conversation.participants,
                                            createdAt: conversation.createdAt,
                                        },
                                        messages: formattedMessages,
                                    }
                                })];
                        case 3:
                            e_5 = _a.sent();
                            console.log(e_5);
                            return [2 /*return*/, callback({ status: 'error', error: 'Failed to load your messages' })];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            socket.on('give me the list of my friends', function (data, callback) { return __awaiter(_this, void 0, void 0, function () {
                var friendsList, e_6;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, friend_relationship_1.FriendRelationship.find({
                                    $and: [
                                        { status: 'accepted' },
                                        // {
                                        //     $or: [
                                        //         {requester: socket.user._id}
                                        //     ]
                                        // }
                                    ],
                                }).populate([
                                    {
                                        path: 'requester',
                                        select: 'username',
                                    },
                                    {
                                        path: 'recipient',
                                        select: 'username',
                                    },
                                ]).sort({ updatedAt: -1 }).lean()];
                        case 1:
                            friendsList = _a.sent();
                            if (!friendsList) {
                                return [2 /*return*/, callback({ status: 'error', error: 'Socket user id is null', data: [] })];
                            }
                            return [2 /*return*/, callback({ status: 'ok', data: friendsList })];
                        case 2:
                            e_6 = _a.sent();
                            console.log(e_6);
                            return [2 /*return*/, callback({ status: 'error', error: 'Server Internal Error' })];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            socket.on('I refuse to be a friend', function (data, callback) { return __awaiter(_this, void 0, void 0, function () {
                var annoucementId, refusingUser, announcement, e_7;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            if (!data || !data._id)
                                return [2 /*return*/, callback({ status: 'error', error: 'Invalid data' })];
                            annoucementId = data._id;
                            refusingUser = socket.user._id;
                            return [4 /*yield*/, friend_relationship_1.FriendRelationship.findByIdAndUpdate({
                                    _id: annoucementId,
                                    recipient: acceptingUser,
                                    status: 'pending'
                                }, {
                                    $set: {
                                        status: 'rejected',
                                        updatedAt: new Date(),
                                    },
                                }, {
                                    populate: [
                                        {
                                            path: 'requester',
                                            select: 'username'
                                        },
                                        {
                                            path: 'recipient',
                                            select: 'username'
                                        }
                                    ]
                                })];
                        case 1:
                            announcement = _a.sent();
                            if (!announcement) {
                                return [2 /*return*/, callback({ status: 'error', error: 'Friend request not found or already processed' })];
                            }
                            return [2 /*return*/, callback({
                                    status: 'ok',
                                    message: "Rejected successfully",
                                    announcementId: announcement._id
                                })];
                        case 2:
                            e_7 = _a.sent();
                            console.log(e_7);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            socket.on('I accept to be a friend', function (data, callback) { return __awaiter(_this, void 0, void 0, function () {
                var annoucementId, acceptingUser, announcement, announcementsCount, e_8;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 4, , 5]);
                            if (!data || !data._id) {
                                return [2 /*return*/, callback({ status: 'error', error: 'Invalid data' })];
                            }
                            annoucementId = data._id;
                            acceptingUser = socket.user._id;
                            return [4 /*yield*/, friend_relationship_1.FriendRelationship.findByIdAndUpdate({
                                    _id: annoucementId,
                                    recipient: acceptingUser,
                                    status: 'pending'
                                }, {
                                    $set: {
                                        status: 'accepted',
                                        updatedAt: new Date(),
                                    },
                                }, {
                                    populate: [
                                        {
                                            path: 'requester',
                                            select: 'username'
                                        },
                                        {
                                            path: 'recipient',
                                            select: 'username'
                                        }
                                    ]
                                })];
                        case 1:
                            announcement = _a.sent();
                            if (!announcement) {
                                return [2 /*return*/, callback({ status: 'error', error: 'Friend request not found or already processed' })];
                            }
                            console.log(announcement);
                            return [4 /*yield*/, Promise.all([
                                    user_1.User.findByIdAndUpdate(announcement.requester._id, {
                                        $addToSet: { friends: announcement.recipient._id },
                                    }),
                                    user_1.User.findByIdAndUpdate(announcement.recipient._id, {
                                        $addToSet: { friends: announcement.requester._id },
                                    }),
                                ])];
                        case 2:
                            _a.sent();
                            io.to(userSockets.get(announcement.requester._id))
                                .emit('friend request accepted', "".concat(announcement.recipient.username, " has accepted your friend request"));
                            return [4 /*yield*/, friend_relationship_1.FriendRelationship.find({
                                    recipient: acceptingUser,
                                    status: 'pending'
                                }).countDocuments()];
                        case 3:
                            announcementsCount = _a.sent();
                            return [2 /*return*/, callback({
                                    status: 'ok',
                                    message: "You are now friend with ".concat(announcement.requester.username),
                                    announcementId: announcement._id,
                                    announcementCount: announcementsCount
                                })];
                        case 4:
                            e_8 = _a.sent();
                            console.error(e_8);
                            return [2 /*return*/, callback({ status: 'error', message: e_8.message })];
                        case 5: return [2 /*return*/];
                    }
                });
            }); });
            socket.on('delete this conversation', function (conversationId, callback) { return __awaiter(_this, void 0, void 0, function () {
                var conversation, e_9;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 4, , 5]);
                            if (!conversationId) {
                                return [2 /*return*/, callback({ status: 'error', message: 'Conversation Id is invalid' })];
                            }
                            return [4 /*yield*/, conversation_1.Conversation.findById(conversationId)];
                        case 1:
                            conversation = _a.sent();
                            if (!conversation) {
                                return [2 /*return*/, callback({ status: 'error', message: 'Conversation does not exist' })];
                            }
                            // Remove all messages assigned to this conversation.
                            return [4 /*yield*/, message_1.Message.deleteMany({ conversation: conversationId })];
                        case 2:
                            // Remove all messages assigned to this conversation.
                            _a.sent();
                            // Then remove conversation
                            return [4 /*yield*/, conversation_1.Conversation.deleteOne(conversation)];
                        case 3:
                            // Then remove conversation
                            _a.sent();
                            return [2 /*return*/, callback({ status: 'ok' })];
                        case 4:
                            e_9 = _a.sent();
                            console.error(e_9);
                            return [2 /*return*/, callback({ status: 'error', error: "Failed to delete conversation. Please try again." })];
                        case 5: return [2 /*return*/];
                    }
                });
            }); });
            socket.on('give me my announcements', function (data, callback) { return __awaiter(_this, void 0, void 0, function () {
                var announcements, e_10;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, friend_relationship_1.FriendRelationship.find({
                                    recipient: socket.user._id,
                                    status: 'pending',
                                }).populate('requester', 'username')
                                    .populate('recipient', 'username')
                                    .sort({ createdAt: -1 }).lean()];
                        case 1:
                            announcements = _a.sent();
                            return [2 /*return*/, callback({ status: 'ok', data: announcements })];
                        case 2:
                            e_10 = _a.sent();
                            console.error(e_10);
                            return [2 /*return*/, callback({ status: 'error', message: e_10.message })];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            socket.on('new conversation', function (data, callback) { return __awaiter(_this, void 0, void 0, function () {
                var conversationName, isPrivate, existingConversation, newConversation, e_11;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            conversationName = data.conversationName, isPrivate = data.isPrivate;
                            if (!conversationName) {
                                callback({ status: 'error', error: 'Conversation name is invalid' });
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, conversation_1.Conversation.findOne({ name: conversationName })];
                        case 2:
                            existingConversation = _a.sent();
                            if (existingConversation) {
                                return [2 /*return*/, callback({ status: 'error', error: 'Conversation name is alreay exists' })];
                            }
                            newConversation = new conversation_1.Conversation({
                                name: conversationName,
                                type: Boolean(isPrivate) ? 'private' : 'public',
                                participants: [{
                                        user: socket.user._id,
                                        role: 'admin',
                                        joinedAt: new Date()
                                    }],
                                createdAt: new Date()
                            });
                            return [4 /*yield*/, newConversation.save()];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, callback({ status: 'ok', message: 'success', newConversation: newConversation })];
                        case 4:
                            e_11 = _a.sent();
                            console.error(e_11);
                            callback({ status: 'error', error: 'Internal Server' });
                            return [3 /*break*/, 5];
                        case 5:
                            if (typeof callback === 'function') {
                                return [2 /*return*/, callback({ status: 'ok' })];
                            }
                            return [2 /*return*/];
                    }
                });
            }); });
            socket.on('help me find this user with username', function (usernameSearch, callback) { return __awaiter(_this, void 0, void 0, function () {
                var users, friendships, e_12;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 4]);
                            if (!usernameSearch) {
                                return [2 /*return*/, callback({ status: 'error', error: 'Query is invalid' })];
                            }
                            return [4 /*yield*/, user_1.User.find({
                                    username: new RegExp(usernameSearch, 'i'),
                                    _id: { $ne: socket.user._id }
                                }).select('username status')
                                    .limit(10)
                                    .lean()];
                        case 1:
                            users = _a.sent();
                            return [4 /*yield*/, friend_relationship_1.FriendRelationship.find({
                                    $or: [
                                        { requester: socket.user._id },
                                        { recipient: socket.user._id },
                                    ]
                                })];
                        case 2:
                            friendships = _a.sent();
                            return [2 /*return*/, callback({ status: 'ok', friends: users, friendships: friendships })];
                        case 3:
                            e_12 = _a.sent();
                            console.log(e_12);
                            return [2 /*return*/, callback({ status: 'error', error: 'Something went wrong' })];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            socket.on('my response to invitation', function (data, callback) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/];
                });
            }); });
            socket.on('send my invitation to this user has id', function (userId, callback) { return __awaiter(_this, void 0, void 0, function () {
                var user, friendShip, existingFriendShip, e_13;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 6, , 7]);
                            return [4 /*yield*/, user_1.User.findById(userId)];
                        case 1:
                            user = _a.sent();
                            if (!user) {
                                return [2 /*return*/, callback({ status: 'error', error: 'User not found' })];
                            }
                            friendShip = new friend_relationship_1.FriendRelationship({
                                requester: socket.user._id,
                                recipient: user._id,
                                status: 'pending',
                                createdAt: new Date()
                            });
                            return [4 /*yield*/, friend_relationship_1.FriendRelationship.findOne({
                                    requester: socket.user._id,
                                    recipient: user._id,
                                    status: 'pending'
                                })];
                        case 2:
                            existingFriendShip = _a.sent();
                            if (!!existingFriendShip) return [3 /*break*/, 4];
                            return [4 /*yield*/, friendShip.save()];
                        case 3:
                            _a.sent();
                            return [3 /*break*/, 5];
                        case 4: return [2 /*return*/, callback({ status: 'error', error: 'You have already sent an invite' })];
                        case 5:
                            io.to(userSockets.get(userId)).emit('someone sends you an invite', {
                                from: socket.user._id,
                                invitation: friendShip,
                                timestamp: new Date()
                            });
                            return [2 /*return*/, callback({
                                    status: 'ok',
                                    message: 'Your request has been sent',
                                })];
                        case 6:
                            e_13 = _a.sent();
                            console.error(e_13);
                            return [2 /*return*/, callback({
                                    status: 'error',
                                    error: 'Something went wrong'
                                })];
                        case 7: return [2 /*return*/];
                    }
                });
            }); });
            socket.on('stop typing', function (data, callback) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    try {
                        socket.to(data.conversationId).emit('user stop typing');
                    }
                    catch (e) {
                        console.error(e);
                        return [2 /*return*/, callback({ status: 'error', error: e.message })];
                    }
                    return [2 /*return*/];
                });
            }); });
            socket.on('typing', function (data, callback) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    try {
                        socket.to(data.conversationId).emit('user typing', { username: data.username });
                    }
                    catch (e) {
                        console.error(e);
                        return [2 /*return*/, callback({ status: 'error', error: e.message })];
                    }
                    return [2 /*return*/];
                });
            }); });
            socket.on('give me my conversation between my friend and I', function (data, callback) { return __awaiter(_this, void 0, void 0, function () {
                var friendId, yourFriend, conversation, newConversation, populatedConversation, messages, formattedMessages, e_14;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 7, , 8]);
                            friendId = data.friendId;
                            if (!friendId) {
                                return [2 /*return*/, callback({ status: 'error', error: 'Friend Id is invalid' })];
                            }
                            return [4 /*yield*/, user_1.User.findById(friendId)];
                        case 1:
                            yourFriend = _a.sent();
                            if (!yourFriend) {
                                return [2 /*return*/, callback({ status: 'error', error: 'Friend not found' })];
                            }
                            return [4 /*yield*/, conversation_1.Conversation.findOne({
                                    type: 'private',
                                    participants: {
                                        $all: [
                                            { $elemMatch: { user: socket.user._id } },
                                            { $elemMatch: { user: friendId } },
                                        ],
                                        $size: 2
                                    }
                                }).populate('participants.user', 'username')
                                    .populate({ path: 'latestMessage', select: 'content createdAt sender' })];
                        case 2:
                            conversation = _a.sent();
                            if (!!conversation) return [3 /*break*/, 5];
                            return [4 /*yield*/, conversation_1.Conversation.create({
                                    type: 'private',
                                    name: "".concat(yourFriend.username, ", ").concat(socket.user.username),
                                    participants: [
                                        { user: socket.user._id },
                                        { user: friendId }
                                    ],
                                })];
                        case 3:
                            newConversation = _a.sent();
                            return [4 /*yield*/, conversation_1.Conversation.findById(newConversation._id)
                                    .populate('participants.user', 'username')
                                    .populate('latestMessage')];
                        case 4:
                            populatedConversation = _a.sent();
                            return [2 /*return*/, callback({
                                    status: 'ok',
                                    conversation: populatedConversation,
                                    messages: [],
                                })];
                        case 5: return [4 /*yield*/, message_1.Message.find({
                                conversation: conversation._id,
                            }).populate('sender', 'username').sort({ createdAt: 1 }).limit(50)];
                        case 6:
                            messages = _a.sent();
                            formattedMessages = messages.map(function (message) { return ({
                                _id: message._id,
                                content: message.content,
                                sender: {
                                    _id: message.sender._id,
                                    username: message.sender.username
                                },
                                isCurrentUser: message.sender._id.toString() === socket.user._id.toString(),
                                createdAt: new Date(message.createdAt).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                }),
                            }); });
                            return [2 /*return*/, callback({
                                    status: 'ok',
                                    conversation: conversation,
                                    messages: formattedMessages,
                                    hasMore: messages.length === 50
                                })];
                        case 7:
                            e_14 = _a.sent();
                            console.error(e_14);
                            return [2 /*return*/, callback({ status: 'error', error: e_14.message })];
                        case 8: return [2 /*return*/];
                    }
                });
            }); });
            socket.on('I just sent a new message', function (data, callback) { return __awaiter(_this, void 0, void 0, function () {
                var msg, conversation_id, conversation, formattedMsg, message, formattedMessage, e_15;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 5, , 6]);
                            msg = data.msg, conversation_id = data.conversation_id;
                            console.log(msg);
                            if (!msg || !conversation_id) {
                                return [2 /*return*/, callback({
                                        status: 'error',
                                        error: 'Message and conversation id are required'
                                    })];
                            }
                            return [4 /*yield*/, conversation_1.Conversation.findOne({
                                    _id: conversation_id,
                                    'participants.user': socket.user._id
                                })];
                        case 1:
                            conversation = _a.sent();
                            if (!conversation)
                                return [2 /*return*/, callback({
                                        status: 'error',
                                        error: 'Conversation does not exist or you are not part of this conversation'
                                    })];
                            formattedMsg = msg.replace(/\n/g, '<br>');
                            message = new message_1.Message({
                                conversation: conversation_id,
                                content: formattedMsg,
                                sender: socket.user._id,
                                createdAt: new Date()
                            });
                            return [4 /*yield*/, message.save()];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, conversation_1.Conversation.findByIdAndUpdate(conversation_id, {
                                    latestMessage: message._id,
                                    updatedAt: new Date()
                                })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, message.populate('sender', 'username')];
                        case 4:
                            _a.sent();
                            formattedMessage = {
                                _id: message._id,
                                content: message.content,
                                createdAt: new Date(message.createdAt).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                }),
                                sender: {
                                    username: message.sender.username
                                },
                            };
                            // conversation.participants.forEach(participant => {
                            //   if (participant.user._id.toString() !== socket.user._id.toString()) {
                            //     socket.to(userSockets.get(participant.user._id.toString())).emit('new message', message);
                            //     // socket.to(participant.user.toString()).emit('new message', message);
                            //   }
                            // });
                            socket.to(conversation_id).emit('new message', { conversation: conversation, message: formattedMessage });
                            return [2 /*return*/, callback({
                                    status: 'ok',
                                    message: formattedMessage,
                                    conversation: conversation
                                })];
                        case 5:
                            e_15 = _a.sent();
                            console.error(e_15);
                            return [2 /*return*/, callback({ status: 'error', error: 'There something went wrong' })];
                        case 6: return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    }); });
}
