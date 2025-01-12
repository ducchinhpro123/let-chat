import FriendSearch from "./friend_search";
import App from "./main";
import SocketManager from "./socket_manager";

class ChatManager {
  static instance: ChatManager | null = null;

  socketManager: SocketManager | undefined;
  chatArea: HTMLElement | null | undefined;
  chatMessages: HTMLElement | null | undefined;
  chatHeader: HTMLElement | null | undefined;
  messageInput: HTMLElement | null | undefined;
  editor: any;
  chatInput: HTMLElement | null | undefined;
  sendBtn: HTMLElement | null | undefined;
  username: string | undefined;
  typingIndicator: HTMLElement | null | undefined;
  typingText: HTMLElement | null | undefined;
  selectedConversationId: string | undefined;
  contextMenu: HTMLElement | null | undefined;
  friendSearch: FriendSearch | undefined;
  HREditor: any;
  EmojiPicker: any

  constructor() {
    if (ChatManager.instance) {
      return ChatManager.instance;
    }
    ChatManager.instance = this;
    console.log("init chat manager");

    this.socketManager = App.getInstance().socketManager;
    this.chatArea = document.querySelector(".main-chat") as HTMLElement | null;
    this.chatMessages = document.querySelector(
      ".chat-messages",
    ) as HTMLElement | null;
    this.chatHeader = document.querySelector(
      ".chat-header",
    ) as HTMLElement | null;
    this.chatInput = document.querySelector(
      ".chat-input",
    ) as HTMLElement | null;
    this.sendBtn = document.querySelector(".send-button") as HTMLElement | null;
    this.typingIndicator = document.querySelector(
      ".typing-indicator",
    ) as HTMLElement | null;
    this.typingText = document.querySelector(
      ".typing-text",
    ) as HTMLElement | null;
    this.messageInput = null;
    this.editor = null;
    this.handleSendMessage = this.handleSendMessage.bind(this);
    this.username = (
      document.querySelector("#username-hidden") as HTMLInputElement
    ).value;
    this.selectedConversationId = this.chatHeader?.dataset.id;

    this.contextMenu = this.createContextMenu();

    this.friendSearch = new FriendSearch();

    this.handleContextMenu = this.handleContextMenu.bind(this);
    this.hideContextMenu = this.hideContextMenu.bind(this);
    this.handleContextMenuAction = this.handleContextMenuAction.bind(this);
    this.removeNodeMessage = this.removeNodeMessage.bind(this);

    document.addEventListener("click", this.hideContextMenu);
  }

  static getInstance(): ChatManager {
    if (!ChatManager.instance) {
      ChatManager.instance = new ChatManager();
    }
    return ChatManager.instance;
  }

  initialize() {
    this.socketManager?.on("new message", (data: any) => {
      if (data.message) {
        this.appendMessage(data.message, data.conversation._id);
      }
    });

    this.socketManager?.on("remove message", (data: any) => {
      if (data.messageId) {
        this.removeNodeMessage(data.messageId);
      }
    });

    this.userTyping();
    this.userStopTyping();
  }

  createContextMenu() {
    const menu = document.createElement("div");
    menu.className = "message-context-menu";
    menu.style.display = "none";
    document.body.appendChild(menu);

    return menu;
  }

  hideUserTypingIndicator() {
    this.typingIndicator!.style.display = "none";
    this.typingText!.innerHTML = ``;
  }

  displayUserTypingIndicator(username: string) {
    this.typingIndicator!.style.display = "flex";
    this.typingText!.innerHTML = `${username} is typing`;
  }

  userStopTyping() {
    this.socketManager?.on("user stop typing", () => {
      this.hideUserTypingIndicator();
    });
  }

  userTyping() {
    this.socketManager?.on("user typing", (response: any) => {
      this.displayUserTypingIndicator(response.username);
    });
  }

