/* QA פונקציונלי — כפתורי מפה, פאנל שכבות, סרגל קנה מידה */
const fs = require("fs");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync("www/index.html", "utf8");
const dom = new JSDOM(html, { runScripts: "outside-only", url: "https://localhost/" });
const w = dom.window;
const doc = w.document;

/* ---------- stubs ---------- */
w.requestAnimationFrame = (cb) => setTimeout(cb, 0);
w.cancelAnimationFrame = () => {};

// עוקבים אחרי קריאה ל-L.control.scale (סרגל קנה מידה)
let scaleAdded = false;

function makeFakeLayer() {
  const obj = {
    addTo: () => obj,
    bringToFront: () => obj,
    bringToBack: () => obj,
    setStyle: () => obj,
    setOpacity: () => obj,
    on: () => obj,
    off: () => obj,
    removeLayer: () => {},
    invalidateSize: () => {},
    fitBounds: () => {},
    flyToBounds: () => {},
    flyTo: () => {},
    getLatLng: () => ({ lat: 48.208, lng: 16.372 }),
    setLatLng: () => {},
    getElement: () => null,
    bindTooltip: () => obj,
  };
  return obj;
}

const scaleCtrl = { addTo: () => { scaleAdded = true; return scaleCtrl; } };

w.L = {
  map: () => makeFakeLayer(),
  tileLayer: () => makeFakeLayer(),
  divIcon: () => ({}),
  marker: () => makeFakeLayer(),
  polyline: () => makeFakeLayer(),
  control: {
    zoom: () => ({ addTo: () => {} }),
    scale: () => scaleCtrl,
  },
};

/* ---------- טוען סקריפטים ---------- */
for (const f of ["image-slot.js", "data.js", "app.js", "app-plan.js"]) {
  w.eval(fs.readFileSync("www/app/" + f, "utf8"));
}

const A = w.APP;
const $ = (s) => doc.querySelector(s);
const $$ = (s) => [...doc.querySelectorAll(s)];

let failures = 0;
function check(label, cond) {
  console.log((cond ? "✅ PASS" : "❌ FAIL") + " — " + label);
  if (!cond) failures++;
}

/* ================================================================
   1. קיום רכיבי DOM
   ================================================================ */
console.log("\n── קיום כפתורים ופאנלים ──");
check("#map-menu-btn קיים",   !!$("#map-menu-btn"));
check("#basemap-btn קיים",    !!$("#basemap-btn"));
check("#layers-fab קיים",     !!$("#layers-fab"));
check("#layers-panel קיים",   !!$("#layers-panel"));
check("#lp-list קיים",        !!$("#lp-list"));
check("#tg-visited קיים",     !!$("#tg-visited"));

/* ================================================================
   2. מעבר למפה — initMap רץ
   ================================================================ */
console.log("\n── ניווט למסך מפה ──");
A.showScreen("map");
check("screen-map active אחרי showScreen('map')", $("#screen-map").classList.contains("active"));
check("screen-home לא active", !$("#screen-home").classList.contains("active"));

/* ================================================================
   3. כפתור תפריט (hamburger) → חוזר לבית
   ================================================================ */
console.log("\n── map-menu-btn ──");
const menuBtn = $("#map-menu-btn");
menuBtn.click();
check("אחרי לחיצת menu: screen-home active",  $("#screen-home").classList.contains("active"));
check("אחרי לחיצת menu: screen-map לא active", !$("#screen-map").classList.contains("active"));

/* ================================================================
   4. FAB שכבות — פתיחה וסגירה
   ================================================================ */
console.log("\n── layers-fab פתיחה/סגירה ──");
// חזרה למפה (initMap לא ירוץ שוב — map כבר קיים)
A.showScreen("map");
const fab   = $("#layers-fab");
const panel = $("#layers-panel");

check("לפני לחיצה: panel ללא .open",  !panel.classList.contains("open"));
fab.click();
check("לחיצה 1: panel קיבל .open",    panel.classList.contains("open"));
fab.click();
check("לחיצה 2: panel הסיר .open",    !panel.classList.contains("open"));

// פתיחה שוב לבדיקות נוספות
fab.click();
check("לחיצה 3: panel שוב .open",     panel.classList.contains("open"));
fab.click();
check("לחיצה 4: panel שוב ללא .open", !panel.classList.contains("open"));

/* ================================================================
   5. רשימת שכבות (lp-list) מאוכלסת
   ================================================================ */
console.log("\n── lp-list שכבות קטגוריה ──");
const catRows = $$("#lp-list .lp-row");
check("lp-list: ≥ 6 שורות קטגוריה",     catRows.length >= 6);
check("כל שורה: data-cat קיים",          catRows.every(b => !!b.dataset.cat));
check("כל שורה: data-on קיים",           catRows.every(b => b.dataset.on !== undefined));
check("שורת cafe קיימת",                 catRows.some(b => b.dataset.cat === "cafe"));
check("שורת restaurant קיימת",           catRows.some(b => b.dataset.cat === "restaurant"));
check("שורת museum קיימת",               catRows.some(b => b.dataset.cat === "museum"));
check("שורת attraction קיימת",           catRows.some(b => b.dataset.cat === "attraction"));
check("שורת entertainment קיימת",        catRows.some(b => b.dataset.cat === "entertainment"));
check("שורת nightlife קיימת",            catRows.some(b => b.dataset.cat === "nightlife"));

/* ================================================================
   6. toggle קטגוריה מ-lp-list
   ================================================================ */
console.log("\n── toggle קטגוריה ──");
const cafeRow = catRows.find(b => b.dataset.cat === "cafe");
const cafeOnBefore = cafeRow.dataset.on;
cafeRow.click();
const cafeOnAfter = cafeRow.dataset.on;
check("לחיצת שורת cafe מחליפה data-on", cafeOnBefore !== cafeOnAfter);
cafeRow.click(); // מחזיר למקום
check("לחיצה שוב חוזרת לdata-on המקורי", cafeRow.dataset.on === cafeOnBefore);

/* ================================================================
   7. tg-visited מתחיל ב-false ו-toggle עובד
   ================================================================ */
console.log("\n── tg-visited ──");
const vis = $("#tg-visited");
check("tg-visited: data-on='false' בהתחלה", vis.dataset.on === "false");
vis.click();
check("אחרי לחיצה: data-on='true'",          vis.dataset.on === "true");
vis.click();
check("אחרי לחיצה שוב: data-on='false'",     vis.dataset.on === "false");

/* ================================================================
   8. סרגל קנה מידה — L.control.scale נקרא ונוסף
   ================================================================ */
console.log("\n── scale ruler (סרגל קנה מידה) ──");
check("L.control.scale().addTo() נקרא — סרגל נוסף", scaleAdded);

/* ================================================================
   סיכום
   ================================================================ */
console.log("\n" + "═".repeat(48));
if (failures === 0) {
  console.log("✅  כל הבדיקות עברו!");
} else {
  console.log(`❌  ${failures} בדיקות נכשלו`);
}
process.exit(failures ? 1 : 0);
