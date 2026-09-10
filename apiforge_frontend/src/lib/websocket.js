export class WebSocketClient {
  constructor(url) {
    this.url = url || import.meta.env.VITE_WS_URL;
    this.ws = null;
  }

  connect() {
    if (!this.url) return;
    this.ws = new WebSocket(this.url);
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export const wsClient = new WebSocketClient();
export default wsClient;
