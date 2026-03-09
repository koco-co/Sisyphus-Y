import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const filePath = join(process.cwd(), '..', 'progress.json');
    const content = await readFile(filePath, 'utf-8');
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json(
      { error: 'Progress data not available' },
      { status: 404 }
    );
  }
}
