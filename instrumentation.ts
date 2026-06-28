export async function register() {
  // Only run in Node.js runtime (not Edge), and only in the server process
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { fetchAndProcessRss } = await import('./lib/rss_fetcher');

    // Run once on server startup (after a short delay to let DB init)
    setTimeout(async () => {
      console.log('[CRON] Sunucu başladı — ilk RSS çekimi başlıyor...');
      try {
        const result = await fetchAndProcessRss();
        console.log(`[CRON] İlk çekim tamamlandı: +${result.addedCount} haber, ${result.errorCount} hata`);
      } catch (err) {
        console.error('[CRON] İlk çekim hatası:', err);
      }
    }, 5000);

    // Schedule hourly fetch using node-cron
    const cron = await import('node-cron');
    cron.schedule('0 * * * *', async () => {
      console.log('[CRON] Saatlik RSS çekimi başlıyor...');
      try {
        const result = await fetchAndProcessRss();
        console.log(`[CRON] Saatlik çekim tamamlandı: +${result.addedCount} haber, ${result.errorCount} hata`);
      } catch (err) {
        console.error('[CRON] Saatlik çekim hatası:', err);
      }
    });

    console.log('[CRON] Saatlik RSS zamanlayıcısı kuruldu (her saat başı çalışır).');
  }
}
