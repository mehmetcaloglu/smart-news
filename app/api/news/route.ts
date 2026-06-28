import { NextRequest, NextResponse } from 'next/server';
import { getNews } from '@/lib/rss_fetcher';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sentiment = searchParams.get('sentiment') || 'tümü';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '24')));
    const offset = (page - 1) * limit;

    const { news, total } = getNews(sentiment, offset, limit);
    const hasMore = offset + limit < total;

    return NextResponse.json({ success: true, news, page, limit, total, hasMore });
  } catch (error: any) {
    console.error('[API /news] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
