import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, sendMessage, searchMessages, getMessagesWithPagination } from "../controllers/message.controller.js";
import { validateSendMessage, validateGetMessages, validateSearchMessages } from "../middleware/validation.middleware.js";
import { messageRateLimiter } from "../middleware/rateLimiter.middleware.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, validateGetMessages, getMessages);
router.get("/:id/search", protectRoute, validateSearchMessages, searchMessages);
router.get("/:id/paginated", protectRoute, validateGetMessages, getMessagesWithPagination);

router.post("/send/:id", protectRoute, validateSendMessage, messageRateLimiter, sendMessage);

export default router;
