
import { NextResponse } from 'next/server';
import { getRedisClient, getRedisInitializationError } from '@/lib/redis';
import type { ClipboardItemData, SharedClipCollection } from '@/lib/types';

interface Params {
  id: string;
}

export async function POST(request: Request, { params }: { params: Params }) {
  const { id: collectionId } = params;
  const initError = getRedisInitializationError();

  if (initError) {
      console.error('API Error: Redis client not available.', initError);
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

  try {
    const redis = getRedisClient();
    const collectionKey = `clip:${collectionId}`;

    // --- Using MULTI/EXEC for Atomicity ---
    // Watch the key to ensure it doesn't change between GET and SET
    await redis.watch(collectionKey);

    const rawCurrentCollection = await redis.get(collectionKey);

    if (!rawCurrentCollection) {
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

    // Start transaction
    const multi = redis.multi();

    // Set the updated collection back into Redis
    multi.set(collectionKey, JSON.stringify(updatedCollection));

    // Preserve TTL if it exists (> 0, -1 means no expire, -2 key doesn't exist)
    if (currentTTL > 0) {
      multi.expire(collectionKey, currentTTL);
    } else if (currentTTL === -1) {
       // If no TTL was set, maybe set a default one now? Optional.
       // const defaultExpiration = 7 * 24 * 60 * 60;
       // multi.expire(collectionKey, defaultExpiration);
    }


    // Execute the transaction
    const execResult = await multi.exec();

    // Check if transaction was successful (execResult is null if WATCH failed)
    if (execResult === null) {
      console.error(`Transaction failed for adding item to collection ${collectionId} (likely due to WATCH conflict).`);
      // Transaction failed, likely because the key was modified.
      // Retry logic could be implemented here.
      return NextResponse.json({ error: 'Conflict: Collection updated concurrently. Please retry.' }, { status: 409 });
    }

     // Check results of individual commands within the transaction (optional, depends on ioredis multi type)
     // execResult is an array of results, e.g., [[null, 'OK'], [null, 1]] for SET and EXPIRE
     const setOpResult = execResult[0]?.[1]; // Result of the SET command
     if (setOpResult !== 'OK') {
         console.error(`Failed to SET collection ${collectionId} within transaction. Result: ${setOpResult}`);
         // Handle failure within transaction, though exec() succeeding usually means commands were queued.
         // This might indicate a Redis-side issue after queueing.
         return NextResponse.json({ error: 'Failed to save updated collection data during transaction.' }, { status: 500 });
     }


    return NextResponse.json(newItem, { status: 201 }); // Return the newly added item

    // --- Simple get/set approach (Higher risk of race conditions) ---
    /*
    const rawCurrentCollection = await redis.get(collectionKey);
    if (!rawCurrentCollection) {
        return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }
    // ... parse, update, get TTL ...
    const currentTTL = await redis.ttl(collectionKey);
    const options = currentTTL > 0 ? { px: currentTTL * 1000 } : {}; // ioredis uses PX for milliseconds in set options
    await redis.set(collectionKey, JSON.stringify(updatedCollection), 'PX', options.px); // Use PX if preserving TTL
    return NextResponse.json(newItem, { status: 201 });
    */


  } catch (error) {
    console.error(`Failed to add item to collection ${collectionId}:`, error);
    const errorDetails = error instanceof Error ? error.message : 'An unknown error occurred.';
    const status = errorDetails.includes('Redis client failed to initialize') || errorDetails.includes('Redis client is not connected') ? 500 : 500;
    return NextResponse.json(
        { error: 'Failed to add item to collection', details: errorDetails },
        { status: status }
    );
  }
}
