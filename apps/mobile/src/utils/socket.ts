import { WS_URL, getToken } from "./api";
import { QueryClient } from "@tanstack/react-query";
import { TalksyMessage, TalksyUser } from "@/types/domain";
import { getId } from "@/utils/ids";
import { Platform } from "react-native";

let Notifications: any = null;
try {
  Notifications = require("expo-notifications");
} catch {}

if (Notifications && typeof Notifications.setNotificationHandler === "function") {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {}
}

type SocketPayload = {
  type?: string;
  data?: unknown;
};

const isMessage = (value: unknown): value is TalksyMessage => (
  typeof value === "object" &&
  value !== null &&
  "_id" in value &&
  "sender" in value &&
  "text" in value
);

class SocketService {
  private socket: WebSocket | null = null;
  private queryClient: QueryClient | null = null;

  init(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.queryClient.setQueryData(["socket-status"], "disconnected");
  }

  async triggerLocalNotification(title: string, body: string, data: any) {
    if (!Notifications) return;
    try {
      const permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) {
        await Notifications.requestPermissionsAsync();
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null,
      });
    } catch {}
  }

  triggerNotification(payload: { title: string; body: string; avatar?: string; route?: string }) {
    if (!this.queryClient) return;
    this.queryClient.setQueryData(["in-app-notification"], payload);
    setTimeout(() => {
      const current = this.queryClient?.getQueryData<{ title: string; body: string }>(["in-app-notification"]);
      if (current && current.title === payload.title && current.body === payload.body) {
        this.queryClient?.setQueryData(["in-app-notification"], null);
      }
    }, 4000);

    this.triggerLocalNotification(payload.title, payload.body, { route: payload.route });
  }

  sendTypingStatus(recipientId: string, typing: boolean) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: "typing",
          recipientId,
          typing,
        })
      );
    }
  }

  connect() {
    if (this.socket) return;

    const token = getToken();
    console.log("[WebSocket Client] Attempting connect. Token status:", token ? "Token present" : "Token missing");
    if (!token) return;

    const socketUrl = `${WS_URL}?token=${encodeURIComponent(token)}`;
    console.log("[WebSocket Client] Connection URL:", socketUrl);
    try {
      if (Platform.OS === "web") {
        this.socket = new WebSocket(socketUrl);
      } else {
        this.socket = new (WebSocket as unknown as {
          new (
            url: string,
            protocols?: string | string[],
            options?: { headers?: { [key: string]: string } }
          ): WebSocket;
        })(socketUrl, undefined, {
          headers: {
            "X-Tunnel-Skip-AntiPhishing-Page": "true",
          },
        });
      }

      this.socket.onopen = () => {
        console.log("[WebSocket Client] Connected to WS server");
        this.queryClient?.setQueryData(["socket-status"], "connected");
      };

      this.socket.onerror = (err) => {
        console.warn("[WebSocket Client Error]", err);
        this.queryClient?.setQueryData(["socket-status"], "disconnected");
      };

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as SocketPayload;
        const { type, data } = payload;

        const qc = this.queryClient;
        if (!qc) return;

        if ((type === "message" || type === "message_sent") && isMessage(data)) {
          const msg = data;
          const authUser = qc.getQueryData<TalksyUser | null>(["auth-user"]);
          const currentUserId = getId(authUser);
          const senderId = getId(typeof msg.sender === "string" ? msg.sender : msg.sender);
          const isMe = senderId === currentUserId;

          if (msg.group) {
            const groupObj = typeof msg.group === "string" ? null : msg.group;
            const groupId = getId(typeof msg.group === "string" ? msg.group : msg.group);
            qc.setQueryData<TalksyMessage[]>(["group-messages", groupId], (old) => {
              const list = Array.isArray(old) ? old : [];
              if (list.some((m) => m._id === msg._id)) return list;
              return [...list, msg];
            });
            qc.invalidateQueries({ queryKey: ["joined-groups"] });

            if (!isMe) {
              const observers = qc.getQueryCache().find({ queryKey: ["group-messages", groupId] })?.getObserversCount() ?? 0;
              if (observers === 0) {
                const groupTitle = groupObj?.title || "Group Message";
                const senderName = typeof msg.sender === "string" ? "Someone" : msg.sender.name;
                const groupLogo = groupObj?.logo;
                this.triggerNotification({
                  title: groupTitle,
                  body: `${senderName}: ${msg.text}`,
                  avatar: groupLogo,
                  route: `/group-chat/${groupId}`,
                });
              }
            }
          } else {
            const recipientId = getId(typeof msg.recipient === "string" ? msg.recipient : msg.recipient);
            const otherUser = isMe ? recipientId : senderId;

            qc.setQueryData<TalksyMessage[]>(["messages", otherUser], (old) => {
              const list = Array.isArray(old) ? old : [];
              if (list.some((m) => m._id === msg._id)) return list;
              return [...list, msg];
            });
            qc.invalidateQueries({ queryKey: ["friends"] });

            if (!isMe) {
              const observers = qc.getQueryCache().find({ queryKey: ["messages", senderId] })?.getObserversCount() ?? 0;
              if (observers === 0) {
                const senderName = typeof msg.sender === "string" ? "Direct Message" : msg.sender.name;
                const senderAvatar = typeof msg.sender === "string" ? undefined : msg.sender.profile;
                this.triggerNotification({
                  title: senderName,
                  body: msg.text,
                  avatar: senderAvatar,
                  route: `/chat/${senderId}`,
                });
              }
            }
          }
          qc.invalidateQueries({ queryKey: ["recent-conversations"] });
        } else if (type === "friend_request_received") {
          qc.invalidateQueries({ queryKey: ["friend-requests"] });
          qc.invalidateQueries({ queryKey: ["explore-users"] });
          qc.invalidateQueries({ queryKey: ["auth-user"] });

          const observers = qc.getQueryCache().find({ queryKey: ["friend-requests"] })?.getObserversCount() ?? 0;
          if (observers === 0) {
            const requester = data as { name?: string; profile?: string } | undefined;
            const requesterName = requester?.name || "Someone";
            const requesterAvatar = requester?.profile;
            this.triggerNotification({
              title: "Friend Request",
              body: `${requesterName} sent you a friend request!`,
              avatar: requesterAvatar,
              route: "/explore",
            });
          }
        } else if (type === "friend_request_sent") {
          qc.invalidateQueries({ queryKey: ["friend-requests"] });
          qc.invalidateQueries({ queryKey: ["explore-users"] });
          qc.invalidateQueries({ queryKey: ["auth-user"] });
        } else if (type === "friend_request_accepted") {
          qc.invalidateQueries({ queryKey: ["friends"] });
          qc.invalidateQueries({ queryKey: ["friend-requests"] });
          qc.invalidateQueries({ queryKey: ["explore-users"] });
          qc.invalidateQueries({ queryKey: ["auth-user"] });

          const acceptor = data as { name?: string; profile?: string } | undefined;
          if (acceptor && acceptor.name) {
            const acceptorName = acceptor.name;
            const acceptorAvatar = acceptor.profile;
            this.triggerNotification({
              title: "Request Accepted",
              body: `${acceptorName} accepted your friend request!`,
              avatar: acceptorAvatar,
              route: "/",
            });
          }
        } else if (type === "friend_request_declined") {
          qc.invalidateQueries({ queryKey: ["friends"] });
          qc.invalidateQueries({ queryKey: ["friend-requests"] });
          qc.invalidateQueries({ queryKey: ["explore-users"] });
          qc.invalidateQueries({ queryKey: ["auth-user"] });
        } else if (type === "group_join_request_received") {
          qc.invalidateQueries({ queryKey: ["joined-groups"] });
          
          this.triggerNotification({
            title: "Group Join Request",
            body: "A user wants to join your group!",
            route: "/groups",
          });
        } else if (type === "group_created") {
          qc.invalidateQueries({ queryKey: ["joined-groups"] });
        } else if (
          type === "group_join_request_accepted" ||
          type === "group_join_request_declined" ||
          type === "group_join_request_sent"
        ) {
          qc.invalidateQueries({ queryKey: ["joined-groups"] });
          qc.invalidateQueries({ queryKey: ["explore-groups"] });
        } else if (type === "profile_updated") {
          qc.invalidateQueries({ queryKey: ["friends"] });
          qc.invalidateQueries({ queryKey: ["messages"] });
          qc.invalidateQueries({ queryKey: ["group-messages"] });
        } else if (type === "user_status") {
          const statusData = data as { userId: string; status: "online" | "offline" } | undefined;
          if (statusData) {
            qc.setQueryData(["user-status", statusData.userId], statusData.status);
          }
        } else if (type === "online_friends") {
          const onlineIds = data as string[] | undefined;
          if (Array.isArray(onlineIds)) {
            onlineIds.forEach((friendId) => {
              qc.setQueryData(["user-status", friendId], "online");
            });
          }
        } else if (type === "typing") {
          const typingData = data as { userId: string; typing: boolean } | undefined;
          if (typingData) {
            qc.setQueryData(["user-typing", typingData.userId], typingData.typing);
          }
        }
      } catch {
        return;
      }
    };

    this.socket.onclose = (event) => {
      console.log(`[WebSocket Client Closed] Code: ${event.code}, Reason: ${event.reason}`);
      this.socket = null;
      this.queryClient?.setQueryData(["socket-status"], "disconnected");
      const token = getToken();
      if (token) {
        setTimeout(() => this.connect(), 3000);
      }
    };
    } catch (err) {
      console.error("[WebSocket Client Constructor Error]", err);
      this.socket = null;
      this.queryClient?.setQueryData(["socket-status"], "disconnected");
      const token = getToken();
      if (token) {
        setTimeout(() => this.connect(), 3000);
      }
    }
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
