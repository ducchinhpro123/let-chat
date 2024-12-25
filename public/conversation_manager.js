import App from '/main.js';
import ChatManager from '/chat_manager.js';

class ConversationManager {
  constructor() {
    this.newConversationBtn = document.querySelector('.new-conversation-btn');
    this.newConversationModal = document.getElementById('newConversationModal');
    this.closeBtn = document.querySelector('.close-modal');
    this.modalNameInput = document.getElementById('modalName');
    this.confirmBtn = document.querySelector('.confirm-new-conversation');
    this.conversationList = document.querySelector('.conversation-list');

    this.socketManager = App.getInstance().socketManager;

    this.initialize();
  }

  initialize() {
    this.newConversationBtn.addEventListener('click', () => this.openModal());
    this.confirmBtn.addEventListener('click', () => this.handleCreateNewConversation());
    this.closeBtn.addEventListener('click', () => this.closeModal());
  }

  appendNewConversation(conversation) {
    const conversationItem = document.createElement('div');
    conversationItem.className = 'conversation-item';
    conversationItem.dataset.id = conversation._id;

    conversationItem.innerHTML = `
            <h4>${conversation.name}</h4>
            <div class="last-message">${conversation.latestMessage ? conversation.lastestMessage : 'No messages yet'}</div>
    `;

    conversationItem.addEventListener('click', () => {
      this.socketManager.emit('here is conversation_id, give me my messages', conversation._id, (response) => {
        if (response.status === 'ok') {
          const chatManager = new ChatManager();
          chatManager.renderChatArea(response.data.conversation, response.data.messages);
        } else {
          this.socketManager.showErrorToast(response.error);
        }
      });
      // this.handleSelectConversation(conversation);
    });

    this.conversationList.appendChild(conversationItem);

  }

  handleSelectConversation(conversation) {
    ChatManager.renderChatArea(conversation);
  }

  handleCreateNewConversation() {
    if (this.modalNameInput) {
      const isPrivate = document.getElementById('isConversationPrivate').checked;

      this.socketManager.emit('new conversation', { 
        conversationName: this.modalNameInput.value, 
        isPrivate: isPrivate,
      }, (response) => {
        if (response?.status === 'ok') {
          this.appendNewConversation(response.newConversation);
        } else {
          console.error(response.error);
        }
        this.closeModal();
      });
    } else {
      return;
    }
  }

  openModal() {
    this.newConversationModal.style.display = 'block';
  }

  closeModal() {
    this.newConversationModal.style.display = 'none';
    this.modalNameInput.value = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ConversationManager();
});

export default ConversationManager;
