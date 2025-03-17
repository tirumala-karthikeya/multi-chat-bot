// src/utils/upload.ts
import { fetchApi } from '@/utils/api';

interface UploadOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Upload image or text data with retry logic
 * @param endpoint The API endpoint to upload to
 * @param payload The data to upload
 * @param options Upload options including retry configuration
 * @returns Promise that resolves when upload is successful
 */
export const uploadImage = async (
  endpoint: string,
  payload: any,
  options: UploadOptions = {}
): Promise<any> => {
  const { maxRetries = 3, retryDelay = 1000, onRetry } = options;
  let attempt = 0;
  
  const executeWithRetry = async (): Promise<any> => {
    try {
      attempt++;
      
      // Add timestamp to help prevent caching issues
      const timestampedPayload = {
        ...payload,
        _timestamp: Date.now()
      };
      
      return await fetchApi(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(timestampedPayload)
      });
    } catch (error) {
      if (attempt < maxRetries) {
        // Log retry attempt
        console.log(`Upload attempt ${attempt} failed. Retrying in ${retryDelay}ms...`);
        
        // Call the onRetry callback if provided
        if (onRetry && error instanceof Error) {
          onRetry(attempt, error);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        
        // Retry the upload
        return executeWithRetry();
      }
      
      // If we've exhausted all retries, throw the error
      console.error(`Upload failed after ${maxRetries} attempts.`);
      throw error;
    }
  };
  
  return executeWithRetry();
};

/**
 * Upload a file directly from a file input
 * @param endpoint The API endpoint to upload to
 * @param file The file to upload
 * @param extraData Additional data to include in the form
 * @param options Upload options including retry configuration
 * @returns Promise that resolves when upload is successful
 */
export const uploadFile = async (
  endpoint: string,
  file: File,
  extraData: Record<string, string> = {},
  options: UploadOptions = {}
): Promise<any> => {
  const { maxRetries = 3, retryDelay = 1000, onRetry } = options;
  let attempt = 0;
  
  const executeWithRetry = async (): Promise<any> => {
    try {
      attempt++;
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Add any extra data to the form
      Object.entries(extraData).forEach(([key, value]) => {
        formData.append(key, value);
      });
      
      // Add timestamp to help prevent caching issues
      formData.append('_timestamp', Date.now().toString());
      
      return await fetchApi(endpoint, {
        method: 'POST',
        body: formData,
      });
    } catch (error) {
      if (attempt < maxRetries) {
        // Log retry attempt
        console.log(`File upload attempt ${attempt} failed. Retrying in ${retryDelay}ms...`);
        
        // Call the onRetry callback if provided
        if (onRetry && error instanceof Error) {
          onRetry(attempt, error);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        
        // Retry the upload
        return executeWithRetry();
      }
      
      // If we've exhausted all retries, throw the error
      console.error(`File upload failed after ${maxRetries} attempts.`);
      throw error;
    }
  };
  
  return executeWithRetry();
};

/**
 * Converts a file to a base64 string
 * @param file The file to convert
 * @returns Promise that resolves with the base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};