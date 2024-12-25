import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import  { User } from '../models/user.js';
import  { Conversation } from '../models/conversation.js';
import  { Message } from '../models/message.js';
import  { FriendRelationship } from '../models/friend_relationship.js';

export function initializeSocket(server) {
  const userSockets = new Map();

  const io = new Server(server, {
    connectionStateRecovery: {},
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      const user = await User.findById(decoded.user_id);
      if (!user) {
        return next(new Error('User not found'));
      }
      socket.user = user;
      next();
    } catch (e) {
      console.error(e);
      if (e.name === 'TokenExpiredError') {
        socket.emit('redirect me to this url', '/users/login');
      }
      // next(e);
    }
  });

  io.on('connection', async (socket) => {
    console.log(`${socket.user.username} is connected`);

    socket.on('user:connect', (userId) => {
      userSockets.set(userId, socket.id);
      console.log(userSockets);
    });

    socket.on('give me my conversations', async (callback) => {
      try {
        const conversations = await Conversation.find({ 
          'participants.user': socket.user._id 
        }).sort({ updatedAt: -1 })
          .populate('latestMessage');

        return callback({ status: 'ok', conversations: conversations });
      } catch (e) {
        console.error(e);
        return callback({ status: 'error', error: 'Failed to fetch resources' });
      }
    });

    socket.on('here is conversation_id, give me my messages', async (conversation_id, callback) => {
      try {
        if (!conversation_id) {
          return callback({ status: 'error', error: 'Conversation Id is invalid' });
        }

        const conversation = await Conversation.findOne({
            _id: conversation_id,
            'participants.user': socket.user._id // Ensure user is a participant
        });

        if (!conversation) {
          return callback({ status: 'error', error: 'Conversation not found' });
        }

        const messages = await Message.find({ conversation: conversation_id })
          .populate('sender', 'username');

        // Formatted message for client uses
        const formattedMessages = messages.map(message => ({
          _id: message._id,
          content: message.content,
          sender: {
            _id: message.sender._id,
            usename: message.sender.username
          },
          isCurrentUser: message.sender._id.toString() === socket.user._id.toString(),
          createdAt: new Date(message.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        }));

        return callback({ 
          status: 'ok', 
          data: {
            conversation: {
              _id: conversation._id,
              name: conversation.name,
              type: conversation.type,
              participants: conversation.participants
            },
            messages: formattedMessages,
          }
        });

      } catch (e) {
        console.log(e);
        return callback({ status: 'error', error: 'Failed to load your messages' });
      }
    });

    socket.on('new conversation', async (data, callback) => {
      const { conversationName, isPrivate } = data;
      console.log(isPrivate);

      if (!conversationName) {
        callback({ status: 'error', error: 'Conversation name is invalid' });
      }

      try {
        const existingConversation = await Conversation.findOne({ name: conversationName });
        if (existingConversation) {
          return callback({ status: 'error', error: 'Conversation name is alreay exists' });
        }

        const newConversation = new Conversation({
          name: conversationName,
          type: Boolean(isPrivate) ? 'private' : 'public',
          participants: [{
            user: socket.user._id,
            role: 'admin',
            joinedAt: new Date()
          }],
        });

        await newConversation.save();

        return callback({ status: 'ok', message: 'success', newConversation });

      } catch (e) {
        console.error(e);
        callback({ status: 'error', error: 'Internal Server' });
      }

      if (typeof callback === 'function') {
        return callback({ status: 'ok' });
      }
    });

    socket.on('help me find this user with username', async (usernameSearch, callback) => {
      try {
        if (!usernameSearch) {
          return callback({ status: 'error', error: 'Query is invalid' });
        }
        console.log(usernameSearch);

        const users = await User.find({ 
          username: new RegExp(usernameSearch, 'i'),
          _id: { $ne: socket.user._id }
        }).select('username status')
          .limit(10)
          .lean();

        const friendships = await FriendRelationship.find({
          $or: [
            { requester: socket.user._id },
            { recipient: socket.user._id },
          ]
        });

        return callback({ status: 'ok', friends: users, friendships: friendships  });

      } catch (e) {
        console.log(e);
        return callback({ status: 'error', error: 'Something went wrong' });
      }
    });

    socket.on('my response to invitation', async (data, callback) => {

    });

    socket.on('send my invitation to this user has id', async (userId, callback) => {
      try {
        const user = await User.findById(userId) ;

        if (!user) {
          return callback({ status: 'error', error: 'User not found' });
        }

        const friendShip = new FriendRelationship({
          requester: socket.user._id,
          recipient: user._id,
          status: 'pending',
          createdAt: new Date()
        });

        const existingFriendShip = await FriendRelationship.findOne({
          requester: socket.user._id,
          recipient: user._id,
          status: 'pending'
        });

        if (!existingFriendShip) {
          await friendShip.save();
        } else {
          return callback({ status: 'error', error: 'You have already sent an invite' });
        }


        io.to(userSockets.get(userId)).emit('someone sends you an invite', { 
          from: socket.user._id, 
          invitation: friendShip, 
          timestamp: new Date() 
        });

        return callback({ 
          status: 'ok',
          message: 'Your request has been sent',
        });

      } catch (e) {
        console.error(e);
        return callback({ 
          status: 'error',
          error: 'Something went wrong'
        })
      }
    });

    socket.on('I just sent a new message', async (data, callback) => {
      try {
        const { msg, conversation_id } = data;
        if (!msg || !conversation_id) {
          return callback({
            status: 'error',
            error: 'Message and conversation id are required'
          });
        }
        // TODO: verify conversation_id and check if user is a part of a conversation
        const conversation = await Conversation.findOne({
          _id: conversation_id,
          'participants.user': socket.user._id 
        });
        if (!conversation) return callback({ 
          status: 'error', 
          error: 'Conversation does not exist or you are not part of this conversation' 
        });

        const message = new Message({
          conversation: conversation_id,
          content: msg,
          sender: socket.user._id,
          createdAt: new Date()
        });

        await message.save();
        await Conversation.findByIdAndUpdate(conversation_id, {
          latestMessage: message._id,
          updatedAt: new Date()
        });

        await message.populate('sender', 'username');

        const formattedMessage = {
          content: message.content,
          createdAt: new Date(message.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          sender: {
            username: message.sender.username
          },
        }

        conversation.participants.forEach(participant => {
          if (participant.user.toString() !== socket.user._id.toString()) {
            socket.to(participant.user.toString()).emit('new message', message);
          }
        });

        return callback({ 
          status: 'ok',  
          message: formattedMessage,
          conversation: conversation
        });
        
      } catch (e) {
        console.error(e);
        return callback({ status: 'error', error: 'There something went wrong' });
      }
    });

  })
}

