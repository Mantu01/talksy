import { RequestHandler, Response, Router } from "express";
import { register, login, getMe } from "../controllers/auth";
import {
  updateProfile,
  getFriends,
  getFriendRequests,
  getExploreUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  changePassword,
  getUserDetails,
} from "../controllers/user";
import {
  createGroup,
  getJoinedGroups,
  getExploreGroups,
  requestToJoinGroup,
  acceptJoinRequest,
  declineJoinRequest,
  getGroupDetails,
  updateGroup,
} from "../controllers/group";
import { getDirectMessages, getGroupMessages, getRecentConversations } from "../controllers/chat";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { upload } from "../middleware/multer";

const router = Router();
type ProtectedController = (req: AuthenticatedRequest, res: Response) => Promise<void>;

const protectedRoute = authenticate as RequestHandler;
const route = (handler: ProtectedController): RequestHandler => handler as RequestHandler;

router.get('/health',(_,res)=>{
  res.send('Server is Ok');
})
router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/me", protectedRoute, route(getMe));

router.put(
  "/users/profile",
  protectedRoute,
  upload.fields([
    { name: "profile", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  route(updateProfile)
);
router.put("/users/change-password", protectedRoute, route(changePassword));
router.get("/users/friends", protectedRoute, route(getFriends));
router.get("/users/friend-requests", protectedRoute, route(getFriendRequests));
router.get("/users/explore", protectedRoute, route(getExploreUsers));
router.get("/users/:id", protectedRoute, route(getUserDetails));
router.post("/users/friend-request/send/:id", protectedRoute, route(sendFriendRequest));
router.post("/users/friend-request/accept/:id", protectedRoute, route(acceptFriendRequest));
router.post("/users/friend-request/decline/:id", protectedRoute, route(declineFriendRequest));

router.post(
  "/groups",
  protectedRoute,
  upload.fields([{ name: "logo", maxCount: 1 }]),
  route(createGroup)
);
router.get("/groups/joined", protectedRoute, route(getJoinedGroups));
router.get("/groups/explore", protectedRoute, route(getExploreGroups));
router.get("/groups/:id", protectedRoute, route(getGroupDetails));
router.put(
  "/groups/:id",
  protectedRoute,
  upload.fields([{ name: "logo", maxCount: 1 }]),
  route(updateGroup)
);
router.post("/groups/join-request/:id", protectedRoute, route(requestToJoinGroup));
router.post("/groups/join-request/accept/:groupId/:userId", protectedRoute, route(acceptJoinRequest));
router.post("/groups/join-request/decline/:groupId/:userId", protectedRoute, route(declineJoinRequest));

router.get("/chats/recent", protectedRoute, route(getRecentConversations));
router.get("/chats/messages/:userId", protectedRoute, route(getDirectMessages));
router.get("/chats/group-messages/:groupId", protectedRoute, route(getGroupMessages));

export default router;
