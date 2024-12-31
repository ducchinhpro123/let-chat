class AnnouncementManager {
    static instance = null;

    constructor(socketManager) {
        this.openBtn = document.querySelector('.announcement-btn');
        this.countAnnouncement = this.openBtn.querySelector('.notification-badge');
        this.closeBtn = document.querySelector('.close-ann');
        this.socketManager = socketManager;
        this.announcements = null;

        this.openModal = this.openModal.bind(this);
        this.closeModal = this.closeModal.bind(this);

        this.initialize();
        AnnouncementManager.instance = this;
    }

    static getInstance() {
        if (AnnouncementManager.instance) {
            return AnnouncementManager.instance;
        }
        return null;
    }

    updateAnnouncementCount(count) {
        if (this.countAnnouncement) this.countAnnouncement.innerHTML = count;
    }

    initialize() {
        this.openBtn.addEventListener('click', this.openModal);
        this.closeBtn.addEventListener('click', this.closeModal);

        this.socketManager.emit('give me my announcements', '', (response) => {
            if (response.status === 'ok') {
                this.updateAnnouncementCount(response.data.length);
                this.announcements = response.data;
            }
        });
    }

    handleAccept(announcement) {
        this.socketManager.emit('I accept to be a friend', announcement, (response) => {
            if (response.status === 'ok') {
                console.log(response);
                this.updateAnnouncementCount(response.announcementCount);
            }
        });
    }

    handleRefuse(announcement) {
        this.socketManager.emit('I refuse to be a friend', announcement, (response) => {
            if (response.status === 'ok') {
                this.updateAnnouncementCount(response.announcementCount);
            }
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

        if (this.announcements && this.announcements.length > 0) {
            this.announcements.forEach(announcement => {
                const modalItem = document.createElement('div');
                modalItem.className = 'announcement-item';
                modalItem.innerHTML = `
          <div class="announcement-content">
            <p class="announcement-text">
              <strong>${announcement.requester.username}</strong> wants to be your friend
            </p>
            <span class="announcement-time">${new Date(announcement.createdAt).toLocaleString()}</span>
          </div>
          <div class="announcement-actions">
            <button class="accept-btn" data-id="${announcement._id}">Accept</button>
            <button class="decline-btn" data-id="${announcement._id}">Decline</button>
          </div>
        `;
                const acceptBtn = modalItem.querySelector(`.accept-btn[data-id="${announcement._id}"]`);
                const refuseBtn = modalItem.querySelector(`.decline-btn[data-id="${announcement._id}"]`);
                acceptBtn.addEventListener('click', () => this.handleAccept(announcement));
                refuseBtn.addEventListener('click', () => this.handleRefuse(announcement));

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
