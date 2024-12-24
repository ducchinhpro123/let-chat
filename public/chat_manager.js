class ChatManager {
  constructor(socketManager) {
    this.socketManager = socketManager;
    this.messageInput = document.querySelector('.message-input');
    this.chatMessages = document.querySelector('.chat-messages');
    this.sendBtn = document.querySelector('.send-button');
  }

  initialize() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.sendBtn.addEventListener('click', this.handleSendMessage);
    this.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });
  }

  // Append new message to messge container
  appendMessage(message) {

  }

  handleSendMessage() {
    const value = this.messageInput.value;
    if (!value) {
      return;
    }
    this.socketManager.emit('send new message', value, (response) => {
      console.log(response);
    });
  }
}

export default ChatManager;
