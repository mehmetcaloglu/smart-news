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
    `INSERT OR IGNORE INTO news (title, summary, image, link, published, source, sentiment_label, sentiment_score)
     VALUES (?, ?, ?, ?, ?, ?, 'nötr', 0.5)`
  );

  // 1. Fetch all sources and insert them IMMEDIATELY to free memory (garbage collector friendly)
  for (const sourceUrl of sources) {
    try {
      console.log(`[RSS] Fetching: ${sourceUrl}`);
      const feed = await parser.parseURL(sourceUrl);
      const sourceName = feed.title || sourceUrl;

      // Limit feed items processed per source to prevent huge backlogs
      const itemsToProcess = feed.items.slice(0, 10);

      // Insert all new items for this feed inside a micro-transaction to be fast
      const insertFeedItems = db.transaction((items: any[]) => {
        for (const item of items) {
          if (!item.link || !item.title) continue;
          
          const summary = item.contentSnippet || item.content || item.summary || '';
          const imageUrl = extractImageUrl(item);
          const publishedDate = item.isoDate || item.pubDate || new Date().toISOString();

          const result = insertStmt.run(
            item.title,
            summary,
            imageUrl,
            item.link,
            publishedDate,
            sourceName
          );

          if (result.changes > 0) {
            addedCount++;
          }
        }
      });

      insertFeedItems(itemsToProcess);
    } catch (error) {
      console.error(`[RSS] Error fetching ${sourceUrl}:`, error);
      errorCount++;
    }
  }

  console.log(`[RSS] Total new articles successfully added to DB: ${addedCount}`);

  // 2. Select the 30 newest articles that are still neutral (either newly added, or legacy un-analyzed ones)
  const MAX_GEMINI_CALLS_PER_RUN = 30;
  const unanalyzedNews = db.prepare(
    `SELECT id, title, summary FROM news 
     WHERE sentiment_label = 'nötr' AND sentiment_score = 0.5 
     ORDER BY published DESC LIMIT ?`
  ).all(MAX_GEMINI_CALLS_PER_RUN) as { id: number; title: string; summary: string }[];

  console.log(`[RSS] Found ${unanalyzedNews.length} unanalyzed articles. Will analyze with Gemini...`);

  if (unanalyzedNews.length === 0) {
    return { addedCount, errorCount };
  }

  // 3. Analyze and update them in the DB one by one (completely memory-safe)
  const updateStmt = db.prepare(
    `UPDATE news SET sentiment_label = ?, sentiment_score = ? WHERE id = ?`
  );

  let geminiCallsCount = 0;
  for (const article of unanalyzedNews) {
    const textToAnalyze = `${article.title}. ${article.summary}`.trim();
    if (textToAnalyze) {
      try {
        // Delay to respect 15 Requests Per Minute limit (15 RPM -> 1 request every 4 seconds)
        if (geminiCallsCount > 0) {
          await new Promise((resolve) => setTimeout(resolve, 3500));
        }

        console.log(`[NLP] Analyzing article #${geminiCallsCount + 1}/${unanalyzedNews.length} (ID: ${article.id}): ${article.title}`);
        const sentiment = await analyzeSentiment(textToAnalyze);

        // Update database immediately
        updateStmt.run(sentiment.label, sentiment.score, article.id);
        geminiCallsCount++;
      } catch (e) {
        console.error(`[RSS] Sentiment error for ID ${article.id} "${article.title}":`, e);
      }
    }
  }

  console.log(`[RSS] Done. Successfully analyzed and updated ${geminiCallsCount} articles.`);
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
