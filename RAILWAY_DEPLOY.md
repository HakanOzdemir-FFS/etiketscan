# Railway Deployment Guide

## Step 1: Railway Hesabı Oluştur
1. Git → [railway.app](https://railway.app)
2. "Login with GitHub" veya "Sign Up with Email"
3. Giriş yap

## Step 2: Railway CLI ile Login
```bash
cd /Users/hakanozdemir/marketList/backend
export PATH="/opt/homebrew/bin:$PATH"
railway login
# → Tarayıcıda açılacak, authorize et
```

## Step 3: Yeni Proje Oluştur
```bash
railway init
# → "Create a new project" seç
# → Project adı: "etiket-scan-backend"
```

## Step 4: Ortam Değişkenlerini Ekle
```bash
railway variables set GEMINI_API_KEY=AIzaSyDjj7JvP5TC0EXSwFEOetiIZp7wIrIEVs4
railway variables set PORT=3000
```

## Step 5: Deploy Et
```bash
railway up
# → Kurulum başlar (2-3 dakika)
# → "Deployment successful" görünce bitti
```

## Step 6: Public URL'sini Al
```bash
railway open
# → Railway Dashboard açılır
# → "Deployments" → son deployment'ı tıkla
# → "URL" kopyala → https://xxx.railway.app
```

## Step 7: api.js'de Güncelle
`mobile/src/utils/api.js` içinde:
```javascript
const API_BASE = 'https://xxx.railway.app';
```

**xxx.railway.app** yerine Railway'den aldığın URL yaz.

---

## Alternatif: Web UI ile Deploy
1. railway.app Dashboard
2. "Create New" → "GitHub Repo"
3. Bu repo'yu seç → Authorize
4. Backend klasörü seç
5. "Deploy" tıkla
6. Environment variables ekle
7. Bitti!

---

## Test Et
```bash
curl https://xxx.railway.app/health
# {"status":"ok"} dönmeli
```
