require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test(imagePath) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString('base64');
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

  const prompt = `Bu bir Türk süpermarket fiyat etiketi fotoğrafı.
Aşağıdaki bilgileri fotoğraftan çıkar ve SADECE JSON formatında döndür, başka hiçbir şey yazma:

{
  "product_name": "ürün adı (marka + ürün, Türkçe karakterleri koru)",
  "price": 0.00,
  "discounted_price": null,
  "unit": "adet",
  "market": "market adı"
}

Kurallar:
- price: etiketteki ana/normal fiyat (sayı, TL işareti olmadan)
- discounted_price: indirimli/kampanya fiyatı varsa o, yoksa null
- unit: "kg", "litre", "gr", "adet" değerlerinden biri
- market: "Migros", "A101", "Aldın Aldın", "BİM", "Şok", "CarrefourSA", "Generic" değerlerinden biri
- Eğer bir bilgiyi okuyamazsan null yaz
- Sadece JSON döndür, markdown code block kullanma`;

  console.log('📤 Resim gönderiliyor:', imagePath);
  const result = await model.generateContent([prompt, { inlineData: { data: base64Image, mimeType } }]);
  const text = result.response.text();
  console.log('\n📥 Ham Gemini cevabı:\n', text);
}

const imagePath = process.argv[2];
if (!imagePath) {
  console.error('Kullanım: node test/testGemini.js /path/to/image.jpg');
  process.exit(1);
}

test(imagePath).catch(console.error);
