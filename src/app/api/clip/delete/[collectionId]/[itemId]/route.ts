
import { NextResponse } from 'next/server';
import { getRedisClient, getRedisInitializationError } from '@/lib/redis';
import type { SharedClipCollection } from '@/lib/types';

interface Params {
  collectionId: string;
  itemId: string;
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  const { collectionId, itemId } = params;
  const initError = getRedisInitializationError();
  if (initError && !initError.startsWith('Redis Client Error')) {
      console.error('API Config Error: Redis client not available.', initError);
      return NextResponse.json(
          { error: 'Server configuration error', details: initError },
          { status: 500 }
      );
  }

  if (!collectionId || !itemId) {
    return NextResponse.json({ error: 'Collection ID and Item ID are required' }, { status: 400 });
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
    await redis.watch(collectionKey);

    const rawCurrentCollection = await redis.get(collectionKey);

    if (rawCurrentCollection === null) {
        await redis.unwatch();
        return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    let currentCollection: SharedClipCollection;
     try {
        currentCollection = JSON.parse(rawCurrentCollection);
    } catch(parseError) {
        await redis.unwatch();
        console.error(`Failed to parse JSON for collection ${collectionId} during delete:`, parseError);
        return NextResponse.json({ error: 'Failed to read collection data', details: 'Corrupted data format.' }, { status: 500 });
    }


    const itemIndex = currentCollection.items.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
       await redis.unwatch();
      // Item already deleted or never existed
      return NextResponse.json({ message: 'Item not found or already deleted' }, { status: 404 });
    }

    // Remove the item from the array
    const updatedItems = currentCollection.items.filter(item => item.id !== itemId);

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

     // Preserve TTL if it exists
    if (currentTTL > 0) {
      multi.expire(collectionKey, currentTTL);
    }

    // Execute the transaction
    const execResult = await multi.exec();

    // Check if transaction was successful
    if (execResult === null || execResult === undefined) {
       console.error(`Transaction failed for deleting item ${itemId} from collection ${collectionId} (likely due to WATCH conflict).`);
      return NextResponse.json({ error: 'Conflict: Collection updated concurrently. Please retry.' }, { status: 409 });
    }

     // Optional: Check command results if needed
     const setOpResult = execResult[0];
     if (setOpResult !== 'OK') {
         console.warn(`SET command within delete transaction for ${collectionId} returned: ${setOpResult} (Expected 'OK')`);
     }


    return NextResponse.json({ message: 'Item deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error(`Failed to delete item ${itemId} from collection ${collectionId}:`, error);
    // Ensure WATCH is released on error
     try { await redis.unwatch(); } catch (unwatchError) { console.error('Error during unwatch cleanup:', unwatchError); }

     const errorDetails = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json(
        { error: 'Failed to delete item', details: errorDetails },
        { status: 500 }
    );
  }
}
