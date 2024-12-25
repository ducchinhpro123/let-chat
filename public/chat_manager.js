import FriendSearch from '/friend_search.js';

class ChatManager {
  constructor(socketManager) {
    this.socketManager = socketManager;
    this.chatArea = document.querySelector('.main-chat');
    this.chatMessages = document.querySelector('.chat-messages');
    this.chatHeader = document.querySelector('.chat-header');
    this.messageInput = document.querySelector('.message-input');
    this.chatMessages = document.querySelector('.chat-messages');
    this.sendBtn = document.querySelector('.send-button');
    this.handleSendMessage = this.handleSendMessage.bind(this);

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

  renderChatArea(conversation, messages) {
    if (!messages || messages.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-chat-state';
      empty.innerHTML = `
            <div class="empty-chat-content">
                <div class="empty-chat-icon">
                    <i class="far fa-comments"></i>
                </div>
                <h3>No messages yet</h3>
                <p>Be the first one to send a message in this conversation!</p>
                <p class="conversation-created">Conversation created on ${new Date(conversation.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
            </div>
        `;
      this.chatArea.appendChild(empty);
      return;
    }

    this.chatMessages.innerHTML = '';
    this.chatHeader.innerHTML = '';

    this.chatHeader.innerHTML = `
              <div class="header-left">
                  <h2>${conversation.name}</h2>
                  <span class="member-count">${conversation.participants.length > 1 ? 'members' : 'member'}</span>
              </div>
              <div class="header-actions">
                  <button class="btn-invite" title="Invite Members">
                      <i class="fas fa-user-plus"></i>
                  </button>
                  <button class="btn-info" title="Conversation Info">
                      <i class="fas fa-info-circle"></i>
                  </button>
              </div>
    `;
    this.chatHeader.dataset.id = conversation._id;

    messages.forEach(message => {
      if (!message.isCurrentUser) {
        const receiver = document.createElement('div');
        receiver.className = 'message received';
        receiver.innerHTML = `
                  <div class="message-avatar">
                      <img src="https://ui-avatars.com/api/?name=${message.sender.username}" alt="avatar">
                  </div>
                  <div class="message-bubble">
                      <div class="message-info">
                          <span class="message-username">${message.sender.username}</span>
                      </div>
                      <div class="message-content">
                        ${message.content}
                          <br>
                          <span class="message-time">${message.createdAt}</span>
                      </div>
                  </div>
      `;
        this.chatMessages.appendChild(receiver);

      } else {
        const sender = document.createElement('div');
        sender.className = 'message sent';
        sender.innerHTML = `
                  <div class="message-bubble">
                      <div class="message-info">
                      </div>
                      <div class="message-content">
                      ${message.content}
                          <br>
                          <span class="message-time">${message.createdAt}</span>
                      </div>
                  </div>
      `;

        this.chatMessages.appendChild(sender);
      }
      // this.handleHeaderChat();
      new FriendSearch();
    });
  }

  // Append new message to messge container
  appendMessage(message) {
    const m = document.createElement('div');
    const isCurrentUser = document.getElementById('username').innerHTML === message.sender.username;
    if (isCurrentUser) {
      const sender = document.createElement('div');
      sender.className = 'message sent';
      sender.innerHTML = `
                    <div class="message-bubble">
                        <div class="message-info">
                        </div>
                        <div class="message-content">
                        ${message.content}
                            <br>
                            <span class="message-time">${message.createdAt}</span>
                        </div>
                    </div>
        `;

      this.chatMessages.appendChild(sender);

    } else {
      const receiver = document.createElement('div');
      receiver.className = 'message received';
      receiver.innerHTML = `
                    <div class="message-avatar">
                        <img src="https://ui-avatars.com/api/?name=${message.sender.username}" alt="avatar">
                    </div>
                    <div class="message-bubble">
                        <div class="message-info">
                            <span class="message-username">${message.sender.username}</span>
                        </div>
                        <div class="message-content">
                          ${message.content}
                            <br>
                            <span class="message-time">${message.createdAt}</span>
                        </div>
                    </div>
        `;
      this.chatMessages.appendChild(receiver);
    }

  }

  handleSendMessage() {
    const value = this.messageInput.value;
    if (!value) {
      return;
    }
    const data = {
      msg: value,
      conversation_id: this.chatHeader.dataset.id
    };

    this.socketManager.emit('I just sent a new message', data, (response) => {
      if (response.status === 'ok') {
        this.appendMessage(response.message);
      } else {
        this.socketManager.showErrorToast(response.error);
      }
    });
    this.messageInput.value = '';
  }
}

export default ChatManager;
