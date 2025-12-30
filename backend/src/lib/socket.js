import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from '../models/message.model.js';
import GroupMessage from '../models/groupMessage.model.js';
import Group from '../models/group.model.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Handle message delivered event
  socket.on("messageDelivered", async (messageId) => {
    try {
      await Message.findByIdAndUpdate(messageId, {
        status: 'delivered',
        deliveredAt: new Date()
      });
      
      // Notify sender that the message was delivered
      const message = await Message.findById(messageId);
      if (message) {
        const senderSocketId = getReceiverSocketId(message.senderId.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageStatusUpdate", {
            messageId: message._id,
            status: 'delivered',
            deliveredAt: message.deliveredAt
          });
        }
      }
    } catch (error) {
      console.error("Error updating message delivered status:", error);
    }
  });
  
  // Handle message read event
  socket.on("messageRead", async (messageId) => {
    try {
      await Message.findByIdAndUpdate(messageId, {
        status: 'read',
        readAt: new Date()
      });
      
      // Notify sender that the message was read
      const message = await Message.findById(messageId);
      if (message) {
        const senderSocketId = getReceiverSocketId(message.senderId.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageStatusUpdate", {
            messageId: message._id,
            status: 'read',
            readAt: message.readAt
          });
        }
      }
    } catch (error) {
      console.error("Error updating message read status:", error);
    }
  });
  
  // Handle user typing event
  socket.on("typingStart", (data) => {
    const { receiverId, senderId } = data;
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", { senderId });
    }
  });
  
  socket.on("typingStop", (data) => {
    const { receiverId, senderId } = data;
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userStoppedTyping", { senderId });
    }
  });
  
  // Handle group message read event
  socket.on("groupMessageRead", async (data) => {
    try {
      const { messageId, userId } = data;
      
      await GroupMessage.updateOne(
        { _id: messageId, 'readBy.userId': { $ne: userId } },
        { 
          $push: { readBy: { userId, readAt: new Date() } },
          $set: { status: 'read' }
        }
      );
      
      // Get the group message to notify other members
      const groupMessage = await GroupMessage.findById(messageId);
      if (groupMessage) {
        const group = await Group.findById(groupMessage.groupId);
        if (group) {
          // Notify all group members about the read status
          for (const memberId of group.members) {
            const memberSocketId = getReceiverSocketId(memberId.toString());
            if (memberSocketId && memberId.toString() !== userId) {
              io.to(memberSocketId).emit("groupMessageStatusUpdate", {
                messageId: groupMessage._id,
                status: 'read',
                userId: userId
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error updating group message read status:", error);
    }
  });
  
  // Handle group message delivered event
  socket.on("groupMessageDelivered", async (data) => {
    try {
      const { messageId, userId } = data;
      
      await GroupMessage.updateOne(
        { _id: messageId, 'deliveredTo.userId': { $ne: userId } },
        { 
          $push: { deliveredTo: { userId, deliveredAt: new Date() } },
          $set: { status: 'delivered' }
        }
      );
    } catch (error) {
      console.error("Error updating group message delivered status:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    // Remove the user from the socket map
    for (let [key, value] of Object.entries(userSocketMap)) {
      if (value === socket.id) {
        delete userSocketMap[key];
        break;
      }
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
