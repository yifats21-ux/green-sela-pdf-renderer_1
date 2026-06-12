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
dom2.window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
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

// ---- הוספת תחנות ----
const d2 = dom2.window.document;
const $2 = (s) => d2.querySelector(s);
dom2.window.renderTrip();
$2("#trip-edit-btn").click();                 // מצב עריכה
$2('[data-addpanel="1"]').click();            // פתיחת פאנל ההוספה ליום 1
check("פאנל ההוספה נפתח עם אטרקציות ואוכל", !!$2(".add-panel") && !!$2("[data-add-attr]") && !!$2("[data-add-food]"));

// הוספת אטרקציה (בלוודרה a1) ליום 1
$2('[data-add-attr="a1"]').click();
check("האטרקציה נוספה לסוף יום 1", names2(1).endsWith(",101"));
check("האטרקציה נעלמה מרשימת ההוספה", !$2('[data-add-attr="a1"]'));
const addedSite = A2.siteByN(101);
check("לתחנה שנוספה יש שם ומיקום אמיתיים", addedSite.name === "ארמון בלוודרה" && !!addedSite.lat);

// הוספת תחנה חופשית ליום 2
$2('[data-addpanel="2"]').click();
$2("#ap-custom-name").value = "קונצרט ערב";
$2('[data-add-custom="2"]').click();
check("תחנה חופשית נוספה לסוף יום 2", names2(2).endsWith(",102") && A2.siteByN(102).name === "קונצרט ערב");
check("לתחנה החופשית יש קואורדינטות (מרכז היום)", Number.isFinite(A2.siteByN(102).lat));

// שמירה אחרי "רענון"
const saved2 = dom2.window.localStorage.getItem("vie_route_added");
const dom4 = new JSDOM(html, { runScripts: "outside-only", url: "https://localhost/" });
dom4.window.L = w.L;
dom4.window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
dom4.window.localStorage.setItem("vie_route_added", saved2);
for (const f of ["image-slot.js", "data.js", "app.js", "app-plan.js"]) {
  dom4.window.eval(fs.readFileSync("www/app/" + f, "utf8"));
}
const A4 = dom4.window.APP;
check("אחרי רענון: התחנות שנוספו עדיין במסלול", A4.dayStops(1).some(s => s.n === 101) && A4.dayStops(2).some(s => s.n === 102));

// הסרת תחנה שנוספה
dom2.window.renderTrip();
$2('[data-remove="101"]').click();
check("התחנה שנוספה הוסרה", !names2(1).includes("101"));

// איפוס מוחק גם תחנות שנוספו
A2.clearRouteEdits();
check("אחרי איפוס: גם התחנות שנוספו נמחקו", A2.addedStops().length === 0 && !names2(2).includes("102"));

// מסך הברכה בכניסה חוזרת: מוצג לכמה שניות ואז נעלם לבד
const dom3 = new JSDOM(html, { runScripts: "outside-only", url: "https://localhost/" });
dom3.window.L = w.L;
dom3.window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
dom3.window.localStorage.setItem("vie_seen_welcome", "true");
for (const f of ["image-slot.js", "data.js", "app.js", "app-plan.js"]) {
  dom3.window.eval(fs.readFileSync("www/app/" + f, "utf8"));
}
const welcome = dom3.window.document.getElementById("welcome");
check("בכניסה חוזרת: הברכה מוצגת בהתחלה", !welcome.classList.contains("hidden"));
setTimeout(() => {
  check("בכניסה חוזרת: הברכה עדיין מוצגת אחרי 3 שניות", !welcome.classList.contains("hidden"));
}, 3000);
setTimeout(() => {
  check("בכניסה חוזרת: הברכה נעלמת לבד אחרי ~6 שניות", welcome.classList.contains("hidden"));
  process.exit(failures ? 1 : 0);
}, 6600);
