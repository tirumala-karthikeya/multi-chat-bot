const BACKEND_PORT = "8000"; // This can be configured based on environment
const isProduction = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";

// Modified backend URL logic to improve connection reliability
let backendUrl = '';

// Determine the backend URL based on environment
if (isProduction) {
  // In production, try without specifying port (in case it's using standard HTTP/HTTPS ports)
  backendUrl = `${window.location.protocol}//${window.location.hostname}`;
} else {
  // In development, use localhost without specifying port
  backendUrl = "http://127.0.0.1";
}

// Allow overriding via local storage for debugging
const storedBackendUrl = localStorage.getItem('backendUrl');
if (storedBackendUrl) {
  backendUrl = storedBackendUrl;
  console.log('Using manually configured backend URL from localStorage:', backendUrl);
}

// Override with environment variable if available (injected at build time)
if (typeof (window as any).BACKEND_URL !== "undefined") {
  backendUrl = (window as any).BACKEND_URL;
}

// Log the determined backend URL only once at startup
console.log('Backend URL configured as:', backendUrl);

export const getBackendUrl = () => backendUrl;

// Cache the health check result to prevent frequent checks
let lastHealthCheckTime = 0;
let lastHealthCheckResult = false;
const HEALTH_CHECK_CACHE_DURATION = 30000; // 30 seconds

// For users to manually set the backend URL (useful for debugging)
export const setBackendUrl = (url: string) => {
  localStorage.setItem('backendUrl', url);
  backendUrl = url;
  console.log('Backend URL manually set to:', url);
  // Reload the page to apply the new URL
  window.location.reload();
};

// Generic fetch wrapper with error handling
export async function fetchApi<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${backendUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  try {
    // Only log non-GET requests
    if (options.method && options.method !== 'GET') {
      console.log(`API Request: ${options.method} ${url}`);
    }
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    // Handle empty responses
    if (response.status === 204) {
      return {} as T;
    }
    // Check content type to handle JSON vs text appropriately
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json() as T;
    } else {
      // Try to parse as JSON first in case content-type is wrong
      const text = await response.text();
      try {
        return JSON.parse(text) as T;
      } catch {
        return { data: text } as unknown as T;
      }
    }
  } catch (error) {
    console.error('API request error:', error, 'URL:', url);
    
    // Add more details to the error
    if (error instanceof Error) {
      error.message = `API Error (${url}): ${error.message}`;
    }
    
    throw error;
  }
}

// Simplified API fetch with cache
export async function fetchApiWithCache<T>(
  endpoint: string, 
  options: RequestInit = {},
  cacheDuration = 10000 // 10 seconds default
): Promise<T> {
  // Only cache GET requests
  if (options.method && options.method !== 'GET') {
    return fetchApi<T>(endpoint, options);
  }
  
  const cacheKey = `api_cache_${endpoint}`;
  const cachedData = localStorage.getItem(cacheKey);
  
  if (cachedData) {
    try {
      const { data, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < cacheDuration) {
        return data as T;
      }
    } catch (err) {
      // Invalid cache, ignore and fetch fresh data
      localStorage.removeItem(cacheKey);
    }
  }
  
  // If not cached or expired, fetch fresh data
  const result = await fetchApi<T>(endpoint, options);
  
  // Cache the result
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      data: result,
      timestamp: Date.now()
    }));
  } catch (err) {
    console.warn('Failed to cache API response:', err);
    // If localStorage is full, clear some old caches
    clearOldCaches();
  }
  
  return result;
}

// Helper to clear old cache entries if localStorage is getting full
function clearOldCaches() {
  try {
    const cachePrefix = 'api_cache_';
    const cacheKeys = Object.keys(localStorage)
      .filter(key => key.startsWith(cachePrefix))
      .map(key => {
        try {
          const { timestamp } = JSON.parse(localStorage.getItem(key) || '{}');
          return { key, timestamp: timestamp || 0 };
        } catch {
          return { key, timestamp: 0 };
        }
      })
      .sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest 50% of cache entries
    const toRemove = cacheKeys.slice(0, Math.ceil(cacheKeys.length / 2));
    toRemove.forEach(({ key }) => localStorage.removeItem(key));
  } catch (err) {
    console.error('Error clearing old caches:', err);
  }
}

// Add a function to test connection to backend and automatically attempt to fix issues
export async function testBackendConnection() {
  // Use cached health check result if recent enough
  const now = Date.now();
  if (now - lastHealthCheckTime < HEALTH_CHECK_CACHE_DURATION) {
    console.log('Using cached health check result:', lastHealthCheckResult);
    return {success: lastHealthCheckResult, url: backendUrl};
  }

  console.log('Testing backend connection...');
  
  // Try different backend URL variations to find one that works
  const possibleUrls = [
    // Without port (default HTTP/HTTPS ports)
    `${window.location.protocol}//${window.location.hostname}`,
    // With explicit port 8000
    `${window.location.protocol}//${window.location.hostname}:8000`,
    // Try localhost
    'http://localhost:8000',
    'http://127.0.0.1:8000',
  ];
  
  // First, check if the cached URL works first
  try {
    console.log(`Checking cached backend URL: ${backendUrl}/get-bots-files...`);
    const response = await fetch(`${backendUrl}/get-bots-files`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log(`✅ Connection successful to ${backendUrl}`);
      lastHealthCheckTime = now;
      lastHealthCheckResult = true;
      return {success: true, url: backendUrl};
    }
  } catch (error) {
    console.log(`❌ Cached backend URL failed: ${error}`);
  }
  
  // If cached URL fails, try the bot files endpoint with different URLs
  for (const url of possibleUrls) {
    try {
      console.log(`Trying connection to ${url}/get-bots-files...`);
      const response = await fetch(`${url}/get-bots-files`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log(`✅ Connection successful to ${url}`);
        // Update the backend URL
        localStorage.setItem('backendUrl', url);
        backendUrl = url;
        lastHealthCheckTime = now;
        lastHealthCheckResult = true;
        return {success: true, url};
      }
    } catch (error) {
      console.log(`❌ Connection failed to ${url}:`, error);
    }
  }
  
  // If we get here, all connection attempts failed
  lastHealthCheckTime = now;
  lastHealthCheckResult = false;
  return {success: false, message: 'Could not connect to any backend URL'};
}

// Add a new utility function for handling image uploads specifically
export async function uploadImage<T>(
  endpoint: string,
  payload: any
): Promise<T> {
  // Add exponential backoff retry logic for image uploads
  const maxRetries = 3;
  let retryCount = 0;
  let lastError: any = null;
  
  while (retryCount < maxRetries) {
    try {
      // Use the regular fetchApi function with a longer timeout for images
      return await fetchApi<T>(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      lastError = error;
      retryCount++;
      console.log(`Upload attempt ${retryCount} failed, retrying...`);
      
      // Wait before retrying (exponential backoff)
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
      }
    }
  }
  
  // If we've exhausted all retries, throw the last error
  console.error('Image upload failed after maximum retries');
  throw lastError;
}