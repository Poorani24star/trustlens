const sharp = require('sharp');
const { GoogleGenAI } = require('@google/genai');

// Valid Gemini models that support multimodal vision (as of @google/genai v2)
// Listed in priority order: fastest/cheapest first, most capable last
const GEMINI_VISION_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
];

const TRANSCRIPTION_PROMPT = `Transcribe ONLY the handwritten and printed text visible on this document page.
Rules:
1. Preserve all question numbers, section titles, headings, and lists faithfully.
2. Maintain natural paragraph breaks and sentence structure.
3. Do NOT provide commentary, corrections, explanations, or conversational introductions.
4. Output strictly the transcribed content.`;

/**
 * Transcribes handwritten or printed document images using Google Gemini Multimodal Vision API
 * Uses @google/genai v2 SDK (client.models.generateContent)
 * @param {Buffer} imageBuffer
 * @param {string} [mimeType='image/jpeg']
 * @returns {Promise<{success: boolean, text?: string, error?: string, extractionMethod?: string, confidence?: number}>}
 */
async function transcribeWithVision(imageBuffer, mimeType = 'image/jpeg') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return {
      success: false,
      reason: 'NO_API_KEY',
      error: 'GEMINI_API_KEY is not configured in .env',
    };
  }

  // Pre-process: resize large images for optimal OCR accuracy and network transport
  let bufferToSend = imageBuffer;
  try {
    bufferToSend = await sharp(imageBuffer)
      .rotate()
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();
  } catch (sharpErr) {
    console.warn('[VisionOcrService] Sharp resize warning, using raw buffer:', sharpErr.message);
    bufferToSend = imageBuffer;
  }

  const base64Data = bufferToSend.toString('base64');
  const client = new GoogleGenAI({ apiKey: apiKey.trim() });

  for (const modelName of GEMINI_VISION_MODELS) {
    try {
      console.log(`[VisionOcrService] Trying model: ${modelName}`);

      const response = await Promise.race([
        client.models.generateContent({
          model: modelName,
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Data,
                  },
                },
                { text: TRANSCRIPTION_PROMPT },
              ],
            },
          ],
          config: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini request timeout')), 15000)
        ),
      ]);

      const rawText = response?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText && rawText.trim().length > 0) {
        const cleanText = rawText
          .replace(/^```[a-z]*\r?\n/i, '')
          .replace(/\r?\n```$/g, '')
          .replace(/^(?:Here is the transcription[^\n]*|Below is the transcription[^\n]*|Transcribed text:)\s*\n+/i, '')
          .replace(/^---+[\r\n]+/gm, '')
          .trim();

        console.log(`[VisionOcrService] Success via ${modelName} (${cleanText.length} chars)`);
        return {
          success: true,
          text: cleanText,
          extractionMethod: `gemini-vision (${modelName})`,
          confidence: 98,
        };
      }

      console.warn(`[VisionOcrService] ${modelName} returned empty text, trying next model`);
    } catch (err) {
      const msg = err.message || '';
      // Don't retry on auth errors — key is invalid
      if (msg.includes('API_KEY_INVALID') || msg.includes('401')) {
        console.error('[VisionOcrService] Invalid API key, skipping all Gemini models');
        return {
          success: false,
          reason: 'INVALID_API_KEY',
          error: 'Gemini API key is invalid.',
        };
      }
      console.warn(`[VisionOcrService] ${modelName} failed: ${msg}`);
    }
  }

  return {
    success: false,
    reason: 'ALL_MODELS_FAILED',
    error: 'All Gemini Vision models were unavailable or returned empty text.',
  };
}

module.exports = {
  transcribeWithVision,
};
