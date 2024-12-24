import SocketManager from '/socket_manager.js';
import ChatManager from '/chat_manager.js';


class App {
  static instance = null;

  constructor() {
    if (App.instance) {
      return App.instance;
    }
    this.socketManager = new SocketManager();
    this.chatManager = null;
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