  messageTypingIndicator() {
    let typingTimeout: NodeJS.Timeout | null = null;
    this.editor.onChange(() => {
      if (!typingTimeout) {
        this.socketManager?.emit("typing", {
          conversationId: this.chatHeader?.dataset.id,
          username: this.username,
        });

        if (typingTimeout) {
          clearTimeout(typingTimeout);
        }

        typingTimeout = setTimeout(() => {
          this.socketManager?.emit("stop typing", {
            conversationId: this.chatHeader?.dataset.id,
          });
          typingTimeout = null;
        }, 1000);
      }
    });
  }

  setupEventListeners() {
    // Button click
    this.sendBtn?.addEventListener("click", this.handleSendMessage);
    // Enter press
    const editorElement = this.chatArea?.querySelector(
      ".hr-editor",
    ) as HTMLElement | null;
    editorElement?.addEventListener("keypress", (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });
  }

  getChatHeader(conversation: any) {
    return `
              <div class="header-left">
                  <h2>${conversation.name}</h2>
                  <span class="member-count">
                    ${
                      conversation.participants.length > 1
                        ? `${conversation.participants.length} members`
                        : `${conversation.participants.length} member`
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
    const inviteBtn = this.chatHeader?.querySelector(".btn-invite");
    inviteBtn?.addEventListener("click", () => {
      this.friendSearch?.openModal();
    });
  }

  hideContextMenu() {
    this.contextMenu!.style.display = "none";
  }

  removeNodeMessage(messageId: string) {
    const selectedMsg = this.chatMessages?.querySelector(
      `[data-id="${messageId}"]`,
    ) as HTMLElement;

    selectedMsg.style.transition = "opacity 0.3s ease";
    selectedMsg.style.opacity = "0";

    setTimeout(() => {
      selectedMsg.remove();
    }, 300);
  }

  handleContextMenuAction(
    action: string | undefined,
    messageId: string,
    conversationId: string,
  ) {
    if (!this.socketManager) {
      console.error("socketManager is not initialized");
      return;
    }

    switch (action) {
      case "delete":
        this.socketManager.emit(
          "delete message",
          { messageId, conversationId },
          (response: any) => {
            if (response.status === "error") {
              this.socketManager!.showErrorToast(response.error);
            }
          },
        );
    }
  }

  handleContextMenu(e: any, messageId: string, conversationId: string) {
    e.preventDefault();
    const { clientX: mouseX, clientY: mouseY } = e;
    this.contextMenu!.style.display = "block";

    const menuWidth = this.contextMenu!.offsetWidth;
    const menuHeight = this.contextMenu!.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const menuX =
      mouseX + menuWidth > windowWidth ? windowWidth - menuWidth - 5 : mouseX;

    const menuY =
      mouseY + menuHeight > windowHeight
        ? windowHeight - menuHeight - 5
        : mouseY;

    this.contextMenu!.style.left = `${menuX}px`;
    this.contextMenu!.style.top = `${menuY}px`;

    this.contextMenu!.innerHTML = `
      <div class="menu-item delete" data-action="delete">
        <i class="fas fa-trash"></i> Delete message
      </div>
    `;

    this.contextMenu?.querySelectorAll(".menu-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        const action = (e.currentTarget as HTMLElement).dataset.action;
        this.handleContextMenuAction(action, messageId, conversationId);
      });
    });
  }

  getEmptyHTML(createdAt: any) {
    return ` <div class="empty-chat-content">
        <div class="empty-chat-icon">
        <i class="far fa-comments"></i>
        </div>
        <h3>No messages yet</h3>
        <p>Be the first one to send a message in this conversation!</p>
        <p class="conversation-created">Conversation created on ${new Date(
          createdAt,
        ).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}</p>
        </div> `;
  }

  getSenderMessage(message: any, conversationId: string) {
    const sender = document.createElement("div");
    sender.className = "message sent";
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

    sender.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.handleContextMenu(e, message._id, conversationId);
    });

    return sender;
  }

  getReceiverSendMessage(message: any, previousMsg: any) {
    const receiver = document.createElement("div");
    receiver.className = "message received";
    receiver.dataset.id = message._id.toString();

    const isSameSender =
      !previousMsg ||
      previousMsg.isCurrentUser ||
      previousMsg.sender.username !== message.sender.username;

    receiver.innerHTML = `
                <div class="message-avatar" ${!isSameSender ? 'style="visibility: hidden;"' : ""}>
                    <img src="https://ui-avatars.com/api/?name=${message.sender.username}" alt="avatar">
                </div>
                <div class="message-bubble">
                    <div class="message-info" ${!isSameSender ? 'style="visibility: hidden;"' : ""}>
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
    if (this.chatArea?.querySelector(".empty-chat-state")) {
      this.chatArea!.querySelector(".empty-chat-state")?.remove();
    }

    if (this.chatMessages) {
      this.chatMessages.innerHTML = "";
      this.chatHeader!.innerHTML = "";
    }
  }

