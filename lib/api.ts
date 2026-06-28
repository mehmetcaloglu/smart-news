export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  link: string;
  source: string;
  published: string;
  image: string | null;
  sentiment_label: 'olumlu' | 'olumsuz' | 'nötr';
  sentiment_score: number;
}

export interface NewsResponse {
  success: boolean;
  news: NewsItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  error?: string;
}

export interface SourcesResponse {
  success: boolean;
  sources: string[];
  error?: string;
}

export interface FetchResponse {
  success: boolean;
  addedCount?: number;
  errorCount?: number;
  error?: string;
}

export async function fetchNews(
  sentiment: string = 'tümü',
  page: number = 1,
  limit: number = 24
): Promise<NewsResponse> {
  try {
    const params = new URLSearchParams({
      sentiment,
      page: String(page),
      limit: String(limit),
    });
    const res = await fetch(`/api/news?${params}`, { cache: 'no-store' });
    return await res.json();
  } catch (error) {
    console.error('[API] fetchNews error:', error);
    return { success: false, news: [], page, limit, total: 0, hasMore: false, error: 'Haberler alınamadı' };
  }
}

export async function fetchSources(): Promise<SourcesResponse> {
  try {
    const res = await fetch('/api/sources', { cache: 'no-store' });
    return await res.json();
  } catch (error) {
    console.error('[API] fetchSources error:', error);
    return { success: false, sources: [], error: 'Kaynaklar alınamadı' };
  }
}

export async function updateSources(sources: string[]): Promise<SourcesResponse> {
  try {
    const res = await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sources }),
    });
    return await res.json();
  } catch (error) {
    console.error('[API] updateSources error:', error);
    return { success: false, sources: [], error: 'Kaynaklar güncellenemedi' };
  }
}

export async function triggerFetch(): Promise<FetchResponse> {
  try {
    const res = await fetch('/api/fetch', { method: 'POST' });
    return await res.json();
  } catch (error) {
    console.error('[API] triggerFetch error:', error);
    return { success: false, error: 'RSS çekimi başlatılamadı' };
  }
}
