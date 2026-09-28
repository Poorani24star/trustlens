const sharp = require('sharp');

/**
 * Transcribes handwritten or printed document images using Google Gemini Multimodal Vision API
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

  // Pre-process and resize large camera photos for optimal OCR accuracy and fast network transport
  let bufferToSend = imageBuffer;
  try {
    bufferToSend = await sharp(imageBuffer)
      .rotate() // Auto-orient based on camera EXIF tags
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();
  } catch (sharpErr) {
    console.warn('[VisionOcrService] Sharp resize warning, using raw buffer:', sharpErr.message);
    bufferToSend = imageBuffer;
  }

  const base64Data = bufferToSend.toString('base64');
  const safeMime = 'image/jpeg';

  const prompt = `Transcribe ONLY the handwritten and printed text visible on this document page.
Rules:
1. Preserve all question numbers, section titles (e.g. 1a, 1b, CA1 Test), headings, and lists faithfully.
2. Maintain natural paragraph breaks and sentence structure.
3. Do NOT provide commentary, corrections, explanations, or conversational introductions (e.g. do NOT say "Here is the transcription").
4. Output strictly the transcribed content.`;

  // Tested multimodal vision models in priority order
  const modelsToTry = [
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-3-flash-preview',
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
  ];

  for (const modelName of modelsToTry) {
    try {
      console.log(`[VisionOcrService] Transcribing document with ${modelName}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout per model

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: safeMime,
                    data: base64Data,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (response.ok) {
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText && rawText.trim().length > 0) {
          // Clean conversational preamble or code blocks
          const cleanText = rawText
            .replace(/^```[a-z]*\r?\n/i, '')
            .replace(/\r?\n```$/g, '')
            .replace(/^(?:Here is the transcription[^\n]*|Below is the transcription[^\n]*|Transcribed text:)\s*\n+/i, '')
            .replace(/^---+[\r\n]+/gm, '')
            .trim();

          console.log(`[VisionOcrService] Successfully transcribed via ${modelName} (${cleanText.length} characters)`);
          return {
            success: true,
            text: cleanText,
            extractionMethod: `gemini-vision (${modelName})`,
            confidence: 98,
          };
        }
      } else {
        const status = response.status;
        const msg = data.error?.message || response.statusText;
        console.warn(`[VisionOcrService] ${modelName} returned HTTP ${status}: ${msg}`);
        // Immediately try next model in fallback list
      }
    } catch (err) {
      console.warn(`[VisionOcrService] ${modelName} failed: ${err.message}`);
      // Immediately try next model in fallback list
    }
  }

  return {
    success: false,
    reason: 'ALL_MODELS_FAILED',
    error: 'All Gemini Vision models were temporarily unavailable or returned empty text.',
  };
}

module.exports = {
  transcribeWithVision,
};
