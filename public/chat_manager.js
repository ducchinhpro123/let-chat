import FriendSearch from '/friend_search.js';
import App from '/main.js';

class ChatManager {
  constructor(socketManager) {
    // this.socketManager = socketManager;

    this.socketManager = App.getInstance().socketManager;

    this.chatArea = document.querySelector('.main-chat');
    this.chatMessages = document.querySelector('.chat-messages');
    this.chatHeader = document.querySelector('.chat-header');
    this.messageInput = document.querySelector('.message-input');
    this.chatInput = document.querySelector('.chat-input');
    this.chatMessages = document.querySelector('.chat-messages');
    this.sendBtn = document.querySelector('.send-button');
    this.handleSendMessage = this.handleSendMessage.bind(this);
    this.username = document.querySelector('#username-hidden').value;
    this.typingIndicator = document.querySelector('.typing-indicator');
    this.typingText = document.querySelector('.typing-text');

    this.selectedConversationId = this.chatHeader.dataset.id;

    this.contextMenu = this.createContextMenu();
  
    this.friendSearch = new FriendSearch();

    this.handleContextMenu = this.handleContextMenu.bind(this);
    this.hideContextMenu = this.hideContextMenu.bind(this);
    this.handleContextMenuAction = this.handleContextMenuAction.bind(this);
    this.removeNodeMessage = this.removeNodeMessage.bind(this);

    document.addEventListener('click', this.hideContextMenu);
  }

  initialize() {
    this.socketManager.on('new message', (data) => {
      if (data.message) {
        console.log(data.message);
        this.appendMessage(data.message);
      }
    });

    this.socketManager.on('remove message', (data) => {
      if (data.messageId) {
        this.removeNodeMessage(data.messageId);
      }
    });

    this.setupEventListeners();
    this.messageTypingIndicator();
    this.userTyping();
    this.userStopTyping();
  }

  createContextMenu() {
    const menu = document.createElement('div');
    menu.className = 'message-context-menu';
    menu.style.display = 'none';
    document.body.appendChild(menu);

    return menu;
  }

  hideUserTypingIndicator() {
    this.typingIndicator.style.display = 'none';
    this.typingText.innerHTML = ``;
  }

  displayUserTypingIndicator(username) {
    this.typingIndicator.style.display = 'flex';
    this.typingText.innerHTML = `${username} is typing`;
  }

  userStopTyping() {
    this.socketManager.on('user stop typing', () => {
      this.hideUserTypingIndicator();
    });
  }

  userTyping() {
    this.socketManager.on('user typing', (response) => {
      console.log(response);
      this.displayUserTypingIndicator(response.username);
    });
  }

  messageTypingIndicator() {
    let typingTimeout;

    this.messageInput.addEventListener('input', () => {
      if (!typingTimeout) {
        this.socketManager.emit('typing', {
          conversationId: this.chatHeader.dataset.id,
          username: this.username,
        });
      }

      clearTimeout(typingTimeout);

      typingTimeout = setTimeout(() => {
        this.socketManager.emit('stop typing', {
          conversationId: this.chatHeader.dataset.id,
        });
        typingTimeout = null;
      }, 1000);
    });
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

  openModal() { }

  getChatHeader(conversation) {
    return `
              <div class="header-left">
                  <h2>${conversation.name}</h2>
                  <span class="member-count">
                    ${conversation.participants.length > 1 ? 
                    `${conversation.participants.length} members` : 
                    `${conversation.participants.length} member`
                    }
                  </span>
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

  }

  handleOpenUserSearch() {
    const inviteBtn = this.chatHeader.querySelector('.btn-invite');
    inviteBtn.addEventListener('click', () => {
      this.friendSearch.openModal();
    });
  }

  hideContextMenu() {
    this.contextMenu.style.display = 'none';
  }

  removeNodeMessage(messageId) {
    const selectedMsg = this.chatMessages.querySelector(`[data-id="${messageId}"]`);

    selectedMsg.style.transition = 'opacity 0.3s ease';
    selectedMsg.style.opacity = '0';

    setTimeout(() => {
      selectedMsg.remove();
    }, 300);
  }

  async handleContextMenuAction(action, messageId, conversationId) {
    if (!this.socketManager) {
      console.error('socketManager is not initialized');
      return;
    }

    switch (action) {
      case 'delete': 
        this.socketManager.emit('delete message',  { messageId, conversationId }, (response) => {
          if (response.status === 'error') {
            this.socketManager.showErrorToast(response.error);
          }
        });
    }
  }

  handleContextMenu(e, messageId, conversationId) {
    e.preventDefault();
    const { clientX: mouseX, clientY: mouseY } = e;
    this.contextMenu.style.display = 'block';

    const menuWidth = this.contextMenu.offsetWidth;
    const menuHeight = this.contextMenu.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const menuX = mouseX + menuWidth > windowWidth 
      ? windowWidth - menuWidth - 5 : mouseX;

    const menuY = mouseY + menuHeight > windowHeight 
      ? windowHeight - menuHeight - 5 : mouseY;

    this.contextMenu.style.left = `${menuX}px`;
    this.contextMenu.style.top = `${menuY}px`;

    this.contextMenu.innerHTML = `
      <div class="menu-item delete" data-action="delete">
        <i class="fas fa-trash"></i> Delete message
      </div>
    `;

    this.contextMenu.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleContextMenuAction(action, messageId, conversationId);
      });
    });
  }

  renderChatArea(conversation, messages) {
    if (!messages || messages.length === 0) {
      this.chatHeader.innerHTML = this.getChatHeader(conversation);
      this.chatHeader.dataset.id = conversation._id;

      this.handleOpenUserSearch(); // Modal

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
            </div> `;

        this.chatArea.insertBefore(empty, this.chatInput);
        // new FriendSearch(this.chatHeader);
        return;
      }

      this.chatHeader.innerHTML = this.getChatHeader(conversation);
      this.chatHeader.dataset.id = conversation._id;

      messages.forEach(message => {
        if (!message.isCurrentUser) {
          const receiver = document.createElement('div');
          receiver.className = 'message received';
          receiver.dataset.id = message._id;
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
                  </div>`;

          this.chatMessages.appendChild(receiver);

        } else {
          // You're the one who sends
          const sender = document.createElement('div');
          sender.className = 'message sent';
          sender.dataset.id = message._id;
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

          // Sender will be able to remove their message
          sender.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.handleContextMenu(e, message._id, conversation._id);
          });

          this.chatMessages.appendChild(sender);
        }
        // this.handleHeaderChat();
      });

      this.handleOpenUserSearch(); // Modal
      this.chatMessages.scrollTop  = this.chatMessages.scrollHeight;
    }

    // Append new message to messge container
    appendMessage(message) {
      const emptyChatState = document.querySelector('.empty-chat-state');
      if (emptyChatState) {
        emptyChatState.remove();
      }

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
        sender.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.handleContextMenu(e, message._id);
        });

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
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
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
        }
        if (response.status === 'error') {
          this.socketManager.showErrorToast(response.error);
        }
      });
      this.messageInput.value = '';
    }
}

export default ChatManager;
