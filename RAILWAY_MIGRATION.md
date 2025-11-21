# 🚀 Railway Database Migration Guide

## الخطوات المطلوبة لنقل البيانات من Replit إلى Railway

### الخطوة 1️⃣: Push Scripts إلى GitHub

في Replit Terminal:

```bash
git add scripts/ RAILWAY_MIGRATION.md
git commit -m "Add database migration scripts"
git push origin main
```

---

### الخطوة 2️⃣: إنشاء جداول قاعدة البيانات على Railway

في Railway Dashboard:

1. افتح **A.Z-Finance-Hub** → **Settings** → **Deploy**
2. أضف **Build Command**:
   ```
   npm run build
   ```
3. أضف **Start Command**:
   ```
   npm run db:push && npm run start
   ```

أو باستخدام Railway CLI (إذا كان متاحاً):

```bash
railway link
railway run npx drizzle-kit push
```

---

### الخطوة 3️⃣: Import البيانات إلى Railway

بعد نجاح db:push، شغّل seed script:

**باستخدام Railway CLI:**
```bash
railway run tsx scripts/seed-data.ts
```

**أو من Railway Dashboard:**
1. اذهب إلى **Settings** → **Deploy**
2. أضف **Post-deploy Command**:
   ```
   tsx scripts/seed-data.ts
   ```
3. Deploy مرة واحدة فقط، ثم احذف Post-deploy Command

---

### الخطوة 4️⃣: إعادة Start Command إلى الوضع العادي

بعد نجاح Import، أعد Start Command إلى:
```
npm run start
```

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

## ⚠️ ملاحظات

- تأكد من وجود `DATABASE_URL` في Railway Variables
- تأكد من وجود `NODE_ENV=production`
- Script seed يستخدم `onConflictDoNothing()` لتجنب Duplicate Errors
