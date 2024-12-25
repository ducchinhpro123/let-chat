import App from '/main.js'

class FriendSearch {
  constructor() {
    this.socketManager = App.getInstance().socketManager;
    this.inviteModal = document.getElementById('inviteModal');
    this.inviteBtn = document.querySelector('.btn-invite');
    this.closeInviteModalBtn = document.querySelector('.close-modal');
    this.friendSearch = document.getElementById('friendSearch');
    this.friendsList = document.querySelector('.friends-list');
    this.performUserSearch = document.querySelector('.perform-search-user');

    this.friendsSet = new Set();
    this.initializeSearch();

  }

  initializeSearch() {
    if (!this.friendSearch) {
      return;
    }

    this.inviteBtn.addEventListener('click', () => {
      this.openModal();
    });

    this.closeInviteModalBtn.addEventListener('click', () => {
      this.closeModal();
    });

    // this.friendSearch.addEventListener('input', () => {
    // });
    this.performUserSearch.addEventListener('click', () => {
      const term = this.friendSearch.value.trim();
      if (term) {
        this.performSearch(term);
      }
    });

    this.friendSearch.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const term = this.friendSearch.value.trim();
        if (term) {
          this.performSearch(term);
        }
      }
    });
  }

  closeModal() {
    this.inviteModal.style.display = 'none';
  }

  openModal() {
    this.inviteModal.style.display = 'block';
  }

  clearResults() {
    this.friendsList.innerHTML = '';
    this.friendSearch.value = '';
    this.friendsSet.clear();
  }

  appendFriendItem(user) {
    const friendItem = document.createElement('div');
    friendItem.className = 'friend-item';
    friendItem.innerHTML = `
        <img src="https://api.dicebear.com/9.x/pixel-art/svg?seed=${user.username}" alt="Avatar" class="friend-avatar">
        <div class="friend-info">
          <div class="friend-name">${user.username}</div>
          <div class="friend-status">${user.status}</div>
        </div>
        <button class="invite-friend-btn" data-user-id=${user._id}>
          Invite
        </button>
    `;

    const inviteFBtn = friendItem.querySelector('.invite-friend-btn');
    if (inviteFBtn) {
      inviteFBtn.addEventListener('click', () => this.handleInvite(user._id));
    }

    this.friendsList.appendChild(friendItem);
  }

  handleInvite(userId) {
    this.socketManager.emit('send my invitation to this user has id', userId, (response) => {
      if (response.status === 'ok') {
        this.socketManager.showSuccessToast(response.message);
      } else {
        this.socketManager.showErrorToast(response.error);
      }
    });
    // TODO: send invitation to server
  }

  performSearch(searchTerm) {
    this.clearResults();

    this.performUserSearch.disabled = true;
    this.performUserSearch.innerHTML = 'Searching...';

    this.socketManager.emit('help me find this user with username', searchTerm, (response) => {
      if (response.status === 'ok') {
        this.performUserSearch.disabled = false;
        this.performUserSearch.innerHTML = 'Searching';


        if (response.friends.length === 0) {
          this.friendsList.innerHTML = '<div class="no-results">No users found</div>';
          return;
        }

        response.friends.forEach(user => {
          if (!this.friendsSet.has(user._id.toString())) {
            this.friendsSet.add(user._id.toString());
            this.appendFriendItem(user);
            console.log(this.friendsSet);
          }
        });
      } else {
        this.performUserSearch.disabled = false;
        this.performUserSearch.innerHTML = 'Searching';

        this.socketManager.showErrorToast(response.error);
      }
    });
  }

}

export default FriendSearch;
