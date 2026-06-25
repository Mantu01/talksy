import { Response } from "express";
import { Group } from "database";
import { AuthenticatedRequest } from "../middleware/auth";
import { uploadOnCloudinary } from "../helpers/cloudinary";

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

    const { id: groupId } = req.params;
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
      $addToSet: { joinRequests: req.user._id as any },
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

    const { groupId, userId } = req.params;
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
      $pull: { joinRequests: userId as any },
      $addToSet: { members: userId as any },
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

    const { groupId, userId } = req.params;
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
      $pull: { joinRequests: userId as any },
    });

    res.status(200).json({ message: "Join request declined" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
