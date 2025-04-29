
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import type { SharedClipCollection } from '@/lib/types';

interface Params {
  collectionId: string;
  itemId: string;
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  const { collectionId, itemId } = params;

  if (!collectionId || !itemId) {
    return NextResponse.json({ error: 'Collection ID and Item ID are required' }, { status: 400 });
  }

  try {
    const collectionKey = `clip:${collectionId}`;

    // Use a transaction to ensure atomicity
    const multi = redis.multi();
    multi.get<SharedClipCollection | null>(collectionKey); // Get current collection

    const results = await multi.exec<[SharedClipCollection | null]>();
    const currentCollection = results[0];


    if (!currentCollection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const itemIndex = currentCollection.items.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Item not found in collection' }, { status: 404 });
    }

    // Remove the item from the array
    const updatedItems = [
        ...currentCollection.items.slice(0, itemIndex),
        ...currentCollection.items.slice(itemIndex + 1)
    ];


    const updatedCollection: SharedClipCollection = {
      ...currentCollection,
      items: updatedItems,
    };

    // Set the updated collection back into Redis
    await redis.set(collectionKey, JSON.stringify(updatedCollection));

     // Optional: Refresh expiration on modification
    // const expirationInSeconds = 7 * 24 * 60 * 60; // 7 days
    // await redis.expire(collectionKey, expirationInSeconds);

    return NextResponse.json({ message: 'Item deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error(`Failed to delete item ${itemId} from collection ${collectionId}:`, error);
     const errorDetails = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json(
        { error: 'Failed to delete item', details: errorDetails },
        { status: 500 }
    );
  }
}
