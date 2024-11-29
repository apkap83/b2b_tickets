// app/api/revalidate/route.ts (API route)

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(req: Request) {
  const { path } = await req.json(); // Expecting a JSON body with a `path` to revalidate

  try {
    // Trigger revalidation for the path provided in the request
    revalidatePath(path);
    return NextResponse.json({ message: `Revalidated ${path}` });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to revalidate' },
      { status: 500 }
    );
  }
}
