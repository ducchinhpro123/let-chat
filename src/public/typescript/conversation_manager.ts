import App from "./main";
import DateTimeFormatter from "./date_time_formatter";
import ChatManager from "./chat_manager";
import SocketManager from "./socket_manager";

// import { Conversation, any } from "../../models/conversation";

class ConversationManager {
  // static instance = null;

  newConversationBtn: HTMLElement | null;
  newConversationModal: HTMLElement | null;
  closeBtn: HTMLElement | null | undefined;
  modalNameInput: HTMLInputElement | null;
  confirmBtn: HTMLElement | null;
  conversationList: HTMLElement | null;
  contextMenu: any; // Replace 'any' with the actual type if known
  selectedConversationId: string | null;
  chatManager: ChatManager;
  socketManager: SocketManager;

  constructor() {
    console.log("init conversation manager");

    this.newConversationBtn = document.querySelector(".new-conversation-btn");
    this.newConversationModal = document.getElementById("newConversationModal");
    this.closeBtn = this.newConversationModal?.querySelector(".close-modal");
    this.modalNameInput = document.getElementById(
      "modalName",
    ) as HTMLInputElement;
    this.confirmBtn = document.querySelector(".confirm-new-conversation");
    this.conversationList = document.querySelector(".conversation-list");

    this.contextMenu = this.createContextMenu();
    this.selectedConversationId = null;

    this.chatManager = ChatManager.getInstance();
    this.socketManager = App.getInstance().socketManager;

    this.handleContextMenu = this.handleContextMenu.bind(this);
    this.hideContextMenu = this.hideContextMenu.bind(this);

    document.addEventListener("click", this.hideContextMenu);

    this.initialize();
  }

  initialize() {
    this.newConversationBtn?.addEventListener("click", () => this.openModal());
    this.confirmBtn?.addEventListener("click", () =>
      this.handleCreateNewConversation(),
    );
    this.closeBtn?.addEventListener("click", () => this.closeModal());
  }

  hideContextMenu() {
    this.contextMenu.style.display = "none";
  }

  showConfirmDialog(title: string, message: string) {
    return new Promise((resolve) => {
      const dialog = document.createElement("div") as HTMLElement;
      dialog.className = "confirm-dialog";
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

      const handleConfirm = (confirmed: boolean) => {
        dialog.remove();
        resolve(confirmed);
      };

      const cancelButton = dialog.querySelector(
        ".cancel-btn",
      ) as HTMLButtonElement;
      const confirmButton = dialog.querySelector(
        ".confirm-btn",
      ) as HTMLButtonElement;
      if (cancelButton && confirmButton) {
        cancelButton.onclick = () => handleConfirm(false);
        confirmButton.onclick = () => handleConfirm(true);
      }
    });
  }

  deleteConversation(conversationId: string) {
    const conversationElement = this.conversationList?.querySelector(
      `.conversation-item[data-id="${conversationId}"]`,
    );

    if (conversationElement) {
      conversationElement.remove();
      this.chatManager!.chatMessages!.innerHTML = "";
      this.chatManager!.chatHeader!.innerHTML = "";

      if (this.conversationList?.children.length === 0) {
        this.socketManager.showEmptyState(this);
      }
    }
  }

  async handleDeleteConversation(conversationId: string) {
    try {
      const confirmed = await this.showConfirmDialog(
        "Delete Conversation",
        "Are you sure you want to delete this conversation? This action cannot be undone.",
      );
      if (!confirmed) return;

      this.socketManager.emit(
        "delete this conversation",
        conversationId,
        (response: any) => {
          console.log(response);
          if (response.status === "ok") {
            this.deleteConversation(conversationId);
            this.socketManager.showSuccessToast(
              "Deleted conversation successfully",
            );
          } else {
            this.socketManager.showErrorToast("Failed to delete conversation");
          }
        },
      );
    } catch (e) {
      this.socketManager.showErrorToast(
        "There something went wrong, please logout and login back!",
      );
    }
  }

  handleContextMenuAction(action: string, conversation: any) {
    switch (action) {
      case "view":
      case "mute":
      case "mark-read":
      case "delete":
        this.handleDeleteConversation(conversation._id.toString());
        break;
    }
    this.hideContextMenu();
  }

  handleContextMenu(event: MouseEvent, conversation: any | any) {
    event.preventDefault();

    this.selectedConversationId = conversation._id.toString();
    const { clientX: mouseX, clientY: mouseY } = event;
    this.contextMenu.style.display = "block";

    const menuWidth = this.contextMenu.offsetWidth;
    const menuHeight = this.contextMenu.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const menuX =
      mouseX + menuWidth > windowWidth ? windowWidth - menuWidth - 5 : mouseX;

    const menuY =
      mouseY + menuHeight > windowHeight
        ? windowHeight - menuHeight - 5
        : mouseY;

    this.contextMenu.style.left = `${menuX}px`;
    this.contextMenu.style.top = `${menuY}px`;

    this.contextMenu.innerHTML = `
      <div class="menu-item view" data-action="view">
      <i class="fas fa-eye"></i> View Conversation
      </div>
      <div class="menu-item mute" data-action="mute">
      <i class="fas fa-bell-slash"></i> ${conversation.isMuted ? "Unmute" : "Mute"} Conversation
      </div>
      <div class="menu-item mark-read" data-action="mark-read">
      <i class="fas fa-check-double"></i> Mark as Read
      </div>
      <div class="menu-item delete" data-action="delete">
      <i class="fas fa-trash"></i> Delete Conversation
      </div>
      `;

    (
      this.contextMenu.querySelectorAll(".menu-item") as NodeListOf<HTMLElement>
    ).forEach((item: any) => {
      item.addEventListener("click", (e: MouseEvent) => {
        const action = (e.currentTarget as HTMLDivElement).dataset.action;
        if (action) {
          this.handleContextMenuAction(action, conversation);
        }
      });
    });
  }

