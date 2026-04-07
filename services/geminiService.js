const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODEL = 'gemini-2.5-flash-lite';

const PROMPT = `Bu bir Türk süpermarket fiyat etiketi fotoğrafı.
Fotoğrafta birden fazla etiket olsa bile SADECE EN ÖNDEKİ / EN BÜYÜK / EN NET etiketi işle.

Aşağıdaki bilgileri o etiketten çıkar ve SADECE tek bir JSON object döndür, array değil, başka hiçbir şey yazma:

{
  "product_name": "ürün adı (marka + ürün, Türkçe karakterleri koru)",
  "price": 0.00,
  "discounted_price": null,
  "unit": "adet",
  "market": "market adı"
}

Kurallar:
- price: etiketteki ana/normal fiyat (sayı, TL işareti olmadan)
- discounted_price: indirimli/kampanya/üzeri çizili fiyat varsa o, yoksa null
- unit: "kg", "litre", "gr", "adet" değerlerinden biri
- market: "Migros", "A101", "Aldın Aldın", "BİM", "Şok", "CarrefourSA", "Generic" değerlerinden biri
- Eğer bir bilgiyi okuyamazsan null yaz
- MUTLAKA tek bir JSON object döndür — array döndürme
- Markdown code block kullanma, sadece ham JSON yaz`;

/**
 * Send image to Gemini and get structured product data back.
 * @param {string} imagePath - absolute path to the uploaded image file
 * @returns {object} { product_name, price, discounted_price, unit, market }
 */
async function scanLabel(imagePath) {
  const model = genAI.getGenerativeModel({ model: MODEL });

  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString('base64');
  const mimeType = getMimeType(imagePath);

  const result = await model.generateContent([
    PROMPT,
    {
      inlineData: {
        data: base64Image,
        mimeType,
      },
    },
  ]);

  const text = result.response.text().trim();
  return parseGeminiResponse(text);
}

/**
 * Parse Gemini's JSON response, handling any markdown wrapping it might add.
 */
function parseGeminiResponse(text) {
  // Strip markdown code blocks if present (gemini sometimes adds them despite instruction)
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract first JSON object from response if there's surrounding text
    const match = cleaned.match(/\{[\s\S]*?\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error('Gemini yanıtı JSON formatında değil: ' + text.substring(0, 200));
    }
  }

  // Gemini bazen array döndürür — ilk elemanı al
  if (Array.isArray(parsed)) {
    parsed = parsed[0];
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Geçersiz Gemini yanıtı');
  }

  return {
    product_name: parsed.product_name || null,
    price: toNumber(parsed.price),
    discounted_price: toNumber(parsed.discounted_price),
    unit: normalizeUnit(parsed.unit),
    market: parsed.market || 'Generic',
    error: parsed.price == null ? 'no_price_found' : undefined,
  };
}

function toNumber(val) {
  if (val === null || val === undefined) return null;
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) || n <= 0 ? null : n;
}

function normalizeUnit(val) {
  if (!val) return 'adet';
  const v = String(val).toLowerCase().trim();
  if (v === 'lt' || v === 'litre' || v === 'liter' || v === 'l') return 'litre';
  if (v === 'gr' || v === 'gram' || v === 'g') return 'gr';
  if (v === 'kg' || v === 'kilogram') return 'kg';
  return 'adet';
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  return map[ext] || 'image/jpeg';
}

module.exports = { scanLabel };
