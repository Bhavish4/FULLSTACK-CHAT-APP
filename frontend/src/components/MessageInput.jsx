import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [filePreview, setFilePreview] = useState(null); // For non-image files
  const fileInputRef = useRef(null);
  const fileInputRef2 = useRef(null); // For file input
  const typingTimeoutRef = useRef(null);
  const {
    sendMessage,
    selectedUser,
    startTyping,
    stopTyping,
  } = useChatStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file.type.startsWith("image/")) {
      toast.error("Please use the image button for images");
      return;
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }

    // Create a preview object
    setFilePreview({
      name: file.name,
      size: file.size,
      type: file.type,
    });
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = () => {
    setFilePreview(null);
    if (fileInputRef2.current) fileInputRef2.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !filePreview) return;

    try {
      const messageData = {
        text: text.trim(),
        image: imagePreview,
      };

      // If there's a file, add it to the message data
      if (filePreview) {
        // In a real implementation, you would upload the file to a service like Cloudinary
        // For now, we'll just pass the file info as part of the message
        messageData.file = {
          name: filePreview.name,
          size: filePreview.size,
          type: filePreview.type,
          // In a real app, this would be the URL of the uploaded file
          url: null, 
        };
      }

      await sendMessage(messageData);

      // Clear form
      setText("");
      setImagePreview(null);
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (fileInputRef2.current) fileInputRef2.current.value = "";
      
      // Stop typing indicator
      if (selectedUser) {
        stopTyping(selectedUser._id);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleTextChange = (e) => {
    const value = e.target.value;
    setText(value);
    
    // Send typing indicator
    if (selectedUser) {
      if (value.trim() !== "") {
        startTyping(selectedUser._id);
        
        // Clear any existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        // Set new timeout to stop typing indicator after 1 second of inactivity
        typingTimeoutRef.current = setTimeout(() => {
          stopTyping(selectedUser._id);
        }, 1000);
      } else {
        stopTyping(selectedUser._id);
      }
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="p-4 w-full">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}
      {filePreview && (
        <div className="mb-3 flex items-center gap-2 p-2 bg-base-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-base-300 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium truncate max-w-xs">{filePreview.name}</p>
              <p className="text-xs text-base-content/70">{(filePreview.size / 1024).toFixed(2)} KB</p>
            </div>
          </div>
          <button
            onClick={removeFile}
            className="ml-2 w-5 h-5 rounded-full bg-base-300
            flex items-center justify-center"
            type="button"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={handleTextChange}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />
          <input
            type="file"
            className="hidden"
            ref={fileInputRef2}
            onChange={handleFileChange}
          />

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle
                     ${imagePreview || filePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
          <button
            type="button"
            className={`hidden sm:flex btn btn-circle
                     ${imagePreview || filePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef2.current?.click()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !imagePreview && !filePreview}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;