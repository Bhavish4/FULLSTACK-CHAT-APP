import User from "../models/user.model.js";
import Group from "../models/group.model.js";
import GroupMessage from "../models/groupMessage.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { name, description, members, isPrivate } = req.body;
    const adminId = req.user._id;

    // Validate that admin is part of the members
    if (!members.includes(adminId.toString())) {
      return res.status(400).json({ error: "Admin must be part of the group members" });
    }

    // Validate that all members exist
    const users = await User.find({ _id: { $in: members } });
    if (users.length !== members.length) {
      return res.status(400).json({ error: "One or more members don't exist" });
    }

    const group = new Group({
      name,
      description,
      members,
      admin: adminId,
      isPrivate: isPrivate || false,
    });

    await group.save();

    // Populate group with user details
    const populatedGroup = await Group.findById(group._id).populate("members", "fullName email profilePic");

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error("Error in createGroup controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all groups for a user
export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await Group.find({
      members: userId,
    }).populate("admin", "fullName profilePic").populate("members", "fullName email profilePic");

    res.status(200).json(groups);
  } catch (error) {
    console.error("Error in getUserGroups controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add member to group
export const addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberId } = req.body;
    const adminId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is admin
    if (group.admin.toString() !== adminId.toString()) {
      return res.status(403).json({ error: "Only admin can add members" });
    }

    // Check if member already exists
    if (group.members.includes(memberId)) {
      return res.status(400).json({ error: "Member already exists in group" });
    }

    // Check if user exists
    const user = await User.findById(memberId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    group.members.push(memberId);
    await group.save();

    // Notify all group members about the new member
    const populatedGroup = await Group.findById(groupId).populate("members", "fullName email profilePic");
    for (const member of populatedGroup.members) {
      const memberSocketId = getReceiverSocketId(member._id.toString());
      if (memberSocketId) {
        io.to(memberSocketId).emit("newGroupMember", {
          groupId,
          member: user,
          addedBy: req.user,
        });
      }
    }

    res.status(200).json({ message: "Member added successfully" });
  } catch (error) {
    console.error("Error in addMember controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Remove member from group
export const removeMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberId } = req.body;
    const adminId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is admin
    if (group.admin.toString() !== adminId.toString()) {
      return res.status(403).json({ error: "Only admin can remove members" });
    }

    // Check if member exists in group
    if (!group.members.includes(memberId)) {
      return res.status(400).json({ error: "Member not found in group" });
    }

    // Prevent admin from removing themselves
    if (memberId === adminId.toString()) {
      return res.status(400).json({ error: "Admin cannot remove themselves" });
    }

    group.members = group.members.filter(id => id.toString() !== memberId);
    await group.save();

    res.status(200).json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Error in removeMember controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Send a group message
export const sendGroupMessage = async (req, res) => {
  try {
    const { text, image, file } = req.body;
    const { groupId } = req.params;
    const senderId = req.user._id;

    // Check if group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!group.members.includes(senderId)) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }
    
    // Check if sender has been blocked by any group member
    const senderUser = await User.findById(senderId);
    for (const memberId of group.members) {
      const member = await User.findById(memberId);
      if (member.blockedUsers.includes(senderId)) {
        return res.status(403).json({ error: "You are blocked by a group member and cannot send messages" });
      }
    }

    let imageUrl;
    let fileData = null;
    
    if (image) {
      // In a real implementation, you would upload the image to Cloudinary
      // For now, we'll just store the image URL
      imageUrl = image;
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

    const newMessage = new GroupMessage({
      senderId,
      groupId,
      text,
      image: imageUrl,
      file: fileData,
    });

    await newMessage.save();

    // Get all members in the group except the sender
    const groupMembers = await User.find({ _id: { $in: group.members } });
    
    // Emit message to all group members except the sender
    for (const member of groupMembers) {
      if (member._id.toString() !== senderId.toString()) {
        const memberSocketId = getReceiverSocketId(member._id.toString());
        if (memberSocketId) {
          io.to(memberSocketId).emit("newGroupMessage", newMessage);
        }
      }
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendGroupMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get group messages
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    // Check if group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    const messages = await GroupMessage.find({ groupId })
      .populate("senderId", "fullName profilePic")
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getGroupMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Leave group
export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is a member
    if (!group.members.includes(userId)) {
      return res.status(400).json({ error: "You are not a member of this group" });
    }

    // If user is admin, transfer admin to another member or delete the group
    if (group.admin.toString() === userId.toString()) {
      if (group.members.length === 1) {
        // If only admin is in the group, delete the group
        await Group.findByIdAndDelete(groupId);
        res.status(200).json({ message: "Group deleted as you were the only member" });
      } else {
        // Transfer admin to the first other member
        const newMembers = group.members.filter(id => id.toString() !== userId.toString());
        group.admin = newMembers[0];
        group.members = newMembers;
        await group.save();
        res.status(200).json({ message: "You left the group and admin was transferred" });
      }
    } else {
      // Remove user from members
      group.members = group.members.filter(id => id.toString() !== userId.toString());
      await group.save();
      res.status(200).json({ message: "You left the group successfully" });
    }
  } catch (error) {
    console.error("Error in leaveGroup controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Search group messages
export const searchGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { q, limit = 20, skip = 0 } = req.query;

    // Check if group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const messages = await GroupMessage.find({
      $and: [
        { groupId: groupId },
        {
          $or: [
            { text: { $regex: q, $options: "i" } },
          ],
        },
      ],
    })
      .populate("senderId", "fullName profilePic")
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in searchGroupMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};