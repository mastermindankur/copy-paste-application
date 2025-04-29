
import { NextResponse } from 'next/server';
import { getRedisClient, getRedisInitializationError } from '@/lib/redis';
import type { SharedClipCollection } from '@/lib/types';

interface Params {
  id: string;
}

export async function GET(request: Request, { params }: { params: Params }) {
  const { id } = params;
  const initError = getRedisInitializationError();
  if (initError && !initError.startsWith('Redis Client Error')) {
      console.error('API Config Error: Redis client not available.', initError);
      return NextResponse.json(
          { error: 'Server configuration error', details: initError },
          { status: 500 }
      );
  }

  if (!id) {
    return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
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
    const collectionKey = `clip:${id}`;
    const rawData = await redis.get(collectionKey); // Returns string or null

    if (rawData === null) { // Check for null specifically
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
    // try {
    //     const currentTTL = await redis.ttl(collectionKey);
    //     if (currentTTL > 0) { // Only refresh if it has an expiration
    //         const expirationInSeconds = 7 * 24 * 60 * 60; // 7 days
    //         await redis.expire(collectionKey, expirationInSeconds);
    //     }
    // } catch (expireError) {
    //      console.warn(`Failed to refresh TTL for ${collectionKey}:`, expireError);
    // }


    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error(`Failed to fetch clip collection ${id}:`, error);
    const errorDetails = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json(
        { error: 'Failed to fetch clip collection', details: errorDetails },
        { status: 500 }
    );
  }
}
