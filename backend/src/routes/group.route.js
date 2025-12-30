import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
  createGroup, 
  getUserGroups, 
  addMember, 
  removeMember, 
  sendGroupMessage, 
  getGroupMessages,
  leaveGroup,
  searchGroupMessages
} from "../controllers/group.controller.js";
import { validateSendMessage, validateSearchMessages } from "../middleware/validation.middleware.js";

const router = express.Router();

router.post("/create", protectRoute, createGroup);
router.get("/user", protectRoute, getUserGroups);
router.post("/:groupId/add-member", protectRoute, addMember);
router.post("/:groupId/remove-member", protectRoute, removeMember);
router.post("/:groupId/messages", protectRoute, validateSendMessage, sendGroupMessage);
router.get("/:groupId/messages", protectRoute, getGroupMessages);
router.get("/:groupId/search", protectRoute, validateSearchMessages, searchGroupMessages);
router.post("/:groupId/leave", protectRoute, leaveGroup);

export default router;