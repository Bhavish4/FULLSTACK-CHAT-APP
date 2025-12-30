// Offline message handling utilities

// Check if the browser supports service workers
export const supportsServiceWorker = () => {
  return 'serviceWorker' in navigator;
};

// Check if the browser supports background sync
export const supportsBackgroundSync = () => {
  return 'serviceWorker' in navigator && 'sync' in navigator.serviceWorker;
};

// Register service worker
export const registerServiceWorker = async () => {
  if (!supportsServiceWorker()) {
    console.log('Service workers are not supported in this browser.');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/offlineServiceWorker.js');
    console.log('Service worker registered with scope:', registration.scope);
    
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
  }
};

// Queue a message for offline sending
export const queueMessageForSending = async (messageData, receiverId) => {
  // Create a unique ID for the message
  const messageId = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Store the message in localStorage
  const pendingMessages = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
  pendingMessages.push({
    id: messageId,
    receiverId,
    data: messageData,
    timestamp: Date.now(),
  });
  
  localStorage.setItem('pendingMessages', JSON.stringify(pendingMessages));
  
  // If background sync is available, trigger a sync
  if (supportsBackgroundSync()) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-messages');
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }
  
  return messageId;
};

// Get pending messages
export const getPendingMessages = () => {
  const pendingMessages = localStorage.getItem('pendingMessages');
  return pendingMessages ? JSON.parse(pendingMessages) : [];
};

// Remove a pending message
export const removePendingMessage = (messageId) => {
  const pendingMessages = getPendingMessages();
  const updatedMessages = pendingMessages.filter(msg => msg.id !== messageId);
  localStorage.setItem('pendingMessages', JSON.stringify(updatedMessages));
};

// Check if device is online
export const isOnline = () => {
  return navigator.onLine;
};

// Set up online/offline listeners
export const setupOnlineOfflineListeners = (onOnlineCallback, onOfflineCallback) => {
  window.addEventListener('online', () => {
    console.log('Back online');
    if (onOnlineCallback) onOnlineCallback();
  });
  
  window.addEventListener('offline', () => {
    console.log('Offline');
    if (onOfflineCallback) onOfflineCallback();
  });
};

// Attempt to send all pending messages when back online
export const attemptToSendPendingMessages = async (axiosInstance) => {
  const pendingMessages = getPendingMessages();
  
  if (pendingMessages.length === 0) {
    return;
  }
  
  console.log(`Attempting to send ${pendingMessages.length} pending messages`);
  
  for (const message of pendingMessages) {
    try {
      const response = await axiosInstance.post(`/messages/send/${message.receiverId}`, message.data);
      
      if (response.status === 201) {
        // Remove the message from pending queue
        removePendingMessage(message.id);
        console.log(`Message ${message.id} sent successfully`);
      }
    } catch (error) {
      console.error(`Failed to send message ${message.id}:`, error.message);
      // Keep the message in the queue for next attempt
    }
  }
};