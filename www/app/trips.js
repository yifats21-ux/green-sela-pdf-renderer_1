/* ===========================================================
   שכבת "טיולים" — ריבוי טיולים, טיול פעיל, קבוצה, שיתוף בקישור
   נטען אחרי data.js ולפני app.js. הופך את window.TRIP לטיול הפעיל,
   כך ששאר האפליקציה עובדת בדיוק כמו קודם — רק שעכשיו יש כמה טיולים,
   ווינה היא רק דוגמה אחת מתוכם.
   =========================================================== */
(function () {
  "use strict";

  var LSK = { trips: "vie_trips", active: "vie_active_trip" };
  function lget(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var seed = window.TRIP || {};          // וינה — כפי שהוגדר ב-data.js
  var VIENNA_ID = "vienna";
  var PALETTE = ["#7a1f2b", "#9a4a1d", "#1f5d3a", "#3a4a86", "#5a2746", "#2e6da4", "#8e44ad", "#c75b39"];

  function now() { return (typeof Date !== "undefined" && Date.now) ? Date.now() : 0; }
  function uid(prefix) { uid._n = (uid._n || 0) + 1; return (prefix || "t") + "_" + now().toString(36) + uid._n.toString(36); }

  function copyTaxonomy() {
    return {
      foodTypes: JSON.parse(JSON.stringify(seed.foodTypes || {})),
      placeCategories: JSON.parse(JSON.stringify(seed.placeCategories || {})),
    };
  }

  /* ---------- וינה כטיול-דוגמה ---------- */
  function seedViennaTrip() {
    var t = Object.assign({}, seed);
    t.id = VIENNA_ID;
    t.name = "וינה — טיול לדוגמה";
    t.city = "וינה";
    t.example = true;
    t.createdAt = 0;
    t.members = t.members || [
      { id: "m_shlomi", name: seed.traveler || "שלומי", emoji: "🎂" },
      { id: "m_yifat", name: seed.hostess || "יפעת", emoji: "💛" },
    ];
    return t;
  }

  /* ---------- טיול ריק/גנרי חדש ---------- */
  function makeBlankTrip(name, opts) {
    opts = opts || {};
    var center = opts.center || { lat: 48.2082, lng: 16.3719 };
    var nDays = Math.max(1, Math.min(14, parseInt(opts.days, 10) || 3));
    var tax = copyTaxonomy();
    var days = [];
    for (var i = 1; i <= nDays; i++) days.push({ id: i, title: "יום " + i, sub: "", color: PALETTE[(i - 1) % PALETTE.length] });
    return {
      id: uid("trip"),
      name: name || "טיול חדש",
      city: opts.city || "",
      example: false,
      createdAt: now(),
      traveler: opts.traveler || "",
      hostess: "",
      members: opts.members || [],
      days: days,
      userStart: center,
      sites: [],
      teasers: [{ emoji: "🧭", t: name || "טיול חדש", s: opts.city ? ("מתכננים יחד את " + opts.city) : "מתחילים לתכנן — הוסיפו תחנות למסלול." }],
      food: [],
      foodTypes: tax.foodTypes,
      hotelAreas: [{ id: "h1", label: opts.city || "מרכז", lat: center.lat, lng: center.lng }],
      airport: null,
      attractions: [],
      placeCategories: tax.placeCategories,
      places: [],
    };
  }

  /* ---------- טעינת מאגר הטיולים ---------- */
  function loadStore() {
    var store = lget(LSK.trips, null);
    if (!store || typeof store !== "object" || !Object.keys(store).length) {
      store = {};
      store[VIENNA_ID] = seedViennaTrip();
      lset(LSK.trips, store);
      lset(LSK.active, VIENNA_ID);
    } else if (!store[VIENNA_ID]) {
      store[VIENNA_ID] = seedViennaTrip();   // וינה תמיד נשמרת כדוגמה
      lset(LSK.trips, store);
    }
    return store;
  }

  var store = loadStore();
  var activeId = lget(LSK.active, VIENNA_ID);
  if (!store[activeId]) { activeId = VIENNA_ID; lset(LSK.active, activeId); }

  function persist() { lset(LSK.trips, store); }

  /* ---------- שיתוף בקישור (ללא שרת) — קידוד JSON ל-hash ---------- */
  function encodeTrip(t) {
    try {
      var json = JSON.stringify(t);
      var b64 = (typeof btoa !== "undefined") ? btoa(unescape(encodeURIComponent(json))) : "";
      return encodeURIComponent(b64);
    } catch (e) { return ""; }
  }
  function decodeTrip(s) {
    try {
      var b64 = decodeURIComponent(s);
      var json = decodeURIComponent(escape(atob(b64)));
      var t = JSON.parse(json);
      if (!t || !t.days || !t.id) return null;
      return t;
    } catch (e) { return null; }
  }
  function wipeTripStorage(id) {
    try {
      var pre = "vie_" + id + "_", kill = [];
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(pre) === 0) kill.push(k); }
      kill.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
  }

  /* ---------- ייבוא מקישור, אם קיים ---------- */
  function importFromHash() {
    var h = (typeof location !== "undefined" && location.hash) || "";
    var m = h.match(/[#&]trip=([^&]+)/);
    if (!m) return null;
    var t = decodeTrip(m[1]);
    if (!t) return null;
    if (t.id !== VIENNA_ID && store[t.id]) t.id = uid("trip"); // לא לדרוס טיול קיים
    t.example = false;
    store[t.id] = t;
    persist();
    return t.id;
  }

  /* ---------- API ציבורי ---------- */
  var API = {
    VIENNA_ID: VIENNA_ID,
    activeId: function () { return activeId; },
    active: function () { return store[activeId]; },
    get: function (id) { return store[id]; },
    list: function () {
      return Object.keys(store).map(function (id) {
        var t = store[id];
        return {
          id: id, name: t.name || "טיול", city: t.city || "", example: !!t.example,
          members: (t.members || []).length, stops: (t.sites || []).length, active: id === activeId,
        };
      }).sort(function (a, b) { return (store[a.id].createdAt || 0) - (store[b.id].createdAt || 0); });
    },
    create: function (name, opts) { var t = makeBlankTrip(name, opts); store[t.id] = t; persist(); return t.id; },
    add: function (tripObj) { if (!tripObj || !tripObj.id) return null; store[tripObj.id] = tripObj; persist(); return tripObj.id; },
    remove: function (id) {
      if (id === VIENNA_ID || !store[id]) return false;   // אי אפשר למחוק את דוגמת וינה
      delete store[id];
      wipeTripStorage(id);
      persist();
      if (activeId === id) { activeId = VIENNA_ID; lset(LSK.active, activeId); window.TRIP = store[activeId]; }
      return true;
    },
    rename: function (id, name) { if (store[id]) { store[id].name = name; persist(); } },
    switchTo: function (id) { if (store[id]) { activeId = id; lset(LSK.active, id); window.TRIP = store[id]; return true; } return false; },
    addMember: function (id, name, emoji) { var t = store[id]; if (!t) return; t.members = t.members || []; t.members.push({ id: uid("m"), name: (name || "אורח/ת").trim(), emoji: emoji || "🙂" }); persist(); },
    removeMember: function (id, memberId) { var t = store[id]; if (!t || !t.members) return; t.members = t.members.filter(function (m) { return m.id !== memberId; }); persist(); },
    exportLink: function (id) {
      var t = store[id]; if (!t) return "";
      var base = (typeof location !== "undefined") ? (location.origin + location.pathname) : "";
      return base + "#trip=" + encodeTrip(t);
    },
    importFromHash: importFromHash,
    makeBlankTrip: makeBlankTrip,
  };

  /* ---------- אתחול: ייבוא מקישור אם צריך, וקביעת הטיול הפעיל ל-window.TRIP ---------- */
  var imported = importFromHash();
  if (imported) {
    activeId = imported; lset(LSK.active, activeId);
    // נקה את ה-hash כדי שרענון לא ייבא שוב
    try { if (history && history.replaceState) history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  }
  window.TRIP = store[activeId];
  window.APP_TRIPS = API;
})();
