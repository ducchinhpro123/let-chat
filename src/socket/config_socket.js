var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { User, Conversation, Message, FriendRelationship, } from "../models";
import mongoose from "mongoose";
export function initializeSocket(server) {
    const userSockets = new Map();
    const io = new Server(server, {
        connectionStateRecovery: {},
    });
    io.use((socket, next) => __awaiter(this, void 0, void 0, function* () {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.token;
            if (!token) {
                return next(new Error("Authentication error"));
            }
            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                throw new Error("JWT_SECRET is not found");
            }
            const decoded = jwt.verify(token, jwtSecret);
            const user = yield User.findById(decoded.user_id);
            if (!user) {
                return next(new Error("User not found"));
            }
            socket.user = user;
            next();
        }
        catch (error) {
            return next(new Error("Authentication error"));
        }
    }));
    io.on("connection", (socket) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log(`${(_a = socket.user) === null || _a === void 0 ? void 0 : _a.username} is connected`);
        socket.on("user:connect", (userId) => {
            userSockets.set(userId, socket.id);
            console.log(userSockets);
        });
        socket.on("give me my conversations", (_data, callback) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const conversations = yield Conversation.find({
                    "participants.user": (_a = socket.user) === null || _a === void 0 ? void 0 : _a._id,
                })
                    .sort({ updatedAt: -1 })
                    .populate("latestMessage")
                    .populate({
                    path: "latestMessage",
                    populate: {
                        path: "sender",
                        select: "username",
                    },
                })
                    .lean();
                return callback({ status: "ok", conversations: conversations });
            }
            catch (e) {
                console.error(e);
                return callback({
                    status: "error",
                    error: "Failed to fetch resources",
                });
            }
        }));
        socket.on("add my friend to this conversation", (data, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId, conversationId } = data;
                const userObjectId = new mongoose.Types.ObjectId(userId);
                const user = yield User.findById(userObjectId).select("username");
                if (!user) {
                    return callback({ status: "error", error: "User not found" });
                }
                const conversation = yield Conversation.findById(conversationId).populate("participants", "username");
                if (!conversation) {
                    return callback({ status: "error", error: "Conversation not found" });
                }
                if (conversation.participants.some((p) => p._id.toString() === userId)) {
                    return callback({
                        status: "error",
                        error: `${user.username} is already in this conversation`,
                    });
                }
                const updatedConversation = yield Conversation.findByIdAndUpdate(conversation._id, {
                    $addToSet: {
                        participants: {
                            user: userId,
                            role: "member",
                            joinedAt: new Date(),
                        },
                    },
                }, {
                    new: true,
                    populate: {
                        path: "participants.user",
                        select: "username",
                    },
                });
                socket
                    .to(userSockets.get(userId))
                    .emit("One of you friend has added you to a conversation", updatedConversation);
                return callback({
                    status: "ok",
                    message: `Added ${user.username} to ${conversation.name} successfully`,
                });
            }
            catch (e) {
                console.error(e);
                return callback({ status: "error", error: e.message });
            }
        }));
        socket.on("delete message", (data, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { messageId, conversationId } = data;
                if (!messageId || !conversationId) {
                    return callback({
                        status: "error",
                        error: "Message or conversation invalid",
                    });
                }
                yield Message.findByIdAndDelete(messageId);
                io.to(conversationId).emit("remove message", { messageId: messageId });
                return callback({ status: "ok" });
            }
            catch (e) {
                console.error(e);
                return callback({ status: "error", error: "Internal Server Error" });
            }
        }));
        socket.on("here is conversation_id, give me my messages", (conversation_id, callback) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                if (!conversation_id) {
                    return callback({
                        status: "error",
                        error: "Conversation Id is invalid",
                    });
                }
                const conversation = yield Conversation.findOne({
                    _id: conversation_id,
                    "participants.user": (_a = socket.user) === null || _a === void 0 ? void 0 : _a._id, // Ensure user is a participant
                });
                // const membersCount = ;
                if (!conversation) {
                    return callback({
                        status: "error",
                        error: "Conversation not found",
                    });
                }
                const messages = yield Message.find({
                    conversation: conversation_id,
                }).populate("sender", "username");
                // Formatted message for client uses
                const formattedMessages = messages.map((message) => {
                    var _a;
                    return ({
                        _id: message._id,
                        content: message.content,
                        sender: {
                            _id: message.sender._id,
                            username: message.sender.username,
                        },
                        isCurrentUser: message.sender._id.toString() === ((_a = socket.user) === null || _a === void 0 ? void 0 : _a._id.toString()),
                        createdAt: new Date(message.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                        }),
                    });
                });
                // Join to a conversation
                socket.join(conversation_id);
                return callback({
                    status: "ok",
                    data: {
                        conversation: {
                            _id: conversation._id,
                            name: conversation.name,
                            type: conversation.type,
                            participants: conversation.participants,
                            createdAt: conversation.createdAt,
                        },
                        messages: formattedMessages,
                    },
                });
            }
            catch (e) {
                console.log(e);
                return callback({
                    status: "error",
                    error: "Failed to load your messages",
                });
            }
        }));
        socket.on("give me the list of my friends", (data, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const friendsList = yield FriendRelationship.find({
                    $and: [
                        { status: "accepted" },
                        // {
                        //     $or: [
                        //         {requester: socket.user._id}
                        //     ]
                        // }
                    ],
                })
                    .populate([
                    {
                        path: "requester",
                        select: "username",
                    },
                    {
                        path: "recipient",
                        select: "username",
                    },
                ])
                    .sort({ updatedAt: -1 })
                    .lean();
                if (!friendsList) {
                    return callback({
                        status: "error",
                        error: "Socket user id is null",
                        data: [],
                    });
                }
                return callback({ status: "ok", data: friendsList });
            }
            catch (e) {
                console.log(e);
                return callback({ status: "error", error: "Server Internal Error" });
            }
        }));
        socket.on("I refuse to be a friend", (data, callback) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                if (!data || !data._id)
                    return callback({ status: "error", error: "Invalid data" });
                const annoucementId = data._id;
                const refusingUser = (_a = socket.user) === null || _a === void 0 ? void 0 : _a._id;
                const announcement = yield FriendRelationship.findByIdAndUpdate({
                    _id: annoucementId,
                    recipient: refusingUser,
                    status: "pending",
                }, {
                    $set: {
                        status: "rejected",
                        updatedAt: new Date(),
                    },
                }, {
                    populate: [
                        {
                            path: "requester",
                            select: "username",
                        },
                        {
                            path: "recipient",
                            select: "username",
                        },
                    ],
                });
                if (!announcement) {
                    return callback({
                        status: "error",
                        error: "Friend request not found or already processed",
                    });
                }
                return callback({
                    status: "ok",
                    message: `Rejected successfully`,
                    announcementId: announcement._id,
                });
            }
            catch (e) {
                console.log(e);
            }
        }));
        socket.on("I accept to be a friend", (data, callback) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                if (!data || !data._id) {
                    return callback({ status: "error", error: "Invalid data" });
                }
                const annoucementId = data._id;
                const acceptingUser = (_a = socket.user) === null || _a === void 0 ? void 0 : _a._id; // Current User
                const announcement = yield FriendRelationship.findByIdAndUpdate({
                    _id: annoucementId,
                    recipient: acceptingUser,
                    status: "pending",
                }, {
                    $set: {
                        status: "accepted",
                        updatedAt: new Date(),
                    },
                }, {
                    populate: [
                        {
                            path: "requester",
                            select: "username",
                        },
                        {
                            path: "recipient",
                            select: "username",
                        },
                    ],
                }).exec();
                if (!announcement) {
                    return callback({
                        status: "error",
                        error: "Friend request not found or already processed",
                    });
                }
                const populatedAnnouncement = announcement;
                console.log(announcement);
                yield Promise.all([
                    User.findByIdAndUpdate(announcement.requester._id, {
                        $addToSet: { friends: announcement.recipient._id },
                    }),
                    User.findByIdAndUpdate(announcement.recipient._id, {
                        $addToSet: { friends: announcement.requester._id },
                    }),
                ]);
                io.to(userSockets.get(announcement.requester._id)).emit("friend request accepted", `${populatedAnnouncement.recipient.username} has accepted your friend request`);
                const announcementsCount = yield FriendRelationship.find({
                    recipient: acceptingUser,
                    status: "pending",
                }).countDocuments();
                return callback({
                    status: "ok",
                    message: `You are now friend with ${populatedAnnouncement.requester.username}`,
                    announcementId: announcement._id,
                    announcementCount: announcementsCount,
                });
            }
            catch (e) {
                console.error(e);
                return callback({ status: "error", message: e.message });
            }
        }));
        socket.on("delete this conversation", (conversationId, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!conversationId) {
                    return callback({
                        status: "error",
                        message: "Conversation Id is invalid",
                    });
                }
                yield Conversation.findByIdAndDelete(conversationId);
                // Remove all messages assigned to this conversation.
                yield Message.deleteMany({ conversation: conversationId });
                return callback({ status: "ok" });
            }
            catch (e) {
                console.error(e);
                return callback({
                    status: "error",
                    error: "Failed to delete conversation. Please try again.",
                });
            }
        }));
        socket.on("give me my announcements", (data, callback) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const announcements = yield FriendRelationship.find({
                    recipient: (_a = socket.user) === null || _a === void 0 ? void 0 : _a._id,
                    status: "pending",
                })
                    .populate("requester", "username")
                    .populate("recipient", "username")
                    .sort({ createdAt: -1 })
                    .lean();
                return callback({ status: "ok", data: announcements });
            }
            catch (e) {
                console.error(e);
                return callback({ status: "error", message: e.message });
            }
        }));
        socket.on("new conversation", (data, callback) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { conversationName, isPrivate } = data;
            if (!conversationName) {
                callback({ status: "error", error: "Conversation name is invalid" });
            }
            try {
                const existingConversation = yield Conversation.findOne({
                    name: conversationName,
                });
                if (existingConversation) {
                    return callback({
                        status: "error",
                        error: "Conversation name is alreay exists",
                    });
                }
                const newConversation = new Conversation({
                    name: conversationName,
                    type: Boolean(isPrivate) ? "private" : "public",
                    participants: [
                        {
                            user: (_a = socket.user) === null || _a === void 0 ? void 0 : _a._id,
                            role: "admin",
                            joinedAt: new Date(),
                        },
                    ],
                    createdAt: new Date(),
                });
                yield newConversation.save();
                return callback({ status: "ok", message: "success", newConversation });
            }
            catch (e) {
                console.error(e);
                callback({ status: "error", error: "Internal Server" });
            }
            if (typeof callback === "function") {
                return callback({ status: "ok" });
            }
        }));
        socket.on("help me find this user with username", (usernameSearch, callback) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                if (!usernameSearch) {
                    return callback({ status: "error", error: "Query is invalid" });
                }
                const users = yield User.find({
                    username: new RegExp(usernameSearch, "i"),
                    _id: { $ne: (_a = socket.user) === null || _a === void 0 ? void 0 : _a._id },
                })
                    .select("username status")
                    .limit(10)
                    .lean();
                const friendships = yield FriendRelationship.find({
                    $or: [
                        { requester: (_b = socket.user) === null || _b === void 0 ? void 0 : _b._id },
                        { recipient: (_c = socket.user) === null || _c === void 0 ? void 0 : _c._id },
                    ],
                });
                return callback({
                    status: "ok",
                    friends: users,
                    friendships: friendships,
                });
            }
            catch (e) {
                console.log(e);
                return callback({ status: "error", error: "Something went wrong" });
            }
        }));
        socket.on("my response to invitation", (data, callback) => __awaiter(this, void 0, void 0, function* () { }));
        socket.on("send my invitation to this user has id", (userId, callback) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const user = yield User.findById(userId);
                if (!user) {
                    return callback({ status: "error", error: "User not found" });
                }
                const friendShip = new FriendRelationship({
                    requester: (_a = socket.user) === null || _a === void 0 ? void 0 : _a._id,
                    recipient: user._id,
                    status: "pending",
                    createdAt: new Date(),
                });
                const existingFriendShip = yield FriendRelationship.findOne({
                    requester: (_b = socket.user) === null || _b === void 0 ? void 0 : _b._id,
                    recipient: user._id,
                    status: "pending",
                });
                if (!existingFriendShip) {
                    yield friendShip.save();
                }
                else {
                    return callback({
                        status: "error",
                        error: "You have already sent an invite",
                    });
                }
                io.to(userSockets.get(userId)).emit("someone sends you an invite", {
                    from: (_c = socket.user) === null || _c === void 0 ? void 0 : _c._id,
                    invitation: friendShip,
                    timestamp: new Date(),
                });
                return callback({
                    status: "ok",
                    message: "Your request has been sent",
                });
            }
            catch (e) {
                console.error(e);
                return callback({
                    status: "error",
                    error: "Something went wrong",
                });
            }
        }));
        socket.on("stop typing", (data, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                socket.to(data.conversationId).emit("user stop typing");
            }
            catch (e) {
                console.error(e);
                return callback({ status: "error", error: e.message });
            }
        }));
        socket.on("typing", (data, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                socket
                    .to(data.conversationId)
                    .emit("user typing", { username: data.username });
            }
            catch (e) {
                console.error(e);
                return callback({ status: "error", error: e.message });
            }
        }));
        socket.on("give me my conversation between my friend and I", (data, callback) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const { friendId } = data;
                if (!friendId) {
                    return callback({ status: "error", error: "Friend Id is invalid" });
                }
                const yourFriend = yield User.findById(friendId);
                if (!yourFriend) {
                    return callback({ status: "error", error: "Friend not found" });
                }
                const conversation = yield Conversation.findOne({
                    type: "private",
                    participants: {
                        $all: [
                            { $elemMatch: { user: (_a = socket.user) === null || _a === void 0 ? void 0 : _a._id } },
                            { $elemMatch: { user: friendId } },
                        ],
                        $size: 2,
                    },
                })
                    .populate("participants.user", "username")
                    .populate({
                    path: "latestMessage",
                    select: "content createdAt sender",
                });
                if (!conversation) {
                    const newConversation = yield Conversation.create({
                        type: "private",
                        name: `${yourFriend.username}, ${(_b = socket.user) === null || _b === void 0 ? void 0 : _b.username}`,
                        participants: [{ user: (_c = socket.user) === null || _c === void 0 ? void 0 : _c._id }, { user: friendId }],
                    });
                    const populatedConversation = yield Conversation.findById(newConversation._id)
                        .populate("participants.user", "username")
                        .populate("latestMessage");
                    return callback({
                        status: "ok",
                        conversation: populatedConversation,
                        messages: [],
                    });
                }
                const messages = yield Message.find({
                    conversation: conversation._id,
                })
                    .populate("sender", "username")
                    .sort({ createdAt: 1 })
                    .limit(50)
                    .exec();
                const formattedMessages = messages.map((message) => {
                    var _a;
                    return ({
                        _id: message._id,
                        content: message.content,
                        sender: {
                            _id: message.sender._id,
                            username: message.sender.username,
                        },
                        isCurrentUser: message.sender._id.toString() === ((_a = socket.user) === null || _a === void 0 ? void 0 : _a._id.toString()),
                        createdAt: new Date(message.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                        }),
                    });
                });
                return callback({
                    status: "ok",
                    conversation: conversation,
                    messages: formattedMessages,
                    hasMore: messages.length === 50,
                });
            }
            catch (e) {
                console.error(e);
                return callback({ status: "error", error: e.message });
            }
        }));
        socket.on("I just sent a new message", (data, callback) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { msg, conversation_id } = data;
                console.log(msg);
                if (!msg || !conversation_id) {
                    return callback({
                        status: "error",
                        error: "Message and conversation id are required",
                    });
                }
                const conversation = yield Conversation.findOne({
                    _id: conversation_id,
                    "participants.user": (_a = socket.user) === null || _a === void 0 ? void 0 : _a._id,
                });
                if (!conversation)
                    return callback({
                        status: "error",
                        error: "Conversation does not exist or you are not part of this conversation",
                    });
                const formattedMsg = msg.replace(/\n/g, "<br>");
                const message = new Message({
                    conversation: conversation_id,
                    content: formattedMsg,
                    sender: (_b = socket.user) === null || _b === void 0 ? void 0 : _b._id,
                    createdAt: new Date(),
                });
                yield message.save();
                yield Conversation.findByIdAndUpdate(conversation_id, {
                    latestMessage: message._id,
                    updatedAt: new Date(),
                });
                const populatedMessage = yield message.populate("sender", "username");
                const formattedMessage = {
                    _id: message._id,
                    content: message.content,
                    createdAt: new Date(message.createdAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    sender: {
                        username: populatedMessage.sender.username,
                    },
                };
                // conversation.participants.forEach(participant => {
                //   if (participant.user._id.toString() !== socket.user._id.toString()) {
                //     socket.to(userSockets.get(participant.user._id.toString())).emit('new message', message);
                //     // socket.to(participant.user.toString()).emit('new message', message);
                //   }
                // });
                socket
                    .to(conversation_id)
                    .emit("new message", {
                    conversation: conversation,
                    message: formattedMessage,
                });
                return callback({
                    status: "ok",
                    message: formattedMessage,
                    conversation: conversation,
                });
            }
            catch (e) {
                console.error(e);
                return callback({
                    status: "error",
                    error: "There something went wrong",
                });
            }
        }));
    }));
}
//# sourceMappingURL=config_socket.js.map