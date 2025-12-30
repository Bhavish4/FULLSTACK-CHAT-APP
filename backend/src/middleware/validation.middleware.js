import { body, query, param } from "express-validator";
import { validate } from "../lib/utils.js";

// Validation middleware for sending messages
export const validateSendMessage = [
  param("id")
    .isMongoId()
    .withMessage("Invalid receiver ID"),
  body("text")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Message text cannot exceed 1000 characters")
    .trim()
    .escape(),
  body("image")
    .optional()
    .isURL()
    .withMessage("Image must be a valid URL"),
  (req, res, next) => {
    validate(req, res, next);
  }
];

// Validation middleware for getting messages
export const validateGetMessages = [
  param("id")
    .isMongoId()
    .withMessage("Invalid user ID"),
  (req, res, next) => {
    validate(req, res, next);
  }
];

// Validation middleware for searching messages
export const validateSearchMessages = [
  query("q")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters")
    .trim()
    .escape(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),
  query("skip")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Skip must be a non-negative integer")
    .toInt(),
  (req, res, next) => {
    validate(req, res, next);
  }
];