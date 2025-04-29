
import { NextResponse } from 'next/server';
import { getRedisClient, getRedisInitializationError } from '@/lib/redis';
import type { SharedClipCollection } from '@/lib/types';

// Define the structure for the response
interface CreateResponse {
    url: string;
    id: string;
}

// Helper function to determine the base URL at runtime - CRITICAL for share URLs
const getRuntimeBaseUrl = (): string | null => {
  let source = 'Unknown';
  let url = '';

  // 1. Vercel System Environment Variable (Preferred for Vercel deployments)
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl) {
    url = vercelUrl.startsWith('https://') ? vercelUrl : `https://${vercelUrl}`;
    source = 'Vercel (NEXT_PUBLIC_VERCEL_URL)';
    console.log(`Create API Runtime: Using ${source}: ${url}`);
    return url;
  }

  // 2. Explicitly Set Environment Variable (Required for non-Vercel or local)
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
        // Fall through, URL remains empty, will trigger error below
    }
  }

  // 3. Error State: No valid URL found
  console.error(`Create API Runtime CRITICAL ERROR: Cannot determine base URL. Neither NEXT_PUBLIC_VERCEL_URL nor a valid NEXT_PUBLIC_BASE_URL is set. Cannot generate share URL.`);
  return null; // Indicate failure to determine URL
};


export async function POST() {
  const initError = getRedisInitializationError();
  // Allow connection errors to be handled later if client can be created initially
  if (initError && !initError.startsWith('Redis Client Error') && !initError.startsWith('Failed to create Redis client')) {
      console.error('API Config Error: Redis setup failed before connection attempt.', initError);
      return NextResponse.json(
          { error: 'Server configuration error (Redis)', details: initError },
          { status: 500 }
      );
  }

   // --- URL Construction: Must happen before DB interaction if failure prevents URL gen ---
   const baseUrl = getRuntimeBaseUrl();
   if (!baseUrl) {
       return NextResponse.json(
           { error: 'Server configuration error', details: 'Cannot determine application base URL. NEXT_PUBLIC_BASE_URL environment variable might be missing or invalid.' },
           { status: 500 }
       );
   }
   // --- End URL Construction ---


  let redis;
  try {
     redis = await getRedisClient();
  } catch (error) {
     console.error('API Runtime Error: Failed to get Redis client:', error);
     const errorDetails = error instanceof Error ? error.message : 'Could not connect to Redis.';
     // Check if it's the specific initialization error related to URL format
     if (initializationError && (initializationError.includes('invalid URL') || initializationError.includes('https'))) {
        return NextResponse.json(
            { error: 'Server configuration error (Redis)', details: initializationError },
            { status: 500 }
        );
     }
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

    // Check if SET command was successful (node-redis v4 returns 'OK' on success)
    if (setResult !== 'OK') {
        console.error(`Failed to set collection ${collectionId} in Redis. Result: ${setResult}`);
        // Provide a more specific error if possible, otherwise generic
        throw new Error('Failed to save new collection data to Redis.');
    }


    const collectionUrl = `${baseUrl}/clip/${collectionId}`;
    console.log(`Create API: Successfully generated collection URL: ${collectionUrl}`);

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
