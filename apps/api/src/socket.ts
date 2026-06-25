import { IncomingMessage, Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import url from "url";
import jwt from "jsonwebtoken";
import { User, Group, Message } from "database";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
}

const activeClients = new Map<string, AuthenticatedWebSocket>();

export const initWebSocket = (server: Server): WebSocketServer => {
  const wss = new WebSocketServer({ server });

  wss.on("connection", async (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
    try {
      const requestUrl = url.parse(req.url || "", true);
      const token = requestUrl.query.token as string | undefined;

      if (!token) {
        ws.close(4001, "Unauthorized");
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret") as { id: string };
      const user = await User.findById(decoded.id);

      if (!user) {
        ws.close(4001, "Unauthorized");
        return;
      }

      const userId = user._id.toString();
      ws.userId = userId;
      activeClients.set(userId, ws);

      ws.on("message", async (messageStr: string) => {
        try {
          const payload = JSON.parse(messageStr);
          const { recipientId, groupId, text } = payload;

          if (!text) return;

          if (recipientId) {
            const msg = new Message({
              sender: userId,
              recipient: recipientId,
              text,
            });
            await msg.save();
            const populatedMsg = await msg.populate("sender", "_id name email profile");

            const recipientWs = activeClients.get(recipientId);
            if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
              recipientWs.send(JSON.stringify({ type: "message", data: populatedMsg }));
            }

            ws.send(JSON.stringify({ type: "message_sent", data: populatedMsg }));
          } else if (groupId) {
            const group = await Group.findById(groupId);
            if (!group) return;

            const msg = new Message({
              sender: userId,
              group: groupId,
              text,
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
        } catch (err) {
          console.error("Socket message error:", err);
        }
      });

      ws.on("close", () => {
        if (ws.userId) {
          activeClients.delete(ws.userId);
        }
      });
    } catch (error) {
      ws.close(4002, "Authentication Failed");
    }
  });

  return wss;
};
