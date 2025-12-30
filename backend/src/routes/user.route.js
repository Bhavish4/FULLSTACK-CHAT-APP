import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  blockUser,
  unblockUser,
  getBlockedUsers,
  updatePrivacySettings,
  isUserBlocked,
} from "../controllers/user.controller.js";

const router = express.Router();

router.post("/block", protectRoute, blockUser);
router.post("/unblock", protectRoute, unblockUser);
router.get("/blocked", protectRoute, getBlockedUsers);
router.put("/privacy-settings", protectRoute, updatePrivacySettings);
router.get("/:userId/is-blocked", protectRoute, isUserBlocked);

export default router;