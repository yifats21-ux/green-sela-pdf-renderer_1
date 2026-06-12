/* בדיקה פונקציונלית לעריכת המסלול — רץ ב-jsdom בלי דפדפן */
const fs = require("fs");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync("www/index.html", "utf8");
const dom = new JSDOM(html, { runScripts: "outside-only", url: "https://localhost/" });
const w = dom.window;

// סטאב מינימלי ל-Leaflet — המפה לא מאותחלת בבדיקה
w.L = { divIcon: () => ({}), map: () => { throw new Error("map should not init in test"); } };
// jsdom חסר rAF (קיים בכל דפדפן)
w.requestAnimationFrame = (cb) => setTimeout(cb, 0);

for (const f of ["image-slot.js", "data.js", "app.js", "app-plan.js"]) {
  w.eval(fs.readFileSync("www/app/" + f, "utf8"));
}

const A = w.APP;
const $ = (s) => w.document.querySelector(s);
const $$ = (s) => [...w.document.querySelectorAll(s)];
let failures = 0;
function check(name, cond) {
  console.log((cond ? "PASS" : "FAIL") + " — " + name);
  if (!cond) failures++;
}
const names = (d) => A.dayStops(d).map((s) => s.n).join(",");

// מצב התחלתי
check("יום 1 מתחיל עם תחנות 1,2,3,4", names(1) === "1,2,3,4");

// כניסה למצב עריכה
w.renderTrip();
$("#trip-edit-btn").click();
check("מצב עריכה נדלק (יש כפתורי חצים)", $$("#screen-trip [data-up]").length === 11);

// הורדת תחנה 1 מקום אחד למטה
$('#screen-trip [data-down="1"]').click();
check("אחרי הורדת תחנה 1: סדר 2,1,3,4", names(1) === "2,1,3,4");

// העלאה בחזרה
$('#screen-trip [data-up="1"]').click();
check("אחרי העלאה חזרה: סדר 1,2,3,4", names(1) === "1,2,3,4");

// דילוג על תחנה 2
$('#screen-trip [data-skip="2"]').click();
check("אחרי דילוג על 2: יום 1 הוא 1,3,4", names(1) === "1,3,4");
check("תחנה מדולגת מסומנת בעריכה", $$("#screen-trip .ri.skip").length === 1);

// החזרת תחנה 2
$('#screen-trip [data-skip="2"]').click();
check("אחרי החזרה: יום 1 הוא 1,2,3,4", names(1) === "1,2,3,4");

// העברת תחנה 4 (קפה סנטרל) ליום 2
const sel = $('#screen-trip [data-dayof="4"]');
sel.value = "2";
sel.dispatchEvent(new w.Event("change", { bubbles: true }));
check("תחנה 4 עברה ליום 2 (בסוף היום)", names(2).endsWith(",4") && !names(1).includes("4"));

// הגנה: אי אפשר לרוקן יום — מדלגים על כל תחנות יום 1 חוץ מאחרונה
$('#screen-trip [data-skip="1"]').click();
$('#screen-trip [data-skip="2"]').click();
$('#screen-trip [data-skip="3"]').click();
check("הדילוג על התחנה האחרונה ביום נחסם", names(1).length > 0);

// שמירה: הכל נשמר ב-storage ושורד "רענון" (טעינת אפליקציה חדשה)
const saved = w.localStorage.getItem("vie_route_edits");
const dom2 = new JSDOM(html, { runScripts: "outside-only", url: "https://localhost/" });
dom2.window.L = w.L;
dom2.window.localStorage.setItem("vie_route_edits", saved);
for (const f of ["image-slot.js", "data.js", "app.js", "app-plan.js"]) {
  dom2.window.eval(fs.readFileSync("www/app/" + f, "utf8"));
}
const A2 = dom2.window.APP;
const names2 = (d) => A2.dayStops(d).map((s) => s.n).join(",");
check("אחרי רענון: תחנה 4 עדיין ביום 2", names2(2).endsWith(",4"));
check("אחרי רענון: הדילוגים נשמרו", names2(1) !== "1,2,3" && names2(1).length > 0);

// איפוס לברירת מחדל
A2.clearRouteEdits();
check("אחרי איפוס: יום 1 חזר ל-1,2,3,4", names2(1) === "1,2,3,4");
check("אחרי איפוס: יום 2 בלי תחנה 4", !names2(2).split(",").includes("4"));

// מסך הבית לא נשבר אחרי עריכות
dom2.window.renderHome();
check("מסך הבית מתרנדר אחרי עריכות", !!dom2.window.document.querySelector("#screen-home .scr-title"));

process.exit(failures ? 1 : 0);
