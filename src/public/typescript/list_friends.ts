import SocketManager from "./socket_manager";

class ListFriends {
    socketManager: SocketManager;

    constructor(socketManager: SocketManager) {
        this.socketManager = socketManager;
    }

    async getListFriends(): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.socketManager.emit('give me the list of my friends', '', (response) => {
                if (response.status === 'ok') {
                    resolve(response.data);
                } else {
                    reject(response.error || 'Failed to get friends');
                }
            });
        })
    }
}

export default ListFriends;
