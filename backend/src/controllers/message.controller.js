import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    // Verify that the requesting user is one of the participants
    const receiver = await User.findById(userToChatId);
    if (!receiver) {
      return res.status(404).json({ error: "User not found" });
    }

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 }); // Sort messages by creation date

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Search messages for a specific user
export const searchMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;
    const { q, limit = 20, skip = 0 } = req.query;

    // Verify that the requesting user is one of the participants
    const receiver = await User.findById(userToChatId);
    if (!receiver) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const messages = await Message.find({
      $and: [
        {
          $or: [
            { senderId: myId, receiverId: userToChatId },
            { senderId: userToChatId, receiverId: myId },
          ],
        },
        {
          $or: [
            { text: { $regex: q, $options: "i" } },
          ],
        },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in searchMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get messages with pagination
export const getMessagesWithPagination = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;
    const { limit = 20, skip = 0 } = req.query;

    // Verify that the requesting user is one of the participants
    const receiver = await User.findById(userToChatId);
    if (!receiver) {
      return res.status(404).json({ error: "User not found" });
    }

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessagesWithPagination controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, file } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Verify that the receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: "Receiver not found" });
    }

    // Check if sender and receiver are the same (prevent self messaging)
    if (senderId.toString() === receiverId) {
      return res.status(400).json({ error: "You cannot send a message to yourself" });
    }
    
    // Check if either user has blocked the other
    const sender = await User.findById(senderId);
    if (sender.blockedUsers.includes(receiverId) || receiver.blockedUsers.includes(senderId.toString())) {
      return res.status(403).json({ error: "Messaging is not allowed between these users" });
    }
    
    // Check if receiver allows messaging
    if (!receiver.privacySettings.allowMessaging) {
      return res.status(403).json({ error: "This user does not allow messages" });
    }

    let imageUrl;
    let fileData = null;
    
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    } else if (file) {
      // In a real implementation, you would upload the file to Cloudinary or another service
      // For now, we'll just store the file information
      fileData = {
        url: file.url,
        name: file.name,
        type: file.type,
        size: file.size,
      };
    }

    // Sanitize text input
    const sanitizedText = text ? text.trim() : null;
    
    const newMessage = new Message({
      senderId,
      receiverId,
      text: sanitizedText,
      image: imageUrl,
      file: fileData,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
