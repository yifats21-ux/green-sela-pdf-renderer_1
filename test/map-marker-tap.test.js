/* QA — לחיצה על מרקרים במפה: האם הגיליון נפתח עם תוכן נכון? */
const fs = require("fs");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync("www/index.html", "utf8");
const dom  = new JSDOM(html, { runScripts: "outside-only", url: "https://localhost/" });
const w    = dom.window, doc = w.document;

w.requestAnimationFrame = (cb) => setTimeout(cb, 0);
w.cancelAnimationFrame  = () => {};

/* ---------- Leaflet mock ---------- */
// מרקרים בלבד (L.marker) — שמור כאן כדי לירות את ה-click callbacks
const capturedMarkers = [];

function makeMap() {
  const m = {
    addLayer:      () => {},
    removeLayer:   () => {},
    fitBounds:     () => {},
    flyTo:         () => {},
    flyToBounds:   () => {},
    on:            () => m,
    off:           () => m,
    invalidateSize: () => {},
    addTo:         () => m,
    bringToFront:  () => m,
    bringToBack:   () => m,
  };
  return m;
}

function makeLayer() {
  const l = {
    addTo:        () => l,
    on:           () => l,
    off:          () => l,
    bringToFront: () => l,
    bringToBack:  () => l,
    setStyle:     () => l,
    setOpacity:   () => l,
    getElement:   () => null,
    getLatLng:    () => ({ lat: 48.208, lng: 16.372 }),
    setLatLng:    () => {},
    bindTooltip:  () => l,
  };
  return l;
}

function makeMarker(ll) {
  const cbs = {};
  const m = {
    _ll: ll, _cbs: cbs,
    addTo:        () => m,
    on:           (ev, cb) => { cbs[ev] = cb; return m; },
    off:          () => m,
    bringToFront: () => m,
    bringToBack:  () => m,
    setStyle:     () => m,
    getElement:   () => null,
    getLatLng:    () => ({ lat: m._ll[0], lng: m._ll[1] }),
    setLatLng:    (p)  => { m._ll = [p.lat ?? p[0], p.lng ?? p[1]]; },
    bindTooltip:  () => m,
  };
  capturedMarkers.push(m);
  return m;
}

w.L = {
  map:       () => makeMap(),
  tileLayer: () => makeLayer(),
  divIcon:   () => ({}),
  marker:    (ll, opts) => makeMarker(ll),
  polyline:  () => makeLayer(),
  control: {
    zoom:  () => ({ addTo: () => {} }),
    scale: () => ({ addTo: () => {} }),
  },
};

/* ---------- טוען סקריפטים ---------- */
for (const f of ["image-slot.js", "data.js", "app.js", "app-plan.js"])
  w.eval(fs.readFileSync("www/app/" + f, "utf8"));

const A  = w.APP;
const T  = A.T;
const $  = (s) => doc.querySelector(s);
const $$ = (s) => [...doc.querySelectorAll(s)];

let failures = 0;
function check(label, cond, extra) {
  const ok = !!cond;
  console.log((ok ? "✅ PASS" : "❌ FAIL") + " — " + label +
    (!ok && extra ? "\n         >> " + extra : ""));
  if (!ok) failures++;
}
function closeSheet() {
  const btn = doc.querySelector("#sheet-close-btn");
  if (btn) btn.click();
  else { $("#sheet").classList.remove("open"); $("#scrim").classList.remove("open"); }
}

/* ====================================================================
   א. שלמות הנתונים
   ==================================================================== */
console.log("\n── א. שלמות נתוני מסלול (sites) ──");
T.sites.forEach(s =>
  check(`site ${s.n}: שדות חובה`, s.n && s.day && s.name && s.lat && s.lng && s.fact && s.hours));
check("כל site.day מצביע על יום קיים",
  T.sites.every(s => T.days.some(d => d.id === s.day)));

console.log("\n── א2. שלמות נתוני מקומות (places) ──");
const validCats = Object.keys(T.placeCategories);
T.places.forEach(p => {
  check(`place ${p.id}: שדות חובה`, p.id && p.cat && p.he && p.note && p.lat && p.lng && p.area);
  check(`place ${p.id}: קטגוריה תקפה (${p.cat})`, validCats.includes(p.cat));
  check(`place ${p.id}: note לא ריק`, p.note && p.note.trim().length > 10);
});
check("31 מקומות בסך הכל", T.places.length === 31, `בפועל: ${T.places.length}`);
check("6 קטגוריות", validCats.length === 6);
validCats.forEach(cat => {
  const n = T.places.filter(p => p.cat === cat).length;
  check(`קטגוריה ${cat}: ≥ 4 מקומות`, n >= 4, `בפועל: ${n}`);
});

/* ====================================================================
   ב. initMap
   ==================================================================== */
console.log("\n── ב. initMap ──");
A.showScreen("map");
const hasMapMarkers = capturedMarkers.length > 0;
check("initMap יצר מרקרים", hasMapMarkers, `${capturedMarkers.length} נוצרו`);

