import React, { useState, useEffect, useCallback } from "react";
import { useBotContext } from "@/context/BotContext";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "./Header";
import BotCard from "./BotCard";
import AddBotCard from "./AddBotCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { testBackendConnection } from "@/utils/api";
import { toast } from "sonner";

const Dashboard: React.FC = () => {
  const { bots, loading, refreshBots } = useBotContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddCardVisible, setIsAddCardVisible] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [healthCheckDone, setHealthCheckDone] = useState(false);

  // Test backend connection only once on first load
  useEffect(() => {
    if (!healthCheckDone) {
      const testConnection = async () => {
        try {
          setIsTestingConnection(true);
          const result = await testBackendConnection();
          if (result.success) {
            setConnectionError(null);
            // Only refresh if we have a good connection
            refreshBots();
          } else {
            setConnectionError("Cannot connect to server. Please check your connection.");
          }
        } catch (error) {
          console.error("Connection test failed:", error);
          setConnectionError("Cannot connect to server. Please check your connection.");
        } finally {
          setIsTestingConnection(false);
          setHealthCheckDone(true);
        }
      };
      
      testConnection();
    }
  }, [healthCheckDone, refreshBots]);

  // Debounced refresh function
  const debouncedRefresh = useCallback(async () => {
    const now = Date.now();
    if (!connectionError && now - lastRefreshTime > 5000) {
      setIsRefreshing(true);
      try {
        await refreshBots();
        setLastRefreshTime(now);
      } catch (error) {
        console.error("Failed to refresh bots:", error);
        toast.error("Failed to refresh bots");
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [connectionError, lastRefreshTime, refreshBots]);

  // Refresh bots when the component mounts or when add card closes
  useEffect(() => {
    if (!isAddCardVisible && !connectionError) {
      console.log("Dashboard: refreshing bots");
      debouncedRefresh();
    }
  }, [isAddCardVisible, connectionError, debouncedRefresh]);

  const filteredBots = bots.filter(bot => 
    bot.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCardClose = () => {
    setIsAddCardVisible(false);
  };

  const handleManualRefresh = () => {
    debouncedRefresh();
  };

  const retryConnection = async () => {
    setIsTestingConnection(true);
    try {
      const result = await testBackendConnection();
      if (result.success) {
        setConnectionError(null);
        toast.success(`Connected to server at ${result.url}`);
        // Refresh bots after successful connection
        debouncedRefresh();
      } else {
        setConnectionError("Still cannot connect to server. Please check your connection.");
        toast.error("Still cannot connect to server");
      }
    } catch (error) {
      console.error("Connection retry failed:", error);
      setConnectionError("Connection retry failed. Please try again later.");
      toast.error("Connection retry failed");
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header onSearch={setSearchQuery} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {connectionError && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>{connectionError}</p>
              <Button 
                onClick={retryConnection}
                disabled={isTestingConnection}
                variant="outline" 
                size="sm"
                className="self-start"
              >
                {isTestingConnection ? "Testing Connection..." : "Retry Connection"}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Your Bots</h2>
          <div className="flex gap-2">
            <Button 
              onClick={handleManualRefresh}
              variant="outline"
              size="icon"
              disabled={isRefreshing || loading || !!connectionError}
              className="w-10 h-10"
              title="Refresh bots"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              onClick={() => setIsAddCardVisible(true)}
              className="bg-xspectrum-purple hover:bg-xspectrum-purple/90"
              disabled={!!connectionError}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Bot
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-3 bg-gray-50">
                  <Skeleton className="h-6 w-3/4" />
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-16 w-16 rounded-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-16 w-16 rounded-full" />
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 flex justify-between items-center">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredBots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBots.map((bot) => (
              <BotCard key={bot.code} bot={bot} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg p-8 shadow-sm max-w-md mx-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? "No bots match your search" : "You don't have any bots yet"}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery 
                  ? "Try a different search term or clear your search"
                  : "Get started by creating your first bot"}
              </p>
              {!searchQuery && !connectionError && (
                <Button 
                  onClick={() => setIsAddCardVisible(true)}
                  className="bg-xspectrum-purple hover:bg-xspectrum-purple/90"
                >
                  <Plus className="h-4 w-4 mr-2" /> Create Your First Bot
                </Button>
              )}
            </div>
          </div>
        )}
      </main>

      <AddBotCard 
        isVisible={isAddCardVisible}
        onClose={handleAddCardClose}
      />
    </div>
  );
};

export default Dashboard;