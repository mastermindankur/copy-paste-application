
import { NextResponse } from 'next/server';
import { getRedisClient, getRedisInitializationError } from '@/lib/redis';
import type { SharedClipCollection } from '@/lib/types';

// Define the structure for the response
interface CreateResponse {
    url: string;
    id: string;
}

// Helper function to determine the base URL at runtime
const getRuntimeBaseUrl = (): string => {
  let source = 'Unknown';
  let url = '';

  // 1. Vercel System Environment Variable (Preferred for Vercel deployments)
  // Vercel automatically sets NEXT_PUBLIC_VERCEL_URL for deployments.
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl) {
    // Ensure it starts with https://, Vercel usually provides this.
    url = vercelUrl.startsWith('https://') ? vercelUrl : `https://${vercelUrl}`;
    source = 'Vercel (NEXT_PUBLIC_VERCEL_URL)';
    console.log(`Create API Runtime: Using ${source}: ${url}`);
    return url;
  }

  // 2. Explicitly Set Environment Variable (For non-Vercel deployments or overrides)
  const explicitBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (explicitBaseUrl) {
    // Basic validation: Check if it starts with http
    if (explicitBaseUrl.startsWith('http://') || explicitBaseUrl.startsWith('https://')) {
        url = explicitBaseUrl;
        source = 'Explicit (NEXT_PUBLIC_BASE_URL)';
        console.log(`Create API Runtime: Using ${source}: ${url}`);
        return url;
    } else {
        console.error(`Create API Runtime Error: Invalid NEXT_PUBLIC_BASE_URL format: ${explicitBaseUrl}. Must start with http:// or https://.`);
        // Fall through to localhost if invalid explicit URL is provided
    }
  }

  // 3. Fallback to localhost (Development or misconfigured environment)
  url = 'http://localhost:9002'; // Default port
  source = 'Fallback (localhost)';
  // This warning is crucial for deployment troubleshooting
  console.warn(`Create API Runtime Warning: Vercel URL and valid NEXT_PUBLIC_BASE_URL are not set. Using ${source}: ${url}. Ensure NEXT_PUBLIC_BASE_URL is configured correctly in your hosting environment's runtime variables for non-Vercel deployments.`);
  return url;
};


export async function POST() {
  const initError = getRedisInitializationError();
  if (initError && !initError.startsWith('Redis Client Error')) {
      console.error('API Config Error: Redis client not available.', initError);
      return NextResponse.json(
          { error: 'Server configuration error', details: initError },
          { status: 500 }
      );
  }

  let redis;
  try {
     redis = await getRedisClient();
  } catch (error) {
     console.error('API Runtime Error: Failed to get Redis client:', error);
     const errorDetails = error instanceof Error ? error.message : 'Could not connect to Redis.';
     return NextResponse.json(
         { error: 'Failed to connect to database', details: errorDetails },
         { status: 500 }
     );
  }

  try {
    const collectionId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newCollection: SharedClipCollection = {
      id: collectionId,
      items: [],
      createdAt: now,
    };

    const collectionKey = `clip:${collectionId}`;
    const expirationInSeconds = 7 * 24 * 60 * 60; // 7 days

    const setResult = await redis.set(collectionKey, JSON.stringify(newCollection), {
        EX: expirationInSeconds,
        // NX: true // Optional: Only set if the key does not already exist
    });

    if (setResult !== 'OK') {
        console.error(`Failed to set collection ${collectionId} in Redis. Result: ${setResult}`);
        throw new Error('Failed to save new collection data.');
    }

    // --- URL Construction using runtime logic ---
    const baseUrl = getRuntimeBaseUrl();
    const collectionUrl = `${baseUrl}/clip/${collectionId}`;
    console.log(`Create API: Final generated collection URL: ${collectionUrl}`);
    // --- End URL Construction ---

    const response: CreateResponse = {
      url: collectionUrl,
      id: collectionId,
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Failed to create clip collection:', error);
    const errorDetails = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json(
        { error: 'Failed to create clip collection', details: errorDetails },
        { status: 500 }
    );
  }
}
