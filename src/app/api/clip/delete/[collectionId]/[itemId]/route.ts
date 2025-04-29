
import { NextResponse } from 'next/server';
import { getRedisClient, redisInitializationError } from '@/lib/redis';
import type { SharedClipCollection } from '@/lib/types';

interface Params {
  collectionId: string;
  itemId: string;
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  const { collectionId, itemId } = params;

  if (redisInitializationError) {
      console.error('API Error: Redis client not available.', redisInitializationError);
      return NextResponse.json(
          { error: 'Server configuration error', details: redisInitializationError },
          { status: 500 }
      );
  }

  if (!collectionId || !itemId) {
    return NextResponse.json({ error: 'Collection ID and Item ID are required' }, { status: 400 });
  }

  try {
    const redis = getRedisClient();
    const collectionKey = `clip:${collectionId}`;

    // Similar atomicity considerations as the 'add' endpoint apply here.
    // Get/set approach:
    const currentCollection = await redis.get<SharedClipCollection | null>(collectionKey);

    if (!currentCollection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const itemIndex = currentCollection.items.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
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
    const options = currentTTL > 0 ? { ex: currentTTL } : {};

    // Set the updated collection back into Redis, preserving TTL
    await redis.set(collectionKey, JSON.stringify(updatedCollection), options);


    return NextResponse.json({ message: 'Item deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error(`Failed to delete item ${itemId} from collection ${collectionId}:`, error);
     const errorDetails = error instanceof Error ? error.message : 'An unknown error occurred.';
     const status = errorDetails.includes('Redis client failed to initialize') ? 500 : 500;
    return NextResponse.json(
        { error: 'Failed to delete item', details: errorDetails },
        { status: status }
    );
  }
}
