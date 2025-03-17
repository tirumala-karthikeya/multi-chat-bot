import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Grip, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useBotContext } from "@/context/BotContext";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { testBackendConnection } from "@/utils/api";

interface AddBotCardProps {
  isVisible: boolean;
  onClose: () => void;
}

const AddBotCard: React.FC<AddBotCardProps> = ({ isVisible, onClose }) => {
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({ name: "", apiKey: "" });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragConstraintsRef = useRef(null);
  const { addBot, refreshBots } = useBotContext();

  // Reset form when modal opens or closes
  useEffect(() => {
    if (!isVisible) {
      resetForm();
    }
  }, [isVisible]);

  const validateForm = () => {
    let formValid = true;
    const newErrors = { name: "", apiKey: "" };
    
    if (!name.trim()) {
      newErrors.name = "Bot name is required";
      formValid = false;
    }
    
    if (!apiKey.trim()) {
      newErrors.apiKey = "API key is required";
      formValid = false;
    }
    
    setErrors(newErrors);
    return formValid;
  };

  const resetForm = () => {
    setName("");
    setApiKey("");
    setErrors({ name: "", apiKey: "" });
    setSubmitError(null);
  };

  const handleAddBot = async () => {
    if (!validateForm()) {
      return;
    }
    
    setSubmitError(null);
    setIsSubmitting(true);
    
    try {
      // Check connection first
      const connectionTest = await testBackendConnection();
      if (!connectionTest.success) {
        setSubmitError("Cannot connect to server. Please check your connection and try again.");
        return;
      }
      
      console.log("Adding bot with", { name, apiKey: "***" });
      await addBot(name, apiKey);
      toast.success(`Bot "${name}" created successfully!`);
      resetForm();
      onClose(); // Close the modal
      // Manually refresh bots to ensure the new bot appears
      setTimeout(() => {
        refreshBots();
      }, 500);
    } catch (error: any) {
      console.error("Error adding bot:", error);
      setSubmitError(error.message || "Failed to create bot. Please try again.");
      toast.error(error.message || "Failed to create bot. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={dragConstraintsRef}
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/20 pointer-events-auto"
        >
          <motion.div
            drag
            dragConstraints={dragConstraintsRef}
            dragMomentum={false}
            dragElastic={0}
            onDragEnd={(_, info) => {
              setPosition({
                x: position.x + info.offset.x,
                y: position.y + info.offset.y,
              });
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              x: position.x,
            }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-200 pointer-events-auto"
          >
            <div className="flex items-center justify-between mb-4 cursor-grab">
              <div className="flex items-center gap-2">
                <Grip className="w-4 h-4 text-gray-400" />
                <h2 className="text-lg font-semibold">Add New Bot</h2>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {submitError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              <div>
                <label 
                  htmlFor="name" 
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Bot Name
                </label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors({...errors, name: ""});
                  }}
                  placeholder="Enter bot name"
                  className={`w-full ${errors.name ? "border-red-500" : ""}`}
                  required
                />
                {errors.name && (
                  <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                )}
              </div>
              
              <div>
                <label 
                  htmlFor="apiKey" 
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  API Key
                </label>
                <Input
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    if (errors.apiKey) setErrors({...errors, apiKey: ""});
                  }}
                  placeholder="Enter API key"
                  type="password"
                  className={`w-full ${errors.apiKey ? "border-red-500" : ""}`}
                  required
                />
                {errors.apiKey ? (
                  <p className="text-xs text-red-500 mt-1">{errors.apiKey}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    This key will be used to interact with your bot
                  </p>
                )}
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    onClose();
                  }}
                  className="border-gray-300"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddBot}
                  disabled={isSubmitting}
                  className="bg-xspectrum-purple hover:bg-xspectrum-purple/90"
                >
                  {isSubmitting ? "Creating..." : "Create Bot"}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddBotCard;