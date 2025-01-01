import FriendSearch from '/friend_search.js';
import App from '/main.js';

class ChatManager {

    static instance = null;

    constructor(socketManager) {
        if (ChatManager.instance) {
            return ChatManager.instance;
        }
        ChatManager.instance = this;
        console.log('init chat manager');

        this.socketManager = App.getInstance().socketManager;
        this.chatArea = document.querySelector('.main-chat');
        this.chatMessages = document.querySelector('.chat-messages');
        this.chatHeader = document.querySelector('.chat-header');
        // this.messageInput = document.querySelector('.message-input');
        this.messageInput = null;
        this.editor = null;
        this.chatInput = document.querySelector('.chat-input');
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

    static getInstance() {
        if (!ChatManager.instance) {
            ChatManager.instance = new ChatManager();
        }
        return ChatManager.instance;
    }

    initialize() {
        this.socketManager.on('new message', (data) => {
            if (data.message) {
                this.appendMessage(data.message);
            }
        });

        this.socketManager.on('remove message', (data) => {
            if (data.messageId) {
                this.removeNodeMessage(data.messageId);
            }
        });

        // this.setupEventListeners();
        // this.messageTypingIndicator();
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
            this.displayUserTypingIndicator(response.username);
        });
    }

    messageTypingIndicator() {
        let typingTimeout;
        this.editor.onChange(content => { 
            if (!typingTimeout) {
                this.socketManager.emit('typing', {
                    conversationId: this.chatHeader.dataset.id,
                    username: this.username,
                });

                clearTimeout(typingTimeout);

                typingTimeout = setTimeout(() => {
                    this.socketManager.emit('stop typing', {
                        conversationId: this.chatHeader.dataset.id,
                    });
                    typingTimeout = null;
                }, 1000);
            }
        });
    }

    setupEventListeners() {
        // Button click
        this.sendBtn.addEventListener('click', this.handleSendMessage);
        // Enter press
        const editorElement = this.chatArea.querySelector('.hr-editor');
        editorElement.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });

        // this.messageInput.addEventListener('keypress', (e) => {
        //     if (e.key === 'Enter' && !e.shiftKey) {
        //         e.preventDefault();
        //         this.handleSendMessage();
        //     }
        // });
    }

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
        console.log(messageId);
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
                this.socketManager.emit('delete message', {messageId, conversationId}, (response) => {
                    if (response.status === 'error') {
                        this.socketManager.showErrorToast(response.error);
                    }
                });
        }
    }

    handleContextMenu(e, messageId, conversationId) {
        e.preventDefault();
        const {clientX: mouseX, clientY: mouseY} = e;
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

    getEmptyHTML(createdAt) {
        return ` <div class="empty-chat-content">
                <div class="empty-chat-icon">
                    <i class="far fa-comments"></i>
                </div>
                <h3>No messages yet</h3>
                <p>Be the first one to send a message in this conversation!</p>
                <p class="conversation-created">Conversation created on ${new Date(createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}</p>
            </div> `;

    }

    getSenderMessage(message, conversationId) {
        const sender = document.createElement('div');
        sender.className = 'message sent';
        sender.dataset.id = message._id;
        sender.dataset.senderId = message.sender.username;
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
            this.handleContextMenu(e, message._id, conversationId);
        });

        return sender;
    }

    getReceiverSendMessage(message, previousMsg) {
        const receiver = document.createElement('div');
        receiver.className = 'message received';
        receiver.dataset.id = message._id;
        // const previousMsg = messages[index - 1];

        const isSameSender = !previousMsg || previousMsg.isCurrentUser
            || previousMsg.sender.username !== message.sender.username;

        receiver.innerHTML = `
                <div class="message-avatar" ${!isSameSender ? 'style="visibility: hidden;"' : ''}>
                    <img src="https://ui-avatars.com/api/?name=${message.sender.username}" alt="avatar">
                </div>
                <div class="message-bubble">
                    <div class="message-info" ${!isSameSender ? 'style="visibility: hidden;"' : ''}>
                        <span class="message-username">${message.sender.username}</span>
                    </div>
                    <div class="message-content">
                      ${message.content}
                        <br>
                        <span class="message-time">${message.createdAt}</span>
                    </div>
                </div>`;

        return receiver;
    }

    removeChatArea() {
        if (this.chatArea.querySelector('.empty-chat-state')) {
            this.chatArea.querySelector('.empty-chat-state').remove();
        }

        if (this.chatMessages) {
            this.chatMessages.innerHTML = '';
            this.chatHeader.innerHTML = '';
        }
    }

    renderInputArea() {
        console.log('displayInputArea get called');
        // const inputArea = this.chatManager.chatInput;
        if (!this.editor) {
            const container = document.querySelector('.input-container');
            this.editor = HREditor.init(container);
            this.messageTypingIndicator();
            this.setupEventListeners();

            // new EmojiPicker({
            //     trigger: [
            //         {
            //             selector: '.first-btn',
            //             insertInto: '.hr-editor',
            //         },
            //     ],
            //     closeButton: true,
            //     specialButtons: 'green', // #008000, rgba(0, 128, 0);

            // });
        }

        if (this.chatInput) {
            if (this.chatInput.style.display === 'block') {
                return;
            } else {
                this.chatInput.style.display = 'block';
            }
        }
    }

    renderChatArea(conversation, messages) {
        // this.chatArea
        this.removeChatArea();

        if (!messages || messages.length === 0) {
            this.chatHeader.innerHTML = this.getChatHeader(conversation);
            this.chatHeader.dataset.id = conversation._id;

            this.handleOpenUserSearch(); // Modal

            const empty = document.createElement('div');
            empty.className = 'empty-chat-state';
            empty.innerHTML = this.getEmptyHTML(conversation.createdAt);

            this.chatArea.insertBefore(empty, this.chatInput);
            return;
        }

        this.chatHeader.innerHTML = this.getChatHeader(conversation);
        this.chatHeader.dataset.id = conversation._id;

        this.chatMessages.classList.add('padding-20px');

        messages.forEach((message, index) => {
            if (!message.isCurrentUser) {
                this.chatMessages.appendChild(this.getReceiverSendMessage(message, messages[index - 1]));
            } else {
                this.chatMessages.appendChild(this.getSenderMessage(message, conversation._id));
            }
        });

        this.handleOpenUserSearch(); // Modal
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        this.renderInputArea();
    }

    // Append new message to messge container
    appendMessage(message, conversationId) {
        const emptyChatState = document.querySelector('.empty-chat-state');
        if (emptyChatState) {
            emptyChatState.remove();
        }

        const isCurrentUser = document.getElementById('username').innerHTML.trim() === message.sender.username.trim();

        if (isCurrentUser) {
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

            sender.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.handleContextMenu(e, message._id, conversationId);
            });

            this.chatMessages.appendChild(sender);

        } else {
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
                    </div>
        `;

            this.chatMessages.appendChild(receiver);
        }
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    handleSendMessage() {
        let content = this.editor.getContent();
        content = content.replace(/<br>$/, '');
        console.log(content);

        if (!content) {
            return;
        }

        const data = {
            msg: content,
            conversation_id: this.chatHeader.dataset.id
        };

        this.socketManager.emit('I just sent a new message', data, (response) => {
            if (response.status === 'ok') {
                this.appendMessage(response.message, response.conversation._id);
            }
            if (response.status === 'error') {
                this.socketManager.showErrorToast(response.error);
            }
        });
        this.editor.setContent('');

        // this.chatInput.value = '';
        // this.chatInput.focus();
    }
}

export default ChatManager;
