
import { NextResponse } from 'next/server';
import { getRedisClient, getRedisInitializationError } from '@/lib/redis';
import type { SharedClipCollection } from '@/lib/types';

// Define the structure for the response
interface CreateResponse {
    url: string;
    id: string;
}

export async function POST() {
  const initError = getRedisInitializationError(); // Check initial config error
  if (initError && !initError.startsWith('Redis Client Error')) { // Allow transient connection errors from client itself
      console.error('API Config Error: Redis client not available.', initError);
      return NextResponse.json(
          { error: 'Server configuration error', details: initError },
          { status: 500 }
      );
  }

  let redis;
  try {
     redis = await getRedisClient(); // Get connected client
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

    // Store the new empty collection in Redis
    // Set an expiration time for the collection (e.g., 7 days)
    const expirationInSeconds = 7 * 24 * 60 * 60; // 7 days

    // Use 'set' with 'EX' option for atomic set and expire
    const setResult = await redis.set(collectionKey, JSON.stringify(newCollection), {
        EX: expirationInSeconds,
    });

    if (setResult !== 'OK') {
        console.error(`Failed to set collection ${collectionId} in Redis. Result: ${setResult}`);
        // Note: redis client might throw directly on SET failure depending on config
        throw new Error('Failed to save new collection data.');
    }


    // Construct the URL for the new collection using the environment variable
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL; // Use the env variable determined in next.config.js
    if (!baseUrl) {
        console.error('NEXT_PUBLIC_BASE_URL environment variable is not set!');
        // Don't throw here, provide a fallback or log, but it indicates a config issue
        // Fallback to relative URL which might work in some scenarios but isn't ideal
        const collectionUrl = `/clip/${collectionId}`;
        console.warn('Warning: NEXT_PUBLIC_BASE_URL not set, using relative URL:', collectionUrl);
        const response: CreateResponse = {
            url: collectionUrl,
            id: collectionId,
        };
        return NextResponse.json(response, { status: 201 });
    }
    const collectionUrl = `${baseUrl}/clip/${collectionId}`;

    const response: CreateResponse = {
      url: collectionUrl,
      id: collectionId,
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Failed to create clip collection:', error);
    // Provide more specific error details if possible
    const errorDetails = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json(
        { error: 'Failed to create clip collection', details: errorDetails },
        { status: 500 }
    );
  }
}
