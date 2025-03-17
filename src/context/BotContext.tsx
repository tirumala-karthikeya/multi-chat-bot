import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Bot } from '@/types';
import { fetchApi, getBackendUrl } from '@/utils/api';
import { toast } from 'sonner';
import { uploadImage } from '@/utils/upload'; // Import our new utility

interface BotContextProps {
  bots: Bot[];
  loading: boolean;
  addBot: (name: string, apiKey: string) => Promise<void>;
  deleteBot: (name: string, code: string) => Promise<void>;
  updateBotImage: (bot: Bot, imageType: 'chatIcon' | 'botIcon' | 'background' | 'header', imageData: string) => Promise<void>;
  updateBotText: (bot: Bot, textType: 'chatboxText' | 'chatGradient', text: string) => Promise<void>;
  refreshBots: () => Promise<void>;
}

const BotContext = createContext<BotContextProps | undefined>(undefined);

export const useBotContext = () => {
  const context = useContext(BotContext);
  if (context === undefined) {
    throw new Error('useBotContext must be used within a BotProvider');
  }
  return context;
};

interface BotProviderProps {
  children: ReactNode;
}

export const BotProvider = ({ children }: BotProviderProps) => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const backendUrl = getBackendUrl();

  // Keep track of failed resource requests to avoid repetitive 404s
  const [failedResources] = useState<Set<string>>(new Set());
  const [refreshInProgress, setRefreshInProgress] = useState(false);
  const [lastRefreshTimestamp, setLastRefreshTimestamp] = useState(0);

  // Get deleted bots from local storage
  const getDeletedBots = (): string[] => {
    const storedDeletedBots = localStorage.getItem('deletedBots');
    return storedDeletedBots ? JSON.parse(storedDeletedBots) : [];
  };

  // Add a bot code to the deleted bots list
  const addToDeletedBots = (code: string) => {
    const deletedBots = getDeletedBots();
    if (!deletedBots.includes(code)) {
      deletedBots.push(code);
      localStorage.setItem('deletedBots', JSON.stringify(deletedBots));
    }
  };

  // Remove a bot code from the deleted bots list
  const removeFromDeletedBots = (code: string) => {
    const deletedBots = getDeletedBots();
    const index = deletedBots.indexOf(code);
    if (index !== -1) {
      deletedBots.splice(index, 1);
      localStorage.setItem('deletedBots', JSON.stringify(deletedBots));
    }
  };

  // Extract file info
  const extractFileInfo = (fileName: string): { name: string; code: string } | null => {
    const regex = /^(.+?)-(.+?)\.[a-zA-Z0-9]+$/;
    const match = fileName.match(regex);

    if (match) {
      return {
        name: match[1],
        code: match[2],
      };
    }
    return null;
  };

  // Cache bots in localStorage for persistence between page refreshes
  const saveBotsToCachedStorage = (bots: Bot[]) => {
    try {
      localStorage.setItem('cachedBots', JSON.stringify(bots));
    } catch (error) {
      console.error('Error saving bots to cached storage:', error);
    }
  };

  // Load bots from localStorage
  const loadBotsFromCachedStorage = (): Bot[] => {
    try {
      const cachedBots = localStorage.getItem('cachedBots');
      return cachedBots ? JSON.parse(cachedBots) : [];
    } catch (error) {
      console.error('Error loading bots from cached storage:', error);
      return [];
    }
  };

  // Helper function to safely fetch a bot resource with 404 tracking
  const fetchBotResource = async <T extends any>(
    endpoint: string, 
    botCode: string,
    resourceType: string,
    skipCache = false
  ): Promise<T | null> => {
    // Check if this resource has failed before
    const resourceKey = `${botCode}:${endpoint}:${resourceType}`;
    
    if (!skipCache && failedResources.has(resourceKey)) {
      // Skip request for resources we know have failed
      console.log(`Skipping previously failed resource: ${resourceKey}`);
      return null;
    }
    
    try {
      const response = await fetchApi<T>(endpoint);
      return response;
    } catch (error) {
      // Add to failed resources to avoid future requests
      if (error instanceof Error && error.message.includes('404')) {
        failedResources.add(resourceKey);
      }
      console.log(`Resource ${resourceType} for bot ${botCode} not found`);
      return null;
    }
  };

  // Fetch all bots
  const fetchBots = async (): Promise<Bot[]> => {
    try {
      const deletedBots = getDeletedBots();
      
      // Try to fetch the list of bot files
      let filesArray: string[] = [];
      try {
        const response = await fetchApi<{ files: string }>('/get-bots-files');
        // Convert the stringified list into an array
        filesArray = response.files ? response.files.split(", ").filter(Boolean) : [];
      } catch (error) {
        console.error('Error fetching bots file list:', error);
        
        // If the fetch fails, try to load from localStorage
        const cachedBots = loadBotsFromCachedStorage();
        if (cachedBots.length > 0) {
          toast.info('Using cached bots data. Some information may be outdated.');
          return cachedBots;
        }
        
        return [];
      }
      
      // Process bot files in batches to avoid too many concurrent requests
      const batchSize = 2; // Process only 2 bots at a time
      const fetchedBots: Bot[] = [];
      
      for (let i = 0; i < filesArray.length; i += batchSize) {
        const batch = filesArray.slice(i, i + batchSize);
        const batchPromises = batch.map(async (file) => {
          const fileInfo = extractFileInfo(file);
          if (!fileInfo) return null;
          
          // Skip deleted bots
          if (deletedBots.includes(fileInfo.code)) return null;

          // Create basic bot information
          const bot: Bot = {
            name: fileInfo.name,
            code: fileInfo.code,
            apiKey: '',
            url: `${backendUrl}/agent/${fileInfo.name}/${fileInfo.code}`
          };

          // Fetch additional data with proper 404 handling
          try {
            const chatIconRes = await fetchBotResource<{ image_data: string }>(
              `/get_chatIcon/${fileInfo.code}`,
              fileInfo.code,
              'chatIcon'
            );
            if (chatIconRes?.image_data) {
              bot.chatIcon = chatIconRes.image_data;
            }
          } catch (error) {
            // Ignore errors for optional data
          }

          try {
            const botIconRes = await fetchBotResource<{ image_data: string }>(
              `/get_botIcon/${fileInfo.code}`,
              fileInfo.code,
              'botIcon'
            );
            if (botIconRes?.image_data) {
              bot.botIcon = botIconRes.image_data;
            }
          } catch (error) {
            // Ignore errors for optional data
          }

          try {
            const bgRes = await fetchBotResource<{ image_data: string }>(
              `/get_bg/${fileInfo.code}`,
              fileInfo.code,
              'background'
            );
            if (bgRes?.image_data) {
              bot.backgroundImage = bgRes.image_data;
            }
          } catch (error) {
            // Ignore errors for optional data
          }

          try {
            const headerRes = await fetchBotResource<{ data: string }>(
              `/header_img/${fileInfo.code}`,
              fileInfo.code,
              'header'
            );
            if (headerRes?.data) {
              bot.headerImage = headerRes.data;
            }
          } catch (error) {
            // Ignore errors for optional data
          }

          try {
            const textRes = await fetchBotResource<{ data: string }>(
              `/chatbox_text/${fileInfo.code}`,
              fileInfo.code,
              'chatboxText'
            );
            if (textRes?.data) {
              bot.chatboxText = textRes.data;
            }
          } catch (error) {
            // Ignore errors for optional data
          }

          return bot;
        });

        const batchResults = await Promise.all(batchPromises);
        fetchedBots.push(...batchResults.filter(Boolean) as Bot[]);
      }
      
      // Save bots to localStorage for persistence
      saveBotsToCachedStorage(fetchedBots);
      
      return fetchedBots;
    } catch (error) {
      console.error('Error fetching bots:', error);
      
      // If the fetch fails, try to load from localStorage
      const cachedBots = loadBotsFromCachedStorage();
      if (cachedBots.length > 0) {
        toast.info('Using cached bots data. Some information may be outdated.');
        return cachedBots;
      }
      
      return [];
    }
  };

  // Refresh bots with debouncing
  const refreshBots = async () => {
    // Prevent concurrent refreshes and implement a minimum refresh interval (5 seconds)
    const now = Date.now();
    if (refreshInProgress || (now - lastRefreshTimestamp < 5000)) {
      console.log('Skipping refresh - already in progress or too recent');
      return;
    }
    
    setRefreshInProgress(true);
    setLastRefreshTimestamp(now);
    
    try {
      const fetchedBots = await fetchBots();
      setBots(fetchedBots);
    } catch (error) {
      console.error('Error refreshing bots:', error);
      toast.error('Failed to refresh bots');
    } finally {
      setRefreshInProgress(false);
      setLoading(false);
    }
  };

  // Load bots on mount
  useEffect(() => {
    // First try to load from cache for immediate display
    const cachedBots = loadBotsFromCachedStorage();
    if (cachedBots.length > 0) {
      setBots(cachedBots);
      setLoading(false);
    }
    
    // Then fetch fresh data
    refreshBots();
    
    // Set up refresh interval with a more reasonable frequency (30 seconds)
    const intervalId = setInterval(() => {
      refreshBots();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Add a new bot
  const addBot = async (name: string, apiKey: string) => {
    try {
      if (!name.trim()) {
        throw new Error("Bot name is required");
      }
      
      if (!apiKey.trim()) {
        throw new Error("API key is required");
      }
      
      const code = generateSecureCode();
      removeFromDeletedBots(code);
      
      // Format the bot name for use in filenames (lowercase, no spaces)
      const formattedName = name.toLowerCase().replace(/\s+/g, '-');
      
      // Create URL with slash but store with hyphen in the backend
      const botCode = `${formattedName}-${code}`;
      
      await fetchApi('/generate-html', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          filename: botCode,
          apiKey: apiKey
        })
      });
      
      const newBot: Bot = {
        name,
        code,
        apiKey,
        url: `${backendUrl}/agent/${formattedName}/${code}`
      };
      
      setBots(prevBots => {
        const updatedBots = [...prevBots, newBot];
        saveBotsToCachedStorage(updatedBots);
        return updatedBots;
      });
      
      toast.success(`Bot "${name}" created successfully`);
    } catch (error: any) {
      console.error('Error adding bot:', error);
      toast.error(error.message || 'Failed to create bot');
      throw error;
    }
  };

  // Delete a bot
  const deleteBot = async (name: string, code: string) => {
    try {
      // Add to deleted bots list
      addToDeletedBots(code);
      
      // Format the name to match what was used at creation
      const formattedName = name.toLowerCase().replace(/\s+/g, '-');
      
      // Delete the file using the correct format
      await fetchApi(`/delete-file/${formattedName}-${code}.html`, {
        method: 'DELETE'
      });
      
      // Also remove any images or other associated files
      try {
        // Delete chat icon
        fetchApi(`/delete-file/${formattedName}-${code}-chaticon.png`, {
          method: 'DELETE'
        });

        // Delete bot icon
        fetchApi(`/delete-file/${formattedName}-${code}-boticon.png`, {
          method: 'DELETE'
        });
        
        // Delete header image
        fetchApi(`/delete-file/${formattedName}-${code}-header.png`, {
          method: 'DELETE'
        });
        
        // Delete background image
        fetchApi(`/delete-file/${formattedName}-${code}-bg.png`, {
          method: 'DELETE'
        });
      } catch (deleteError) {
        console.error('Error deleting associated files:', deleteError);
      }
      
      // Update state
      setBots(prevBots => {
        const updatedBots = prevBots.filter(bot => bot.code !== code);
        saveBotsToCachedStorage(updatedBots);
        return updatedBots;
      });
      
      toast.success(`Bot "${name}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting bot:', error);
      toast.error('Failed to delete bot');
      throw error;
    }
  };

  // Update bot image with retry logic
  const updateBotImage = async (bot: Bot, imageType: 'chatIcon' | 'botIcon' | 'background' | 'header', imageData: string) => {
    try {
      const { name, code } = bot;
      
      // Format the name to match what was used at creation
      const formattedName = name.toLowerCase().replace(/\s+/g, '-');
      
      let endpoint = '';
      let payload: any = {};
      
      switch (imageType) {
        case 'chatIcon':
          endpoint = '/chatIconSave';
          payload = {
            bot_code: code,
            filename: `${formattedName}-${code}-chaticon.png`,
            image_data: imageData
          };
          break;
        case 'botIcon':
          endpoint = '/botIconSave';
          payload = {
            bot_code: code,
            filename: `${formattedName}-${code}-boticon.png`,
            image_data: imageData
          };
          break;
        case 'background':
          endpoint = '/bgSave';
          payload = {
            code,
            image: imageData
          };
          break;
        case 'header':
          endpoint = '/headerImg';
          payload = {
            code,
            image: imageData
          };
          break;
      }
      
      // Clear any related failed resource
      const resourceKey = `${code}:/get_${imageType === 'chatIcon' ? 'chatIcon' : 
                           imageType === 'botIcon' ? 'botIcon' : 
                           imageType === 'background' ? 'bg' : 'header_img'}/${code}:${imageType}`;
      failedResources.delete(resourceKey);
      
      // Use the uploadImage utility which includes retry logic
      await uploadImage(endpoint, payload, {
        maxRetries: 3,
        retryDelay: 1000
      });
      
      // Update bot in state
      setBots(prevBots => {
        const updatedBots = prevBots.map(b => {
          if (b.code === code) {
            const updatedBot = { ...b };
            
            switch (imageType) {
              case 'chatIcon':
                updatedBot.chatIcon = imageData;
                break;
              case 'botIcon':
                updatedBot.botIcon = imageData;
                break;
              case 'background':
                updatedBot.backgroundImage = imageData;
                break;
              case 'header':
                updatedBot.headerImage = imageData;
                break;
            }
            
            return updatedBot;
          }
          return b;
        });
        
        // Update cached bots
        saveBotsToCachedStorage(updatedBots);
        return updatedBots;
      });
      
      toast.success(`${imageType.charAt(0).toUpperCase() + imageType.slice(1)} updated successfully`);
    } catch (error) {
      console.error(`Error updating ${imageType}:`, error);
      toast.error(`Failed to update ${imageType}. Please try again.`);
      throw error;
    }
  };

  // Update bot text
  const updateBotText = async (bot: Bot, textType: 'chatboxText' | 'chatGradient', text: string) => {
    try {
      const { code } = bot;
      
      let endpoint = '';
      let payload: any = {};
      
      if (textType === 'chatboxText') {
        endpoint = '/chatboxtext';
        payload = {
          text,
          code
        };
        // Clear any related failed resource
        failedResources.delete(`${code}:/chatbox_text/${code}:chatboxText`);
      } else if (textType === 'chatGradient') {
        endpoint = '/chatgradient';
        payload = {
          gradient: text,
          code
        };
      }
      
      // Use the upload utility for text updates as well for consistent retry behavior
      await uploadImage(endpoint, payload, {
        maxRetries: 2, // Fewer retries needed for text updates
        retryDelay: 800
      });
      
      // Update bot in state
      setBots(prevBots => {
        const updatedBots = prevBots.map(b => {
          if (b.code === code) {
            return {
              ...b,
              [textType]: text
            };
          }
          return b;
        });
        
        // Update cached bots
        saveBotsToCachedStorage(updatedBots);
        return updatedBots;
      });
      
      toast.success(`${textType === 'chatboxText' ? 'Chat box text' : 'Chat gradient'} updated successfully`);
    } catch (error) {
      console.error(`Error updating ${textType}:`, error);
      toast.error(`Failed to update ${textType === 'chatboxText' ? 'chat box text' : 'chat gradient'}`);
      throw error;
    }
  };

  // Generate a secure code
  const generateSecureCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(8); // Use 8 characters for better security
    window.crypto.getRandomValues(array);
    return Array.from(array, num => characters[num % characters.length]).join('');
  };

  return (
    <BotContext.Provider
      value={{
        bots,
        loading,
        addBot,
        deleteBot,
        updateBotImage,
        updateBotText,
        refreshBots
      }}
    >
      {children}
    </BotContext.Provider>
  );
};