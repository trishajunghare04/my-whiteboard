import { io } from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
    this.boardId = null;
  }

  connect() {
    if (this.socket?.connected) return;
    this.socket = io("http://localhost:5000", {
      autoConnect: true,
      transports: ["websocket"]
    });
    this.socket.on("connect", () => console.log("🔌 Socket connected:", this.socket.id));
    this.socket.on("disconnect", () => console.log("❌ Socket disconnected"));
  }

  joinBoard(boardId, userId, userName) {
    this.boardId = boardId;
    this.connect();
    this.socket.emit("board:join", { boardId, userId, userName });
  }

  leaveBoard() {
    if (this.socket && this.boardId) {
      this.socket.leave?.(this.boardId);
      this.boardId = null;
    }
  }

  sendCanvasUpdate(data) {
    if (this.socket?.connected && this.boardId) {
      this.socket.emit("canvas:update", { boardId: this.boardId, data });
    }
  }

  sendCursorMove(x, y) {
    if (this.socket?.connected && this.boardId) {
      this.socket.emit("cursor:move", { boardId: this.boardId, x, y });
    }
  }

  sendChatMessage(message, userName) {
    if (this.socket?.connected && this.boardId) {
      this.socket.emit("chat:message", { boardId: this.boardId, message, userName });
    }
  }

  onCanvasUpdate(cb) { this.socket?.on("canvas:update", cb); }
  onUserJoined(cb) { this.socket?.on("user:joined", cb); }
  onUserLeft(cb) { this.socket?.on("user:left", cb); }
  onRoomUsers(cb) { this.socket?.on("room:users", cb); }
  onCursorMove(cb) { this.socket?.on("cursor:move", cb); }
  onChatMessage(cb) { this.socket?.on("chat:message", cb); }
  onBoardSaved(cb) { this.socket?.on("board:saved", cb); }

  offAll() {
    ["canvas:update","user:joined","user:left","room:users","cursor:move","chat:message","board:saved"]
      .forEach(ev => this.socket?.off(ev));
  }
}

export default new SocketService();
