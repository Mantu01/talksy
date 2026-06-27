import { Response } from "express";
import { Message, Group, User } from "database";
import { AuthenticatedRequest } from "../middleware/auth";

const getParam = (value: string | string[] | undefined): string => Array.isArray(value) ? value[0] || "" : value || "";

export const getDirectMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userId = getParam(req.params.userId);
    const participant = await User.findById(userId);
    if (!participant) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const isFriend = req.user.friends.some((id) => id.toString() === userId);
    if (!isFriend) {
      res.status(403).json({ error: "You can only message friends" });
      return;
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: userId },
        { sender: userId, recipient: req.user._id },
      ],
      group: null,
    })
      .sort({ createdAt: 1 })
      .populate("sender", "_id name email profile")
      .populate("recipient", "_id name email profile");

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroupMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const groupId = getParam(req.params.groupId);

    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    if (!group.members.some(id => id.toString() === req.user?._id.toString())) {
      res.status(403).json({ error: "Not a member of this group" });
      return;
    }

    const messages = await Message.find({ group: groupId })
      .sort({ createdAt: 1 })
      .populate("sender", "_id name email profile");

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getRecentConversations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const currentUserId = req.user._id.toString();

    const userGroups = await Group.find({ members: req.user._id }).select("_id");
    const groupIds = userGroups.map((g) => g._id);

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, group: null },
        { recipient: req.user._id, group: null },
        { group: { $in: groupIds } },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "_id name email profile")
      .populate("recipient", "_id name email profile")
      .populate("group", "_id title logo members");

    const conversationMap = new Map<string, any>();

    for (const msg of messages) {
      if (msg.group) {
        const groupObj = msg.group as any;
        const groupId = groupObj._id.toString();
        if (!conversationMap.has(groupId)) {
          conversationMap.set(groupId, {
            key: `group-${groupId}`,
            id: groupId,
            title: groupObj.title,
            subtitle: groupObj.description || "Group conversation",
            imageUri: groupObj.logo,
            kind: "group",
            membersCount: groupObj.members?.length || 1,
            lastMessage: msg.text,
            lastMessageAt: msg.createdAt.toISOString(),
            lastMessageSender: (msg.sender as any)?.name || "",
            lastMessageSenderId: (msg.sender as any)?._id?.toString() || "",
          });
        }
      } else {
        const senderObj = msg.sender as any;
        const recipientObj = msg.recipient as any;
        if (!senderObj || !recipientObj) continue;

        const senderId = senderObj._id.toString();
        const recipientId = recipientObj._id.toString();
        const partner = senderId === currentUserId ? recipientObj : senderObj;
        const partnerId = partner._id.toString();

        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            key: `user-${partnerId}`,
            id: partnerId,
            title: partner.name,
            subtitle: partner.bio || "Available for a chat",
            imageUri: partner.profile,
            kind: "friend",
            lastMessage: msg.text,
            lastMessageAt: msg.createdAt.toISOString(),
            lastMessageSender: senderObj.name,
            lastMessageSenderId: senderId,
          });
        }
      }
    }

    const friendsList = await User.findById(req.user._id)
      .populate("friends", "_id name email bio profile banner")
      .select("friends");

    if (friendsList && friendsList.friends) {
      for (const friend of friendsList.friends as any[]) {
        const friendId = friend._id.toString();
        if (!conversationMap.has(friendId)) {
          conversationMap.set(friendId, {
            key: `user-${friendId}`,
            id: friendId,
            title: friend.name,
            subtitle: friend.bio || "Available for a chat",
            imageUri: friend.profile,
            kind: "friend",
            lastMessage: "",
            lastMessageAt: "",
            lastMessageSender: "",
            lastMessageSenderId: "",
          });
        }
      }
    }

    const groupsList = await Group.find({ members: req.user._id }).select("_id title description logo members");
    for (const group of groupsList) {
      const groupId = group._id.toString();
      if (!conversationMap.has(groupId)) {
        conversationMap.set(groupId, {
          key: `group-${groupId}`,
          id: groupId,
          title: group.title,
          subtitle: group.description || "Group conversation",
          imageUri: group.logo,
          kind: "group",
          membersCount: group.members?.length || 1,
          lastMessage: "",
          lastMessageAt: "",
          lastMessageSender: "",
          lastMessageSenderId: "",
        });
      }
    }

    const conversations = Array.from(conversationMap.values()).sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) {
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      }
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return a.title.localeCompare(b.title);
    });

    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
