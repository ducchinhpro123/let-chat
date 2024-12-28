import SocketManager from '/socket_manager.js';
import ChatManager from '/chat_manager.js';
import AnnouncementManager from '/announcement_manager.js';
import YourFriends from '/your_friends.js';


class App {
  static instance = null;

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
      this.socketManager.initialize();
      this.chatManager = new ChatManager(this.socketManager);
      this.announcementManager = new AnnouncementManager(this.socketManager);
      this.yourFriends = new YourFriends(this.socketManager);

      this.chatManager.initialize();

    } catch (e) {
      console.error(e);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.initialize();
});

export default App;
