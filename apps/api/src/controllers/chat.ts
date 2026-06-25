import { Response } from "express";
import { Message, Group } from "database";
import { AuthenticatedRequest } from "../middleware/auth";

export const getDirectMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { userId } = req.params;

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

    const { groupId } = req.params;

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
