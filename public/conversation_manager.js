import App from '/main.js';
import DateTimeFormatter from '/date_time_formatter.js';
import ChatManager from '/chat_manager.js';

class ConversationManager {
  constructor() {
    this.newConversationBtn = document.querySelector('.new-conversation-btn');
    this.newConversationModal = document.getElementById('newConversationModal');
    this.closeBtn = this.newConversationModal.querySelector('.close-modal');
    this.modalNameInput = document.getElementById('modalName');
    this.confirmBtn = document.querySelector('.confirm-new-conversation');
    this.conversationList = document.querySelector('.conversation-list');

    this.contextMenu = this.createContextMenu();
    this.selectedConversationId = null;
    this.chatManager = null;
    this.socketManager = App.getInstance().socketManager;

    this.handleContextMenu = this.handleContextMenu.bind(this);
    this.hideContextMenu = this.hideContextMenu.bind(this);

    document.addEventListener('click', this.hideContextMenu);


    this.initialize();
  }

  initialize() {
    this.newConversationBtn.addEventListener('click', () => this.openModal());
    this.confirmBtn.addEventListener('click', () => this.handleCreateNewConversation());
    this.closeBtn.addEventListener('click', () => this.closeModal());
  }

  hideContextMenu() {
    this.contextMenu.style.display = 'none';
  }

  showConfirmDialog(title, message) {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'confirm-dialog';
      dialog.innerHTML = `
        <div class="confirm-dialog-content">
          <h3>${title}</h3>
          <p>${message}</p>
          <div class="confirm-dialog-actions">
            <button class="cancel-btn">Cancel</button>
            <button class="confirm-btn">Delete</button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      const handleConfirm = (confirmed) => {
        dialog.remove();
        resolve(confirmed);
      };

      dialog.querySelector('.cancel-btn').onclick = () => handleConfirm(false);
      dialog.querySelector('.confirm-btn').onclick = () => handleConfirm(true);
    });
  }

  deleteConversation(conversationId) {
    const conversationElement = this.conversationList.querySelector(
      `.conversation-item[data-id="${conversationId}"]`
    );

    if (conversationElement) {
      conversationElement.remove();
      if (this.conversationList.children.length === 0) {
        this.socketManager.showEmptyState(this);
      }
    }
  }

  async handleDeleteConversation(conversationId) {
    try {
      const confirmed = await this.showConfirmDialog(
        'Delete Conversation',
        'Are you sure you want to delete this conversation? This action cannot be undone.'
      );
      if (!confirmed) return;

      this.socketManager.emit('delete this conversation', conversationId, (response) => {
        console.log(response);
        if (response.status === 'ok') {
          this.deleteConversation(conversationId);
          this.socketManager.showSuccessToast('Deleted conversation successfully');
        } else {
          this.socketManager.showErrorToast('Failed to delete conversation');
        }
      });

    } catch (e) {
      this.socketManager.showErrorToast('There something went wrong, please logout and login back!');
    }
  }

  handleContextMenuAction(action, conversation) {
    switch (action) {
      case 'view': 
      case 'mute':
      case 'mark-read':
      case 'delete':
        this.handleDeleteConversation(conversation._id);
        break;
    }
    this.hideContextMenu();
  }

  handleContextMenu(event, conversation) {
    event.preventDefault();

    this.selectedConversationId = conversation._id;
    const { clientX: mouseX, clientY: mouseY } = event;
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
      <div class="menu-item view" data-action="view">
        <i class="fas fa-eye"></i> View Conversation
      </div>
      <div class="menu-item mute" data-action="mute">
        <i class="fas fa-bell-slash"></i> ${conversation.isMuted ? 'Unmute' : 'Mute'} Conversation
      </div>
      <div class="menu-item mark-read" data-action="mark-read">
        <i class="fas fa-check-double"></i> Mark as Read
      </div>
      <div class="menu-item delete" data-action="delete">
        <i class="fas fa-trash"></i> Delete Conversation
      </div>
    `;

    this.contextMenu.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleContextMenuAction(action, conversation);
      });
    });
  }

  createContextMenu() {
    const menu = document.createElement('div');
    menu.className = 'conversation-context-menu';
    menu.style.display = 'none';
    document.body.appendChild(menu);

    return menu;
  }

  showLoadingState() {
    const loading = document.querySelector('.conversations-loading');
    if (loading) {
      loading.style.height = '100vh';
      loading.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Loading your messages...</p>
    `
    }
  }
  
  hideLoadingState() {
    const loadingElement = document.querySelector('.conversations-loading');
    loadingElement.style.height = '0px';
    loadingElement.innerHTML = '';
  }

  removeEmptyState() {
    const empty = this.conversationList.querySelector('.empty-conversations');
    if (empty) {
      empty.remove();
    }
  }

  appendNewConversation(conversation) {
    this.removeEmptyState();

    const conversationItem = document.createElement('div');
    conversationItem.className = 'conversation-item';
    conversationItem.dataset.id = conversation._id;

    let formattedDateLatestMsg = 'No messages yet';
    if (conversation.latestMessage) {
      formattedDateLatestMsg = DateTimeFormatter.formatDateTime(conversation.latestMessage.createdAt);
    }

    // const latestMsg = conversation.latestMessage?.createdAt?Data

    conversationItem.innerHTML = `
            <h4>${conversation.name}</h4>
            <div class="last-message">${formattedDateLatestMsg}</div>
    `;

    conversationItem.addEventListener('click', () => {
      this.handleSelectConversation(conversation._id);
    });

    conversationItem.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.handleContextMenu(e, conversation);
    });

    this.conversationList.appendChild(conversationItem);
  }

  handleSelectConversation(conversationId) {
    console.log("clicked");
    if (!this.chatManager) {
      this.chatManager = new ChatManager();
    }

    if (this.chatManager.chatArea.querySelector('.empty-chat-state')) {
      this.chatManager.chatArea.querySelector('.empty-chat-state').remove();
    }

    if (this.chatManager.chatMessages) {
      this.chatManager.chatMessages.innerHTML = '';
      this.chatManager.chatHeader.innerHTML = '';
    }

    this.showLoadingState();

    const timeoutId = setTimeout(() => {
      this.hideLoadingState();
    }, 5000);

    this.socketManager.emit('here is conversation_id, give me my messages', conversationId, (response) => {
      if (response.status === 'ok') {
        clearTimeout(timeoutId);
        this.hideLoadingState();

        this.chatManager.renderChatArea(response.data.conversation, response.data.messages);
      } else {
        this.socketManager.showErrorToast(response.error);
      }
    });
    // this.handleSelectConversation(conversation);
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
  // new ConversationManager();
});

export default ConversationManager;