const expectedMin = T.sites.length + T.places.length + 1; // route + place + me
check(`לפחות ${expectedMin} מרקרים נוצרו`,
  capturedMarkers.length >= expectedMin, `בפועל: ${capturedMarkers.length}`);

/* ====================================================================
   ג. openSheet ישיר — כל תחנת מסלול
   ==================================================================== */
console.log("\n── ג. openSheet — תוכן לכל תחנה ──");
T.sites.forEach(s => {
  A.openSheet(s.n);
  const el = doc.querySelector("#sheet .sheet__name");
  const ok = el && el.textContent.trim() === s.name;
  check(`site ${s.n} (${s.name}): sheet מציג שם נכון`, ok,
    `בפועל: "${el ? el.textContent.trim() : "(ריק)"}", צפוי: "${s.name}"`);
  if (ok) {
    check(`site ${s.n}: כפתור ניווט קיים`, !!doc.querySelector("#sheet [data-walk]"));
    check(`site ${s.n}: שעות מוצגות`,      $("#sheet").innerHTML.includes("שעות:"));
  }
  closeSheet();
  check(`site ${s.n}: sheet נסגר`, !$("#sheet").classList.contains("open"));
});

/* ====================================================================
   ד. לחיצת marker מסלול — callback מחובר ל-click
   ==================================================================== */
console.log("\n── ד. callbacks — מרקרי מסלול ──");
const siteNames = new Set(T.sites.map(s => s.name));
let routeHits = 0;

for (const m of capturedMarkers) {
  if (!m._cbs.click) continue;
  if ($("#sheet").classList.contains("open")) closeSheet();
  try { m._cbs.click(); } catch(e) { continue; }
  const el = doc.querySelector("#sheet .sheet__name");
  if (el && siteNames.has(el.textContent.trim())) routeHits++;
  closeSheet();
}
check(`כל ${T.sites.length} מרקרי מסלול מחוברים ל-click`,
  routeHits === T.sites.length, `בפועל: ${routeHits} מתוך ${T.sites.length}`);

/* ====================================================================
   ה. לחיצת marker מקום גילוי — openPlaceSheet
   ==================================================================== */
console.log("\n── ה. callbacks — מרקרי מקומות (discovery) ──");
const placeIds = new Set(T.places.map(p => p.id));
let placeHits = 0;

for (const m of capturedMarkers) {
  if (!m._cbs.click) continue;
  if ($("#sheet").classList.contains("open")) closeSheet();
  try { m._cbs.click(); } catch(e) { continue; }
  // מקומות discovery: ה-sheet מכיל "גילוי על המפה"
  if ($("#sheet").classList.contains("open") &&
      $("#sheet").innerHTML.includes("גילוי על המפה")) {
    placeHits++;
    // בדוק תוכן ספציפי
    const nameEl = doc.querySelector("#sheet .sheet__name");
    const hasName = nameEl && nameEl.textContent.trim().length > 0;
    if (placeHits === 1) {
      // בדיקות תוכן רק לראשון, מדגם
      check("place sheet: שם מקום מאוכלס",        hasName);
      check("place sheet: chip קטגוריה מוצגת",    $("#sheet").innerHTML.includes("food-type-chip"));
      check("place sheet: chip 'גילוי על המפה'",  $("#sheet").innerHTML.includes("גילוי על המפה"));
      check("place sheet: כפתור ניווט קיים",       !!doc.querySelector("#sheet [data-walkplace]"));
      check("place sheet: כפתור סגירה קיים",       !!doc.querySelector("#sheet-close-btn"));
    }
  }
  closeSheet();
}
check(`כל ${T.places.length} מרקרי מקומות מחוברים ל-click`,
  placeHits === T.places.length, `בפועל: ${placeHits} מתוך ${T.places.length}`);

/* ====================================================================
   ו. sheet מתרענן — לחיצה על שתי תחנות שונות
   ==================================================================== */
console.log("\n── ו. רענון sheet בין לחיצות ──");
A.openSheet(1);
const txt1 = doc.querySelector("#sheet .sheet__name").textContent.trim();
A.openSheet(5);
const txt5 = doc.querySelector("#sheet .sheet__name").textContent.trim();
check("תחנה 1 מציגה שמה", txt1 === T.sites[0].name, `בפועל: ${txt1}`);
check("תחנה 5 מציגה שמה", txt5 === T.sites[4].name, `בפועל: ${txt5}`);
check("sheet מתרענן (שם 5 שונה מ-1)", txt1 !== txt5);
closeSheet();

/* ====================================================================
   ז. link אופציונלי — לא קורס
   ==================================================================== */
console.log("\n── ז. link אופציונלי ──");
const withLink    = T.places.find(p => p.link);
const withoutLink = T.places.find(p => !p.link);
check("יש לפחות place אחד עם link",    !!withLink);
check("יש לפחות place אחד ללא link",   !!withoutLink);
if (withLink)    check("link תקין (https)", withLink.link.startsWith("http"));

/* ====================================================================
   סיכום
   ==================================================================== */
console.log("\n" + "═".repeat(52));
console.log(failures === 0
  ? "✅  כל הבדיקות עברו!"
  : `❌  ${failures} בדיקות נכשלו`);
process.exit(failures ? 1 : 0);
