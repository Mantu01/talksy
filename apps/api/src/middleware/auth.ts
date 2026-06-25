import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, IUser } from "database";

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token =
      req.cookies?.token ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret") as { id: string };
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
};
