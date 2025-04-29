
import { NextResponse } from 'next/server';
import { getRedisClient, getRedisInitializationError } from '@/lib/redis';
import type { ClipboardItemData, SharedClipCollection } from '@/lib/types';

interface Params {
  id: string;
}

export async function POST(request: Request, { params }: { params: Params }) {
  const { id: collectionId } = params;
  const initError = getRedisInitializationError();
  if (initError && !initError.startsWith('Redis Client Error')) {
      console.error('API Config Error: Redis client not available.', initError);
      return NextResponse.json(
          { error: 'Server configuration error', details: initError },
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

  const collectionKey = `clip:${collectionId}`;
  try {
    // --- Using WATCH/MULTI/EXEC for Atomicity ---
    // Watch the key to ensure it doesn't change between GET and SET
    await redis.watch(collectionKey);

    const rawCurrentCollection = await redis.get(collectionKey);

    if (rawCurrentCollection === null) {
        await redis.unwatch(); // Release the watch if the key doesn't exist
        return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    let currentCollection: SharedClipCollection;
    try {
        currentCollection = JSON.parse(rawCurrentCollection);
    } catch(parseError) {
        await redis.unwatch(); // Release the watch on parse error
        console.error(`Failed to parse JSON for collection ${collectionId} during add:`, parseError);
        return NextResponse.json({ error: 'Failed to read collection data', details: 'Corrupted data format.' }, { status: 500 });
    }

    const newItem: ClipboardItemData = {
      ...newItemData,
      id: crypto.randomUUID(), // Generate unique ID for the item
      createdAt: new Date().toISOString(), // Store as ISO string
    };

    // Prepend the new item to the list
    const updatedItems = [newItem, ...currentCollection.items];

    // Optional: Limit history size
    // const MAX_ITEMS = 100;
    // if (updatedItems.length > MAX_ITEMS) updatedItems.length = MAX_ITEMS;

    const updatedCollection: SharedClipCollection = {
      ...currentCollection,
      items: updatedItems,
    };

    // Get current TTL to preserve it
    const currentTTL = await redis.ttl(collectionKey);

    // Start transaction
    const multi = redis.multi();

    // Queue the SET command
    multi.set(collectionKey, JSON.stringify(updatedCollection));

    // Preserve TTL if it exists (> 0, -1 means no expire, -2 key doesn't exist)
    if (currentTTL > 0) {
      multi.expire(collectionKey, currentTTL);
    }
    // Optionally set a default TTL if none existed (currentTTL === -1)
    // else if (currentTTL === -1) {
    //    const defaultExpiration = 7 * 24 * 60 * 60;
    //    multi.expire(collectionKey, defaultExpiration);
    // }

    // Execute the transaction
    const execResult = await multi.exec();

    // Check if transaction was successful (execResult is null/undefined if WATCH failed)
    if (execResult === null || execResult === undefined) {
      console.error(`Transaction failed for adding item to collection ${collectionId} (likely due to WATCH conflict).`);
      // Transaction failed, likely because the key was modified. Retry logic could be implemented here.
      return NextResponse.json({ error: 'Conflict: Collection updated concurrently. Please retry.' }, { status: 409 });
    }

     // Check results of individual commands within the transaction if needed
     // For redis client v4, exec() returns an array of results or throws on error during exec
     // Let's assume success if execResult is not null/undefined and didn't throw
     // Example check (might depend on specific command results if needed):
     const setOpResult = execResult[0]; // Result of the SET command
     if (setOpResult !== 'OK') {
         // This check might be redundant if exec() throws on failure
         console.warn(`SET command within transaction for ${collectionId} returned: ${setOpResult} (Expected 'OK')`);
         // Potentially handle unexpected command result, though rare if transaction succeeded
     }

    return NextResponse.json(newItem, { status: 201 }); // Return the newly added item

  } catch (error) {
    console.error(`Failed to add item to collection ${collectionId}:`, error);
    // Ensure WATCH is released in case of errors after WATCH starts but before UNWATCH
    try { await redis.unwatch(); } catch (unwatchError) { console.error('Error during unwatch cleanup:', unwatchError); }

    const errorDetails = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json(
        { error: 'Failed to add item to collection', details: errorDetails },
        { status: 500 }
    );
  }
}
