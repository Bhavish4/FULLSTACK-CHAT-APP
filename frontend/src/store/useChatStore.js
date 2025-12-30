export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isMoreMessages: true, // Flag to indicate if there are more messages to load
  skip: 0, // Number of messages to skip for pagination
  limit: 20, // Number of messages to fetch per request
  typingUsers: [],
  encryptionKeys: {}, // Store encryption keys per user
  isOffline: !navigator.onLine, // Track if the app is offline

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      // Reset pagination when loading messages for a new user
      set({ skip: 0, isMoreMessages: true });
      
      const res = await axiosInstance.get(`/messages/${userId}/paginated?limit=${get().limit}&skip=0`);
      set({ messages: res.data, skip: get().limit });
      
      // Check if there are more messages to load
      if (res.data.length < get().limit) {
        set({ isMoreMessages: false });
      }
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  
  loadMoreMessages: async (userId) => {
    if (!get().isMoreMessages || get().isMessagesLoading) return;
    
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}/paginated?limit=${get().limit}&skip=${get().skip}`);
      
      if (res.data.length > 0) {
        set((state) => ({
          messages: [...res.data, ...state.messages],
          skip: state.skip + state.limit,
        }));
        
        // Check if there are more messages to load
        if (res.data.length < get().limit) {
          set({ isMoreMessages: false });
        }
      } else {
        set({ isMoreMessages: false });
      }
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages, encryptMessageForUser, isOffline } = get();
    
    // Check if we're offline
    if (isOffline) {
      // Queue the message for sending when back online
      await queueMessageForSending(messageData, selectedUser._id);
      
      // Add a temporary message to the UI with a pending status
      const tempMessage = {
        _id: `temp-${Date.now()}`,
        senderId: useAuthStore.getState().authUser._id,
        receiverId: selectedUser._id,
        ...messageData,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      
      set({ messages: [...messages, tempMessage] });
      toast.success("Message queued for sending when online");
      return;
    }
    
    try {
      // Check if encryption is enabled for this user
      let encryptedMessageData = messageData;
      
      if (messageData.text) {
        try {
          const encryptedText = await encryptMessageForUser(messageData.text, selectedUser._id);
          encryptedMessageData = { ...messageData, text: encryptedText, encrypted: true };
        } catch (encryptionError) {
          // If encryption fails, send message as is
          console.error("Encryption failed, sending message unencrypted:", encryptionError);
        }
      }
      
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, encryptedMessageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      // If sending fails, queue the message for retry
      await queueMessageForSending(messageData, selectedUser._id);
      toast.success("Message failed to send, queued for retry");
      
      // Add a temporary message to the UI with a pending status
      const tempMessage = {
        _id: `temp-${Date.now()}`,
        senderId: useAuthStore.getState().authUser._id,
        receiverId: selectedUser._id,
        ...messageData,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      
      set({ messages: [...messages, tempMessage] });
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, typingUsers } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;

    socket.on("newMessage", async (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;
      
      let processedMessage = newMessage;
      
      // Decrypt message if it's encrypted
      if (newMessage.encrypted && newMessage.text) {
        try {
          const decryptedText = await get().decryptMessageFromUser(newMessage.text, newMessage.senderId);
          processedMessage = { ...newMessage, text: decryptedText, encrypted: false };
        } catch (decryptionError) {
          console.error("Decryption failed:", decryptionError);
          // Keep the encrypted message as is if decryption fails
        }
      }

      set({
        messages: [...get().messages, processedMessage],
      });
      
      // Show notification if the chat is not active or user is not on the page
      if (document.hidden || !document.hasFocus()) {
        showNewMessageNotification(processedMessage, selectedUser, 'direct');
      }
    });
    
    // Handle message status updates
    socket.on("messageStatusUpdate", (statusUpdate) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === statusUpdate.messageId
            ? { ...msg, status: statusUpdate.status, [statusUpdate.status + 'At']: statusUpdate[statusUpdate.status + 'At'] }
            : msg
        ),
      }));
    });
    
    // Handle typing indicators
    socket.on("userTyping", (data) => {
      if (data.senderId === selectedUser._id && !typingUsers.includes(data.senderId)) {
        set({ typingUsers: [...typingUsers, data.senderId] });
      }
    });
    
    socket.on("userStoppedTyping", (data) => {
      set({ typingUsers: typingUsers.filter(id => id !== data.senderId) });
    });
    
    // Handle new group messages
    socket.on("newGroupMessage", (groupMessage) => {
      // Show notification for group messages
      if (document.hidden || !document.hasFocus()) {
        showNewMessageNotification(groupMessage, groupMessage.senderId, 'group');
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messageStatusUpdate");
    socket.off("userTyping");
    socket.off("userStoppedTyping");
  },
  
  markMessagesAsDelivered: (messageIds) => {
    const socket = useAuthStore.getState().socket;
    messageIds.forEach(id => {
      socket.emit("messageDelivered", id);
    });
  },
  
  markMessagesAsRead: (messageIds) => {
    const socket = useAuthStore.getState().socket;
    messageIds.forEach(id => {
      socket.emit("messageRead", id);
    });
  },
  
  startTyping: (receiverId) => {
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;
    socket.emit("typingStart", { receiverId, senderId: authUser._id });
  },
  
  stopTyping: (receiverId) => {
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;
    socket.emit("typingStop", { receiverId, senderId: authUser._id });
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
  
  // Encryption functions
  generateUserEncryptionKey: async (userId) => {
    const key = await generateEncryptionKey();
    const exportedKey = await exportKey(key);
    
    set((state) => ({
      encryptionKeys: {
        ...state.encryptionKeys,
        [userId]: exportedKey,
      },
    }));
    
    return key;
  },
  
  getEncryptionKey: async (userId) => {
    const { encryptionKeys } = get();
    const keyString = encryptionKeys[userId];
    
    if (!keyString) {
      return null;
    }
    
    return await importKey(keyString);
  },
  
  encryptMessageForUser: async (message, userId) => {
    const key = await get().getEncryptionKey(userId);
    if (!key) {
      throw new Error("Encryption key not found for user");
    }
    
    return await encryptMessage(message, key);
  },
  
  decryptMessageFromUser: async (encryptedMessage, userId) => {
    const key = await get().getEncryptionKey(userId);
    if (!key) {
      throw new Error("Encryption key not found for user");
    }
    
    return await decryptMessage(encryptedMessage, key);
  },
  
  // Offline functionality
  initializeOfflineHandling: () => {
    // Set up online/offline listeners
    setupOnlineOfflineListeners(
      () => {
        // When back online
        set({ isOffline: false });
        // Attempt to send pending messages
        attemptToSendPendingMessages(axiosInstance);
      },
      () => {
        // When offline
        set({ isOffline: true });
      }
    );
  },
}
)
);