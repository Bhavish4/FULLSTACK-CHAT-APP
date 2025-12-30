// Notification utility functions

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
};

// Show browser notification
export const showNotification = async (title, options = {}) => {
  if (Notification.permission !== "granted") {
    return;
  }

  try {
    new Notification(title, options);
  } catch (error) {
    console.error("Error showing notification:", error);
  }
};

// Show notification for new messages
export const showNewMessageNotification = async (message, sender, chatType = 'direct') => {
  if (Notification.permission !== "granted") {
    await requestNotificationPermission();
  }

  if (Notification.permission === "granted") {
    const chatName = chatType === 'group' ? message.groupName : sender.fullName;
    const body = message.text ? message.text : (message.image ? 'Sent an image' : 'New message');
    
    showNotification(`${chatName}`, {
      body: body,
      icon: sender.profilePic || '/avatar.png',
      tag: `message-${message._id}`,
    });
  }
};

// Check if notifications are supported
export const areNotificationsSupported = () => {
  return "Notification" in window;
};