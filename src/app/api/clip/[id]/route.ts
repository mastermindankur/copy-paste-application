
import { NextResponse } from 'next/server';
import { getRedisClient, redisInitializationError } from '@/lib/redis';
import type { SharedClipCollection } from '@/lib/types';

interface Params {
  id: string;
}

export async function GET(request: Request, { params }: { params: Params }) {
  const { id } = params;

  if (redisInitializationError) {
      console.error('API Error: Redis client not available.', redisInitializationError);
      return NextResponse.json(
          { error: 'Server configuration error', details: redisInitializationError },
          { status: 500 }
      );
  }

  if (!id) {
    return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
  }

  try {
    const redis = getRedisClient();
    const collectionKey = `clip:${id}`;
    const data = await redis.get<SharedClipCollection | null>(collectionKey);

    if (!data) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Optional: Refresh expiration on access - Consider if needed
    // const expirationInSeconds = 7 * 24 * 60 * 60; // 7 days
    // await redis.expire(collectionKey, expirationInSeconds);

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error(`Failed to fetch clip collection ${id}:`, error);
    const errorDetails = error instanceof Error ? error.message : 'An unknown error occurred.';
     const status = errorDetails.includes('Redis client failed to initialize') ? 500 : 500;
    return NextResponse.json(
        { error: 'Failed to fetch clip collection', details: errorDetails },
        { status: status }
    );
  }
}
