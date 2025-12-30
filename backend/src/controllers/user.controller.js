import User from "../models/user.model.js";

// Block a user
export const blockUser = async (req, res) => {
  try {
    const { userIdToBlock } = req.body;
    const currentUserId = req.user._id;

    // Prevent user from blocking themselves
    if (currentUserId.toString() === userIdToBlock) {
      return res.status(400).json({ error: "You cannot block yourself" });
    }

    // Check if user to block exists
    const userToBlock = await User.findById(userIdToBlock);
    if (!userToBlock) {
      return res.status(404).json({ error: "User not found" });
    }

    // Add user to blocked list
    const currentUser = await User.findById(currentUserId);
    if (currentUser.blockedUsers.includes(userIdToBlock)) {
      return res.status(400).json({ error: "User is already blocked" });
    }

    currentUser.blockedUsers.push(userIdToBlock);
    await currentUser.save();

    res.status(200).json({ message: "User blocked successfully" });
  } catch (error) {
    console.error("Error in blockUser controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Unblock a user
export const unblockUser = async (req, res) => {
  try {
    const { userIdToUnblock } = req.body;
    const currentUserId = req.user._id;

    // Remove user from blocked list
    const currentUser = await User.findById(currentUserId);
    currentUser.blockedUsers = currentUser.blockedUsers.filter(
      (id) => id.toString() !== userIdToUnblock
    );
    await currentUser.save();

    res.status(200).json({ message: "User unblocked successfully" });
  } catch (error) {
    console.error("Error in unblockUser controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get blocked users
export const getBlockedUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId).populate(
      "blockedUsers",
      "fullName email profilePic"
    );

    res.status(200).json(currentUser.blockedUsers);
  } catch (error) {
    console.error("Error in getBlockedUsers controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update privacy settings
export const updatePrivacySettings = async (req, res) => {
  try {
    const { showOnlineStatus, allowMessaging } = req.body;
    const currentUserId = req.user._id;

    const updatedUser = await User.findByIdAndUpdate(
      currentUserId,
      {
        "privacySettings.showOnlineStatus": showOnlineStatus,
        "privacySettings.allowMessaging": allowMessaging,
      },
      { new: true }
    );

    res.status(200).json({
      message: "Privacy settings updated successfully",
      privacySettings: updatedUser.privacySettings,
    });
  } catch (error) {
    console.error("Error in updatePrivacySettings controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Check if a user is blocked
export const isUserBlocked = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId);
    const isBlocked = currentUser.blockedUsers.some(
      (id) => id.toString() === userId
    );

    res.status(200).json({ isBlocked });
  } catch (error) {
    console.error("Error in isUserBlocked controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};