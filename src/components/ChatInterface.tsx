import React, { useRef, useState, useEffect } from "react";
import { Bot } from "@/types";
import { useBotContext } from "@/context/BotContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send, Image, UserCircle, Expand, RefreshCw } from "lucide-react";
import ImageCropModal from "./ImageCropModal";

interface ChatInterfaceProps {
  bot: Bot;
  onClose: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ bot, onClose }) => {
  const { updateBotImage } = useBotContext();
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState([
    { type: "bot", content: "Hello! How can I assist you today?" }
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [cropModalState, setCropModalState] = useState({
    isOpen: false,
    imageType: "" as "chatIcon" | "botIcon" | "background" | "header",
    imageSrc: "",
  });
  
  // Add a debounce ref to prevent rapid image uploads
  const lastUploadTime = useRef<number>(0);
  // Track upload status for different image types
  const [uploadStatus, setUploadStatus] = useState<{
    chatIcon: boolean;
    botIcon: boolean;
    header: boolean;
    background: boolean;
  }>({
    chatIcon: false,
    botIcon: false,
    header: false,
    background: false,
  });

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { type: "user", content: inputMessage }]);
    
    // Simulate bot response after a short delay
    setTimeout(() => {
      setMessages(prev => [...prev, { type: "bot", content: "I'm a demo bot. This is a simulated response." }]);
    }, 1000);
    
    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const setUploadingStatus = (imageType: "chatIcon" | "botIcon" | "background" | "header", status: boolean) => {
    setUploadStatus(prev => ({
      ...prev,
      [imageType]: status
    }));
  };

  const handleImageClick = (imageType: "chatIcon" | "botIcon" | "background" | "header") => {
    // Prevent multiple uploads at once
    if (isUploading) {
      toast.error("Please wait for the current upload to complete");
      return;
    }

    // Check if an upload is already in progress for this specific image type
    if (uploadStatus[imageType]) {
      toast.error(`${imageType} is already being uploaded`);
      return;
    }
    
    // Add debounce to prevent rapid clicking (2 second cooldown)
    const now = Date.now();
    if (now - lastUploadTime.current < 2000) {
      toast.info("Please wait a moment before uploading another image");
      return;
    }
    
    lastUploadTime.current = now;
    
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*"; // Accept all image types
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      // Check if the file is an image
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      
      // Check file size - limit to 5MB
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image is too large. Please select an image under 5MB");
        return;
      }
      
      setIsUploading(true);
      setUploadingStatus(imageType, true);
      
      const reader = new FileReader();
      reader.onload = () => {
        // For chat, bot and header icons, use the cropper
        if (imageType === "chatIcon" || imageType === "botIcon" || imageType === "header") {
          setCropModalState({
            isOpen: true,
            imageType,
            imageSrc: reader.result as string,
          });
          setIsUploading(false);
        } else {
          // For background, just update directly
          toast.loading(`Uploading ${imageType}...`);
          uploadImage(imageType, reader.result as string);
        }
      };
      
      reader.onerror = () => {
        toast.error("Failed to read image file");
        setIsUploading(false);
        setUploadingStatus(imageType, false);
      };
      
      reader.readAsDataURL(file);
    };
    
    input.click();
  };

  const uploadImage = async (imageType: "chatIcon" | "botIcon" | "background" | "header", imageData: string) => {
    try {
      await updateBotImage(bot, imageType, imageData);
      toast.success(`${imageType === "chatIcon" ? "Chat icon" : 
                      imageType === "botIcon" ? "Bot icon" : 
                      imageType === "header" ? "Header image" : 
                      "Background"} updated successfully!`);
      
      // Force a re-render to show the updated image
      if (imageType === "chatIcon" || imageType === "botIcon") {
        setMessages([...messages]);
      }
    } catch (error) {
      console.error(`Error updating ${imageType}:`, error);
      toast.error(`Failed to update ${imageType}. Please try again.`);
    } finally {
      setIsUploading(false);
      setUploadingStatus(imageType, false);
    }
  };

  const handleCropComplete = (croppedImage: string) => {
    const { imageType } = cropModalState;
    setIsUploading(true);
    toast.loading(`Uploading ${imageType}...`);
    
    uploadImage(imageType, croppedImage)
      .finally(() => {
        setCropModalState({ ...cropModalState, isOpen: false });
      });
  };

  // Helper to display loading spinner if upload is in progress
  const renderUploadStatus = (imageType: "chatIcon" | "botIcon" | "background" | "header") => {
    if (uploadStatus[imageType]) {
      return <RefreshCw className="h-4 w-4 animate-spin absolute top-0 right-0" />;
    }
    return null;
  };

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Chat header */}
      <div className="bg-white border-b p-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div 
            className="h-10 w-10 rounded-full overflow-hidden border cursor-pointer relative"
            onClick={() => handleImageClick("botIcon")}
            title="Click to change bot icon"
          >
            {renderUploadStatus("botIcon")}
            {bot.botIcon ? (
              <img src={bot.botIcon} alt={bot.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                <UserCircle className="h-6 w-6 text-gray-400" />
              </div>
            )}
          </div>
          <div>
            <h2 className="font-medium">{bot.name}</h2>
            <p className="text-xs text-gray-500">Click on icons to update them</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => handleImageClick("header")}
            className="h-8 w-8 relative"
            title="Change header image"
          >
            {renderUploadStatus("header")}
            <Image className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm" onClick={onClose}>
            Back to Dashboard
          </Button>
        </div>
      </div>
      
      {/* Chat messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={bot.backgroundImage ? {
          backgroundImage: `url(${bot.backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : {}}
      >
        {messages.map((message, index) => (
          <div 
            key={index}
            className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.type === "bot" && (
              <div 
                className="h-8 w-8 rounded-full overflow-hidden mr-2 cursor-pointer relative"
                onClick={() => handleImageClick("chatIcon")}
                title="Click to change chat icon"
              >
                {renderUploadStatus("chatIcon")}
                {bot.chatIcon ? (
                  <img src={bot.chatIcon} alt="Bot" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                    <UserCircle className="h-5 w-5 text-gray-400" />
                  </div>
                )}
              </div>
            )}
            <div 
              className={`max-w-[75%] p-3 rounded-lg ${
                message.type === "user" 
                  ? "bg-xspectrum-purple text-white"
                  : "bg-white shadow"
              }`}
              style={message.type === "user" && bot.chatGradient 
                ? { background: bot.chatGradient }
                : {}
              }
            >
              {message.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Image upload buttons */}
      <div className="bg-gray-50 px-4 py-2 flex justify-between items-center border-t">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => handleImageClick("background")}
            className="h-8 w-8 relative"
            title="Change background image"
          >
            {renderUploadStatus("background")}
            <Expand className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => handleImageClick("chatIcon")}
            className="h-8 w-8 relative"
            title="Change chat icon"
          >
            {renderUploadStatus("chatIcon")}
            <UserCircle className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-xs text-gray-500">
          {bot.chatboxText || "Type a message..."}
        </div>
      </div>
      
      {/* Chat input */}
      <div className="p-4 border-t flex gap-2">
        <Input
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          className="flex-1"
        />
        <Button onClick={handleSendMessage} className="bg-xspectrum-purple hover:bg-xspectrum-purple/90">
          <Send className="h-4 w-4" />
        </Button>
      </div>
      
      <ImageCropModal
        isOpen={cropModalState.isOpen}
        onClose={() => {
          setCropModalState({ ...cropModalState, isOpen: false });
          setIsUploading(false);
          setUploadingStatus(cropModalState.imageType, false);
        }}
        onCrop={handleCropComplete}
        imageSrc={cropModalState.imageSrc}
        aspectRatio={cropModalState.imageType === "header" ? 16/9 : 1}
      />
    </div>
  );
};

export default ChatInterface;