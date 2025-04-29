
import { NextResponse } from 'next/server';
import { getRedisClient, getRedisInitializationError } from '@/lib/redis';
import type { SharedClipCollection } from '@/lib/types';

interface Params {
  id: string;
}

export async function GET(request: Request, { params }: { params: Params }) {
  const { id } = params;
  const initError = getRedisInitializationError();

  if (initError) {
      console.error('API Error: Redis client not available.', initError);
      return NextResponse.json(
          { error: 'Server configuration error', details: initError },
          { status: 500 }
      );
  }

  if (!id) {
    return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
  }

  try {
    const redis = getRedisClient();
    const collectionKey = `clip:${id}`;
    const rawData = await redis.get(collectionKey); // Returns string or null

    if (!rawData) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    let data: SharedClipCollection;
    try {
      data = JSON.parse(rawData);
    } catch (parseError) {
      console.error(`Failed to parse JSON for collection ${id}:`, parseError, `Raw data: ${rawData}`);
      return NextResponse.json({ error: 'Failed to read collection data', details: 'Corrupted data format.' }, { status: 500 });
    }


    // Optional: Refresh expiration on access - Consider if needed
    // const currentTTL = await redis.ttl(collectionKey);
    // if (currentTTL > 0) { // Only refresh if it has an expiration
    //     const expirationInSeconds = 7 * 24 * 60 * 60; // 7 days
    //     await redis.expire(collectionKey, expirationInSeconds);
    // }

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error(`Failed to fetch clip collection ${id}:`, error);
    const errorDetails = error instanceof Error ? error.message : 'An unknown error occurred.';
     const status = errorDetails.includes('Redis client failed to initialize') || errorDetails.includes('Redis client is not connected') ? 500 : 500;
    return NextResponse.json(
        { error: 'Failed to fetch clip collection', details: errorDetails },
        { status: status }
    );
  }
}
