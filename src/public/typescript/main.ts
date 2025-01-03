import SocketManager from 'public/typescript/socket_manager';
import ChatManager from 'public/typescript/chat_manager';
import AnnouncementManager from 'public/typescript/announcement_manager';
import YourFriends from 'public/typescript/your_friends';


class App {
    private static instance: App | null = null;
    public chatManager: ChatManager | null | undefined;
    public yourFriends: YourFriends | null | undefined;
    public socketManager: SocketManager = new SocketManager;
    public announcementManager: AnnouncementManager | null | undefined;

    constructor() {
        if (App.instance) {
            return App.instance;
        }
        this.chatManager = null;
        this.yourFriends = null;
        this.socketManager = new SocketManager();
        this.announcementManager = null;

        App.instance = this;
    }

    static getInstance() {
        if (!App.instance) {
            App.instance = new App();
        }
        return App.instance;
    }

    initialize() {
        try {
            // this.socketManager.initialize();
            this.chatManager = new ChatManager();
            this.announcementManager = new AnnouncementManager(this.socketManager);
            this.yourFriends = new YourFriends(this.socketManager);
            this.chatManager.initialize();

        } catch (e) {
            console.error('Error initializing App:', e instanceof Error ? e.message : e);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.initialize();
});

export default App;
