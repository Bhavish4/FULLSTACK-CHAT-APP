import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Check, CheckCheck } from "lucide-react";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    markMessagesAsDelivered,
    typingUsers,
    isMoreMessages,
    loadMoreMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    getMessages(selectedUser._id);

    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    
    // Mark messages as delivered when they come into view
    const deliveredMessageIds = messages
      .filter(msg => msg.senderId !== authUser._id && msg.status !== 'delivered' && msg.status !== 'read')
      .map(msg => msg._id);
    
    if (deliveredMessageIds.length > 0) {
      markMessagesAsDelivered(deliveredMessageIds);
    }
  }, [messages, authUser._id, markMessagesAsDelivered]);
  
  // Handle scroll for loading more messages
  useEffect(() => {
    const handleScroll = async () => {
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        
        // When user scrolls to the top (with 100px buffer)
        if (scrollTop < 100 && isMoreMessages && !isMessagesLoading) {
          await loadMoreMessages(selectedUser._id);
          
          // Maintain scroll position after loading more messages
          setTimeout(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = 100;
            }
          }, 0);
        }
      }
    };
    
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [isMoreMessages, isMessagesLoading, selectedUser._id, loadMoreMessages]);

  if (isMessagesLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Load more indicator */}
        {isMessagesLoading && messages.length > 0 && (
          <div className="flex justify-center py-2">
            <span className="loading loading-spinner loading-sm"></span>
          </div>
        )}
        
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="chat chat-start">
            <div className="chat-bubble bg-base-200">
              <span className="text-sm italic">typing...</span>
            </div>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
            ref={messageEndRef}
          >
            <div className=" chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>
            <div className="chat-bubble flex flex-col">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.file && (
                <div className="flex items-center gap-2 p-2 bg-base-200 rounded-md mb-2">
                  <div className="p-2 bg-base-300 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium truncate max-w-xs">{message.file.name}</p>
                    <p className="text-xs text-base-content/70">{(message.file.size / 1024).toFixed(2)} KB</p>
                  </div>
                  <a 
                    href={message.file.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 btn btn-xs btn-primary"
                  >
                    Download
                  </a>
                </div>
              )}
              {message.text && <p>{message.text}</p>}
            </div>
            
            {/* Message status indicators for sent messages */}
            {message.senderId === authUser._id && (
              <div className="chat-footer opacity-50 text-xs flex items-center gap-1">
                {message.status === 'delivered' ? (
                  <CheckCheck className="w-3 h-3 text-blue-500" />
                ) : message.status === 'read' ? (
                  <CheckCheck className="w-3 h-3 text-blue-500 fill-blue-500" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                <span>
                  {message.status === 'delivered' ? 'Delivered' : 
                   message.status === 'read' ? 'Read' : 'Sent'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <MessageInput />
    </div>
  );
};
export default ChatContainer;