/**
 * Aldın Aldın! parser.
 * This is A101's campaign label format.
 * Label structure:
 *   - Brand name (top-left, small)
 *   - Product name (large, multi-line)
 *   - "ALDIN ALDIN!" banner (red/black stripe)
 *   - Large price: "179,00 TL" or "179 00 TL"
 *   - "Ürt. yeri: Türkiye"
 *   - "1 ADT = 179,00 TL KDV Dahildir"
 *   - Barcode
 *   - Date: "Fiyat Geçerlilik Tarihi: DD.MM.YYYY"
 */

const generic = require('./generic');

// "1 ADT = 179,00 TL KDV Dahildir" or "1 LT = 27,50 TL KDV Dahildir"
const UNIT_PRICE_LINE = /(\d+)\s*(ADT|KG|LT|adet|kg|lt)\s*=\s*[₺]?\s*(\d{1,4}[.,]\d{2})\s*TL/i;

function parse(text) {
  // Try to get the definitive unit-price line first (most reliable on Aldın Aldın labels)
  const unitPriceLine = UNIT_PRICE_LINE.exec(text);
  let price = null;
  let unit = 'adet';

  // Extract unit from unit-price line (e.g. "1 LT = 27,50 TL" → unit = litre)
  // But DON'T use the per-unit price as the main price — use the larger price on the label
  if (unitPriceLine) {
    const rawUnit = unitPriceLine[2].toLowerCase();
    if (rawUnit === 'lt') unit = 'litre';
    else if (rawUnit === 'kg') unit = 'kg';
    else unit = 'adet';
  }

  // Extract all prices from the label; the MAIN price is always the largest one shown
  // (the small "1 LT = X,XX TL" line is a per-unit breakdown, not the shelf price)
  const prices = generic.extractPrices(text);
  if (prices.length > 0) {
    price = prices[prices.length - 1]; // largest = shelf price
  }

  // Aldın Aldın labels rarely have a separate discount price.
  // If there are 2+ different prices, lower may be per-unit price not a discount.
  // Only assign discounted_price if there's an explicit discount label.
  const lower = text.toLowerCase();
  const hasDiscountLabel = ['indirimli', 'kampanya', 'eski fiyat', 'normal fiyat'].some(l => lower.includes(l));
  let discounted_price = null;
  if (hasDiscountLabel && prices.length >= 2) {
    discounted_price = prices[0]; // lowest = campaign price
    price = prices[prices.length - 1]; // highest = original
  }

  // Unit override if detected in text
  if (unit === 'adet') {
    unit = generic.extractUnit(text);
  }

  const product_name = extractAldinProductName(text);

  const result = { product_name, price, discounted_price, unit };
  if (price === null) result.error = 'no_price_found';
  return result;
}

/**
 * Aldın Aldın product name:
 * - Skip banner lines: "ALDIN ALDIN!", brand-only lines
 * - Product name is usually 1-3 lines before the price
 * - May include brand on first line, product on second
 */
function extractAldinProductName(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const skipLine = /^(aldin|aldın|aldin!|aldın!|a101|a 101|fisher.price|fiyat|kdv|ürt|urt\.|barcode|\d{5,})/i;
  const skipContent = /^[\d₺TL\s.,\/]+$/i;
  const isBannerLine = /ALDIN/i;

  const candidates = [];
  for (const line of lines) {
    if (isBannerLine.test(line)) continue;
    if (skipLine.test(line)) continue;
    if (skipContent.test(line)) continue;
    if (line.length < 2) continue;
    // Skip lines that look like dates
    if (/^\d{2}[.\s]\d{2}[.\s]\d{4}/.test(line)) continue;
    candidates.push(line);
  }

  if (candidates.length === 0) return generic.extractProductName(text);

  // First 2 candidates = brand + product name
  return candidates.slice(0, 2).join(' ').replace(/\s{2,}/g, ' ').trim() || null;
}

module.exports = { parse };
