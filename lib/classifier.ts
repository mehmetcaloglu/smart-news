import { pipeline } from '@xenova/transformers';

let classifier: any = null;
let currentModel = 'kaixkhazaki/turkish-sentiment';

export async function getClassifier() {
  if (classifier) return classifier;

  try {
    console.log(`Loading sentiment model: ${currentModel}`);
    classifier = await pipeline('sentiment-analysis', currentModel);
    return classifier;
  } catch (error) {
    console.log(`Failed to load ${currentModel}. Trying alternative...`);
    currentModel = 'savasy/bert-base-turkish-sentiment-cased';
    
    try {
      classifier = await pipeline('sentiment-analysis', currentModel);
      return classifier;
    } catch (err2) {
      console.log(`Failed to load ${currentModel}. Falling back to Xenova multilingual model.`);
      currentModel = 'Xenova/bert-base-multilingual-uncased-sentiment';
      classifier = await pipeline('sentiment-analysis', currentModel);
      return classifier;
    }
  }
}

export async function analyzeSentiment(text: string) {
  const model = await getClassifier();
  
  const truncatedText = text.substring(0, 512);

  const result = await model(truncatedText);
  const prediction = Array.isArray(result) ? result[0] : result;
  
  const labelRaw = prediction.label.toLowerCase();
  let label = "nötr";
  
  if (labelRaw.includes("positive") || labelRaw === "label_1" || labelRaw.includes("5 stars") || labelRaw.includes("4 stars")) {
    label = "olumlu";
  } else if (labelRaw.includes("negative") || labelRaw === "label_0" || labelRaw.includes("1 star") || labelRaw.includes("2 stars")) {
    label = "olumsuz";
  } else if (labelRaw.includes("neutral") || labelRaw === "label_2" || labelRaw.includes("3 stars")) {
    label = "nötr";
  }

  return {
    label: label as "olumlu" | "olumsuz" | "nötr",
    score: prediction.score,
    raw_label: prediction.label
  };
}