import { IncomingMessage, Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import url from "url";
import jwt from "jsonwebtoken";
import { User, Group, Message } from "database";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
}

type RealtimeEvent = {
  type: string;
  data: unknown;
};

type IncomingSocketMessage = {
  recipientId?: unknown;
  groupId?: unknown;
  text?: unknown;
};

const activeClients = new Map<string, AuthenticatedWebSocket>();
const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

export const initWebSocket = (server: Server): WebSocketServer => {
  const wss = new WebSocketServer({ server });

  wss.on("connection", async (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
    console.log("[WS Server] Incoming connection request...");
    try {
      const requestUrl = url.parse(req.url || "", true);
      const token = requestUrl.query.token as string | undefined;

      if (!token) {
        console.log("[WS Server] Connection rejected: token missing");
        ws.close(4001, "Unauthorized");
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret") as { id: string };
      const user = await User.findById(decoded.id);

      if (!user) {
        console.log("[WS Server] Connection rejected: user not found");
        ws.close(4001, "Unauthorized");
        return;
      }

      const userId = user._id.toString();
      ws.userId = userId;
      activeClients.set(userId, ws);
      console.log(`[WS Server] Connected user: ${user.name} (${userId})`);

      const friendsList = (user.friends || [])
        .filter(id => id != null)
        .map(id => id.toString());
      for (const friendId of friendsList) {
        const friendWs = activeClients.get(friendId);
        if (friendWs && friendWs.readyState === WebSocket.OPEN) {
          friendWs.send(JSON.stringify({ type: "user_status", data: { userId, status: "online" } }));
        }
      }

      const onlineFriends = [];
      for (const friendId of friendsList) {
        if (activeClients.has(friendId)) {
          onlineFriends.push(friendId);
        }
      }
      ws.send(JSON.stringify({ type: "online_friends", data: onlineFriends }));

      ws.on("message", async (data: Buffer | ArrayBuffer | Buffer[]) => {
        try {
          const messageStr = data.toString();
          const payload = JSON.parse(messageStr);
          const { type, recipientId, groupId, text } = payload;

          if (type === "typing" && isNonEmptyString(recipientId)) {
            const recipientWs = activeClients.get(recipientId);
            if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
              recipientWs.send(JSON.stringify({ type: "typing", data: { userId, typing: !!payload.typing } }));
            }
            return;
          }

          if (!isNonEmptyString(text)) return;

          if (isNonEmptyString(recipientId)) {
            const recipient = await User.findById(recipientId);
            if (!recipient) return;

            const sender = await User.findById(userId);
            if (!sender || !sender.friends.some((id) => id.toString() === recipientId)) return;

            const msg = new Message({
              sender: userId,
              recipient: recipientId,
              text: text.trim(),
            });
            await msg.save();
            const populatedMsg = await msg.populate([
              { path: "sender", select: "_id name email profile" },
              { path: "recipient", select: "_id name email profile" },
            ]);

            const recipientWs = activeClients.get(recipientId);
            if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
              recipientWs.send(JSON.stringify({ type: "message", data: populatedMsg }));
            }

            ws.send(JSON.stringify({ type: "message_sent", data: populatedMsg }));
          } else if (isNonEmptyString(groupId)) {
            const group = await Group.findById(groupId);
            if (!group) return;
            if (!group.members.some((memberId) => memberId.toString() === userId)) return;

            const msg = new Message({
              sender: userId,
              group: groupId,
              text: text.trim(),
            });
            await msg.save();
            const populatedMsg = await msg.populate("sender", "_id name email profile");

            for (const memberId of group.members) {
              const memberIdStr = memberId.toString();
              const memberWs = activeClients.get(memberIdStr);
              if (memberWs && memberWs.readyState === WebSocket.OPEN) {
                memberWs.send(JSON.stringify({ type: "message", data: populatedMsg }));
              }
            }
          }
        } catch (error) {
          console.error(error);
        }
      });

      ws.on("close", () => {
        try {
          if (ws.userId && activeClients.get(ws.userId) === ws) {
            activeClients.delete(ws.userId);
            const friendsListClose = (user.friends || [])
              .filter(id => id != null)
              .map(id => id.toString());
            for (const friendId of friendsListClose) {
              const friendWs = activeClients.get(friendId);
              if (friendWs && friendWs.readyState === WebSocket.OPEN) {
                friendWs.send(JSON.stringify({ type: "user_status", data: { userId: ws.userId, status: "offline" } }));
              }
            }
          }
        } catch (err) {
          console.error("[WS Server] Error in close handler:", err);
        }
      });
    } catch (error) {
      console.error("[WS Server] Connection error:", error);
      ws.close(4002, "Authentication Failed");
    }
  });

  return wss;
};

export const sendRealTimeEvent = (userId: string, event: RealtimeEvent): boolean => {
  const ws = activeClients.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(event));
    return true;
  }
  return false;
};

export const sendGroupRealTimeEvent = async (groupId: string, event: RealtimeEvent): Promise<void> => {
  const group = await Group.findById(groupId);
  if (!group) return;
  for (const memberId of group.members) {
    const memberIdStr = memberId.toString();
    const ws = activeClients.get(memberIdStr);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }
};
