// Service worker for offline message synchronization

const CACHE_NAME = 'chat-app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available, otherwise fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Listen for message sync events
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// Listen for push notifications
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const title = data.title || 'New Message';
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    tag: data.tag || 'chat-message',
    data: {
      url: data.url || '/chat',
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Listen for notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// Function to sync messages when back online
async function syncMessages() {
  try {
    // Get pending messages from IndexedDB or localStorage
    const pendingMessages = await getPendingMessages();
    
    for (const message of pendingMessages) {
      try {
        const response = await fetch(`/api/messages/send/${message.receiverId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}` // Assuming JWT token is stored
          },
          body: JSON.stringify(message.data)
        });

        if (response.ok) {
          // Remove message from pending queue
          await removePendingMessage(message.id);
        }
      } catch (error) {
        console.error('Failed to sync message:', error);
        // Keep the message in the queue for next sync attempt
      }
    }
  } catch (error) {
    console.error('Error during message sync:', error);
  }
}

// Get pending messages from storage
async function getPendingMessages() {
  // This would typically use IndexedDB for better performance
  const pendingMessages = localStorage.getItem('pendingMessages');
  return pendingMessages ? JSON.parse(pendingMessages) : [];
}

// Remove a pending message from storage
async function removePendingMessage(messageId) {
  const pendingMessages = await getPendingMessages();
  const updatedMessages = pendingMessages.filter(msg => msg.id !== messageId);
  localStorage.setItem('pendingMessages', JSON.stringify(updatedMessages));
}

// Add a pending message to storage
async function addPendingMessage(message) {
  const pendingMessages = await getPendingMessages();
  pendingMessages.push(message);
  localStorage.setItem('pendingMessages', JSON.stringify(pendingMessages));
  
  // Try to sync immediately if online
  if ('serviceWorker' in navigator && 'sync' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.sync.register('sync-messages');
    });
  }
}