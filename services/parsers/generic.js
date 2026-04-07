/**
 * Generic parser — handles any Turkish supermarket price label.
 * Works with Migros, A101, BİM, CarrefourSA, Şok, etc.
 */

// Matches: 179,00 TL | 179.00 TL | ₺179,00 | 179 00 (OCR split) | 110 TL (integer) | 149,50₺
// Capture group 1 = integer part, group 2 = decimal part (optional)
const PRICE_REGEX = /(?:₺\s*)?(\d{1,4})(?:[.,](\d{2}))?\s*(?:TL|₺)(?!\d)/gi;
// Also match "179,00" without TL/₺ suffix when surrounded by whitespace/newline
const PRICE_REGEX_NO_SUFFIX = /(?:^|[\s\n])(\d{1,4})[.,](\d{2})(?=[\s\n]|$)/gm;
const UNIT_REGEX = /\b(kg|gr|g|litre|lt|l|adet|ad|pcs|piece)\b/gi;
const DISCOUNT_LABELS = ['indirimli', 'eski fiyat', 'normal fiyat', 'kampanya', 'yeni fiyat', 'aldın aldın', 'aldin aldin'];

/**
 * Parse a price string that may use comma or dot as decimal separator.
 */
function normalizePrice(str) {
  if (!str) return null;
  const cleaned = str.replace(',', '.').trim();
  const val = parseFloat(cleaned);
  return isNaN(val) || val <= 0 || val >= 10000 ? null : val;
}

/**
 * Build a numeric price value from integer + optional decimal capture groups.
 */
function buildPrice(intPart, decPart) {
  const str = decPart ? `${intPart}.${decPart}` : intPart;
  const val = parseFloat(str);
  return isNaN(val) || val <= 0 || val >= 10000 ? null : val;
}

/**
 * Extract all valid prices from text, deduplicated and sorted ascending.
 * Handles:
 *   - 179,00 TL  / 179.00 TL  / ₺179,00  / 110 TL  (with TL/₺ suffix)
 *   - 179,00 / 10,75          (no suffix, but decimal format — surrounded by whitespace)
 *   - 179 00                  (OCR split the decimal: "179" newline "00")
 */
function extractPrices(text) {
  const found = new Set();

  // Pass 1: prices with TL/₺ suffix (most reliable)
  const r1 = new RegExp(PRICE_REGEX.source, 'gi');
  let m;
  while ((m = r1.exec(text)) !== null) {
    const val = buildPrice(m[1], m[2]);
    if (val !== null) found.add(val);
  }

  // Pass 2: prices without suffix — only decimal format (need comma/dot to avoid false positives)
  const r2 = new RegExp(PRICE_REGEX_NO_SUFFIX.source, 'gm');
  while ((m = r2.exec(text)) !== null) {
    const val = buildPrice(m[1], m[2]);
    if (val !== null) found.add(val);
  }

  // Pass 3: OCR sometimes splits "179,00" across two lines as "179" then "00"
  // Pattern: a line with only digits, followed by a line with exactly 2 digits
  const lines = text.split('\n').map(l => l.trim());
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^\d{1,4}$/.test(lines[i]) && /^\d{2}$/.test(lines[i + 1])) {
      const val = buildPrice(lines[i], lines[i + 1]);
      if (val !== null) found.add(val);
    }
  }

  return [...found].sort((a, b) => a - b);
}

/**
 * Detect unit from text.
 * Returns normalized unit string or 'adet' as default.
 *
 * Strategy: look for unit keywords on their own line, or in price-per-unit patterns
 * like "4,99 TL/kg". Avoid matching substrings inside Turkish words (e.g. "yağlı").
 */
