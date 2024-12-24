import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import  { User } from '../models/user.js';
import  { Conversation } from '../models/conversation.js';

export function initializeSocket(server) {
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
    }
  });

  io.on('connection', async (socket) => {
    console.log(`${socket.user.username} is connected`);

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
    })

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

    socket.on('new message', (data, callback) => {
      console.log(data);
      if (typeof callback === 'function') {
        return callback({ status: 'ok' });
      }
    });

  })
}

