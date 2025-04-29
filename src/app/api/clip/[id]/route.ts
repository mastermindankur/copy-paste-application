
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import type { SharedClipCollection } from '@/lib/types';

interface Params {
  id: string;
}

export async function GET(request: Request, { params }: { params: Params }) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
  }

  try {
    const collectionKey = `clip:${id}`;
    const data = await redis.get<SharedClipCollection | null>(collectionKey);

    if (!data) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Optional: Refresh expiration on access
    // const expirationInSeconds = 7 * 24 * 60 * 60; // 7 days
    // await redis.expire(collectionKey, expirationInSeconds);

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
