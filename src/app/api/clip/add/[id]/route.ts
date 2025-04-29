
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import type { ClipboardItemData, SharedClipCollection } from '@/lib/types';

interface Params {
  id: string;
}

export async function POST(request: Request, { params }: { params: Params }) {
  const { id: collectionId } = params;

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
    const collectionKey = `clip:${collectionId}`;

    // Use a transaction to ensure atomicity
    const multi = redis.multi();
    multi.get<SharedClipCollection | null>(collectionKey); // Get current collection

    const results = await multi.exec<[SharedClipCollection | null]>();
    const currentCollection = results[0];

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

    const updatedCollection: SharedClipCollection = {
      ...currentCollection,
      items: updatedItems,
    };

    // Set the updated collection back into Redis
    await redis.set(collectionKey, JSON.stringify(updatedCollection));

    // Optional: Refresh expiration on modification
    // const expirationInSeconds = 7 * 24 * 60 * 60; // 7 days
    // await redis.expire(collectionKey, expirationInSeconds);

    return NextResponse.json(newItem, { status: 201 }); // Return the newly added item

  } catch (error) {
    console.error(`Failed to add item to collection ${collectionId}:`, error);
    const errorDetails = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json(
        { error: 'Failed to add item to collection', details: errorDetails },
        { status: 500 }
    );
  }
}
