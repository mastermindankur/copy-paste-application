
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;
let redisInstance: Redis | null = null;
let initializationError: string | null = null;

if (!redisUrl) {
  initializationError = 'Missing Redis environment variable REDIS_URL. Please check your .env file.';
  console.error(`FATAL ERROR: ${initializationError}`);
} else if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
  initializationError = `Invalid REDIS_URL format. URL must start with 'redis://' or 'rediss://'. Received: ${redisUrl}`;
  console.error(`FATAL ERROR: ${initializationError}`);
} else {
  try {
    redisInstance = new Redis(redisUrl, {
      // Add any specific ioredis options here if needed
      // e.g., tls: {}, if using rediss:// and needing custom TLS options
      maxRetriesPerRequest: null, // Prevent ioredis from retrying infinitely on connection errors during startup
      enableReadyCheck: false,    // Useful if the server might not be ready immediately
      // Consider adding connectTimeout if startup takes too long
      // connectTimeout: 10000, // 10 seconds
    });

    redisInstance.on('error', (err) => {
      // Only set initializationError if it hasn't been set already
      if (!initializationError) {
        initializationError = `Redis connection error: ${err.message}`;
      }
      console.error('Redis Client Error:', err);
      // Depending on the error, you might want to attempt reconnection or handle it differently
      // For critical errors, you might want to prevent the app from starting/running
    });

    redisInstance.on('connect', () => {
        console.log('Successfully connected to Redis.');
        initializationError = null; // Clear error on successful connection
    });

    redisInstance.on('ready', () => {
        console.log('Redis client is ready.');
    });

    redisInstance.on('close', () => {
        console.log('Redis connection closed.');
        // Potentially set an error or attempt reconnection strategy here
        if (!initializationError) {
             initializationError = 'Redis connection closed unexpectedly.';
        }
    });

    redisInstance.on('reconnecting', () => {
        console.log('Reconnecting to Redis...');
        initializationError = 'Reconnecting to Redis...'; // Indicate reconnection attempt
    });

    // Optional: Perform an initial ping to test connection, but handle potential errors
    // redisInstance.ping().catch(err => {
    //     if (!initializationError) {
    //          initializationError = `Initial Redis ping failed: ${err.message}`;
    //     }
    //     console.error('Initial Redis ping failed:', err);
    // });


  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    initializationError = `Failed to create Redis client instance: ${message}`;
    console.error(`FATAL ERROR: ${initializationError}`);
    // Throw error during initialization if client creation fails catastrophically
    throw new Error(initializationError);
  }
}

// Export a function to get the client instance or throw if initialization failed
export const getRedisClient = (): Redis => {
  if (initializationError || !redisInstance) {
    throw new Error(`Redis client failed to initialize or is not available: ${initializationError || 'Unknown error'}`);
  }
  // Check if client is still connected, though ioredis might handle reconnections
  // Consider adding a more robust check if needed, e.g., based on status property
   if (redisInstance.status !== 'ready' && redisInstance.status !== 'connect') {
      // Throw or handle based on whether reconnection attempts are ongoing
       if (initializationError && initializationError.startsWith('Redis connection error')) {
            throw new Error(`Redis client is not connected: ${initializationError}`);
       }
       // If not explicitly an error, it might be connecting/reconnecting
       console.warn(`Redis client status is: ${redisInstance.status}`);
       // Depending on desired behavior, you could throw here or allow potential failures
       // throw new Error(`Redis client is not ready (status: ${redisInstance.status}). Initialization error: ${initializationError}`);
   }

  return redisInstance;
};

// Optional: Export the error for checking elsewhere if needed
export const getRedisInitializationError = () => initializationError;
