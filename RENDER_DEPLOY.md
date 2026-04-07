# Render.com Deployment Guide

## ✅ Render.com TAMAMEN ÜCRETSİZ

- **Free Tier:** 750 saat/ay (25 gün)
- **TestFlight testlemesi:** ~1 hafta = yeterli!
- **Kredi kartı:** İstemez

---

## 📋 ADIM ADIM KURULUM

### **Step 1: GitHub Repo Oluştur**

Backend klasörünü GitHub'a push et:

```bash
cd /Users/hakanozdemir/marketList/backend

# GitHub'da yeni repo oluştur: etiket-scan-backend
# Sonra:

git remote add origin https://github.com/YOUR_USERNAME/etiket-scan-backend.git
git branch -M main
git push -u origin main
```

**NOT:** GitHub hesabın yoksa [github.com](https://github.com) → Sign Up

---

### **Step 2: Render.com'a Git**

1. [render.com](https://render.com) aç
2. **"Sign up with GitHub"** tıkla
3. GitHub'ı authorize et
4. Giriş yap

---

### **Step 3: Yeni Service Oluştur**

1. Dashboard'da **"New +"** → **"Web Service"**
2. **"Connect a repository"** tıkla
3. **etiket-scan-backend** repo'yu seç
4. **"Connect"** tıkla

---

### **Step 4: Deploy Ayarları**

Açılan forma şunu doldur:

| Alan | Değer |
|------|-------|
| **Name** | `etiket-scan-backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Plan** | `Free` |

---

### **Step 5: Environment Variables Ekle**

1. **"Environment"** sekmesine git
2. **"Add Environment Variable"** tıkla
3. Şunu ekle:

```
Key: GEMINI_API_KEY
Value: AIzaSyDjj7JvP5TC0EXSwFEOetiIZp7wIrIEVs4
```

4. **"Add Environment Variable"** tıkla
5. Şunu ekle:

```
Key: PORT
Value: 3000
```

---

### **Step 6: Deploy Et**

1. **"Create Web Service"** tıkla
2. **Deploy başlar** (2-3 dakika)
3. Bitti diye görmek için bekle → **"Live"** yazacak

---

### **Step 7: Public URL'sini Al**

1. Deploy bitince, sayfanın üstünde bir URL göreceksin
2. Örn: `https://etiket-scan-backend-xxxx.onrender.com`
3. **Bu URL'yi kopyala**

---

### **Step 8: api.js'de Güncelle**

`mobile/src/utils/api.js` aç ve şunu yap:

```javascript
// Render public URL
const API_BASE = 'https://etiket-scan-backend-xxxx.onrender.com';
```

**xxxx.onrender.com** yerine Step 7'den aldığın URL yaz.

---

## 🧪 Test Et

Terminal'de:
```bash
curl https://etiket-scan-backend-xxxx.onrender.com/health
```

Sonuç:
```json
{"status":"ok"}
```

Çıkarsa başarılı!

---

## ⚠️ Önemli Notlar

- **İlk 15 dakika inaktif:** Render uyku modu (ama hızlı wakeup)
- **750 saat/ay:** ~25 gün, TestFlight testi için yeterli
- **Upgrade:** Eğer production'a geçerisen paid'e yükseltebilirsin

---

## 💡 Takıldın mı?

1. **Deploy başlamadıysa:** render.yaml dosyasını kontrol et
2. **Bağlantı hatası:** URL'nin doğru olduğunu kontrol et (trailing slash yok)
3. **GEMINI_API_KEY hatası:** Environment variable'ı doğru eklediğini kontrol et
