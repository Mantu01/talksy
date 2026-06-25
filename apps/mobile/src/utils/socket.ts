import { WS_URL, getToken } from "./api";
import { QueryClient } from "@tanstack/react-query";

class SocketService {
  private socket: WebSocket | null = null;
  private queryClient: QueryClient | null = null;

  init(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  connect() {
    if (this.socket) return;

    const token = getToken();
    if (!token) return;

    const socketUrl = `${WS_URL}?token=${encodeURIComponent(token)}`;
    this.socket = new WebSocket(socketUrl);

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { type, data } = payload;

        if (this.queryClient && (type === "message" || type === "message_sent")) {
          const msg = data;
          if (msg.group) {
            const groupId = (msg.group?._id || msg.group)?.toString();
            this.queryClient.setQueryData(["group-messages", groupId], (old: any) => {
              const list = Array.isArray(old) ? old : [];
              if (list.some((m: any) => m._id === msg._id)) return list;
              return [...list, msg];
            });
            this.queryClient.invalidateQueries({ queryKey: ["joined-groups"] });
          } else {
            const authUser = this.queryClient.getQueryData<any>(["auth-user"]);
            const currentUserId = (authUser?.id || authUser?._id)?.toString();
            const senderId = (msg.sender?._id || msg.sender)?.toString();
            const recipientId = (msg.recipient?._id || msg.recipient)?.toString();
            const otherUser = senderId === currentUserId ? recipientId : senderId;

            this.queryClient.setQueryData(["messages", otherUser], (old: any) => {
              const list = Array.isArray(old) ? old : [];
              if (list.some((m: any) => m._id === msg._id)) return list;
              return [...list, msg];
            });
            this.queryClient.invalidateQueries({ queryKey: ["friends"] });
          }
        }
      } catch (err) {
        console.error("Socket incoming message error:", err);
      }
    };

    this.socket.onclose = () => {
      this.socket = null;
      setTimeout(() => this.connect(), 3000);
    };
  }

  sendMessage(recipientId: string | null, groupId: string | null, text: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          recipientId,
          groupId,
          text,
        })
      );
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
