
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBotContext } from "@/context/BotContext";
import ChatInterface from "@/components/ChatInterface";
import { Bot } from "@/types";

const ChatView = () => {
  const { botCode } = useParams<{ botCode: string }>();
  const { bots, loading } = useBotContext();
  const [currentBot, setCurrentBot] = useState<Bot | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && botCode) {
      const foundBot = bots.find(bot => bot.code === botCode);
      if (foundBot) {
        setCurrentBot(foundBot);
      } else {
        // Bot not found, redirect to dashboard
        navigate("/");
      }
    }
  }, [botCode, bots, loading, navigate]);

  const handleClose = () => {
    navigate("/");
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-xspectrum-purple border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!currentBot) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Bot not found</p>
          <button 
            className="px-4 py-2 bg-xspectrum-purple text-white rounded-md"
            onClick={() => navigate("/")}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <ChatInterface bot={currentBot} onClose={handleClose} />;
};

export default ChatView;
