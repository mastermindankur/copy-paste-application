
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

  if (initError) {
      console.error('API Error: Redis client not available.', initError);
      return NextResponse.json(
          { error: 'Server configuration error', details: initError },
          { status: 500 }
      );
  }

  if (!collectionId || !itemId) {
    return NextResponse.json({ error: 'Collection ID and Item ID are required' }, { status: 400 });
  }

  try {
    const redis = getRedisClient();
    const collectionKey = `clip:${collectionId}`;

    // --- Using MULTI/EXEC for Atomicity ---
    await redis.watch(collectionKey);

    const rawCurrentCollection = await redis.get(collectionKey);

    if (!rawCurrentCollection) {
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
      // Item already deleted or never existed, consider success or 404 based on desired behavior
      return NextResponse.json({ message: 'Item not found or already deleted' }, { status: 404 });
      // return NextResponse.json({ message: 'Item already deleted' }, { status: 200 });
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

    // Set the updated collection back into Redis
    multi.set(collectionKey, JSON.stringify(updatedCollection));

     // Preserve TTL if it exists
    if (currentTTL > 0) {
      multi.expire(collectionKey, currentTTL);
    }

    // Execute the transaction
    const execResult = await multi.exec();

    // Check if transaction was successful
    if (execResult === null) {
       console.error(`Transaction failed for deleting item ${itemId} from collection ${collectionId} (likely due to WATCH conflict).`);
      return NextResponse.json({ error: 'Conflict: Collection updated concurrently. Please retry.' }, { status: 409 });
    }

    const setOpResult = execResult[0]?.[1];
    if (setOpResult !== 'OK') {
        console.error(`Failed to SET collection ${collectionId} within delete transaction. Result: ${setOpResult}`);
        return NextResponse.json({ error: 'Failed to save updated collection data during delete transaction.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Item deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error(`Failed to delete item ${itemId} from collection ${collectionId}:`, error);
     const errorDetails = error instanceof Error ? error.message : 'An unknown error occurred.';
     const status = errorDetails.includes('Redis client failed to initialize') || errorDetails.includes('Redis client is not connected') ? 500 : 500;
    return NextResponse.json(
        { error: 'Failed to delete item', details: errorDetails },
        { status: status }
    );
  }
}
