import React, { useState } from "react";
import { Edit2, Trash2, Link as LinkIcon, ExternalLink, Save, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Bot } from "@/types";
import { useBotContext } from "@/context/BotContext";
import ImageCropModal from "./ImageCropModal";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface BotCardProps {
  bot: Bot;
}

const BotCard: React.FC<BotCardProps> = ({ bot }) => {
  const { deleteBot, updateBotImage, updateBotText } = useBotContext();
  const [isEditMode, setIsEditMode] = useState(false);
  const [chatboxText, setChatboxText] = useState(bot.chatboxText || "");
  const [chatGradient, setChatGradient] = useState(bot.chatGradient || "");
  const navigate = useNavigate();
  const [cropModalState, setCropModalState] = useState({
    isOpen: false,
    imageType: "" as "chatIcon" | "botIcon" | "background" | "header",
    imageSrc: "",
  });
  
  // Update form values when bot changes
  React.useEffect(() => {
    setChatboxText(bot.chatboxText || "");
    setChatGradient(bot.chatGradient || "");
  }, [bot]);

  const handleImageClick = (imageType: "chatIcon" | "botIcon" | "background" | "header") => {
    if (!isEditMode) return;
    
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
      
      const reader = new FileReader();
      reader.onload = () => {
        // For chat and bot icons, use the cropper
        if (imageType === "chatIcon" || imageType === "botIcon") {
          setCropModalState({
            isOpen: true,
            imageType,
            imageSrc: reader.result as string,
          });
        } else {
          // Show a loading indicator
          toast.loading(`Uploading ${imageType}...`, { id: `upload-${imageType}` });
          
          // For background and header, just update directly
          updateBotImage(bot, imageType, reader.result as string)
            .then(() => {
              toast.success(`${imageType} updated successfully`, { id: `upload-${imageType}` });
            })
            .catch((error) => {
              console.error(`Error updating ${imageType}:`, error);
              toast.error(`Failed to update ${imageType}`, { id: `upload-${imageType}` });
            });
        }
      };
      reader.readAsDataURL(file);
    };
    
    input.click();
  };

  const handleCropComplete = (croppedImage: string) => {
    // Show a loading indicator
    toast.loading(`Uploading ${cropModalState.imageType}...`, { id: `upload-${cropModalState.imageType}` });
    
    updateBotImage(bot, cropModalState.imageType, croppedImage)
      .then(() => {
        toast.success(`${cropModalState.imageType} updated successfully`, { id: `upload-${cropModalState.imageType}` });
      })
      .catch((error) => {
        console.error(`Error updating ${cropModalState.imageType}:`, error);
        toast.error(`Failed to update ${cropModalState.imageType}`, { id: `upload-${cropModalState.imageType}` });
      });
  };

  const handleOpenBot = () => {
    if (!isEditMode) {
      window.open(bot.url, "_blank");
    }
  };

  const handleOpenChatInterface = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/chat/${bot.code}`);
  };

  const handleSubmitChatboxText = async () => {
    toast.loading("Updating chat box text...", { id: "update-chatbox-text" });
    
    try {
      await updateBotText(bot, "chatboxText", chatboxText);
      toast.success("Chat box text updated successfully", { id: "update-chatbox-text" });
    } catch (error) {
      console.error("Error updating chat box text:", error);
      toast.error("Failed to update chat box text", { id: "update-chatbox-text" });
    }
  };

  const handleSubmitChatGradient = async () => {
    toast.loading("Updating chat gradient...", { id: "update-chat-gradient" });
    
    try {
      await updateBotText(bot, "chatGradient", chatGradient);
      toast.success("Chat gradient updated successfully", { id: "update-chat-gradient" });
    } catch (error) {
      console.error("Error updating chat gradient:", error);
      toast.error("Failed to update chat gradient", { id: "update-chat-gradient" });
    }
  };

  const handleDeleteBot = async () => {
    if (window.confirm(`Are you sure you want to delete ${bot.name}?`)) {
      toast.loading(`Deleting bot ${bot.name}...`, { id: `delete-bot-${bot.code}` });
      
      try {
        await deleteBot(bot.name, bot.code);
        toast.success(`Bot ${bot.name} deleted successfully`, { id: `delete-bot-${bot.code}` });
      } catch (error) {
        console.error("Error deleting bot:", error);
        toast.error(`Failed to delete bot ${bot.name}`, { id: `delete-bot-${bot.code}` });
      }
    }
  };

  return (
    <>
      <Card
        className={`overflow-hidden transition-all duration-300 ${isEditMode ? "border-xspectrum-purple" : "hover:shadow-md cursor-pointer"}`}
        style={{ height: isEditMode ? "auto" : "250px" }}
        onClick={isEditMode ? undefined : handleOpenBot}
      >
        <CardHeader className="p-3 flex flex-row items-center justify-between bg-gray-50 border-b">
          <div className="font-semibold truncate">{bot.name}</div>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditMode(!isEditMode);
                    }}
                  >
                    {isEditMode ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isEditMode ? "Exit edit mode" : "Edit bot"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBot();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete bot</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>

        {!isEditMode && (
          <CardContent className="p-4 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Chat Icon</p>
              <div 
                className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border cursor-pointer hover:border-xspectrum-purple transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenChatInterface(e);
                }}
                title="Open chat interface"
              >
                {bot.chatIcon ? (
                  <img src={bot.chatIcon} alt="Chat icon" className="h-full w-full object-cover" />
                ) : (
                  <MessageSquare className="h-6 w-6 text-gray-400" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-500">Bot Icon</p>
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border">
                {bot.botIcon ? (
                  <img src={bot.botIcon} alt="Bot icon" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-xs text-gray-400">No icon</div>
                )}
              </div>
            </div>
          </CardContent>
        )}

        {isEditMode && (
          <CardContent className="p-4 space-y-4">
            <div className="hidden">{bot.code}</div>
            {bot.apiKey && <div className="text-sm">API Key: {bot.apiKey}</div>}
            
            <div className="grid grid-cols-2 gap-4">
              <div 
                className="space-y-2 cursor-pointer" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageClick("chatIcon");
                }}
              >
                <p className="text-xs text-gray-500">Chat Icon</p>
                <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border hover:border-xspectrum-purple transition-colors">
                  {bot.chatIcon ? (
                    <img src={bot.chatIcon} alt="Chat icon" className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-xs text-gray-400">Click to upload</div>
                  )}
                </div>
              </div>

              <div 
                className="space-y-2 cursor-pointer" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageClick("botIcon");
                }}
              >
                <p className="text-xs text-gray-500">Bot Icon</p>
                <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border hover:border-xspectrum-purple transition-colors">
                  {bot.botIcon ? (
                    <img src={bot.botIcon} alt="Bot icon" className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-xs text-gray-400">Click to upload</div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div 
                className="space-y-2 cursor-pointer" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageClick("background");
                }}
              >
                <p className="text-xs text-gray-500">Background Image</p>
                <div className="h-24 w-full bg-gray-100 flex items-center justify-center overflow-hidden border hover:border-xspectrum-purple transition-colors rounded">
                  {bot.backgroundImage ? (
                    <img src={bot.backgroundImage} alt="Background" className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-xs text-gray-400">Click to upload</div>
                  )}
                </div>
              </div>

              <div 
                className="space-y-2 cursor-pointer" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageClick("header");
                }}
              >
                <p className="text-xs text-gray-500">Header Image</p>
                <div className="h-24 w-full bg-gray-100 flex items-center justify-center overflow-hidden border hover:border-xspectrum-purple transition-colors rounded">
                  {bot.headerImage ? (
                    <img src={bot.headerImage} alt="Header" className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-xs text-gray-400">Click to upload</div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-500">Chat Box Text</p>
              <div className="flex space-x-2">
                <Input
                  value={chatboxText}
                  onChange={(e) => setChatboxText(e.target.value)}
                  placeholder="Enter chat box text..."
                  className="flex-1"
                  onClick={(e) => e.stopPropagation()}
                />
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubmitChatboxText();
                  }}
                  className="bg-xspectrum-purple hover:bg-xspectrum-purple/90"
                >
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-500">Chat Gradient</p>
              <div className="flex space-x-2">
                <Input
                  value={chatGradient}
                  onChange={(e) => setChatGradient(e.target.value)}
                  placeholder="Enter chat gradient..."
                  className="flex-1"
                  onClick={(e) => e.stopPropagation()}
                />
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubmitChatGradient();
                  }}
                  className="bg-xspectrum-purple hover:bg-xspectrum-purple/90"
                >
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
              </div>
            </div>
          </CardContent>
        )}

        <CardFooter className="p-3 bg-gray-50 border-t flex justify-between items-center">
          <div className="flex items-center gap-1">
            <LinkIcon className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-500 truncate max-w-[160px]">
              {bot.url}
            </span>
          </div>
          
          <div className="flex gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenChatInterface(e);
                    }}
                  >
                    <MessageSquare className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open chat interface</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(bot.url);
                      toast.success("Bot URL copied to clipboard");
                    }}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy bot URL</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardFooter>
      </Card>

      <ImageCropModal
        isOpen={cropModalState.isOpen}
        onClose={() => setCropModalState({ ...cropModalState, isOpen: false })}
        onCrop={handleCropComplete}
        imageSrc={cropModalState.imageSrc}
        aspectRatio={
          cropModalState.imageType === "chatIcon" || cropModalState.imageType === "botIcon" ? 1 : undefined
        }
      />
    </>
  );
};

export default BotCard;
