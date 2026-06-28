"use client";

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { RefreshCw, ExternalLink, Settings, X, Plus, Trash2, Globe, Rss, CheckCircle, AlertCircle } from 'lucide-react';
import { fetchNews, fetchSources, updateSources, triggerFetch, NewsItem } from '@/lib/api';

type SentimentFilter = 'tümü' | 'olumlu' | 'olumsuz' | 'nötr';
type FetchStatus = 'idle' | 'fetching' | 'success' | 'error';

export default function Home() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SentimentFilter>('tümü');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);

  // Fetch status
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle');
  const [lastFetchResult, setLastFetchResult] = useState<{ added: number; errors: number } | null>(null);

  // Settings Modal State
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [rssSources, setRssSources] = useState<string[]>([]);
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [sourcesLoading, setSourcesLoading] = useState(false);

  const loadNews = useCallback(async (currentFilter: SentimentFilter, currentPage: number, append = false) => {
    setLoading(true);
    try {
      const data = await fetchNews(currentFilter, currentPage, 24);
      if (data.success) {
        if (append) {
          setNews(prev => [...prev, ...data.news]);
        } else {
          setNews(data.news);
        }
        setHasMore(data.hasMore);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to load news", error);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    async function load() {
      setPage(1);
      await loadNews(filter, 1, false);
    }
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);


  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadNews(filter, nextPage, true);
  };

  const handleTriggerFetch = async () => {
    if (fetchStatus === 'fetching') return;
    setFetchStatus('fetching');
    setLastFetchResult(null);
    try {
      const result = await triggerFetch();
      if (result.success) {
        setFetchStatus('success');
        setLastFetchResult({ added: result.addedCount ?? 0, errors: result.errorCount ?? 0 });
        // Reload news from page 1
        setPage(1);
        await loadNews(filter, 1, false);
      } else {
        setFetchStatus('error');
      }
    } catch {
      setFetchStatus('error');
    }
    // Reset status after 5 seconds
    setTimeout(() => setFetchStatus('idle'), 5000);
  };

  const loadSourcesData = async () => {
    setSourcesLoading(true);
    try {
      const data = await fetchSources();
      if (data.success) setRssSources(data.sources);
    } catch (error) {
      console.error("Failed to load sources", error);
    } finally {
      setSourcesLoading(false);
    }
  };

  useEffect(() => {
    if (showSourcesModal) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadSourcesData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSourcesModal]);

  const handleAddSource = async () => {
    if (!newSourceUrl.trim() || !newSourceUrl.startsWith('http')) {
      alert('Lütfen geçerli bir URL girin (http/https).');
      return;
    }
    const updatedSources = [...rssSources, newSourceUrl.trim()];
    setSourcesLoading(true);
    const data = await updateSources(updatedSources);
    if (data.success) {
      setRssSources(data.sources);
      setNewSourceUrl('');
    } else {
      alert(`Hata: ${data.error}`);
    }
    setSourcesLoading(false);
  };

  const handleRemoveSource = async (url: string) => {
    const updatedSources = rssSources.filter(s => s !== url);
    setSourcesLoading(true);
    const data = await updateSources(updatedSources);
    if (data.success) {
      setRssSources(data.sources);
    } else {
      alert(`Hata: ${data.error}`);
    }
    setSourcesLoading(false);
  };

  const getSentimentBadgeColor = (sentiment: string) => {
    switch (sentiment) {
      case 'olumlu': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'olumsuz': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-slate-100 text-slate-800 border border-slate-200';
    }
  };

  const getSentimentDot = (sentiment: string) => {
    switch (sentiment) {
      case 'olumlu': return 'bg-emerald-500';
      case 'olumsuz': return 'bg-red-500';
      default: return 'bg-slate-400';
    }
  };

  const activeSourcesCount = Array.from(new Set(news.map(item => item.source))).length;

  const fetchButtonLabel = () => {
    switch (fetchStatus) {
      case 'fetching': return <><RefreshCw className="w-4 h-4 animate-spin" /><span>Çekiliyor...</span></>;
      case 'success': return <><CheckCircle className="w-4 h-4" /><span>{lastFetchResult?.added ?? 0} yeni haber</span></>;
      case 'error': return <><AlertCircle className="w-4 h-4" /><span>Hata oluştu</span></>;
      default: return <><Rss className="w-4 h-4" /><span>Yeni Haberleri Çek</span></>;
    }
  };

  const fetchButtonClass = () => {
    const base = "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-sans font-medium transition-all shadow-sm border";
    switch (fetchStatus) {
      case 'fetching': return `${base} bg-blue-50 text-blue-600 border-blue-200 cursor-not-allowed`;
      case 'success': return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
      case 'error': return `${base} bg-red-50 text-red-600 border-red-200`;
      default: return `${base} bg-[color:var(--color-accent)] text-white border-blue-600 hover:bg-blue-700`;
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-[color:var(--color-bg-soft)] text-[color:var(--color-text-main)] font-serif overflow-hidden">
      {/* Header */}
      <header className="h-[70px] border-b border-[color:var(--color-border)] bg-[color:var(--color-card-bg)] flex items-center justify-between px-6 md:px-10 shrink-0 shadow-sm z-10 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[color:var(--color-accent)] rounded-xl flex items-center justify-center shadow-inner">
            <span className="text-white font-bold font-sans text-xl">D</span>
          </div>
          <div>
            <h1 className="text-[20px] font-bold leading-tight tracking-tight">DuyguHaber</h1>
            <span className="text-[11px] text-[color:var(--color-text-muted)] font-mono tracking-wider uppercase">AI Sentiment Analyzer</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* NLP badge */}
          <div className="hidden md:flex items-center gap-2 text-[12px] text-emerald-700 font-mono border border-emerald-200 bg-emerald-50 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            HuggingFace NLP Aktif
          </div>
          {/* Fetch button */}
          <button
            onClick={handleTriggerFetch}
            disabled={fetchStatus === 'fetching'}
            className={fetchButtonClass()}
            title="RSS kaynaklarından yeni haber çek"
          >
            {fetchButtonLabel()}
          </button>
          {/* Sources settings */}
          <button
            onClick={() => setShowSourcesModal(true)}
            className="flex items-center justify-center p-2.5 rounded-lg bg-[color:var(--color-bg-soft)] border border-[color:var(--color-border)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-accent)] hover:bg-white transition-all shadow-sm"
            title="Kaynakları Düzenle"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <nav className="w-[240px] md:w-[280px] bg-[color:var(--color-card-bg)] border-r border-[color:var(--color-border)] p-6 hidden md:flex flex-col overflow-y-auto shrink-0 shadow-sm z-0">
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-[color:var(--color-text-muted)] mb-4">
            DUYGU FİLTRESİ
          </div>
          {(['tümü', 'olumlu', 'olumsuz', 'nötr'] as SentimentFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-left px-[15px] py-[12px] mb-2 rounded-xl text-[14px] font-sans font-medium transition-all flex items-center justify-between ${
                filter === f
                  ? 'bg-blue-50 text-[color:var(--color-accent)] border border-blue-100 shadow-sm'
                  : 'text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-soft)] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                {f !== 'tümü' && (
                  <span className={`w-2 h-2 rounded-full ${getSentimentDot(f)}`}></span>
                )}
                <span className="capitalize">{f}</span>
              </div>
              {filter === f && <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-accent)]"></span>}
            </button>
          ))}

          <div className="mt-8 pt-8 border-t border-[color:var(--color-border)]">
            <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-[color:var(--color-text-muted)] mb-4 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" />
              AKTİF KAYNAKLAR
            </div>
            {initialLoad ? (
              <div className="text-sm text-[color:var(--color-text-muted)] animate-pulse">Yükleniyor...</div>
            ) : activeSourcesCount === 0 ? (
              <div className="px-[15px] py-[10px] text-sm text-[color:var(--color-text-muted)] opacity-50 bg-[color:var(--color-bg-soft)] rounded-xl border border-dashed border-[color:var(--color-border)] text-center">
                Henüz kaynak yok
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {Array.from(new Set(news.map(item => item.source))).sort().map(source => (
                  <div
                    key={source}
                    className="px-3 py-2 bg-[color:var(--color-bg-soft)] rounded-lg text-[13px] text-[color:var(--color-text-main)] font-sans truncate border border-[color:var(--color-border)]/50 flex items-center gap-2 shadow-sm"
                    title={source}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"></div>
                    <span className="truncate">{source}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Main content */}
        <div className="flex-1 p-4 md:p-8 lg:p-10 flex flex-col gap-6 overflow-y-auto bg-[#F8FAFC]">
          {/* Mobile filter pills */}
          <div className="md:hidden flex overflow-x-auto pb-2 gap-2 snap-x">
            {(['tümü', 'olumlu', 'olumsuz', 'nötr'] as SentimentFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`snap-start whitespace-nowrap px-4 py-2 rounded-full text-sm font-sans font-medium transition-all ${
                  filter === f
                    ? 'bg-blue-50 text-[color:var(--color-accent)] border border-blue-100 shadow-sm'
                    : 'bg-white text-[color:var(--color-text-muted)] border border-[color:var(--color-border)]'
                }`}
              >
                <span className="capitalize">{f}</span>
              </button>
            ))}
          </div>

          {/* Page header */}
          <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-5 rounded-2xl border border-[color:var(--color-border)] shadow-sm">
            <div className="flex flex-col">
              <h2 className="text-xl font-bold font-serif text-[color:var(--color-text-main)]">Son Gelişmeler</h2>
              <p className="text-sm text-[color:var(--color-text-muted)] font-sans mt-1">
                Yapay zeka analizli güncel haber akışı
              </p>
            </div>
            {total > 0 && (
              <div className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-xs font-mono font-medium flex items-center gap-2 shadow-sm">
                <span className="font-bold text-slate-800">{total.toLocaleString('tr-TR')}</span> haber
                {filter !== 'tümü' && <span className="text-slate-400">· {filter} filtresi</span>}
              </div>
            )}
          </div>

          {/* News grid */}
          {loading && page === 1 ? (
            <div className="flex items-center justify-center flex-1 h-64">
              <div className="flex flex-col items-center gap-4">
                <RefreshCw className="w-8 h-8 text-[color:var(--color-accent)] animate-spin" />
                <span className="text-[color:var(--color-text-muted)] font-sans font-medium">Haberler yükleniyor...</span>
              </div>
            </div>
          ) : news.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-[color:var(--color-border)] shadow-sm text-center max-w-2xl mx-auto my-10">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <Rss className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold font-serif mb-2 text-[color:var(--color-text-main)]">Haber Bulunamadı</h3>
              <p className="text-[color:var(--color-text-muted)] font-sans text-sm max-w-md mx-auto leading-relaxed mb-6">
                {filter !== 'tümü'
                  ? `"${filter}" filtresine uygun haber bulunamadı.`
                  : 'Henüz haber çekilmemiş. Sağ üstteki "Yeni Haberleri Çek" butonuna basın.'}
              </p>
              {filter === 'tümü' && (
                <button
                  onClick={handleTriggerFetch}
                  disabled={fetchStatus === 'fetching'}
                  className="flex items-center gap-2 px-6 py-3 bg-[color:var(--color-accent)] text-white rounded-xl text-sm font-sans font-medium hover:bg-blue-700 transition-all shadow-sm shadow-blue-200 disabled:opacity-50"
                >
                  <Rss className="w-4 h-4" />
                  Haberleri Çek
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {news.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl overflow-hidden border border-[color:var(--color-border)] flex flex-col h-full relative transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group"
                  >
                      {item.image && (
                      <div className="w-full h-48 bg-slate-100 shrink-0 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                    <div className="p-6 flex flex-col flex-1 gap-4">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-sans text-[11px] text-[color:var(--color-text-muted)]">
                        <span className={`font-semibold uppercase text-[10px] px-2.5 py-1 rounded-md tracking-[0.5px] shadow-sm ${getSentimentBadgeColor(item.sentiment_label)}`}>
                          {item.sentiment_label}
                        </span>
                        <span className="font-mono bg-slate-50 px-2 py-1 rounded text-slate-500 border border-slate-100 shadow-sm">
                          {item.sentiment_score.toFixed(2)}
                        </span>
                      </div>

                      <h2 className="text-[17px] leading-[1.4] text-[color:var(--color-text-main)] font-bold m-0 font-serif">
                        {item.title}
                      </h2>

                      <p className="text-[14px] leading-[1.6] text-[color:var(--color-text-muted)] line-clamp-3 m-0 font-sans flex-1">
                        {item.summary?.replace(/<[^>]*>?/gm, '') || 'Özet bulunamadı.'}
                      </p>

                      <div className="pt-4 mt-auto flex items-center justify-between border-t border-[color:var(--color-border)]/60">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-bold text-slate-700 max-w-[120px] truncate" title={item.source}>
                            {item.source}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.published
                              ? formatDistanceToNow(new Date(item.published), { addSuffix: true, locale: tr })
                              : ''}
                          </span>
                        </div>
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-500 hover:text-blue-600 flex items-center justify-center transition-colors"
                          title="Habere Git"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-2 mb-10">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="px-8 py-3 bg-white border border-[color:var(--color-border)] rounded-full text-sm font-sans font-medium text-slate-700 hover:text-[color:var(--color-accent)] hover:border-blue-200 hover:bg-blue-50 transition-all disabled:opacity-50 shadow-sm flex items-center gap-2"
                  >
                    {loading ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Yükleniyor...</>
                    ) : (
                      'Daha Fazla Göster'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sources Modal */}
      {showSourcesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans border border-slate-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Globe className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif text-[color:var(--color-text-main)] leading-none mb-1">RSS Kaynakları</h3>
                  <p className="text-xs text-[color:var(--color-text-muted)]">Haberlerin çekildiği feed adreslerini yönetin</p>
                </div>
              </div>
              <button
                onClick={() => setShowSourcesModal(false)}
                className="w-10 h-10 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto bg-white">
              <div className="flex gap-3 mb-8">
                <input
                  type="url"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://ornek.com/rss.xml"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm outline-none focus:border-[color:var(--color-accent)] focus:bg-white transition-all focus:ring-4 focus:ring-blue-50"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSource()}
                />
                <button
                  onClick={handleAddSource}
                  disabled={sourcesLoading || !newSourceUrl.trim()}
                  className="bg-[color:var(--color-accent)] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition-all disabled:opacity-50 shadow-sm shadow-blue-200 flex items-center gap-2 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Ekle
                </button>
              </div>

              {sourcesLoading && rssSources.length === 0 ? (
                <div className="text-center py-12 text-[color:var(--color-text-muted)] flex flex-col items-center gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                  <span className="text-sm">Kaynaklar yükleniyor...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mevcut Kaynaklar</div>
                    <div className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      {rssSources.length} URL
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {rssSources.map((source, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all group"
                      >
                        <span className="text-sm font-sans text-slate-600 truncate pr-4" title={source}>
                          {source}
                        </span>
                        <button
                          onClick={() => handleRemoveSource(source)}
                          disabled={sourcesLoading}
                          className="text-slate-400 hover:text-red-600 opacity-50 group-hover:opacity-100 transition-all w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50"
                          title="Kaynağı Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {rssSources.length === 0 && (
                      <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                        <p className="text-sm text-slate-500">Henüz hiçbir RSS kaynağı eklenmemiş.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
