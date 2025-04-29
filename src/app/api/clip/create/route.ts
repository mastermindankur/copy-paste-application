
import { NextResponse } from 'next/server';
import { getRedisClient, redisInitializationError } from '@/lib/redis';
import type { SharedClipCollection } from '@/lib/types';

// Define the structure for the response
interface CreateResponse {
    url: string;
    id: string;
}

export async function POST() {
  // Check if Redis client failed to initialize during startup
  if (redisInitializationError) {
      console.error('API Error: Redis client not available.', redisInitializationError);
      return NextResponse.json(
          { error: 'Server configuration error', details: redisInitializationError },
          { status: 500 }
      );
  }

  try {
    const redis = getRedisClient(); // Get the initialized client instance

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
    // Use 'set' with 'ex' option for atomic set and expire
    await redis.set(collectionKey, JSON.stringify(newCollection), { ex: expirationInSeconds });

    // Construct the URL for the new collection
    const collectionUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/clip/${collectionId}`;

    const response: CreateResponse = {
      url: collectionUrl,
      id: collectionId,
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Failed to create clip collection:', error);
    // Provide more specific error details if possible
    const errorDetails = error instanceof Error ? error.message : 'An unknown error occurred.';
    // Distinguish between config errors and runtime errors
    const status = errorDetails.includes('Redis client failed to initialize') ? 500 : 500; // Keep 500, but could customize
    return NextResponse.json(
        { error: 'Failed to create clip collection', details: errorDetails },
        { status: status }
    );
  }
}
