import ConversationManager from '/conversation_manager.js';

class SocketManager {
  constructor() {
    this.socket = null;
    this.events = {};
    this.userId = document.getElementById('userid-hidden').value;
  }

  getWSToken() {
    try {
      const cookies = document.cookie.split(';')
        .map(cookie => cookie.trim())
        .reduce((acc, curr) => {
          const [key, value] = curr.split('=');
          acc[key] = value;
          return acc;
        }, {});
      return cookies['wsToken'];
    } catch (e) {
      return this.redirectToAuth();
    }
  }

  showSuccessToast(message) {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  showErrorToast(message) {
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  setupEventListeners() {
    this.socket.on('connect', () => {
      this.showSuccessToast('connected');
    });

    this.socket.emit('user:connect', this.userId);

    this.socket.on('disconnect', () => {
      this.showErrorToast('disconnected');
    });

    this.socket.on('One of you friend has added you to a conversation', (response) => {
      console.log(response);
    });

    this.socket.on('friend request accepted', (response) => {
      console.log(response);
    });

    this.socket.on('redirect me to this url', (url) => {
      console.log(url);
      window.location.href = url;
    });

    const conversationManager = new ConversationManager();
    this.showLoadingState(conversationManager);

    const timeoutId = setTimeout(() => {
      this.hideLoadingState(conversationManager);
      this.showErrorToast('Request timed out. Server is taking too long to respond.');
    }, 10000);

    this.socket.emit('give me my conversations', '', (response) => {
      clearTimeout(timeoutId);

      if (response?.status === 'ok') {
        this.hideLoadingState(conversationManager);

        const conversations = Array.from(response.conversations);
        if (conversations.length === 0) {
          this.showEmptyState(conversationManager);
        } else {
          conversations.forEach(conv => {
            conversationManager.appendNewConversation(conv);
          });
        }

      } else {
        console.log(response.error); 
        this.showErrorToast(response.error);
      }
    });

    this.socket.on('someone sends you an invite', (data) => {
      console.log(data);
    });
  }

  hideLoadingState(conversationManager) {
    const loadingElement = conversationManager.conversationList.querySelector('.conversations-loading');
    if (loadingElement) {
      loadingElement.remove();
    }
  }

  showLoadingState(conversationManager) {
    conversationManager.conversationList.innerHTML = `
      <div class="conversations-loading">
        <div class="loading-spinner"></div>
        <p>Loading your conversations...</p>
      </div>
    `;
  }

  showEmptyState(conversationManager) {
    conversationManager.conversationList.innerHTML = `
      <div class="empty-conversations">
        <div class="empty-icon">💭</div>
        <h3>No conversations yet</h3>
        <p>Start chatting with your friends!</p>
      </div>
    `;
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
      this.showErrorToast(e);
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
