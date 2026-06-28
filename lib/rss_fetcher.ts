import Parser from 'rss-parser';
import { getDb } from './database';
import { analyzeSentiment } from './classifier';

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['image', 'image'],
    ],
  },
});

function extractImageUrl(item: any): string | null {
  if (
    item.enclosure?.url &&
    item.enclosure.url.match(/\.(jpeg|jpg|gif|png|webp)/i)
  ) {
    return item.enclosure.url;
  }
  if (item.mediaContent?.$?.url) {
    return item.mediaContent.$.url;
  }
  if (item.image && typeof item.image === 'string') {
    return item.image;
  }
  // Extract from HTML content
  const content = item.content || item.summary || '';
  const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
  if (imgMatch?.[1]) {
    return imgMatch[1];
  }
  return null;
}

export async function fetchAndProcessRss(): Promise<{
  addedCount: number;
  errorCount: number;
}> {
  const db = getDb();

  // Read sources from DB
  const sources = (
    db.prepare('SELECT url FROM sources').all() as { url: string }[]
  ).map((r) => r.url);

  if (sources.length === 0) {
    console.log('[RSS] No sources configured, skipping fetch.');
    return { addedCount: 0, errorCount: 0 };
  }

  let addedCount = 0;
  let errorCount = 0;

  const insertStmt = db.prepare(
    `INSERT INTO news (title, summary, image, link, published, source, sentiment_label, sentiment_score)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const sourceUrl of sources) {
    try {
      console.log(`[RSS] Fetching: ${sourceUrl}`);
      const feed = await parser.parseURL(sourceUrl);
      const sourceName = feed.title || sourceUrl;

      for (const item of feed.items) {
        if (!item.link || !item.title) continue;

        // Skip if already exists
        const existing = db
          .prepare('SELECT id FROM news WHERE link = ?')
          .get(item.link);
        if (existing) continue;

        const summary =
          item.contentSnippet || item.content || item.summary || '';
        const imageUrl = extractImageUrl(item);
        const textToAnalyze = `${item.title}. ${summary}`.trim();

        let sentimentLabel = 'nötr';
        let sentimentScore = 0.5;

        if (textToAnalyze) {
          try {
            const sentiment = await analyzeSentiment(textToAnalyze);
            sentimentLabel = sentiment.label;
            sentimentScore = sentiment.score;
          } catch (e) {
            console.error(`[RSS] Sentiment error for "${item.title}":`, e);
          }
        }

        try {
          insertStmt.run(
            item.title,
            summary,
            imageUrl,
            item.link,
            item.isoDate || item.pubDate || new Date().toISOString(),
            sourceName,
            sentimentLabel,
            sentimentScore
          );
          addedCount++;
        } catch (insertErr: any) {
          // Unique constraint violation — already exists (race condition)
          if (!insertErr.message?.includes('UNIQUE')) {
            console.error('[RSS] Insert error:', insertErr);
          }
        }
      }
    } catch (error) {
      console.error(`[RSS] Error fetching ${sourceUrl}:`, error);
      errorCount++;
    }
  }

  console.log(
    `[RSS] Done. Added: ${addedCount}, Errors: ${errorCount}`
  );
  return { addedCount, errorCount };
}

export function getNews(
  sentimentFilter?: string,
  offset: number = 0,
  limit: number = 20
): { news: any[]; total: number } {
  const db = getDb();

  const whereSentiment =
    sentimentFilter && sentimentFilter !== 'tümü'
      ? 'WHERE sentiment_label = ?'
      : '';
  const params: any[] =
    sentimentFilter && sentimentFilter !== 'tümü' ? [sentimentFilter] : [];

  const total = (
    db
      .prepare(`SELECT COUNT(*) as c FROM news ${whereSentiment}`)
      .get(...params) as { c: number }
  ).c;

  const news = db
    .prepare(
      `SELECT * FROM news ${whereSentiment} ORDER BY published DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  return { news, total };
}
