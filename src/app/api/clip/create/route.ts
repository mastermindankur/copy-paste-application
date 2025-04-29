
import { NextResponse } from 'next/server';
import { getRedisClient, getRedisInitializationError } from '@/lib/redis';
import type { SharedClipCollection } from '@/lib/types';

// Define the structure for the response
interface CreateResponse {
    url: string;
    id: string;
}

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
    });

    if (setResult !== 'OK') {
        console.error(`Failed to set collection ${collectionId} in Redis. Result: ${setResult}`);
        throw new Error('Failed to save new collection data.');
    }

    // --- URL Construction ---
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    let collectionUrl: string;

    if (baseUrl && baseUrl.startsWith('http')) { // Basic check for a valid-looking URL
        console.log(`Create API: Using base URL from env: ${baseUrl}`);
        collectionUrl = `${baseUrl}/clip/${collectionId}`;
    } else {
        // Log why we are falling back
        if (!baseUrl) {
            console.error('Create API Error: NEXT_PUBLIC_BASE_URL environment variable is not set!');
        } else {
            console.error(`Create API Error: NEXT_PUBLIC_BASE_URL is invalid ('${baseUrl}'). Must start with http:// or https://.`);
        }
        // Fallback to relative URL
        collectionUrl = `/clip/${collectionId}`;
        console.warn(`Create API Warning: Falling back to relative URL: ${collectionUrl}. This might not work correctly for external sharing.`);
    }
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