  createContextMenu() {
    const menu = document.createElement("div");
    menu.className = "conversation-context-menu";
    menu.style.display = "none";
    document.body.appendChild(menu);

    return menu;
  }

  showLoadingState() {
    this.chatManager!.chatMessages!.classList.remove("padding-20px");
    const loading = document.querySelector(
      ".conversations-loading",
    ) as HTMLElement;

    if (loading) {
      loading.style.height = "100vh";
      loading.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Loading your messages...</p>
        `;
    }
  }

  hideLoadingState() {
    const loadingElement = document.querySelector(
      ".conversations-loading",
    ) as HTMLElement;
    loadingElement.style.height = "0px";
    loadingElement.innerHTML = "";
  }

  removeEmptyState() {
    const empty = this.conversationList!.querySelector(".empty-conversations");
    if (empty) {
      empty.remove();
    }
  }

  appendNewConversation(conversation: any) {
    const currentUsername = document.getElementById("username");

    this.removeEmptyState();

    const conversationItem = document.createElement("div") as HTMLElement;
    conversationItem.className = "conversation-item";
    conversationItem.dataset.id = conversation._id.toString();

    if (
      this.conversationList!.querySelector(
        `.conversation-item[data-id="${conversation._id}"]`,
      )
    ) {
      return;
    }

    let formattedDateLatestMsg = "No messages yet";
    let formattedLatestMessage = conversation.latestMessage.content;

    if (formattedLatestMessage.length > 20) {
      formattedLatestMessage = formattedLatestMessage.substring(0, 20) + "...";
    }

    if (!formattedLatestMessage || formattedLatestMessage.length === 0) {
      formattedLatestMessage = "No messages yet";
    }

    if (
      conversation.latestMessage &&
      "createdAt" in conversation.latestMessage
    ) {
      formattedDateLatestMsg = DateTimeFormatter.formatDateTime(
        conversation.latestMessage.createdAt.toString(),
      );
    }

    let isYou = "";
    if (
      conversation.latestMessage &&
      "sender" in conversation.latestMessage &&
      conversation.latestMessage.sender &&
      "username" in conversation.latestMessage.sender
    ) {
      isYou =
        conversation.latestMessage.sender.username ===
        currentUsername?.innerHTML.trim()
          ? "You"
          : conversation.latestMessage.sender.username;
    }

    // const latestMsg = conversation.latestMessage?.createdAt?Data

    if (conversation.type === "private") {
      conversationItem.innerHTML = `
        <div class="conversation-item private">
        <div class="conversation-icon">
        <i class="fas fa-user"></i>
        </div>
        <div class="conversation-details">
        <h4>${conversation.name}</h4>
        <div class="last-message">
        <i class="far fa-clock"></i>
        <strong>${isYou}</strong>: ${formattedLatestMessage}
        </div>
        </div>
        </div>
        `;
    } else {
      conversationItem.innerHTML = `
        <div class="conversation-item group">
        <div class="conversation-icon">
        <i class="fas fa-users"></i>
        </div>
        <div class="conversation-details">
        <h4>${conversation.name}</h4>
        <div class="last-message">
        <i class="far fa-clock"></i>
        <strong>${isYou}</strong>: ${formattedLatestMessage}
        </div>
        </div>
        </div>
        `;
    }

    conversationItem.addEventListener("click", () => {
      this.handleSelectConversation(conversation._id.toString());
    });

    conversationItem.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.handleContextMenu(e, conversation);
    });

    this.conversationList!.appendChild(conversationItem);
  }

  removeWelcomeScreen() {
    const welcomeScreen =
      this.chatManager?.chatArea!.querySelector(".welcome-screen");
    if (welcomeScreen) {
      welcomeScreen.remove();
    }
    // this.displayInputArea();
  }

  handleSelectConversation(conversationId: string) {
    this.chatManager.removeChatArea();
    this.showLoadingState();
    this.removeWelcomeScreen();

    const timeoutId = setTimeout(() => {
      this.hideLoadingState();
    }, 5000);

    this.socketManager.emit(
      "here is conversation_id, give me my messages",
      conversationId,
      (response) => {
        if (response.status === "ok") {
          clearTimeout(timeoutId);
          this.hideLoadingState();
          this.removeWelcomeScreen();
          this.chatManager.renderChatArea(
            response.data.conversation,
            response.data.messages,
          );
        } else {
          this.socketManager.showErrorToast(response.error);
        }
      },
    );
    // this.handleSelectConversation(conversation);
  }

  handleCreateNewConversation() {
    if (this.modalNameInput) {
      const privateCheckBox = document.getElementById(
        "isConversationPrivate",
      ) as HTMLInputElement | null;
      const isPrivate = privateCheckBox?.checked ?? false;

      this.socketManager.emit(
        "new conversation",
        {
          conversationName: this.modalNameInput.value,
          isPrivate: isPrivate,
        },
        (response) => {
          if (response?.status === "ok") {
            this.appendNewConversation(response.newConversation);
          } else {
            console.error(response.error);
          }
          this.closeModal();
        },
      );
    } else {
      return;
    }
  }

  openModal() {
    this.newConversationModal!.style.display = "block";
  }

  closeModal() {
    this.newConversationModal!.style.display = "none";
    this.modalNameInput!.value = "";
  }
}

export default ConversationManager;
