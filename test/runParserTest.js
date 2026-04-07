const parser = require('../services/parsers/index');

const labels = [
  // ── Original tests ──────────────────────────────────────────────
  {
    name: 'Migros with discount',
    text: `MlGROS\nSütaş Tam Yağlı Süt 1L\nİndirimli: 7,50 TL\nNormal Fiyat: 9,95 TL\nAdet`,
    expected: { market: 'migros', price: 9.95, discounted_price: 7.5, unit: 'adet' },
  },
  {
    name: 'A101 with discount',
    text: `a101\nEti Puf Çikolata 40g\nFiyat: 12.50TL\nEski Fiyat: 15.00TL\nadet`,
    expected: { market: 'a101', price: 15.0, discounted_price: 12.5, unit: 'adet' },
  },
  {
    name: 'Generic kg',
    text: `Organik Domates\n4,99 TL/kg\nSebze & Meyve\nkg`,
    expected: { market: 'generic', price: 4.99, discounted_price: null, unit: 'kg' },
  },
  {
    name: 'No price (edge case)',
    text: `BİM\nFırın Ekmeği\nadet`,
    expected: { market: 'generic', price: null, error: 'no_price_found' },
  },
  {
    name: 'Multiple prices no label',
    text: `Lipton Ice Tea Şeftali 1.5L\n3,75 TL\n5,25 TL\nlt`,
    expected: { market: 'generic', price: 5.25, discounted_price: 3.75, unit: 'litre' },
  },

  // ── Real label tests (from provided images) ────────────────────
  {
    name: 'Aldın Aldın — Fisher Price Oyuncak (179,00 TL decimal)',
    // Simulated OCR output from image 1
    text: `FISHER PRICE\nOYUNCAK İLK\nARABAM\nALDIN ALDIN!\n179,00 TL\nFiyat Geçerlilik Tarihi\n21 Eylül 2025\n1 ADT = 179,00 TL KDV Dahildir\nürt. yeri: Türkiye`,
    expected: { market: 'aldinAldin', price: 179, unit: 'adet' },
  },
  {
    name: 'Aldın Aldın — Perwoll Deterjan (110 TL integer price)',
    // Simulated OCR output from image 2 — "110" with no decimal
    text: `PERWOLL\nÇAMAŞIR\nDETERJANI SIVI\nRENKLİ\n4 L\nALDIN ALDIN!\n110 TL\nFiyat Geçerlilik Tarihi\n01 Temmuz 2023\n1 LT = 27,50 TL KDV Dahildir`,
    expected: { market: 'aldinAldin', price: 110, unit: 'litre' },
  },
  {
    name: 'Yazgan İrmik — discount (strikethrough OCR as two prices)',
    // OCR reads crossed-out price as a separate number line
    text: `YAZGAN\nİRMİK\n500 G\nF.D. Tarihi: 12.06.2024\n11,00\n10,75`,
    expected: { market: 'generic', price: 11, discounted_price: 10.75 },
  },
  {
    name: 'Relax Çelik Termos — yellow label (349,00 TL/adet)',
    text: `RELAX aktüel\nÇELİK\nTERMOS\n2 L\nF.D.Tarihi: 27.02.2024\n349,00 TL\n349,00 TL / adet\nKDV Dahil`,
    expected: { market: 'generic', price: 349, unit: 'adet' },
  },
  {
    name: 'Polosmart Klavye — yellow label with discount (299→149,50)',
    text: `POLOSMART\nOYUNCU\nKLAVYESİ\naktüel Ü.Yeri: Çin\nF.D. Tarihi: 27.09.2024\n299,00\n149,50\nKDV Dahil`,
    expected: { market: 'generic', price: 299, discounted_price: 149.5 },
  },
];

let passed = 0;
let failed = 0;

labels.forEach(({ name, text, expected }) => {
  const result = parser.parse(text);
  const checks = Object.entries(expected);
  const errors = [];

  checks.forEach(([key, val]) => {
    if (result[key] !== val) {
      errors.push(`  ${key}: expected ${JSON.stringify(val)}, got ${JSON.stringify(result[key])}`);
    }
  });

  if (errors.length === 0) {
    console.log(`✅  ${name}`);
    passed++;
  } else {
    console.log(`❌  ${name}`);
    errors.forEach(e => console.log(e));
    console.log('  Full result:', JSON.stringify(result, null, 2));
    failed++;
  }
});

console.log(`\n${passed}/${passed + failed} tests passed`);
process.exit(failed > 0 ? 1 : 0);
