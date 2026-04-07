/**
 * Migros-specific parser.
 * Migros labels typically show:
 *   - Brand + product name on top lines
 *   - Campaign price (indirimli fiyat) in large font
 *   - Original price (normal fiyat) crossed out below
 *   - Unit (Adet / kg / lt) on the label
 */

const generic = require('./generic');

// Migros often formats prices as "9,95 TL" or "₺9.95"
const MIGROS_PRICE_LINE = /(?:indirimli|kampanya|yeni)?\s*[₺]?\s*(\d{1,4}[.,]\d{2})\s*(?:TL|₺)?/gi;
const MIGROS_ORIGINAL_LINE = /(?:normal fiyat|eski fiyat|önceki|was)[:\s]+[₺]?\s*(\d{1,4}[.,]\d{2})\s*(?:TL|₺)?/gi;

function parse(text) {
  // Try Migros-specific discount line first
  let discounted_price = null;
  let price = null;

  const discountMatch = MIGROS_ORIGINAL_LINE.exec(text);
  if (discountMatch) {
    price = generic.normalizePrice(discountMatch[1]);
  }

  // Extract all prices
  const prices = generic.extractPrices(text);

  if (price !== null) {
    // We found the original price from a label; the campaign price is the lower one
    const lower = prices.find(p => p < price);
    discounted_price = lower !== undefined ? lower : null;
  } else if (prices.length >= 2) {
    price = prices[prices.length - 1];
    discounted_price = prices[0];
  } else if (prices.length === 1) {
    price = prices[0];
  }

  const unit = generic.extractUnit(text);
  const product_name = extractMigrosProductName(text);

  const result = { product_name, price, discounted_price, unit };
  if (price === null) result.error = 'no_price_found';
  return result;
}

/**
 * Migros product name extraction.
 * Migros labels often start with brand on line 1, product description on line 2.
 * Skip the "MIGROS" / "M" logo line.
 */
function extractMigrosProductName(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const skipLine = /^(migros|mİgros|mmigros|mlgros|m market|\bm\b)$/i;
  const priceOrUnit = /^[\d₺TLkg\s.,\/]+$/i;

  const candidates = lines.filter(l => !skipLine.test(l) && !priceOrUnit.test(l));

  if (candidates.length === 0) return generic.extractProductName(text);

  // Join first 1-2 meaningful lines as the product name
  const name = candidates.slice(0, 2).join(' ').replace(/\s{2,}/g, ' ').trim();
  // Strip trailing price if any crept in
  return name.replace(/\s*[₺]?\d{1,4}[.,]\d{2}\s*(TL|₺)?/gi, '').trim() || null;
}

module.exports = { parse };
