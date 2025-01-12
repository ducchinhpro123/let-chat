import ConversationManager from "./conversation_manager";
import AnnouncementManager from "./announcement_manager";

// import { io } from "socket.io-client";
import io, { Socket } from 'socket.io-client';
// import { io, Socket } from 'socket.io-client';

interface Events {
  [key: string]: Function[];
}

class SocketManager {
  private events: Events;
  conversationManager: ConversationManager | null;
  private userId: string | undefined;
  socket: any;

  constructor() {
    this.socket = io;
    this.events = {};
    const userIdElement = document.getElementById(
      "userid-hidden",
    ) as HTMLInputElement;

    if (!userIdElement) {
      throw new Error("User ID element not found");
    }

    this.conversationManager = null;
  }

  initialize() {
    try {
      this.socket = io(window.location.origin, {
        auth: {
          token: this.getWSToken(),
        },
        reconnection: true,
        transports: ["websocket"],
        upgrade: false,
        reconnectionAttempts: 3,
      });

      this.setupEventListeners();
      return this.socket;
    } catch (e: unknown) {
      console.error(e);
      const errorMessage =
        e instanceof Error ? e.message : "An unknown error occurred";
      this.showErrorToast(errorMessage);
    }
  }

  getWSToken(): string | undefined {
    try {
      const cookies: { [key: string]: string } = document.cookie
        .split(";")
        .map((cookie: string) => cookie.trim())
        .reduce((acc: { [key: string]: string }, curr: string) => {
          const [key, value] = curr.split("=");
          acc[key] = value;
          return acc;
        }, {});
      return cookies["wsToken"];
    } catch (e) {
      this.redirectToAuth();
    }
  }

  showSuccessToast(message: string) {
    const toast = document.createElement("div");
    toast.className = "success-toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  showErrorToast(message: string) {
    const toast = document.createElement("div");
    toast.className = "error-toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  setupEventListeners() {
    this.socket.on("connect", () => {
      this.showSuccessToast("connected");
    });

    // this.socket.emit("user:connect", this.userId);

    this.socket.on("disconnect", () => {
      this.showErrorToast("disconnected");
    });

    this.socket.on(
      "One of you friend has added you to a conversation",
      (response: any) => {
        console.log(response);
      },
    );

    this.socket.on("friend request accepted", (response: any) => {
      console.log(response);
    });

    this.socket.on("session_expired", (url: string) => {
      window.location.href = url;
    });

    const conversationManager = new ConversationManager();
    this.conversationManager = conversationManager;
    this.showLoadingState(conversationManager);

    const timeoutId = setTimeout(() => {
      this.hideLoadingState(conversationManager);
      this.showErrorToast(
        "Request timed out. Server is taking too long to respond. Please logout and login back",
      );
    }, 10000);

    this.socket.emit("give me my conversations", "", (response: any) => {
      clearTimeout(timeoutId);

      if (response?.status === "ok") {
        this.hideLoadingState(conversationManager);

        const conversations = Array.from(response.conversations);
        if (conversations.length === 0) {
          this.showEmptyState(conversationManager);
        } else {
          conversations.forEach((conv: any) => {
            conversationManager.appendNewConversation(conv);
          });
        }
      } else {
        this.showErrorToast(response.error);
      }
    });

    this.socket.on("someone sends you an invite", (data: any) => {
      const announcementManager = AnnouncementManager.getInstance();
      if (announcementManager) {
        announcementManager.openModal();
      }
      console.log(data);
    });
  }

  hideLoadingState(conversationManager: ConversationManager) {
    const loadingElement = conversationManager!.conversationList!.querySelector(
      ".conversations-loading",
    );
    if (loadingElement) {
      loadingElement.remove();
    }
  }

  showLoadingState(conversationManager: ConversationManager) {
    conversationManager!.conversationList!.innerHTML = `
      <div class="conversations-loading">
        <div class="loading-spinner"></div>
        <p>Loading your conversations...</p>
      </div>
    `;
  }

  showEmptyState(conversationManager: ConversationManager) {
    conversationManager!.conversationList!.innerHTML = `
      <div class="empty-conversations">
        <div class="empty-icon">💭</div>
        <h3>No conversations yet</h3>
        <p>Start chatting with your friends!</p>
      </div>
    `;
  }

  emit(event: string, data?: any, callback?: (response: any) => void) {
    if (!this.socket) {
      console.log("Socket not initialized");
      return;
    }
    this.socket.emit(event, data, callback);
  }

  on(event: string, handler: Function) {
    if (!this.socket) {
      console.log("Socket not initialized");
      return;
    }
    this.socket.on(event, handler);
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(handler);
  }

  redirectToAuth() {
    try {
      window.location.href = "/users/authentication";
      return null;
    } catch (e) {
      console.log("error redirecting");
      return null;
    }
  }
}

export default SocketManager;
