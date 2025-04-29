
import { NextResponse } from 'next/server';
import { getRedisClient, redisInitializationError } from '@/lib/redis';
import type { ClipboardItemData, SharedClipCollection } from '@/lib/types';

interface Params {
  id: string;
}

export async function POST(request: Request, { params }: { params: Params }) {
  const { id: collectionId } = params;

   if (redisInitializationError) {
      console.error('API Error: Redis client not available.', redisInitializationError);
      return NextResponse.json(
          { error: 'Server configuration error', details: redisInitializationError },
          { status: 500 }
      );
  }


  if (!collectionId) {
    return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
  }

  let newItemData: Omit<ClipboardItemData, 'id' | 'createdAt'>;
  try {
    newItemData = await request.json();
    if (!newItemData || typeof newItemData.content !== 'string' || !newItemData.type) {
        throw new Error('Invalid item data format.');
    }
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body', details: error instanceof Error ? error.message : 'Could not parse JSON.' }, { status: 400 });
  }


  try {
    const redis = getRedisClient();
    const collectionKey = `clip:${collectionId}`;

    // Atomically get and update the collection using a transaction or Lua script for complex logic.
    // For simple prepend, fetching then setting is often sufficient with Vercel KV,
    // but be aware of potential race conditions under high load.
    // Using MULTI/EXEC for atomicity:
    const multi = redis.multi();
    multi.get<SharedClipCollection | null>(collectionKey);

    // Note: Vercel KV's multi/exec might have limitations compared to standard Redis.
    // Check documentation if complex transactions are needed.
    // Simple get/set approach (less atomic, higher race condition risk):
    const currentCollection = await redis.get<SharedClipCollection | null>(collectionKey);

    if (!currentCollection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const newItem: ClipboardItemData = {
      ...newItemData,
      id: crypto.randomUUID(), // Generate unique ID for the item
      createdAt: new Date().toISOString(), // Store as ISO string
    };

    // Prepend the new item to the list
    const updatedItems = [newItem, ...currentCollection.items];

    // Limit history size if needed (e.g., keep last 100 items)
    // const MAX_ITEMS = 100;
    // if (updatedItems.length > MAX_ITEMS) {
    //     updatedItems.length = MAX_ITEMS;
    // }


    const updatedCollection: SharedClipCollection = {
      ...currentCollection,
      items: updatedItems,
    };

    // Get current TTL to preserve it
    const currentTTL = await redis.ttl(collectionKey);
    const options = currentTTL > 0 ? { ex: currentTTL } : {};


    // Set the updated collection back into Redis, preserving TTL
    await redis.set(collectionKey, JSON.stringify(updatedCollection), options);

    return NextResponse.json(newItem, { status: 201 }); // Return the newly added item

  } catch (error) {
    console.error(`Failed to add item to collection ${collectionId}:`, error);
    const errorDetails = error instanceof Error ? error.message : 'An unknown error occurred.';
    const status = errorDetails.includes('Redis client failed to initialize') ? 500 : 500;
    return NextResponse.json(
        { error: 'Failed to add item to collection', details: errorDetails },
        { status: status }
    );
  }
}
