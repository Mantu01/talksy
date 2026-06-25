import { Router } from "express";
import { register, login, getMe } from "../controllers/auth";
import {
  updateProfile,
  getFriends,
  getFriendRequests,
  getExploreUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
} from "../controllers/user";
import {
  createGroup,
  getJoinedGroups,
  getExploreGroups,
  requestToJoinGroup,
  acceptJoinRequest,
  declineJoinRequest,
} from "../controllers/group";
import { getDirectMessages, getGroupMessages } from "../controllers/chat";
import { authenticate } from "../middleware/auth";
import { upload } from "../middleware/multer";

const router = Router();

router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/me", authenticate as any, getMe as any);

router.put(
  "/users/profile",
  authenticate as any,
  upload.fields([
    { name: "profile", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  updateProfile as any
);
router.get("/users/friends", authenticate as any, getFriends as any);
router.get("/users/friend-requests", authenticate as any, getFriendRequests as any);
router.get("/users/explore", authenticate as any, getExploreUsers as any);
router.post("/users/friend-request/send/:id", authenticate as any, sendFriendRequest as any);
router.post("/users/friend-request/accept/:id", authenticate as any, acceptFriendRequest as any);
router.post("/users/friend-request/decline/:id", authenticate as any, declineFriendRequest as any);

router.post(
  "/groups",
  authenticate as any,
  upload.fields([{ name: "logo", maxCount: 1 }]),
  createGroup as any
);
router.get("/groups/joined", authenticate as any, getJoinedGroups as any);
router.get("/groups/explore", authenticate as any, getExploreGroups as any);
router.post("/groups/join-request/:id", authenticate as any, requestToJoinGroup as any);
router.post("/groups/join-request/accept/:groupId/:userId", authenticate as any, acceptJoinRequest as any);
router.post("/groups/join-request/decline/:groupId/:userId", authenticate as any, declineJoinRequest as any);

router.get("/chats/messages/:userId", authenticate as any, getDirectMessages as any);
router.get("/chats/group-messages/:groupId", authenticate as any, getGroupMessages as any);

export default router;
