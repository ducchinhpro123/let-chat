import ConversationManager from '/conversation_manager.js';

class SocketManager {
  constructor() {
    this.socket = null;
    this.events = {};
  }

  getWSToken() {
    const cookies = document.cookie.split(';')
      .map(cookie => cookie.trim())
      .reduce((acc, curr) => {
        const [key, value] = curr.split('=');
        acc[key] = value;
        return acc;
      }, {});

    return cookies['wsToken'];
  }

  setupEventListeners() {
    this.socket.emit('give me my conversations', (response) => {
      const conversationManager = new ConversationManager();
      if (response?.status === 'ok') {
        const conversations = Array.from(response.conversations);
        conversations.forEach(conv => {
          conversationManager.appendNewConversation(conv);
        });
      } else {
        // TODO: implement a toast to display this message
        console.log(response.error); 
      }
    });

    this.socket.on('connect', () => {
      console.log('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('disconnected');
    })
  }

  emit(event, data, callback) {
    if (!this.socket) {
      console.log('Socket not initialized');
      return;
    }
    this.socket.emit(event, data, callback);
  }

  on(event, handler) {
    if (!this.socket) {
      console.log('Socket not initialized');
      return;
    }
    this.socket.on(event, handler);
    this.events[event] = handler;
  }

  initialize() {
    try {
      this.socket = io(window.location.origin, {
        auth: { 
          token: this.getWSToken() 
        },
        reconnection: true,
        transports: ['websocket'],
        upgrade: false,
        reconnectionAttempts: 3
      });

      this.setupEventListeners();
      return this.socket;
    } catch (e) {
      console.error(e);
    }
  }

  redirectToAuth() {
    try {
      window.location.href='/users/authentication';
      return null;
    } catch (e) {
      console.log('error redirecting');
      return null;
    }
  }
}

export default SocketManager;
