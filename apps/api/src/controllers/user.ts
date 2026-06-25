import { Response } from "express";
import { User } from "database";
import { AuthenticatedRequest } from "../middleware/auth";
import { uploadOnCloudinary } from "../helpers/cloudinary";

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { name, email, bio, dob } = req.body;
    const updateData: Record<string, any> = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (bio !== undefined) updateData.bio = bio;
    if (dob !== undefined) updateData.dob = dob;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    if (files) {
      if (files["profile"] && files["profile"][0]) {
        const localPath = files["profile"][0].path;
        const uploadResult = await uploadOnCloudinary(localPath);
        if (uploadResult) {
          updateData.profile = uploadResult.secure_url;
        }
      }
      if (files["banner"] && files["banner"][0]) {
        const localPath = files["banner"][0].path;
        const uploadResult = await uploadOnCloudinary(localPath);
        if (uploadResult) {
          updateData.banner = uploadResult.secure_url;
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updateData, { new: true });
    if (!updatedUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json({
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      bio: updatedUser.bio,
      dob: updatedUser.dob,
      profile: updatedUser.profile,
      banner: updatedUser.banner,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getFriends = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await User.findById(req.user._id).populate("friends", "_id name email bio profile banner");
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json(user.friends);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getFriendRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await User.findById(req.user._id).populate("friendRequestsReceived", "_id name email bio profile banner");
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json(user.friendRequestsReceived);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getExploreUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const excludeIds = [
      req.user._id,
      ...req.user.friends,
      ...req.user.friendRequestsReceived,
    ];

    const users = await User.find({ _id: { $nin: excludeIds } }).select("_id name email bio profile banner");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendFriendRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id: recipientId } = req.params;

    if (req.user._id.toString() === recipientId) {
      res.status(400).json({ error: "Cannot send request to yourself" });
      return;
    }

    if (req.user.friends.some(id => id.toString() === recipientId)) {
      res.status(400).json({ error: "Already friends" });
      return;
    }

    if (req.user.friendRequestsSent.some(id => id.toString() === recipientId)) {
      res.status(400).json({ error: "Friend request already sent" });
      return;
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      res.status(404).json({ error: "Recipient user not found" });
      return;
    }

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { friendRequestsSent: recipientId as any } });
    await User.findByIdAndUpdate(recipientId, { $addToSet: { friendRequestsReceived: req.user._id as any } });

    res.status(200).json({ message: "Friend request sent" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const acceptFriendRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id: requesterId } = req.params;

    if (!req.user.friendRequestsReceived.some(id => id.toString() === requesterId)) {
      res.status(400).json({ error: "No pending friend request from this user" });
      return;
    }

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { friendRequestsReceived: requesterId as any },
      $addToSet: { friends: requesterId as any },
    });

    await User.findByIdAndUpdate(requesterId, {
      $pull: { friendRequestsSent: req.user._id as any },
      $addToSet: { friends: req.user._id as any },
    });

    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const declineFriendRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id: requesterId } = req.params;

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { friendRequestsReceived: requesterId as any },
    });

    await User.findByIdAndUpdate(requesterId, {
      $pull: { friendRequestsSent: req.user._id as any },
    });

    res.status(200).json({ message: "Friend request declined" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
