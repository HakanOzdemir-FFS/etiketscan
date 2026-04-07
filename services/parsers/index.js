const migros = require('./migros');
const a101 = require('./a101');
const aldinAldin = require('./aldinAldin');
const generic = require('./generic');

/**
 * Score-based market detection.
 * Returns { market: 'migros'|'a101'|'generic', score }
 */
function detectMarket(text) {
  const upper = text.toUpperCase();

  const scores = {
    migros: 0,
    a101: 0,
    aldinAldin: 0,
  };

  // Migros keywords — also handle OCR misread: MlGROS (l→I), M1GROS (1→I)
  const migrosKeywords = ['MIGROS', 'MİGROS', 'M MARKET', 'MMIGROS'];
  migrosKeywords.forEach(kw => {
    if (upper.includes(kw)) scores.migros += 3;
  });
  if (/M[Ll1İI]GROS/.test(upper) || /M[Ll1İI]GROS/i.test(text)) scores.migros += 3;

  // A101 keywords
  const a101Keywords = ['A101', 'A 101', 'A-101'];
  a101Keywords.forEach(kw => {
    if (upper.includes(kw)) scores.a101 += 3;
  });

  // Aldın Aldın keywords (A101 sub-brand / campaign label)
  const aldinKeywords = ['ALDIN ALDIN', 'ALDIN!', 'ALDIN ALDIN!', 'ALDIN\nALDIN', 'ALDINALDIN',
                         'ALDIN ALDIN', 'ALDlN ALDlN'];
  aldinKeywords.forEach(kw => {
    if (upper.includes(kw)) scores.aldinAldin += 4;
  });
  // OCR might misread İ as I
  if (/ALDIN[\s!]?ALDIN/i.test(upper)) scores.aldinAldin += 4;

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (best[1] === 0) return 'generic';
  return best[0];
}

/**
 * Main parse entry point.
 * Detects market then delegates to the appropriate parser.
 * Falls back to generic if the specialized parser returns no product name.
 */
function parse(text) {
  const market = detectMarket(text);

  let result;
  if (market === 'migros') {
    result = migros.parse(text);
  } else if (market === 'a101') {
    result = a101.parse(text);
  } else if (market === 'aldinAldin') {
    result = aldinAldin.parse(text);
  } else {
    result = generic.parse(text);
  }

  // Fall back to generic if specialized parser couldn't find a product name
  if (!result.product_name && market !== 'generic') {
    result = generic.parse(text);
  }

  return { market, ...result };
}

module.exports = { parse, detectMarket };
