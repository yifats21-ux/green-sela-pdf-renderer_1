/* QA — שדות טקסט במסך התכנון לא סוגרים את המקלדת (לא מרנדרים מחדש בכל אות) */
const fs = require("fs");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync("www/index.html", "utf8");
const dom  = new JSDOM(html, { runScripts: "outside-only", url: "https://localhost/" });
const w    = dom.window, doc = w.document;

w.requestAnimationFrame = (cb) => setTimeout(cb, 0);
w.cancelAnimationFrame  = () => {};

/* ---------- Leaflet mock קליל (כדי ש-refreshHotel יעבוד אם המפה אותחלה) ---------- */
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
w.L = {
  map: () => makeObj(), tileLayer: () => makeObj(), marker: () => makeObj(),
  polyline: () => makeObj(), divIcon: () => ({}),
  control: { zoom: () => ({ addTo: () => {} }), scale: () => ({ addTo: () => {} }) },
};

for (const f of ["image-slot.js", "data.js", "app.js", "app-plan.js"])
  w.eval(fs.readFileSync("www/app/" + f, "utf8"));

const A  = w.APP;
const $  = (s) => doc.querySelector(s);

let failures = 0;
function check(label, cond, extra) {
  const ok = !!cond;
  console.log((ok ? "✅ PASS" : "❌ FAIL") + " — " + label + (!ok && extra ? "\n         >> " + extra : ""));
  if (!ok) failures++;
}

function type(el, text) {
  // מדמה הקלדה אות-אות עם אירוע input על כל תו (כמו מקלדת אמיתית)
  let v = "";
  for (const ch of text) {
    v += ch;
    el.value = v;
    el.dispatchEvent(new w.Event("input", { bubbles: true }));
  }
}

/* ====================================================================
   מסך התכנון — שדה שם המלון
   ==================================================================== */
console.log("\n── מסך תכנון: שדה שם המלון ──");
w.renderPlan();

const hn1 = $("#h-name");
check("שדה שם המלון קיים", !!hn1);

// הקלדת שם מלא, אות-אות
const name = "Hotel Sacher Wien";
type(hn1, name);

// הבדיקה המרכזית: האם זה אותו element פיזי אחרי כל ההקלדה?
// אם renderPlan רץ בכל אות — האלמנט היה מוחלף ו-querySelector יחזיר node אחר.
const hn2 = $("#h-name");
check("שדה הקלט הוא אותו אלמנט אחרי הקלדה (לא רונדר מחדש → המקלדת לא נסגרת)",
  hn1 === hn2, "האלמנט הוחלף — סימן שהמסך רונדר מחדש בכל אות");
check("ערך השדה נשמר במלואו", hn2.value === name, `בפועל: "${hn2.value}"`);

// השמירה אכן קרתה ל-settings
check("שם המלון נשמר ב-settings", A.settings().hotelName === name,
  `בפועל: "${A.settings().hotelName}"`);

// שורת הסיכום ("סומן על המפה") מתעדכנת במקום
const sum = $("#h-summary");
check("שורת הסיכום קיימת", !!sum);
check("הסיכום מציג שהמלון סומן על המפה", sum.innerHTML.includes("סומן על המפה"));
check("הסיכום כולל את שם המלון", sum.innerHTML.includes(name));

/* ---------- אחרי מחיקת השם — הסיכום נעלם ---------- */
console.log("\n── מחיקת שם המלון ──");
hn2.value = "";
hn2.dispatchEvent(new w.Event("input", { bubbles: true }));
check("שם ריק → הסיכום מתרוקן", $("#h-summary").innerHTML.trim() === "");
check("שדה הקלט עדיין אותו אלמנט", $("#h-name") === hn1);

/* ====================================================================
   המלון אכן ממוקם על המפה (refreshHotel יוצר מרקר)
   ==================================================================== */
console.log("\n── מיקום המלון על המפה ──");
// אתחל מפה, קבע שם מלון ובדוק ש-refreshHotel רץ בלי שגיאה ויוצר מרקר
A.saveSettings({ hotelName: "Hotel Sacher Wien", hotelAreaId: A.T.hotelAreas[0].id });
A.showScreen("map");          // initMap → refreshHotel
let hotelOk = true;
try { A.refreshHotel(); } catch (e) { hotelOk = false; console.log("   refreshHotel error:", e.message); }
check("refreshHotel רץ ללא שגיאה (המלון מסומן על המפה)", hotelOk);
check("לאזור המלון יש קואורדינטות תקפות",
  Number.isFinite(A.hotelArea().lat) && Number.isFinite(A.hotelArea().lng));

/* ====================================================================
   סיכום
   ==================================================================== */
console.log("\n" + "═".repeat(52));
console.log(failures === 0 ? "✅  כל הבדיקות עברו!" : `❌  ${failures} בדיקות נכשלו`);
process.exit(failures ? 1 : 0);
