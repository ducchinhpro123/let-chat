import { Server, Socket } from "socket.io";
import { Server as ServerHttp } from "http";

import jwt, { JwtPayload } from "jsonwebtoken";

import {
  IFriendRelationshipPopulated,
  IUser,
  User,
  Conversation,
  Message,
  FriendRelationship,
} from "../models";

import mongoose from "mongoose";

import { Types } from "mongoose";

interface CustomSocket extends Socket {
  user?: IUser;
}

interface JwtPayloadUser extends JwtPayload {
  user_id: string;
  username: string;
}

export interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;
  "remove message": (messageId: any) => void;
  "friend request accepted": (message: string) => void;
  "someone sends you an invite": (data: any) => void;
}

export interface ClientToServerEvents {
  hello: () => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  name: string;
  age: number;
}

export function initializeSocket(server: ServerHttp) {
  const userSockets = new Map();

  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    CustomSocket
  >(server, {
    connectionStateRecovery: {},
  });

  io.use(async (socket: CustomSocket, next) => {
    try {
      const token =
        socket.handshake.auth.token || socket.handshake.headers.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error("JWT_SECRET is not found");
      }

      const decoded = jwt.verify(token, jwtSecret) as JwtPayloadUser;
      const user = await User.findById(decoded.user_id);

      if (!user) {
        return next(new Error("User not found"));
      }
      socket.user = user;
      next();
    } catch (error) {
      return next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket: CustomSocket) => {
    console.log(`${socket.user?.username} is connected`);

    socket.on("user:connect", (userId) => {
      userSockets.set(userId, socket.id);
      console.log(userSockets);
    });

    socket.on("give me my conversations", async (_data, callback) => {
      try {
        const conversations = await Conversation.find({
          "participants.user": socket.user?._id,
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
      } catch (e) {
        console.error(e);
        return callback({
          status: "error",
          error: "Failed to fetch resources",
        });
      }
    });

    socket.on("add my friend to this conversation", async (data, callback) => {
      try {
        const { userId, conversationId } = data;
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const user = await User.findById(userObjectId).select("username");
        if (!user) {
          return callback({ status: "error", error: "User not found" });
        }

        const conversation = await Conversation.findById(
          conversationId,
        ).populate("participants", "username");

        if (!conversation) {
          return callback({ status: "error", error: "Conversation not found" });
        }

        if (
          conversation.participants.some((p) => p._id.toString() === userId)
        ) {
          return callback({
            status: "error",
            error: `${user.username} is already in this conversation`,
          });
        }

        const updatedConversation = await Conversation.findByIdAndUpdate(
          conversation._id,
          {
            $addToSet: {
              participants: {
                user: userId,
                role: "member",
                joinedAt: new Date(),
              },
            },
          },
          {
            new: true,
            populate: {
              path: "participants.user",
              select: "username",
            },
          },
        );

        socket
          .to(userSockets.get(userId))
          .emit(
            "One of you friend has added you to a conversation",
            updatedConversation,
          );
        return callback({
          status: "ok",
          message: `Added ${user.username} to ${conversation.name} successfully`,
        });
      } catch (e) {
        console.error(e);
        return callback({ status: "error", error: (e as Error).message });
      }
    });

    socket.on("delete message", async (data, callback) => {
      try {
        const { messageId, conversationId } = data;

        if (!messageId || !conversationId) {
          return callback({
            status: "error",
            error: "Message or conversation invalid",
          });
        }

        await Message.findByIdAndDelete(messageId);
        io.to(conversationId).emit("remove message", { messageId: messageId });

        return callback({ status: "ok" });
      } catch (e) {
        console.error(e);
        return callback({ status: "error", error: "Internal Server Error" });
      }
    });

    socket.on(
      "here is conversation_id, give me my messages",
      async (conversation_id, callback) => {
        try {
          if (!conversation_id) {
            return callback({
              status: "error",
              error: "Conversation Id is invalid",
            });
          }

          const conversation = await Conversation.findOne({
            _id: conversation_id,
            "participants.user": socket.user?._id, // Ensure user is a participant
          });

          // const membersCount = ;

          if (!conversation) {
            return callback({
              status: "error",
              error: "Conversation not found",
            });
          }

          const messages = await Message.find({
            conversation: conversation_id,
          }).populate<{ sender: IUser }>("sender", "username");

          // Formatted message for client uses
          const formattedMessages = messages.map((message) => ({
            _id: message._id,
            content: message.content,
            sender: {
              _id: message.sender._id,
              username: message.sender.username,
            },
            isCurrentUser:
              message.sender._id.toString() === socket.user?._id.toString(),
            createdAt: new Date(message.createdAt).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }));

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
        } catch (e) {
          console.log(e);
          return callback({
            status: "error",
            error: "Failed to load your messages",
          });
        }
      },
    );

    socket.on("give me the list of my friends", async (data, callback) => {
      try {
        const friendsList = await FriendRelationship.find({
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
      } catch (e) {
        console.log(e);
        return callback({ status: "error", error: "Server Internal Error" });
      }
    });

    socket.on("I refuse to be a friend", async (data, callback) => {
      try {
        if (!data || !data._id)
          return callback({ status: "error", error: "Invalid data" });

        const annoucementId = data._id;
        const refusingUser = socket.user?._id;

        const announcement = await FriendRelationship.findByIdAndUpdate(
          {
            _id: annoucementId,
            recipient: refusingUser,
            status: "pending",
          },
          {
            $set: {
              status: "rejected",
              updatedAt: new Date(),
            },
          },
          {
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
          },
        );

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
      } catch (e) {
        console.log(e);
      }
    });

    socket.on("I accept to be a friend", async (data, callback) => {
      try {
        if (!data || !data._id) {
          return callback({ status: "error", error: "Invalid data" });
        }

        const annoucementId = data._id;
        const acceptingUser = socket.user?._id; // Current User

        const announcement = await FriendRelationship.findByIdAndUpdate(
          {
            _id: annoucementId,
            recipient: acceptingUser,
            status: "pending",
          },
          {
            $set: {
              status: "accepted",
              updatedAt: new Date(),
            },
          },
          {
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
          },
        ).exec();

        if (!announcement) {
          return callback({
            status: "error",
            error: "Friend request not found or already processed",
          });
        }

        const populatedAnnouncement =
          announcement as unknown as IFriendRelationshipPopulated;

        console.log(announcement);

        await Promise.all([
          User.findByIdAndUpdate(announcement.requester._id, {
            $addToSet: { friends: announcement.recipient._id },
          }),

          User.findByIdAndUpdate(announcement.recipient._id, {
            $addToSet: { friends: announcement.requester._id },
          }),
        ]);

        io.to(userSockets.get(announcement.requester._id)).emit(
          "friend request accepted",
          `${populatedAnnouncement.recipient.username} has accepted your friend request`,
        );

        const announcementsCount = await FriendRelationship.find({
          recipient: acceptingUser,
          status: "pending",
        }).countDocuments();

        return callback({
          status: "ok",
          message: `You are now friend with ${populatedAnnouncement.requester.username}`,
          announcementId: announcement._id,
          announcementCount: announcementsCount,
        });
      } catch (e) {
        console.error(e);
        return callback({ status: "error", message: (e as Error).message });
      }
    });

    socket.on("delete this conversation", async (conversationId, callback) => {
      try {
        if (!conversationId) {
          return callback({
            status: "error",
            message: "Conversation Id is invalid",
          });
        }

        await Conversation.findByIdAndDelete(conversationId);

        // Remove all messages assigned to this conversation.
        await Message.deleteMany({ conversation: conversationId });

        return callback({ status: "ok" });
      } catch (e) {
        console.error(e);
        return callback({
          status: "error",
          error: "Failed to delete conversation. Please try again.",
        });
      }
    });

    socket.on("give me my announcements", async (data, callback) => {
      try {
        const announcements = await FriendRelationship.find({
          recipient: socket.user?._id,
          status: "pending",
        })
          .populate("requester", "username")
          .populate("recipient", "username")
          .sort({ createdAt: -1 })
          .lean();

        return callback({ status: "ok", data: announcements });
      } catch (e) {
        console.error(e);
        return callback({ status: "error", message: (e as Error).message });
      }
    });

    socket.on("new conversation", async (data, callback) => {
      const { conversationName, isPrivate } = data;

      if (!conversationName) {
        callback({ status: "error", error: "Conversation name is invalid" });
      }

      try {
        const existingConversation = await Conversation.findOne({
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
              user: socket.user?._id,
              role: "admin",
              joinedAt: new Date(),
            },
          ],
          createdAt: new Date(),
        });

        await newConversation.save();

        return callback({ status: "ok", message: "success", newConversation });
      } catch (e) {
        console.error(e);
        callback({ status: "error", error: "Internal Server" });
      }

      if (typeof callback === "function") {
        return callback({ status: "ok" });
      }
    });

    socket.on(
      "help me find this user with username",
      async (usernameSearch, callback) => {
        try {
          if (!usernameSearch) {
            return callback({ status: "error", error: "Query is invalid" });
          }

          const users = await User.find({
            username: new RegExp(usernameSearch, "i"),
            _id: { $ne: socket.user?._id },
          })
            .select("username status")
            .limit(10)
            .lean();

          const friendships = await FriendRelationship.find({
            $or: [
              { requester: socket.user?._id },
              { recipient: socket.user?._id },
            ],
          });

          return callback({
            status: "ok",
            friends: users,
            friendships: friendships,
          });
        } catch (e) {
          console.log(e);
          return callback({ status: "error", error: "Something went wrong" });
        }
      },
    );

    socket.on("my response to invitation", async (data, callback) => {});

    socket.on(
      "send my invitation to this user has id",
      async (userId, callback) => {
        try {
          const user = await User.findById(userId);

          if (!user) {
            return callback({ status: "error", error: "User not found" });
          }

          const friendShip = new FriendRelationship({
            requester: socket.user?._id,
            recipient: user._id,
            status: "pending",
            createdAt: new Date(),
          });

          const existingFriendShip = await FriendRelationship.findOne({
            requester: socket.user?._id,
            recipient: user._id,
            status: "pending",
          });

          if (!existingFriendShip) {
            await friendShip.save();
          } else {
            return callback({
              status: "error",
              error: "You have already sent an invite",
            });
          }

          io.to(userSockets.get(userId)).emit("someone sends you an invite", {
            from: socket.user?._id,
            invitation: friendShip,
            timestamp: new Date(),
          });

          return callback({
            status: "ok",
            message: "Your request has been sent",
          });
        } catch (e) {
          console.error(e);
          return callback({
            status: "error",
            error: "Something went wrong",
          });
        }
      },
    );

    socket.on("stop typing", async (data, callback) => {
      try {
        socket.to(data.conversationId).emit("user stop typing");
      } catch (e) {
        console.error(e);
        return callback({ status: "error", error: (e as Error).message });
      }
    });

    socket.on("typing", async (data, callback) => {
      try {
        socket
          .to(data.conversationId)
          .emit("user typing", { username: data.username });
      } catch (e) {
        console.error(e);
        return callback({ status: "error", error: (e as Error).message });
      }
    });

    socket.on(
      "give me my conversation between my friend and I",
      async (data, callback) => {
        try {
          const { friendId } = data;
          if (!friendId) {
            return callback({ status: "error", error: "Friend Id is invalid" });
          }

          const yourFriend = await User.findById(friendId);
          if (!yourFriend) {
            return callback({ status: "error", error: "Friend not found" });
          }

          const conversation = await Conversation.findOne({
            type: "private",
            participants: {
              $all: [
                { $elemMatch: { user: socket.user?._id } },
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
            const newConversation = await Conversation.create({
              type: "private",
              name: `${yourFriend.username}, ${socket.user?.username}`,
              participants: [{ user: socket.user?._id }, { user: friendId }],
            });

            const populatedConversation = await Conversation.findById(
              newConversation._id,
            )
              .populate("participants.user", "username")
              .populate("latestMessage");

            return callback({
              status: "ok",
              conversation: populatedConversation,
              messages: [],
            });
          }

          const messages = await Message.find({
            conversation: conversation._id,
          })
            .populate<{ sender: IUser }>("sender", "username")
            .sort({ createdAt: 1 })
            .limit(50)
            .exec();

          const formattedMessages = messages.map((message) => ({
            _id: message._id,
            content: message.content,
            sender: {
              _id: message.sender._id,
              username: message.sender.username,
            },
            isCurrentUser:
              message.sender._id.toString() === socket.user?._id.toString(),
            createdAt: new Date(message.createdAt).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }));

          return callback({
            status: "ok",
            conversation: conversation,
            messages: formattedMessages,
            hasMore: messages.length === 50,
          });
        } catch (e) {
          console.error(e);
          return callback({ status: "error", error: (e as Error).message });
        }
      },
    );

    socket.on("I just sent a new message", async (data, callback) => {
      try {
        const { msg, conversation_id } = data;
        console.log(msg);
        if (!msg || !conversation_id) {
          return callback({
            status: "error",
            error: "Message and conversation id are required",
          });
        }

        const conversation = await Conversation.findOne({
          _id: conversation_id,
          "participants.user": socket.user?._id,
        });

        if (!conversation)
          return callback({
            status: "error",
            error:
              "Conversation does not exist or you are not part of this conversation",
          });

        const formattedMsg = msg.replace(/\n/g, "<br>");
        const message = new Message({
          conversation: conversation_id,
          content: formattedMsg,
          sender: socket.user?._id,
          createdAt: new Date(),
        });

        await message.save();
        await Conversation.findByIdAndUpdate(conversation_id, {
          latestMessage: message._id,
          updatedAt: new Date(),
        });

        const populatedMessage = await message.populate<{ sender: IUser }>(
          "sender",
          "username",
        );

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
      } catch (e) {
        console.error(e);
        return callback({
          status: "error",
          error: "There something went wrong",
        });
      }
    });
  });
}
