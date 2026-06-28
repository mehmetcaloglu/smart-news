import { NextResponse } from 'next/server';
import { fetchAndProcessRss } from '@/lib/rss_fetcher';

export const dynamic = 'force-dynamic';
// Allow up to 5 minutes for the RSS fetch + sentiment analysis to complete
export const maxDuration = 300;

export async function POST() {
  try {
    const result = await fetchAndProcessRss();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[API /fetch] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
