/**
 * A101-specific parser.
 * A101 labels typically show:
 *   - "A101" logo at top
 *   - Product name
 *   - "Fiyat: XX.XX TL" or just the price
 *   - "Eski Fiyat: XX.XX TL" for discounts
 *   - Unit (adet/kg)
 */

const generic = require('./generic');

const A101_PRICE_LINE = /(?:fiyat|kampanya fiyatı)[:\s]+[₺]?\s*(\d{1,4}[.,]\d{2})\s*(?:TL|₺)?/gi;
const A101_OLD_PRICE_LINE = /(?:eski fiyat|normal fiyat)[:\s]+[₺]?\s*(\d{1,4}[.,]\d{2})\s*(?:TL|₺)?/gi;

function parse(text) {
  let discounted_price = null;
  let price = null;

  // Try to find labeled prices first
  const newPriceMatch = A101_PRICE_LINE.exec(text);
  const oldPriceMatch = A101_OLD_PRICE_LINE.exec(text);

  if (newPriceMatch) {
    discounted_price = generic.normalizePrice(newPriceMatch[1]);
  }
  if (oldPriceMatch) {
    price = generic.normalizePrice(oldPriceMatch[1]);
  }

  // If only one label found, fill the other from raw prices
  if (price === null && discounted_price === null) {
    const prices = generic.extractPrices(text);
    if (prices.length >= 2) {
      price = prices[prices.length - 1];
      discounted_price = prices[0];
    } else if (prices.length === 1) {
      price = prices[0];
    }
  } else if (price === null && discounted_price !== null) {
    // Only campaign price found — treat as the price, no discount
    price = discounted_price;
    discounted_price = null;
  }

  const unit = generic.extractUnit(text);
  const product_name = extractA101ProductName(text);

  const result = { product_name, price, discounted_price, unit };
  if (price === null) result.error = 'no_price_found';
  return result;
}

/**
 * A101 product name extraction.
 * Skip A101 logo line and price/unit lines.
 */
function extractA101ProductName(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const skipLine = /^(a101|a 101|a-101)$/i;
  const skipContent = /^(fiyat|eski fiyat|normal fiyat|kampanya)/i;
  const priceOrUnit = /^[\d₺TLkg\s.,\/]+$/i;

  const candidates = lines.filter(
    l => !skipLine.test(l) && !skipContent.test(l) && !priceOrUnit.test(l)
  );

  if (candidates.length === 0) return generic.extractProductName(text);

  const name = candidates.slice(0, 2).join(' ').replace(/\s{2,}/g, ' ').trim();
  return name.replace(/\s*[₺]?\d{1,4}[.,]\d{2}\s*(TL|₺)?/gi, '').trim() || null;
}

module.exports = { parse };
