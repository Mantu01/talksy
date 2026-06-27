import { Response } from "express";
import mongoose from "mongoose";
import { Group } from "database";
import { AuthenticatedRequest } from "../middleware/auth";
import { uploadOnCloudinary } from "../helpers/cloudinary";
import { sendRealTimeEvent, sendGroupRealTimeEvent } from "../socket";

const getParam = (value: string | string[] | undefined): string => Array.isArray(value) ? value[0] || "" : value || "";
const toObjectId = (value: string): mongoose.Types.ObjectId => new mongoose.Types.ObjectId(value);

export const createGroup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { title, description } = req.body;
    if (!title) {
      res.status(400).json({ error: "Group title is required" });
      return;
    }

    let logoUrl = "";
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files && files["logo"] && files["logo"][0]) {
      const localPath = files["logo"][0].path;
      const uploadResult = await uploadOnCloudinary(localPath);
      if (uploadResult) {
        logoUrl = uploadResult.secure_url;
      }
    }

    const group = new Group({
      title,
      description: description || "",
      logo: logoUrl,
      createdBy: req.user._id,
      members: [req.user._id],
    });

    await group.save();

    sendRealTimeEvent(req.user._id.toString(), {
      type: "group_created",
      data: group,
    });

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getJoinedGroups = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const groups = await Group.find({ members: req.user._id })
      .populate("createdBy", "_id name email profile")
      .populate("members", "_id name email profile")
      .populate("joinRequests", "_id name email profile bio banner");

    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getExploreGroups = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const groups = await Group.find({
      members: { $ne: req.user._id },
    }).populate("createdBy", "_id name email profile");

    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const requestToJoinGroup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const groupId = getParam(req.params.id);
    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    if (group.members.some(id => id.toString() === req.user?._id.toString())) {
      res.status(400).json({ error: "Already a member of this group" });
      return;
    }

    if (group.joinRequests.some(id => id.toString() === req.user?._id.toString())) {
      res.status(400).json({ error: "Join request already pending" });
      return;
    }

    await Group.findByIdAndUpdate(groupId, {
      $addToSet: { joinRequests: req.user._id },
    });

    sendRealTimeEvent(group.createdBy.toString(), {
      type: "group_join_request_received",
      data: { groupId, userId: req.user._id },
    });

    sendRealTimeEvent(req.user._id.toString(), {
      type: "group_join_request_sent",
      data: { groupId },
    });

    res.status(200).json({ message: "Join request submitted" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const acceptJoinRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const groupId = getParam(req.params.groupId);
    const userId = getParam(req.params.userId);
    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    if (group.createdBy.toString() !== req.user._id.toString()) {
      res.status(403).json({ error: "Only the group creator can approve requests" });
      return;
    }

    if (!group.joinRequests.some(id => id.toString() === userId)) {
      res.status(400).json({ error: "No pending join request from this user" });
      return;
    }

    await Group.findByIdAndUpdate(groupId, {
      $pull: { joinRequests: toObjectId(userId) },
      $addToSet: { members: toObjectId(userId) },
    });

    sendRealTimeEvent(userId, {
      type: "group_join_request_accepted",
      data: { groupId },
    });

    await sendGroupRealTimeEvent(groupId, {
      type: "group_join_request_accepted",
      data: { groupId },
    });

    res.status(200).json({ message: "Join request approved" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const declineJoinRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const groupId = getParam(req.params.groupId);
    const userId = getParam(req.params.userId);
    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    if (group.createdBy.toString() !== req.user._id.toString()) {
      res.status(403).json({ error: "Only the group creator can decline requests" });
      return;
    }

    await Group.findByIdAndUpdate(groupId, {
      $pull: { joinRequests: toObjectId(userId) },
    });

    sendRealTimeEvent(userId, {
      type: "group_join_request_declined",
      data: { groupId },
    });

    sendRealTimeEvent(req.user._id.toString(), {
      type: "group_join_request_declined",
      data: { groupId },
    });

    res.status(200).json({ message: "Join request declined" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroupDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const groupId = getParam(req.params.id);
    const group = await Group.findById(groupId)
      .populate("createdBy", "_id name email profile")
      .populate("members", "_id name email profile bio dob banner")
      .populate("joinRequests", "_id name email profile bio banner");
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }
    const isMember = group.members.some(m => m._id.toString() === req.user?._id.toString());
    if (!isMember) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateGroup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const groupId = getParam(req.params.id);
    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }
    if (group.createdBy.toString() !== req.user._id.toString()) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { title, description } = req.body;
    if (title !== undefined) {
      if (!title.trim()) {
        res.status(400).json({ error: "Group title is required" });
        return;
      }
      group.title = title.trim();
    }
    if (description !== undefined) {
      group.description = description.trim();
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files && files["logo"] && files["logo"][0]) {
      const localPath = files["logo"][0].path;
      const uploadResult = await uploadOnCloudinary(localPath);
      if (uploadResult) {
        group.logo = uploadResult.secure_url;
      }
    }

    await group.save();

    const populatedGroup = await Group.findById(groupId)
      .populate("createdBy", "_id name email profile")
      .populate("members", "_id name email profile bio dob banner")
      .populate("joinRequests", "_id name email profile bio banner");

    await sendGroupRealTimeEvent(groupId, {
      type: "profile_updated",
      data: populatedGroup,
    });

    res.status(200).json(populatedGroup);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

