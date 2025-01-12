import SocketManager from "./socket_manager";
import App from "./main";
import ListFriends from "./list_friends";

// import { IUser } from "../../models";

class FriendSearch {
  socketManager: SocketManager;
  inviteModal: HTMLElement | null;
  closeInviteModalBtn: HTMLElement | null;
  friendSearch: HTMLInputElement | null | undefined;
  friendsList: HTMLElement | null | undefined;
  performUserSearch: HTMLButtonElement | null | undefined;
  listFriends: ListFriends;
  cachedFriends: any[] | null;
  lastFetchTime: number | null;
  CACHE_DURATION: number;
  friendsSet: Set<string>;
  friends: any[];

  constructor() {
    // console.log('New instance created');
    this.socketManager = App.getInstance().socketManager;
    this.inviteModal = document.getElementById("inviteModal");
    this.closeInviteModalBtn = document.querySelector(".close-modal");
    this.friendSearch = this.inviteModal?.querySelector("#friendSearch");
    this.friendsList = this.inviteModal?.querySelector(".friends-list");
    this.performUserSearch = this.inviteModal?.querySelector(
      ".perform-search-user",
    );

    this.listFriends = new ListFriends(this.socketManager);
    this.cachedFriends = null;
    this.lastFetchTime = null;
    this.CACHE_DURATION = 5 * 60 * 1000;

    this.friendsSet = new Set();
    this.friends = [];

    this.initializeSearch();
  }