function extractUnit(text) {
  // Priority 1: unit-per pattern like "TL/kg" or "₺/lt"
  const perMatch = text.match(/(?:TL|₺)\s*\/\s*(kg|gr|g|litre|lt|l|adet)/i);
  if (perMatch) {
    const u = perMatch[1].toLowerCase();
    if (u === 'lt' || u === 'l') return 'litre';
    if (u === 'gr' || u === 'g') return 'gr';
    return u;
  }

  // Priority 2: a line that consists ONLY of a unit keyword (case-insensitive)
  const lines = text.split('\n').map(l => l.trim());
  for (const line of lines) {
    const lc = line.toLowerCase();
    if (/^(kg|gr|litre|lt|adet|ad)$/.test(lc)) {
      if (lc === 'lt') return 'litre';
      if (lc === 'gr') return 'gr';
      if (lc === 'ad') return 'adet';
      return lc;
    }
  }

  // Priority 3: unit surrounded by ASCII word boundaries (spaces / start-of-line / punctuation)
  // Use space-boundary pattern instead of \b to avoid matching inside Turkish words
  const spaceMatch = text.match(/(?:^|[\s,.(])(?:(kg|gr|litre|lt|adet))(?:[\s,.)\/]|$)/im);
  if (spaceMatch) {
    const u = spaceMatch[1].toLowerCase();
    if (u === 'lt') return 'litre';
    if (u === 'gr') return 'gr';
    return u;
  }

  return 'adet';
}

/**
 * Extract product name.
 * Heuristic: first non-empty line that is not a price, unit, or store name.
 */
function extractProductName(text) {
  const skipPatterns = [
    /^\d+[.,]\d{2}\s*(TL|₺)?$/i,        // pure decimal price line: "179,00 TL"
    /^\d+\s*(TL|₺)$/i,                   // pure integer price: "110 TL"
    /^[₺TL\d\s.,]+$/i,                   // only numbers/TL
    /^(migros|a101|bim|sok|şok|carrefour|market|aldin|aldın)/i, // store names
    /^(kg|gr|litre|lt|adet|ad)\b/i,      // unit-only lines
    /^fiyat.*(tarihi|ge)/i,              // "Fiyat Geçerlilik Tarihi"
    /^kdv\s*dahil/i,                     // "KDV Dahil"
    /^\d{2}[.\s]\d{2}[.\s]\d{4}/,       // date lines
    /^[a-z]\d{6,}/i,                     // barcode-style lines
    /^\s*$/,                              // blank
  ];

  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 3) continue;
    if (skipPatterns.some(p => p.test(trimmed))) continue;
    // Strip trailing price from line (e.g. "Domates 4,99 TL/kg" → "Domates")
    const cleaned = trimmed
      .replace(/\s*[₺]?\d{1,4}[.,]\d{2}\s*(TL|₺|\/kg|\/adet)?/gi, '')
      .replace(/\s*\d{1,4}\s*TL/gi, '')
      .trim();
    if (cleaned.length >= 2) return cleaned;
  }
  return null;
}

/**
 * Attempt to identify which price is the discount and which is the original
 * by looking at context labels near the prices.
 */
function assignPricesByContext(text, prices) {
  if (prices.length === 0) return { price: null, discounted_price: null };
  if (prices.length === 1) return { price: prices[0], discounted_price: null };

  const lower = text.toLowerCase();

  // Look for explicit discount labels in the text
  const hasDiscountLabel = DISCOUNT_LABELS.some(l => lower.includes(l));

  if (hasDiscountLabel) {
    // Lower price is the discounted (campaign) price
    return {
      price: prices[prices.length - 1],       // highest = original
      discounted_price: prices[0],             // lowest = discounted
    };
  }

  // No explicit label — still: lower is likely campaign price
  return {
    price: prices[prices.length - 1],
    discounted_price: prices.length >= 2 ? prices[0] : null,
  };
}

function parse(text) {
  const prices = extractPrices(text);
  const { price, discounted_price } = assignPricesByContext(text, prices);
  const unit = extractUnit(text);
  const product_name = extractProductName(text);

  const result = {
    product_name,
    price,
    discounted_price,
    unit,
  };

  if (price === null) {
    result.error = 'no_price_found';
  }

  return result;
}

module.exports = { parse, extractPrices, normalizePrice, extractUnit, extractProductName };
