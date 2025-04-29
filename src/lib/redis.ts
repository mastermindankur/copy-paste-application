
import { createClient, VercelKV } from '@vercel/kv';

// Ensure Vercel KV environment variables are set
const kvRestApiUrl = process.env.KV_REST_API_URL;
const kvRestApiToken = process.env.KV_REST_API_TOKEN;

let redisInstance: VercelKV | null = null;
let initializationError: string | null = null;

if (!kvRestApiUrl || !kvRestApiToken) {
  initializationError = 'Missing Vercel KV environment variables. Please set KV_REST_API_URL and KV_REST_API_TOKEN in your .env file.';
  console.error(`FATAL ERROR: ${initializationError}`);
} else {
  // Basic check for URL format (should start with https for Vercel KV)
  if (!kvRestApiUrl.startsWith('https://')) {
      initializationError = `Invalid KV_REST_API_URL format. URL must start with 'https://'. Received: ${kvRestApiUrl}`;
      console.error(`FATAL ERROR: ${initializationError}`);
  } else {
      try {
        redisInstance = createClient({
          url: kvRestApiUrl,
          token: kvRestApiToken,
        });

        // Optional: Perform an initial check to see if connection works.
        // This is async, so it won't block initialization, but logs issues.
        redisInstance.ping()
          .then(response => {
            if (response === 'PONG') {
              console.log('Successfully connected to Vercel KV.');
            } else {
              console.warn('Vercel KV ping response was not PONG. Check connection status.', response);
            }
          })
          .catch(error => {
            console.error('Initial connection test to Vercel KV failed:', error);
            // Set the error here as well in case the initial sync creation didn't throw
            if (!initializationError) {
                initializationError = `Initial connection test to Vercel KV failed: ${error instanceof Error ? error.message : String(error)}`;
            }
          });

      } catch (error) {
         initializationError = `Failed to create Vercel KV client instance: ${error instanceof Error ? error.message : String(error)}`;
         console.error(`FATAL ERROR: ${initializationError}`);
         // Throw error during initialization if client creation fails catastrophically
         throw new Error(initializationError);
      }
  }
}

// Export a function to get the client instance or throw if initialization failed
export const getRedisClient = (): VercelKV => {
  if (initializationError || !redisInstance) {
    throw new Error(`Redis client failed to initialize: ${initializationError || 'Unknown error'}`);
  }
  return redisInstance;
};

// Optional: Export the error for checking elsewhere if needed
export const redisInitializationError = initializationError;
