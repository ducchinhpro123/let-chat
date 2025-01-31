import ChatManager from './chat_manager';
import SocketManager from "./socket_manager";
import ConversationManager from "./conversation_manager";

class YourFriends {
    socketManager: SocketManager;
    modal: HTMLElement | null;
    friendsList: HTMLElement | null;
    openBtn: HTMLButtonElement | null;
    private closeBtn: HTMLButtonElement | null;
    chatManager: ChatManager | null;
    conversationManager: ConversationManager | null;

    constructor(socketManager: SocketManager) {
        console.log('init yo8ur friendcA;');
        this.socketManager = socketManager;
        this.modal = document.getElementById('friendsModal');
        this.friendsList = document.getElementById('friendsList');
        this.openBtn = document.querySelector('.your-friend-btn');
        this.closeBtn = this.modal!.querySelector('.close-friends');

        this.openModal = this.openModal.bind(this);
        this.closeModal = this.closeModal.bind(this);

        this.chatManager = ChatManager.getInstance();
        this.conversationManager = this.socketManager.conversationManager;

        this.initialize();
    }

    initialize() {
        this.openBtn!.addEventListener('click', this.openModal);
        this.closeBtn!.addEventListener('click', this.closeModal);
        this.fetchFriend();
    }

    renderFriendList(friends: Array<any>) {
        if (friends.length === 0) {
            this.friendsList!.innerHTML = `
                <div class="empty-friends-list">
                    <i class="fas fa-users-slash"></i>
                    <p>No friends found</p>
                </div>
            `;
            return;
        }

        this.friendsList!.innerHTML = friends.map(friend => `
            <div class="friend-item" data-id="${friend._id}">
                <div class="friend-info">
                    <div class="friend-avatar">
                        <img src="https://api.dicebear.com/9.x/pixel-art/svg?seed=${friend.recipient.username}" alt="Avatar" class="popup-avatar">
                    </div>
                    <div class="friend-details">
                        <h3 class="friend-username">${friend.recipient.username}</h3>
                    </div>
                </div>
                <div class="friend-actions">
                    <button class="message-btn" data-id="${friend.recipient._id}">
                        <i class="fas fa-comment"></i>
                    </button>
                    <button class="more-options-btn" data-id="${friend.recipient._id}">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
            </div>
        `
        ).join('');

        friends.forEach(friend => {
            const msgFriendBtn = this.friendsList!.querySelector(`.message-btn[data-id="${friend.recipient._id}"]`);
            if (msgFriendBtn) {
                msgFriendBtn.addEventListener('click', () => this.handleChatBtn(friend.recipient._id));
            }
        });
    }

    async getMessagesBetweenMeAndMyFriend(friendId: string): Promise<{conversation: any, messages: any[]}> {
        return new Promise((resolve, reject) => {
            this.socketManager.emit('give me my conversation between my friend and I', {friendId}, (response) => {
                if (response.status === 'ok') {
                    resolve(response);
                } else {
                    this.socketManager.showErrorToast(response.error);
                    reject(response.error);
                }
            });
        })
    }

    /* Render a conversation */
    async renderChatArea(friendId: string) {
        try {
            const response = await this.getMessagesBetweenMeAndMyFriend(friendId);
            this.closeModal();
            this.conversationManager?.removeWelcomeScreen();
            this.chatManager?.renderChatArea(response.conversation, response.messages);

            if (this.conversationManager) {
                this.conversationManager.appendNewConversation(response.conversation);
            }
        } catch (e) {
            console.log(e);
        }
    }

    async handleChatBtn(friendId: string) {
        this.renderChatArea(friendId);
    }

    fetchFriend() {
        this.socketManager.emit('give me the list of my friends', '', (response) => {
            console.log(response);
            if (response.status === 'ok') {
                this.renderFriendList(response.data);
            } else {
                this.socketManager.showErrorToast('Something went wrong while trying to fetch list of friends');
            }
        });
    }

    closeModal() {
        this.modal!.style.display = 'none';
    }

    openModal() {
        this.modal!.style.display = 'block';
    }

}

export default YourFriends
