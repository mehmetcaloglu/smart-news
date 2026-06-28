export async function analyzeSentiment(text: string): Promise<{
  label: 'olumlu' | 'olumsuz' | 'nötr';
  score: number;
  raw_label?: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[NLP] GEMINI_API_KEY is not set. Defaulting to "nötr".');
    return { label: 'nötr', score: 0.5 };
  }

  const truncatedText = text.substring(0, 1000);
  const prompt = `Aşağıdaki haber başlığı ve özetini analiz et ve Türkçe duygu etiketini (olumlu, olumsuz, nötr) belirle.
Ayrıca bu analizin güven skorunu (0.0 ile 1.0 arasında) döndür.

Haber:
${truncatedText}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              sentiment: {
                type: 'STRING',
                enum: ['olumlu', 'olumsuz', 'nötr'],
              },
              score: {
                type: 'NUMBER',
                description: 'Confidence score between 0.0 and 1.0',
              },
            },
            required: ['sentiment', 'score'],
          },
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) {
      throw new Error('Empty response from Gemini API');
    }

    const result = JSON.parse(jsonText);
    const label = result.sentiment as 'olumlu' | 'olumsuz' | 'nötr';
    const score = typeof result.score === 'number' ? result.score : 0.5;

    return { label, score };
  } catch (error) {
    console.error('[NLP] Gemini API sentiment analysis failed:', error);
    return { label: 'nötr', score: 0.5 };
  }
}