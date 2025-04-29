
import { createClient, VercelKV } from '@vercel/kv';

// Ensure REDIS_URL environment variable is set
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.error('FATAL ERROR: Missing environment variable REDIS_URL for Vercel KV.');
  // In a real application, you might want to prevent the app from starting
  // or throw a more specific error that can be caught during initialization.
  // For now, we'll let it potentially fail later when used.
  // throw new Error('Missing environment variable REDIS_URL');
} else if (!redisUrl.startsWith('redis://')) {
   console.warn(
     `Warning: REDIS_URL does not start with 'redis://'. Vercel KV expects this format. URL: ${redisUrl}`
   );
}

let redisInstance: VercelKV;

try {
  redisInstance = createClient({
    url: redisUrl!, // Use non-null assertion as we check above, but handle potential runtime errors
  });

  // Optional: Perform an initial check to see if connection works.
  // This is async, so it won't block initialization, but logs issues.
  redisInstance.ping()
    .then(response => {
      if (response === 'PONG') {
        console.log('Successfully connected to Vercel KV (Redis).');
      } else {
        // This case might not happen with Vercel KV's ping, but good practice
        console.warn('Vercel KV ping response was not PONG. Check connection status.', response);
      }
    })
    .catch(error => {
      console.error('Initial connection test to Vercel KV failed:', error);
      // Depending on your app's requirements, you might want to handle this
      // more critically, e.g., set an application status flag.
    });

} catch (error) {
   console.error('FATAL ERROR: Failed to create Vercel KV client instance:', error);
   // Throw error during initialization if client creation fails catastrophically
   // (e.g., due to fundamentally invalid URL format caught by the client library itself)
    if (error instanceof Error && error.message.includes('invalid URL')) {
        throw new Error(`Failed to create Redis client due to invalid URL: ${redisUrl}. Ensure it starts with redis://`);
    }
   throw error; // Re-throw other unexpected errors
}


export const redis = redisInstance;
