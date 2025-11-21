# 🚀 Railway Database Migration Guide

## 📱 تعليمات بسيطة للمستخدم على iPhone

### الخطوة 1️⃣: Push إلى GitHub

في Replit Shell (من iPhone Safari Desktop Mode):

```bash
git add scripts/ RAILWAY_MIGRATION.md
git commit -m "Add database migration scripts"
git push origin main
```

---

### الخطوة 2️⃣: تحديث Railway Deploy Settings

افتح Railway Dashboard من iPhone:

1. اذهب إلى: **A.Z-Finance-Hub** → **Settings** → **Deploy**

2. **Build Command** (إذا لم يكن موجود):
   ```
   npm run build
   ```

3. **Install Command** (مهم جداً - إضافة tsx):
   ```
   npm install && npm install -g tsx
   ```

4. **Start Command** (مؤقت - للمرة الأولى فقط):
   ```
   npx drizzle-kit push && tsx scripts/seed-data.ts && npm run start
   ```

5. اضغط **Deploy** من Railway Dashboard

---

### الخطوة 3️⃣: مراقبة Deploy Logs

انتظر حتى ترى في Logs:

```
✅ Data imported successfully!
   - Platforms: 7
   - Investments: 2
   - Cashflows: 15
   ...
```

---

### الخطوة 4️⃣: إعادة Start Command للوضع العادي

بعد نجاح Deploy الأول، أعد Start Command إلى:
```
npm run start
```

ثم **Redeploy** مرة أخرى.

---

## ✨ الطريقة الأسهل (ONE-COMMAND)

إذا كنت تريد تبسيط أكثر، استخدم هذا الأمر الواحد فقط:

**Install Command:**
```bash
npm install && npm install -g tsx
```

**Start Command (للمرة الأولى):**
```bash
npx drizzle-kit push --force && tsx scripts/seed-data.ts && npm run start
```

بعد Deploy الأول بنجاح، أعده إلى:
```bash
npm run start
```

**ملاحظة:** إذا استمر الخطأ `Cannot find module 'tsx'`، جرب:
```bash
node --loader tsx scripts/seed-data.ts
```
أو بدلاً من ذلك، أضف `tsx` إلى dependencies في package.json

---

## ✅ التحقق من النجاح

افتح التطبيق على Railway وتحقق من:
- ✅ المؤشرات الثمانية في Dashboard
- ✅ إمكانية اختيار منصة في Investments
- ✅ جميع الاستثمارات والبيانات موجودة
- ✅ Checkpoints تعمل بشكل صحيح

---

## 📊 البيانات المُصدّرة

- 7 منصات
- 2 استثمارات
- 15 دفعات نقدية
- 9 تنبيهات
- 12 معاملة نقدية
- 5 سيناريوهات محفوظة
- 2 نقاط استرجاع
- 182 هدف Vision 2040

---

## ⚠️ ملاحظات مهمة

### 🔌 DATABASE_URL Configuration
- **مهم جداً**: استخدم **Pooled Connection String** في Railway
- في Neon Dashboard → Connection Details → اختر **Pooled connection**
- الرابط يجب أن يحتوي على `-pooler` في الاسم:
  ```
  postgresql://user:pass@ep-xxx-pooler.neon.tech/dbname
  ```
  بدلاً من:
  ```
  postgresql://user:pass@ep-xxx.neon.tech/dbname
  ```

### 📦 Environment Variables على Railway
- `DATABASE_URL` ← Pooled connection string من Neon
- `NODE_ENV=production`
- تأكد من عدم وجود `PORT` variable (Railway يضبطه تلقائياً)

### 🐛 حل مشاكل WebSocket Error 502
إذا ظهر الخطأ:
```
Error: Unexpected server response: 502
wss://crossover.proxy.rlwy.net/v2
```

**الحل:**
1. استخدم **Pooled connection string** (كما بالأعلى)
2. أضف timeout parameters للرابط:
   ```
   ?connect_timeout=30&pool_timeout=30
   ```
3. إذا استمر الخطأ، تحقق من Neon compute status (قد يكون في cold start)

### 💾 Migration Scripts
- Script seed يستخدم `onConflictDoNothing()` لتجنب Duplicate Errors
- آمن لتشغيله عدة مرات بدون مشاكل
