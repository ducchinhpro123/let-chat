class AnnouncementManager {
    constructor(socketManager) {
        this.openBtn = document.querySelector('.announcement-btn');
        this.closeBtn = document.querySelector('.close-ann');
        this.socketManager = socketManager;
        this.anns = null;

        this.openModal = this.openModal.bind(this);
        this.closeModal = this.closeModal.bind(this);

        this.initialize();
    }

    initialize() {
        this.openBtn.addEventListener('click', this.openModal);
        this.closeBtn.addEventListener('click', this.closeModal);

        this.socketManager.emit('give me my announcements', '', (response) => {
            if (response.status === 'ok') {
                this.anns = response.data;
            }
        });
    }

    handleAccept(announcement) {
        this.socketManager.emit('I accept to be a friend', announcement, (response) => {
            console.log(response);
        });
    }

    closeModal() {
        const annModal = document.getElementById('announcementModal');
        if (annModal) annModal.style.display = 'none';
    }

    openModal() {
        const annModal = document.getElementById('announcementModal');
        const modalItem = document.createElement('div');
        const announcements = document.querySelector('#announcementList');
        announcements.innerHTML = '';

        if (this.anns && this.anns.length > 0) {
            this.anns.forEach(ann => {
                const modalItem = document.createElement('div');
                modalItem.className = 'announcement-item';
                modalItem.innerHTML = `
          <div class="announcement-content">
            <p class="announcement-text">
              <strong>${ann.requester.username}</strong> wants to be your friend
            </p>
            <span class="announcement-time">${new Date(ann.createdAt).toLocaleString()}</span>
          </div>
          <div class="announcement-actions">
            <button class="accept-btn" data-id="${ann._id}">Accept</button>
            <button class="decline-btn" data-id="${ann._id}">Decline</button>
          </div>
        `;
                const acceptBtn = modalItem.querySelector(`.accept-btn[data-id="${ann._id}"]`);
                acceptBtn.addEventListener('click', () => this.handleAccept(ann));

                announcements.appendChild(modalItem);
            });
        } else {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
        <p>No announcements yet</p>
      `;
            announcements.appendChild(emptyState);
        }

        annModal.style.display = 'block';
        // announcements.appendChild(modalItem);
    }
}

export default AnnouncementManager;
