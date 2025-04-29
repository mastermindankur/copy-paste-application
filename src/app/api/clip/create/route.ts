
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import type { SharedClipCollection } from '@/lib/types';

// Define the structure for the response
interface CreateResponse {
    url: string;
    id: string;
}

export async function POST() {
  try {
    const collectionId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newCollection: SharedClipCollection = {
      id: collectionId,
      items: [],
      createdAt: now,
    };

    // Store the new empty collection in Redis
    // The key will be something like 'clip:collectionId'
    await redis.set(`clip:${collectionId}`, JSON.stringify(newCollection));

    // Set an expiration time for the collection (e.g., 7 days)
    const expirationInSeconds = 7 * 24 * 60 * 60; // 7 days
    await redis.expire(`clip:${collectionId}`, expirationInSeconds);


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
    return NextResponse.json(
        { error: 'Failed to create clip collection', details: errorDetails },
        { status: 500 }
    );
  }
}
