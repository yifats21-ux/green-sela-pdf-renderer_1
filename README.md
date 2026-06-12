# וינה לשלומי 🎂 — אפליקציית מתנת יום הולדת (iOS + Android)

מדריך טיול אישי וחי ל-4 ימים בווינה, ארוז כאפליקציה נייטיבית עם **Capacitor**.
ה-UI וה"מוח" של האפליקציה הם ה-prototype מתוך חבילת העיצוב (ראו `docs/design-handoff.md`),
עטופים במעטפת נייטיב מלאה לשתי הפלטפורמות.

## מבנה הפרויקט

```
www/                  ← אפליקציית ה-Web (הקוד של האפליקציה עצמה)
│   index.html
│   app/              ← data.js · app.js · app-plan.js · app.css · image-slot.js
│   app/native.js     ← שכבת הגישור לנייטיב (אחסון, GPS, סטטוס-בר, כפתור Back)
│   app/native.css    ← מסך מלא + safe areas על מכשיר אמיתי
│   app/voice/        ← כאן שמים את הקלטות "הקול של יפעת" (.m4a)
│   vendor/leaflet/   ← Leaflet ארוז מקומית (עובד גם בלי רשת)
android/              ← פרויקט Android Studio (מוכן לבנייה)
ios/                  ← פרויקט Xcode (מוכן לבנייה, דורש Mac)
capacitor.config.json
docs/design-handoff.md ← מסמך העיצוב המקורי המלא
```

## מה שכבת הנייטיב (`www/app/native.js`) עושה

| יכולת | איך |
|---|---|
| מסך מלא | מסגרת הטלפון המדומה של הפרוטוטייפ הופכת למסך מלא עם safe-areas (notch / home indicator); הסטטוס-בר המדומה מוסתר והאמיתי מוצג מעל |
| אחסון עמיד | כל כתיבה ל-`localStorage` (מפתחות `vie_*`) משוקפת ל-Capacitor **Preferences** ומשוחזרת בעלייה — מגן מפני פינוי אחסון ב-iOS |
| GPS אמיתי | `navigator.geolocation` מנותב לפלאגין **Geolocation** — המפה, מצב ההליכה ומנוע ההמלצות מקבלים מיקום אמיתי |
| כפתור Back (Android) | סוגר שכבות-על פתוחות (נגן / מצב הליכה / sheet / ברכה) לפני מזעור האפליקציה |
| Splash + StatusBar | מסך פתיחה בורדו (`#7a1f2b`) ועיצוב סטטוס-בר תואם |

קוד האפליקציה עצמו (app.js וכו') **לא שונה** — בדפדפן רגיל הכול ממשיך לעבוד כרגיל (כולל מסגרת הטלפון בדסקטופ).

## בנייה והרצה

דרישות: Node 18+, ולבנייה — Android Studio (אנדרואיד) / Xcode + CocoaPods על Mac (אייפון).

```bash
npm install          # פעם אחת
npx cap sync         # אחרי כל שינוי ב-www/ (כולל הוספת קובצי קול)
```

### Android
```bash
npx cap open android        # פותח ב-Android Studio → Run ▶ על מכשיר/אמולטור
# או מה-CLI:
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

### iPhone (דורש Mac)
```bash
cd ios/App && pod install   # פעם אחת
npx cap open ios            # פותח ב-Xcode
```
ב-Xcode: בחרו Team בחתימה (Signing & Capabilities) → Run ▶ על האייפון.
להפצה דרושים חשבון Apple Developer ($99/שנה) ול-Google Play ($25 חד-פעמי).

### בדיקה מהירה בדפדפן
```bash
npm start            # http://localhost:8080
```

## הרשאות שכבר מוגדרות

- **Android** (`AndroidManifest.xml`): מיקום (FINE/COARSE), התראות (POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM), נעילת portrait.
- **iOS** (`Info.plist`): הסבר שימוש במיקום בעברית (`NSLocationWhenInUseUsageDescription`), portrait בלבד, אזור פיתוח he.

## הוספת הקלטות קול

שימו `welcome.m4a` ו-`site1.m4a`…`site11.m4a` בתיקייה `www/app/voice/`, ואז `npx cap sync`.
קובץ חסר לא שובר כלום — מוצגת הודעה עדינה במקום.

## שלבים הבאים (מתוך מסמך העיצוב, סעיפים 9–11)

- אריחי מפה: כרגע CARTO Voyager (חינם לשימוש אישי). למסחרי — Mapbox / Google Maps SDK.
- Firebase (Firestore/FCM) לסנכרון בין מכשירים ו-Push — פלאגין `local-notifications` כבר מותקן לתזכורות מקומיות.
- Google Photos API לסנכרון תמונות ביומן.
- אייקון אפליקציה ומסכי splash ממותגים: `npx @capacitor/assets generate` עם לוגו בתיקיית `assets/`.
