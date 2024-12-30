class YourFriends {
  constructor(socketManager) {
    this.socketManager = socketManager;
    this.modal = document.getElementById('friendsModal');
    this.friendsList = document.getElementById('friendsList');
    this.openBtn = document.querySelector('.your-friend-btn');
    this.closeBtn = this.modal.querySelector('.close-friends');

    this.openModal = this.openModal.bind(this);
    this.closeModal = this.closeModal.bind(this);

    this.initialize();
  }

  initialize() {
    this.openBtn.addEventListener('click', this.openModal);
    this.closeBtn.addEventListener('click', this.closeModal);
    this.fetchFriend();
  }

  renderFriendList(friends) {
    if (friends.length === 0) {
      this.friendsList.innerHTML = `
                <div class="empty-friends-list">
                    <i class="fas fa-users-slash"></i>
                    <p>No friends found</p>
                </div>
            `;
      return;
    }

    this.friendsList.innerHTML = friends.map(friend => `
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
        `).join('');
  }

  fetchFriend() {
    this.socketManager.emit('give me the list of my friends', '', (response) => {
      if (response.status === 'ok') {
        this.renderFriendList(response.data);
      } else {
        this.socketManager.showErrorToast('Something went wrong while trying to fetch list of friends');
      }
    });

  }

  closeModal() {
    this.modal.style.display = 'none';
  }

  openModal() {
    this.modal.style.display = 'block';
  }

}

export default YourFriends