  renderInputArea() {
    console.log("displayInputArea get called");
    // const inputArea = this.chatManager.chatInput;
    if (!this.editor) {
      const container = document.querySelector(".input-container");
      this.setupEventListeners();
      this.messageTypingIndicator();
    }

    if (this.chatInput) {
      if (this.chatInput.style.display === "block") {
        return;
      } else {
        this.chatInput.style.display = "block";
      }
    }
  }

  renderChatArea(conversation: any, messages: Array<any>) {
    // this.chatArea
    this.removeChatArea();

    if (!messages || messages.length === 0) {
      this.chatHeader!.innerHTML = this.getChatHeader(conversation);
      this.chatHeader!.dataset.id = conversation._id;

      this.handleOpenUserSearch(); // Modal

      const empty = document.createElement("div");
      empty.className = "empty-chat-state";
      empty.innerHTML = this.getEmptyHTML(conversation.createdAt);

      this.chatArea!.insertBefore(empty, this.chatInput!);
      return;
    }

    this.chatHeader!.innerHTML = this.getChatHeader(conversation);
    this.chatHeader!.dataset.id = conversation._id;

    this.chatMessages!.classList.add("padding-20px");

    messages.forEach((message, index) => {
      if (!message.isCurrentUser) {
        this.chatMessages!.appendChild(
          this.getReceiverSendMessage(message, messages[index - 1]),
        );
      } else {
        this.chatMessages!.appendChild(
          this.getSenderMessage(message, conversation._id),
        );
      }
    });

    this.handleOpenUserSearch(); // Modal
    this.chatMessages!.scrollTop = this.chatMessages!.scrollHeight;
    this.renderInputArea();
  }

  // Append new message to messge container
  appendMessage(message: any, conversationId: string) {
    const emptyChatState = document.querySelector(".empty-chat-state");
    if (emptyChatState) {
      emptyChatState.remove();
    }

    const isCurrentUser =
      document.getElementById("username")?.innerHTML.trim() ===
      message.sender.username.trim();

    if (isCurrentUser) {
      const sender = document.createElement("div");
      sender.className = "message sent";
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

      sender.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        this.handleContextMenu(e, message._id, conversationId);
      });

      this.chatMessages?.appendChild(sender);
    } else {
      const receiver = document.createElement("div");
      receiver.className = "message received";
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

      this.chatMessages?.appendChild(receiver);
    }
    this.chatMessages!.scrollTop = this.chatMessages!.scrollHeight;
  }

  handleSendMessage() {
    let content = this.editor.getContent();
    content = content.replace(/<br>$/, "");

    if (!content) {
      return;
    }

    const data = {
      msg: content,
      conversation_id: this.chatHeader?.dataset.id,
    };

    if (this.socketManager) {
      this.socketManager.emit(
        "I just sent a new message",
        data,
        (response: any) => {
          if (response.status === "ok") {
            this.appendMessage(response.message, response.conversation._id);
          }
          if (response.status === "error") {
            this.socketManager?.showErrorToast(response.error);
          }
        },
      );
    }
    this.editor.setContent("");
  }
}

export default ChatManager;
