import { Response } from "express";
import mongoose, { UpdateQuery } from "mongoose";
import { User, IUser } from "database";
import { AuthenticatedRequest } from "../middleware/auth";
import { uploadOnCloudinary } from "../helpers/cloudinary";
import { sendRealTimeEvent } from "../socket";

type ProfileUpdate = {
  name?: string;
  email?: string;
  bio?: string;
  dob?: string;
  profile?: string;
  banner?: string;
};

const getParam = (value: string | string[] | undefined): string => Array.isArray(value) ? value[0] || "" : value || "";
const toObjectId = (value: string | mongoose.Types.ObjectId): mongoose.Types.ObjectId => (
  typeof value === "string" ? new mongoose.Types.ObjectId(value) : value
);

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { name, email, bio, dob } = req.body;
    const updateData: ProfileUpdate = {};

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

    const responseUser = {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      bio: updatedUser.bio,
      dob: updatedUser.dob,
      profile: updatedUser.profile,
      banner: updatedUser.banner,
      friends: updatedUser.friends,
      friendRequestsSent: updatedUser.friendRequestsSent,
      friendRequestsReceived: updatedUser.friendRequestsReceived,
    };

    for (const friendId of updatedUser.friends) {
      sendRealTimeEvent(friendId.toString(), {
        type: "profile_updated",
        data: responseUser,
      });
    }

    res.status(200).json(responseUser);
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
      ...(req.user.friends || []),
      ...(req.user.friendRequestsReceived || []),
      ...(req.user.friendRequestsSent || []),
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

    const recipientId = getParam(req.params.id);

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

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { friendRequestsSent: toObjectId(recipientId) } });
    await User.findByIdAndUpdate(recipientId, { $addToSet: { friendRequestsReceived: req.user._id } });

    sendRealTimeEvent(recipientId, {
      type: "friend_request_received",
      data: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        bio: req.user.bio,
        profile: req.user.profile,
        banner: req.user.banner,
      },
    });

    sendRealTimeEvent(req.user._id.toString(), {
      type: "friend_request_sent",
      data: { recipientId },
    });

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

    const requesterId = getParam(req.params.id);

    if (!req.user.friendRequestsReceived.some(id => id.toString() === requesterId)) {
      res.status(400).json({ error: "No pending friend request from this user" });
      return;
    }

    const acceptorUpdate: UpdateQuery<IUser> = {
      $pull: {
        friendRequestsReceived: toObjectId(requesterId),
        friendRequestsSent: toObjectId(requesterId),
      },
      $addToSet: { friends: toObjectId(requesterId) },
    };

    await User.findByIdAndUpdate(req.user._id, acceptorUpdate);

    await User.findByIdAndUpdate(requesterId, {
      $pull: {
        friendRequestsSent: req.user._id,
        friendRequestsReceived: req.user._id,
      },
      $addToSet: { friends: req.user._id },
    });

    sendRealTimeEvent(requesterId, {
      type: "friend_request_accepted",
      data: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        bio: req.user.bio,
        profile: req.user.profile,
        banner: req.user.banner,
      },
    });

    sendRealTimeEvent(req.user._id.toString(), {
      type: "friend_request_accepted",
      data: { _id: requesterId },
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

    const requesterId = getParam(req.params.id);

    await User.findByIdAndUpdate(req.user._id, {
      $pull: {
        friendRequestsReceived: toObjectId(requesterId),
        friendRequestsSent: toObjectId(requesterId),
      },
    });

    await User.findByIdAndUpdate(requesterId, {
      $pull: {
        friendRequestsSent: req.user._id,
        friendRequestsReceived: req.user._id,
      },
    });

    sendRealTimeEvent(requesterId, {
      type: "friend_request_declined",
      data: { userId: req.user._id },
    });

    sendRealTimeEvent(req.user._id.toString(), {
      type: "friend_request_declined",
      data: { userId: requesterId },
    });

    res.status(200).json({ message: "Friend request declined" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Current and new passwords are required" });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: "New password must be at least 6 characters" });
      return;
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(400).json({ error: "Invalid current password" });
      return;
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const userId = getParam(req.params.id);
    const targetUser = await User.findById(userId).select("_id name bio dob profile banner");
    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.status(200).json(targetUser);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
