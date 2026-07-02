/* QA — שכבת הטיולים: ריבוי טיולים, טיול פעיל, בידוד לפי-טיול, קבוצה, שיתוף בקישור */
const fs = require("fs");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync("www/index.html", "utf8");

function makeObj() {
  const o = {
    addTo: () => o, on: () => o, off: () => o, removeLayer: () => {},
    bindTooltip: () => o, bringToFront: () => o, bringToBack: () => o,
    setStyle: () => o, getElement: () => null,
    getLatLng: () => ({ lat: 48.2, lng: 16.37 }), setLatLng: () => {},
    fitBounds: () => {}, flyTo: () => {}, flyToBounds: () => {}, invalidateSize: () => {},
  };
  return o;
}
function leaflet() {
  return {
    map: () => makeObj(), tileLayer: () => makeObj(), marker: () => makeObj(),
    polyline: () => makeObj(), divIcon: () => ({}),
    control: { zoom: () => ({ addTo: () => {} }), scale: () => ({ addTo: () => {} }) },
  };
}
function boot(url, scripts) {
  const dom = new JSDOM(html, { runScripts: "outside-only", url });
  const w = dom.window;
  w.L = leaflet();
  w.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  w.cancelAnimationFrame = () => {};
  for (const f of scripts) w.eval(fs.readFileSync("www/app/" + f, "utf8"));
  return w;
}

let failures = 0;
function check(label, cond, extra) {
  const ok = !!cond;
  console.log((ok ? "✅ PASS" : "❌ FAIL") + " — " + label + (!ok && extra ? "\n         >> " + extra : ""));
  if (!ok) failures++;
}

/* ====================================================================
   חלק א — API של הטיולים + בידוד לפי-טיול
   ==================================================================== */
console.log("\n── א. מאגר טיולים בסיסי ──");
const w = boot("https://localhost/", ["image-slot.js", "data.js", "trips.js", "app.js", "app-plan.js"]);
const AT = w.APP_TRIPS, A = w.APP;

check("APP_TRIPS קיים", !!AT);
check("window.TRIP הוא הטיול הפעיל (וינה, יש אתרים)", w.TRIP && w.TRIP.sites && w.TRIP.sites.length > 0);
check("ברירת מחדל: הטיול הפעיל הוא וינה", AT.activeId() === "vienna");
const list0 = AT.list();
check("ברשימה יש טיול וינה מסומן כדוגמה", list0.some(t => t.id === "vienna" && t.example));
check("לוינה יש חברי קבוצה (שלומי + יפעת)", (AT.active().members || []).length >= 2);

console.log("\n── ב. יצירת טיול גנרי חדש ──");
const romeId = AT.create("רומא עם החברים", { city: "רומא", days: 4 });
check("נוצר טיול חדש (id שונה)", romeId && romeId !== "vienna");
const rome = AT.get(romeId);
check("לטיול החדש יש 4 ימים", rome.days.length === 4);
check("הטיול החדש ריק מאתרים", rome.sites.length === 0);
check("הטיול החדש אינו דוגמה", rome.example === false);
check("לטיול החדש יש taxonomy (placeCategories)", Object.keys(rome.placeCategories || {}).length === 6);
check("הרשימה גדלה ל-2 טיולים", AT.list().length === 2);

// קישור שיתוף — נתפוס אותו לפני מחיקות
const romeLink = AT.exportLink(romeId);

console.log("\n── ג. מעבר בין טיולים ──");
check("switchTo מחזיר true", AT.switchTo(romeId) === true);
check("הטיול הפעיל התחלף לרומא", AT.activeId() === romeId);
check("active() מצביע על רומא הריק", AT.active().sites.length === 0);
AT.switchTo("vienna");
check("חזרה לוינה", AT.activeId() === "vienna");

console.log("\n── ד. בידוד אחסון לפי-טיול (יומן) ──");
// וינה פעילה — נוסיף רשומת יומן
A.addJournal({ key: "s1", name: "בדיקה", type: "site", lat: 48.2, lng: 16.37, day: 1 });
check("יומן וינה כולל רשומה", A.journal().length >= 1);
AT.switchTo(romeId);
check("יומן רומא ריק (בידוד)", A.journal().length === 0, `בפועל: ${A.journal().length}`);
AT.switchTo("vienna");
check("חזרה לוינה: היומן חזר", A.journal().length >= 1);
// ומאומת ב-localStorage תחת מפתח מנוקד
check("היומן נשמר תחת vie_vienna_journal", !!w.localStorage.getItem("vie_vienna_journal"));
check("אין דליפה ל-vie_" + romeId + "_journal", !w.localStorage.getItem("vie_" + romeId + "_journal"));

console.log("\n── ה. חברי קבוצה ──");
const before = (AT.active().members || []).length;
AT.addMember("vienna", "דני");
check("הוספת חבר קבוצה", (AT.get("vienna").members || []).length === before + 1);
const newM = AT.get("vienna").members[AT.get("vienna").members.length - 1];
AT.removeMember("vienna", newM.id);
check("הסרת חבר קבוצה", (AT.get("vienna").members || []).length === before);

console.log("\n── ו. מחיקת טיול ──");
check("אי אפשר למחוק את דוגמת וינה", AT.remove("vienna") === false);
const parisId = AT.create("פריז", { city: "פריז", days: 2 });
check("נוצר טיול פריז", !!AT.get(parisId));
check("מחיקת פריז מצליחה", AT.remove(parisId) === true);
check("פריז לא ברשימה יותר", !AT.list().some(t => t.id === parisId));

console.log("\n── ז. קישור שיתוף (round-trip) ──");
check("exportLink מכיל #trip=", romeLink.indexOf("#trip=") > -1);
const payload = romeLink.split("#trip=")[1];
let decoded = null;
try { decoded = JSON.parse(decodeURIComponent(w.escape(w.atob(decodeURIComponent(payload))))); } catch (e) {}
check("הקישור מפענח לטיול תקין", decoded && decoded.city === "רומא" && decoded.days.length === 4,
  decoded ? JSON.stringify({ city: decoded.city, days: decoded.days && decoded.days.length }) : "(פענוח נכשל)");

/* ====================================================================
   חלק ב — ייבוא טיול מקישור בכניסה טרייה
   ==================================================================== */
console.log("\n── ח. פתיחת קישור שיתוף בכניסה חדשה ──");
const w2 = boot(romeLink, ["data.js", "trips.js"]);
const AT2 = w2.APP_TRIPS;
check("APP_TRIPS נטען בכניסה עם קישור", !!AT2);
check("הטיול מהקישור יובא ונעשה פעיל", AT2.active().city === "רומא",
  `עיר פעילה: ${AT2.active().city}`);
check("וינה עדיין קיימת כדוגמה לצד המיובא", AT2.list().some(t => t.id === "vienna"));
check("ה-hash נוקה אחרי הייבוא", (w2.location.hash || "").indexOf("trip=") === -1);

/* ====================================================================
   סיכום
   ==================================================================== */
console.log("\n" + "═".repeat(52));
console.log(failures === 0 ? "✅  כל הבדיקות עברו!" : `❌  ${failures} בדיקות נכשלו`);
process.exit(failures ? 1 : 0);
