
import { createClient, type RedisClientType, type RedisClientOptions } from 'redis';

const redisUrl = process.env.REDIS_URL;
let redisClient: RedisClientType | null = null;
let initializationError: string | null = null;
let connectionPromise: Promise<void> | null = null;
let isConnecting = false;

if (!redisUrl) {
    initializationError = 'Missing Redis environment variable REDIS_URL.';
    console.error(`FATAL ERROR: ${initializationError}`);
} else if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
    // Allow redis URLs - this was the user's request
    // initializationError = `Invalid REDIS_URL format. URL must start with 'redis://' or 'rediss://'. Received: ${redisUrl}`;
    // console.error(`FATAL ERROR: ${initializationError}`);
    console.log(`Using Redis URL: ${redisUrl}`);
}

// Only attempt to create client if URL is provided and format is acceptable
if (redisUrl && (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://'))) {
    try {
        const clientOptions: RedisClientOptions = {
            url: redisUrl,
            // Add socket options if needed, e.g., for timeouts or TLS with rediss://
            // socket: {
            //     connectTimeout: 10000, // 10 seconds
            //     // For rediss:// with self-signed certs, etc.
            //     // tls: true,
            //     // rejectUnauthorized: false,
            // }
        };
        redisClient = createClient(clientOptions);

        redisClient.on('error', (err) => {
            const errorMessage = `Redis Client Error: ${err instanceof Error ? err.message : String(err)}`;
            console.error(errorMessage);
            initializationError = errorMessage; // Store the last error
            isConnecting = false; // Reset connecting flag on error
            connectionPromise = null; // Reset promise on error
            // Important: If the client was previously ready, errors might mean it's disconnected.
        });

        redisClient.on('connect', () => {
            console.log('Redis client connecting...');
            initializationError = null; // Clear error when attempting to connect
        });

        redisClient.on('ready', () => {
            console.log('Redis client ready.');
            initializationError = null; // Clear error on successful connection
            isConnecting = false;
        });

        redisClient.on('end', () => {
            console.log('Redis connection closed.');
             if (!initializationError && redisClient?.isOpen) { // Avoid overwriting specific errors
                initializationError = 'Redis connection closed unexpectedly.';
             }
            isConnecting = false;
            connectionPromise = null; // Connection is lost
             // Optionally try to reconnect or mark as unavailable
             // redisClient = null; // Or handle reconnection logic
        });

        // Don't connect automatically here, connect on demand in getRedisClient

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        initializationError = `Failed to create Redis client instance: ${message}`;
        console.error(`FATAL ERROR: ${initializationError}`);
        redisClient = null; // Ensure client is null on creation failure
    }
}

// Function to establish connection if not already connected or connecting
const ensureConnected = async (): Promise<void> => {
    if (!redisClient) {
        throw new Error(`Redis client is not initialized. Error: ${initializationError || 'URL missing or invalid'}`);
    }

    // If already connected (isOpen is true after successful connect), return immediately
    if (redisClient.isOpen) {
        return;
    }

    // If already connecting, wait for the existing promise
    if (isConnecting && connectionPromise) {
        return connectionPromise;
    }

    // Start connecting
    isConnecting = true;
    connectionPromise = new Promise((resolve, reject) => {
        if (!redisClient) { // Double check client exists
             reject(new Error('Redis client became null during connection attempt.'));
             isConnecting = false;
             return;
        }
        redisClient.connect()
            .then(() => {
                // isConnecting will be set to false by the 'ready' event handler
                resolve();
            })
            .catch((err) => {
                const errorMessage = `Redis connection failed: ${err instanceof Error ? err.message : String(err)}`;
                console.error(errorMessage);
                initializationError = errorMessage;
                isConnecting = false;
                connectionPromise = null; // Clear promise on failure
                reject(new Error(initializationError));
            });
    });
    return connectionPromise;
};


export const getRedisClient = async (): Promise<RedisClientType> => {
    if (!redisClient) {
        throw new Error(`Redis client is not initialized. Error: ${initializationError || 'URL missing or invalid'}`);
    }

    try {
        await ensureConnected(); // Ensure connection is established or waits for it
    } catch (connectionError) {
        // Rethrow the connection error to the caller
        throw new Error(`Failed to connect to Redis: ${connectionError instanceof Error ? connectionError.message : String(connectionError)}`);
    }

    // After ensureConnected resolves, the client should be ready (or it threw an error)
    // We double-check isOpen just in case of race conditions or unexpected state changes
    if (!redisClient.isOpen) {
         // This case should ideally be caught by ensureConnected, but acts as a safeguard
         throw new Error(`Redis client is not connected. Last known error: ${initializationError || 'Unknown connection issue'}`);
    }

    return redisClient;
};

// Optional: Export the error for checking elsewhere if needed,
// but relying on getRedisClient throwing is generally better.
export const getRedisInitializationError = () => initializationError;

// Graceful shutdown (optional but recommended)
export const disconnectRedis = async (): Promise<void> => {
    if (redisClient && redisClient.isOpen) {
        try {
            await redisClient.quit();
            console.log('Redis client disconnected gracefully.');
            redisClient = null; // Clear the instance after successful disconnect
            connectionPromise = null;
            isConnecting = false;
            initializationError = null;
        } catch (err) {
            console.error('Error during Redis graceful shutdown:', err);
        }
    }
};
