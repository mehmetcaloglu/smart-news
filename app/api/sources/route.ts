import { NextResponse } from 'next/server';
import { getDb } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT url FROM sources ORDER BY created_at ASC').all() as { url: string }[];
    const sources = rows.map((r) => r.url);
    return NextResponse.json({ success: true, sources });
  } catch (error: any) {
    console.error('[API /sources GET] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { sources } = await req.json();
    if (!Array.isArray(sources)) {
      return NextResponse.json(
        { success: false, error: 'sources must be an array' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Replace all sources: delete existing, insert new ones
    const replace = db.transaction((newSources: string[]) => {
      db.prepare('DELETE FROM sources').run();
      const insert = db.prepare('INSERT OR IGNORE INTO sources (url) VALUES (?)');
      for (const url of newSources) {
        if (url && url.startsWith('http')) insert.run(url.trim());
      }
    });
    replace(sources);

    const rows = db.prepare('SELECT url FROM sources ORDER BY created_at ASC').all() as { url: string }[];
    return NextResponse.json({ success: true, sources: rows.map((r) => r.url) });
  } catch (error: any) {
    console.error('[API /sources POST] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
