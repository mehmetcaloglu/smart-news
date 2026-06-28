# Akıllı Haberler (Smart News) - MVP

Bu proje, yerel Hugging Face NLP modeli (`transformers.js`) kullanarak haberleri Türkçe sentiment analizi (olumlu, olumsuz, nötr) ile sınıflandıran ve SQLite'da saklayan bir Next.js uygulamasıdır. 

Uygulama sunucu tarafında (Server API) çalışır ve istemci (frontend) haberleri ve duygu durumlarını listeler. 

## Kullanılan Teknolojiler
- **Backend/Frontend**: Next.js (App Router), TypeScript
- **Veritabanı**: SQLite (`better-sqlite3`)
- **RSS Çekici**: `rss-parser`
- **Makine Öğrenimi / NLP**: `@xenova/transformers`
- **Stil**: Tailwind CSS
- **İkonlar**: Lucide React

## Özellikler
- RSS kaynaklarını `config/rss_sources.json` üzerinden dinamik olarak okur.
- Otomatik Türkçe duygu analizi yapar (NLP modeli ile).
- Gemini veya başka bir harici LLM/API kullanılmamıştır. AI tamamen lokal çalışır.
- Duplicate haberleri kontrol eder (link bazlı unique constraint).
- Olumlu, olumsuz ve nötr haberleri filtreleme imkanı sunar.

## Kurulum
Proje bağımlılıkları yüklenmiş olmalıdır. Bağımlılıkları yüklemek için:

```bash
npm install
```

## Çalıştırma

Geliştirme sunucusunu başlatmak için:

```bash
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

## RSS Kaynağı Ekleme
`config/rss_sources.json` dosyasını açın ve yeni RSS adreslerini JSON formatında diziye ekleyin.

```json
[
  "https://www.ntv.com.tr/gundem.rss",
  "https://www.ntv.com.tr/teknoloji.rss"
]
```

## Haberleri Çekme
Arayüzde sağ üstte yer alan "Yeni Haberleri Çek" butonuna bastığınızda:
1. `config/rss_sources.json` okunur.
2. RSS kaynaklarından en güncel haberler alınır.
3. Haberler Xenova (Hugging Face) Transformers modeliyle (sentiment-analysis) işlenip etiketlenir.
4. Haberler ve analiz sonuçları lokal SQLite veritabanına kaydedilir.
5. Yeni haberler listelenir.

## Model Nasıl Değiştirilebilir?
Modeli `lib/classifier.ts` dosyasından değiştirebilirsiniz. 
Mevcut kod: `savasy/bert-base-turkish-sentiment-cased` modelini dener (eğer ONNX desteği varsa). Eğer çalışmazsa veya modelin ONNX formatı eksikse otomatik olarak daha kapsayıcı ve Türkçe'de de çalışan `Xenova/bert-base-multilingual-uncased-sentiment` modeline geçiş yapar (Fallback). 

Modeli doğrudan değiştirmek için `lib/classifier.ts` dosyasındaki `currentModel` değişkenini düzenleyebilirsiniz.
