import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "database";
import { AuthenticatedRequest } from "../middleware/auth";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    const user = new User({ name, email, password });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "fallback_secret", {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        dob: user.dob,
        profile: user.profile,
        banner: user.banner,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      res.status(400).json({ error: "Invalid credentials" });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(400).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "fallback_secret", {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        dob: user.dob,
        profile: user.profile,
        banner: user.banner,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    res.status(200).json({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      bio: req.user.bio,
      dob: req.user.dob,
      profile: req.user.profile,
      banner: req.user.banner,
      friends: req.user.friends,
      friendRequestsSent: req.user.friendRequestsSent,
      friendRequestsReceived: req.user.friendRequestsReceived,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