  handlePressSearchBtn() {
    this.performUserSearch?.addEventListener("click", () => {
      const term = this.friendSearch?.value.trim();
      if (term) {
        this.performSearch(term);
      }
    });

    this.friendSearch?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const term = this.friendSearch?.value.trim();
        if (term) {
          this.performSearch(term);
        }
      }
    });
  }

  initializeSearch() {
    if (!this.friendSearch) {
      console.log("Input search can not be found");
      return;
    }

    this.closeInviteModalBtn?.addEventListener("click", () => {
      this.closeModal();
    });
  }

  closeModal() {
    this.inviteModal!.style.display = "none";
  }

  async updateFriendsListCache() {
    try {
      const friends = await this.listFriends.getListFriends();
      this.cachedFriends = friends;
      // this.lastFetchTime = currentTime;
      return friends;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async getFriendsListWithCache() {
    const currentTime = Date.now();

    if (
      this.cachedFriends &&
      this.lastFetchTime &&
      currentTime - this.lastFetchTime < this.CACHE_DURATION
    ) {
      return this.cachedFriends;
    }

    try {
      const friends = await this.listFriends.getListFriends();
      this.cachedFriends = friends;
      this.lastFetchTime = currentTime;
      return friends;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async openModal() {
    try {
      this.inviteModal!.style.display = "block";
      this.friendsList!.innerHTML = '<div class="loading-spinner"></div>';

      const friends = await this.getFriendsListWithCache();

      if (friends && friends.length > 0) {
        this.friendsList!.innerHTML = "";
        friends.forEach((user) => {
          this.appendFriendAdded(user);
        });
      } else {
        this.friendsList!.innerHTML = "<p>No friends found</p>";
      }

      this.handlePressSearchBtn();
    } catch (e) {
      console.error(e);
      this.friendsList!.innerHTML = "<p>Error loading friends</p>";
    }
  }

  clearResults() {
    this.friendsList!.innerHTML = "";
    this.friendSearch!.value = "";
    this.friendsSet.clear();
  }

  appendFriendAdded(user: any) {
    const friendItem = document.createElement("div");

    const isYourFriend = this.cachedFriends?.some(
      (relationShip) =>
        relationShip.recipient.username === user.username ||
        relationShip.recipient._id === user._id,
    );

    friendItem.className = "friend-item";
    friendItem.innerHTML = `
        <img src="https://api.dicebear.com/9.x/pixel-art/svg?seed=${user.recipient.username}" alt="Avatar" class="friend-avatar">
        <div class="friend-info">
          <div class="friend-name">${user.recipient.username}</div>
          <div class="friend-status">${new Date(user.createdAt).toLocaleString()}</div>
        </div>
        <button class="invite-friend-btn" data-user-id=${user.requester._id}>
          Invite
        </button>
    `;

    if (isYourFriend) {
      const inviteFBtn = friendItem.querySelector(".invite-friend-btn");
      if (inviteFBtn) {
        let chatHeader = document.querySelector(".chat-header") as HTMLElement;
        const conversationId = chatHeader?.dataset.id;

        inviteFBtn.addEventListener("click", () =>
          this.handlAddFriendToConversation(user._id, conversationId),
        );
      }
    } else {
      const inviteFBtn = friendItem.querySelector(".invite-friend-btn");
      if (inviteFBtn) {
        inviteFBtn.addEventListener("click", () => this.handleInvite(user._id));
      }
    }

    this.friendsList?.appendChild(friendItem);
  }

  appendFriendItem(user: any) {
    const friendItem = document.createElement("div");
    friendItem.className = "friend-item";

    const isYourFriend = this.cachedFriends?.some(
      (relationShip) =>
        relationShip.recipient.username === user.username ||
        relationShip.recipient._id === user._id,
    );

    friendItem.innerHTML = `
        <img src="https://api.dicebear.com/9.x/pixel-art/svg?seed=${user.username}" alt="Avatar" class="friend-avatar">
        <div class="friend-info">
          <div class="friend-name">${user.username}</div>
          <div class="friend-status">${isYourFriend ? "Your friend" : "Send a request"}</div>
        </div>
        <button class="invite-friend-btn" data-user-id=${user._id}>
          ${isYourFriend ? "Add" : "Invite"}
        </button>
    `;

    if (isYourFriend) {
      // add a friend to group
      const inviteFBtn = friendItem.querySelector(".invite-friend-btn");
      if (inviteFBtn) {
        let chatHeader = document.querySelector(".chat-header") as HTMLElement;
        const conversationId = chatHeader?.dataset.id;

        inviteFBtn.addEventListener("click", () =>
          this.handlAddFriendToConversation(
            user._id.toString(),
            conversationId,
          ),
        );
      }
    } else {
      const inviteFBtn = friendItem.querySelector(".invite-friend-btn");
      if (inviteFBtn) {
        inviteFBtn.addEventListener("click", () =>
          this.handleInvite(user._id.toString()),
        );
      }
    }

    this.friendsList?.appendChild(friendItem);
  }

  handlAddFriendToConversation(
    userId: string,
    conversationId: string | undefined,
  ) {
    if (typeof conversationId === "undefined") {
      this.socketManager.showErrorToast("ConversationId is undefined");
      return;
    }
    this.socketManager.emit(
      "add my friend to this conversation",
      { userId, conversationId },
      (response) => {
        if (response.status === "ok") {
          this.socketManager.showSuccessToast(response.message);
        } else {
          this.socketManager.showErrorToast(response.error);
        }
      },
    );
  }

  handleInvite(userId: string) {
    this.socketManager.emit(
      "send my invitation to this user has id",
      userId,
      (response) => {
        if (response.status === "ok") {
          this.socketManager.showSuccessToast(response.message);
        } else {
          this.socketManager.showErrorToast(response.error);
        }
      },
    );
  }

  performSearch(searchTerm: string) {
    this.clearResults();

    this.performUserSearch!.disabled = true;
    this.performUserSearch!.innerHTML = "Searching...";

    this.socketManager.emit(
      "help me find this user with username",
      searchTerm,
      (response) => {
        if (response.status === "ok") {
          this.performUserSearch!.disabled = false;
          this.performUserSearch!.innerHTML = "Search";

          if (response.friends.length === 0) {
            this.friendsList!.innerHTML =
              '<div class="no-results">No users found</div>';
            return;
          }

          response.friends.forEach((user: unknown) => {
            const typedUser: any = user;
            if (!this.friendsSet.has(typedUser._id.toString())) {
              this.friendsSet.add(typedUser._id.toString());
              this.appendFriendItem(typedUser);
            }
          });
        } else {
          this.performUserSearch!.disabled = false;
          this.performUserSearch!.innerHTML = "Searching";

          this.socketManager.showErrorToast(response.error);
        }
      },
    );
  }
}

export default FriendSearch;
