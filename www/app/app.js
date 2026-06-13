/* ===========================================================
   וינה לשלומי — ליבת האפליקציה (ניווט, מפה, קרבה, המלצות)
   =========================================================== */
window.APP = (function () {
  const T = window.TRIP;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const LS = {
    get: (k, d) => { try { const v = localStorage.getItem("vie_" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem("vie_" + k, JSON.stringify(v)); } catch {} },
  };

  /* ---------- אייקונים ---------- */
  const IC = {
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    metro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 12h14M8 21l2-3M16 21l-2-3"/></svg>',
    ticket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4z"/></svg>',
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/><path d="M5 17V7l9-2 4 4v8"/></svg>',
    nav: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    chev: '<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M12 20V5M5 12l7-7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M4 12h15M13 6l6 6-6 6"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M20 12H5M11 6l-6 6 6 6"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M5 21V4M5 4h12l-2 4 2 4H5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg>',
  };

  /* ---------- עזרי נתונים ---------- */
  const siteByN = n => T.sites.find(s => s.n === n);
  const foodById = id => T.food.find(f => f.id === id);
  const attractionById = id => (T.attractions || []).find(a => a.id === id);
  const ATTR_COLOR = "#355e8a";
  const dayStops = d => T.sites.filter(s => s.day === d && !s.skip);
  const dayAllStops = d => T.sites.filter(s => s.day === d); // כולל תחנות בדילוג (לעריכה)

  /* ---------- עריכת מסלול (יום, סדר, דילוג) ---------- */
  function routeEdits() {
    const e = LS.get("route_edits", {}) || {};
    return { day: e.day || {}, order: e.order || {}, skip: e.skip || [] };
  }
  function setRouteEdits(ed) { LS.set("route_edits", ed); applyRouteEdits(); rebuildRoutes(); }
  function clearRouteEdits() { LS.set("route_added", []); setRouteEdits({ day: {}, order: {}, skip: [] }); }

  /* ---------- תחנות שהמשתמש הוסיף למסלול ---------- */
  function addedStops() { return LS.get("route_added", []); }
  function setAddedStops(list) { LS.set("route_added", list); applyRouteEdits(); rebuildRoutes(); }
  function nextAddedN() { return addedStops().reduce((m, a) => Math.max(m, a.n), 100) + 1; }
  function makeAddedSite(a) {
    return {
      n: a.n, day: a.day, scope: "city", added: true, refId: a.refId || null,
      name: a.name, en: a.en || "", lat: a.lat, lng: a.lng,
      hours: a.hours || "לפי בחירתכם",
      transport: a.transport || "ראו במפה",
      price: a.price || "—",
      walk: "",
      fact: a.fact || "תחנה שהוספתם בעצמכם למסלול — אל תשכחו לדרג ולתעד ביומן!",
      link: a.link || "",
    };
  }
  function pinLabel(s) { return s.added ? "★" : s.n; }

  function applyRouteEdits() {
    // מיזוג תחנות שנוספו ע"י המשתמש (והסרת מה שנמחק)
    const added = addedStops();
    T.sites = T.sites.filter(s => !s.added || added.some(a => a.n === s.n));
    added.forEach(a => { if (!T.sites.some(s => s.n === a.n)) T.sites.push(makeAddedSite(a)); });

    const ed = routeEdits();
    T.sites.forEach((s, i) => {
      if (s.day0 == null) { s.day0 = s.day; s.ord0 = s.day * 100 + i; } // ברירת המחדל המקורית
      s.day = ed.day[s.n] || s.day0;
      s.skip = ed.skip.includes(s.n);
      s.ord = ed.order[s.n] != null ? ed.order[s.n] : s.day * 100 + (s.ord0 % 100);
    });
    T.sites.sort((a, b) => a.ord - b.ord || a.n - b.n);
  }
  applyRouteEdits();
  const dayMeta = d => T.days.find(x => x.id === d);
  const fmtTime = d => d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  function addMin(t, m) { const d = new Date(t.getTime() + m * 60000); return d; }
  function parseTime(str, baseDate) {
    if (!str) return null;
    const [h, mi] = str.split(":").map(Number);
    const d = baseDate ? new Date(baseDate) : new Date();
    d.setHours(h, mi || 0, 0, 0); return d;
  }
  function haversine(a, b) {
    const R = 6371000, toR = x => x * Math.PI / 180;
    const dLat = toR(b[0] - a[0]), dLng = toR(b[1] - a[1]);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[0])) * Math.cos(toR(b[0])) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  /* ---------- הגדרות ---------- */
  function settings() {
    return LS.get("settings", {
      flightOutDate: "", flightOutTime: "", flightArrDate: "", flightArrTime: "",
      flightBackDate: "", flightBackTime: "",
      hotelName: "", hotelAreaId: "c1",
      transferMethod: "cat", transferDetails: "", taxiCompany: "", taxiTime: "", taxiCode: "",
      gps: false,
    });
  }
  function saveSettings(patch) {
    const s = Object.assign(settings(), patch);
    LS.set("settings", s);
    if (s.flightArrDate) LS.set("start_date", s.flightArrDate);
    return s;
  }
  function hotelArea() {
    const s = settings();
    return T.hotelAreas.find(a => a.id === s.hotelAreaId) || T.hotelAreas[0];
  }

  /* ---------- תוכנית יום ההגעה ---------- */
  const TRANSFER_MIN = { cat: 18, taxi: 30, transfer: 35, train: 25 };
  function arrivalPlan() {
    const s = settings();
    if (!s.flightArrTime) return null;
    const base = s.flightArrDate ? new Date(s.flightArrDate + "T00:00:00") : new Date();
    let t = parseTime(s.flightArrTime, base);
    const steps = [];
    steps.push({ ic: "✈️", nm: "נחיתה בנמל וינה (VIE)", time: fmtTime(t), sub: "טיסה נכנסת" });
    t = addMin(t, 45); // ביקורת דרכונים + מזוודות
    steps.push({ ic: "🛄", nm: "דרכונים ומזוודות", time: fmtTime(t), sub: "כ-45 דק'" });
    const tm = TRANSFER_MIN[s.transferMethod] || 30;
    t = addMin(t, tm);
    const methodLbl = { cat: "רכבת CAT למרכז", taxi: "מונית שהוזמנה", transfer: "שאטל/העברה", train: "רכבת S7" }[s.transferMethod] || "העברה למלון";
    steps.push({ ic: s.transferMethod === "taxi" ? "🚕" : "🚆", nm: methodLbl, time: fmtTime(t), sub: `כ-${tm} דק' אל ${s.hotelName || "המלון"}` });
    t = addMin(t, 30);
    steps.push({ ic: "🏨", nm: `צ'ק-אין ב${s.hotelName || "מלון"}`, time: fmtTime(t), sub: "הנחת מזוודות ורענון" });
    t = addMin(t, 30);
    steps.push({ ic: "🚶", nm: "יוצאים לטיול הראשון!", time: fmtTime(t), sub: "מוכנים להתחיל", start: true });
    return { steps, firstStart: t };
  }

  /* ---------- דירוגים ויומן ---------- */
  function ratings() { return LS.get("ratings", {}); }
  function setRating(key, patch) {
    const r = ratings(); r[key] = Object.assign(r[key] || {}, patch); LS.set("ratings", r);
  }
  function journal() { return LS.get("journal", []); }
  function addJournal(entry) {
    const j = journal();
    if (!j.find(e => e.key === entry.key)) { j.push(Object.assign({ ts: Date.now() }, entry)); LS.set("journal", j); }
    refreshMapVisited();
  }
  function isVisited(key) { return !!journal().find(e => e.key === key); }

  /* =====================================================
     טוסטים
     ===================================================== */
  function toast(emoji, title, sub, ms = 4200) {
    const w = $("#toast-wrap");
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<div class="ic">${emoji}</div><div><div class="tt">${title}</div>${sub ? `<div class="ts">${sub}</div>` : ""}</div>`;
    w.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 400); }, ms);
  }

  /* ---------- קול של יפעת ---------- */
  function playVoice(key, btn) {
    const audio = new Audio("app/voice/" + key + ".m4a");
    if (btn) btn.classList.add("playing");
    audio.play().then(() => { audio.onended = () => btn && btn.classList.remove("playing"); })
      .catch(() => {
        if (btn) setTimeout(() => btn.classList.remove("playing"), 600);
        toast("🎙", "הקול של יפעת", "כאן ייכנס הקול של יפעת — נקליט ונשבץ בקרוב 💛");
      });
  }

  /* =====================================================
     ניווט בין מסכים
     ===================================================== */
  function showScreen(name) {
    $$(".screen").forEach(s => s.classList.toggle("active", s.id === "screen-" + name));
    $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.screen === name));
    LS.set("tab", name);
    if (name === "map") initMap();
    if (name === "journal" && window.renderJournal) window.renderJournal();
    if (name === "plan" && window.renderPlan) window.renderPlan();
  }

  /* =====================================================
     מפה
     ===================================================== */
  const TILE = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const ATTR = "&copy; OpenStreetMap &copy; CARTO";
  let map, meMarker, routeLayers = [], foodMarkers = [], attractionMarkers = [], hotelMarker = null, visitedMarkers = [];
  let showFood = true, showAttr = true, showVisited = true, activeDayFilter = 0;

  function numIcon(n, color) {
    return L.divIcon({ className: "", html: `<div class="num-marker" style="background:${color}"><span>${n}</span></div>`, iconSize: [30, 30], iconAnchor: [15, 28] });
  }
  function foodIcon(f) {
    const ft = T.foodTypes[f.type];
    return L.divIcon({ className: "", html: `<div class="food-marker" style="background:${ft.color}">${ft.emoji}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] });
  }
  function attrIcon(a) {
    return L.divIcon({ className: "", html: `<div class="food-marker" style="background:${ATTR_COLOR}">${a.emoji}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] });
  }
  function meIcon() {
    return L.divIcon({ className: "", html: `<div class="me-dot"><div class="pulse"></div><div class="core"></div></div>`, iconSize: [20, 20], iconAnchor: [10, 10] });
  }
  function hotelIcon() {
    return L.divIcon({ className: "", html: `<div class="food-marker" style="background:#2a2320;font-size:15px">🏨</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
  }

  function buildRouteLayers() {
    T.days.forEach(d => {
      const stops = dayStops(d.id);
      const line = L.polyline(stops.map(s => [s.lat, s.lng]), { color: d.color, weight: 3, opacity: .55, dashArray: "1 7", lineCap: "round" }).addTo(map);
      const markers = stops.map(s => {
        const m = L.marker([s.lat, s.lng], { icon: numIcon(pinLabel(s), d.color) }).addTo(map);
        m.on("click", () => openSheet(s.n)); return m;
      });
      routeLayers.push({ day: d.id, line, markers });
    });
  }
  function rebuildRoutes() {
    if (!map) return;
    routeLayers.forEach(r => { map.removeLayer(r.line); r.markers.forEach(m => map.removeLayer(m)); });
    routeLayers = [];
    buildRouteLayers();
    routeLayers.forEach(r => { // החלת מסנן היום הנוכחי, בלי תעופה
      const show = activeDayFilter === 0 || r.day === activeDayFilter;
      r.line.setStyle({ opacity: show ? .55 : 0 });
      r.markers.forEach(m => m.getElement() && (m.getElement().style.display = show ? "" : "none"));
    });
  }

  function initMap() {
    if (map) { setTimeout(() => map.invalidateSize(), 60); refreshHotel(); return; }
    map = L.map("leaf", { zoomControl: false, attributionControl: true });
    L.tileLayer(TILE, { attribution: ATTR, maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);

    buildRouteLayers();

    foodMarkers = T.food.map(f => {
      const m = L.marker([f.lat, f.lng], { icon: foodIcon(f) }).addTo(map);
      m.on("click", () => openFoodSheet(f.id)); return m;
    });
    attractionMarkers = (T.attractions || []).map(a => {
      const m = L.marker([a.lat, a.lng], { icon: attrIcon(a) }).addTo(map);
      m.on("click", () => openAttractionSheet(a.id)); return m;
    });

    meMarker = L.marker([T.userStart.lat, T.userStart.lng], { icon: meIcon(), zIndexOffset: 1000 }).addTo(map);
    refreshHotel();
    refreshMapVisited();

    const all = T.sites.map(s => [s.lat, s.lng]).concat([[T.userStart.lat, T.userStart.lng]]);
    map.fitBounds(all, { padding: [50, 50] });
    setTimeout(() => map.invalidateSize(), 120);
    buildDayFilter();
    wireMapToggles();
    if (settings().gps) startGPS();
  }
  function refreshHotel() {
    if (!map) return;
    const s = settings();
    if (hotelMarker) { map.removeLayer(hotelMarker); hotelMarker = null; }
    if (s.hotelName) {
      const a = hotelArea();
      hotelMarker = L.marker([a.lat, a.lng], { icon: hotelIcon() }).addTo(map).bindTooltip("🏨 " + s.hotelName);
    }
  }
  function refreshMapVisited() {
    if (!map) return;
    visitedMarkers.forEach(m => map.removeLayer(m)); visitedMarkers = [];
    if (!showVisited) return;
    journal().forEach(e => {
      const p = e.lat && e.lng ? [e.lat, e.lng] : null; if (!p) return;
      const m = L.marker(p, { icon: L.divIcon({ className: "", html: `<div class="food-marker" style="background:var(--green);font-size:13px">${IC.check.replace('stroke="currentColor"','stroke="#fff"')}</div>`, iconSize: [24, 24], iconAnchor: [12, 12] }), zIndexOffset: 500 }).addTo(map);
      visitedMarkers.push(m);
    });
  }
  function buildDayFilter() {
    const f = $("#day-filter");
    const items = [{ id: 0, title: "הכל" }].concat(T.days.map(d => ({ id: d.id, title: "יום " + d.id })));
    f.innerHTML = items.map(it => `<button class="df ${it.id === activeDayFilter ? "active" : ""}" data-df="${it.id}">${it.title}</button>`).join("");
    $$("#day-filter .df").forEach(b => b.addEventListener("click", () => setDayFilter(+b.dataset.df)));
  }
  function setDayFilter(id) {
    activeDayFilter = id;
    $$("#day-filter .df").forEach(b => b.classList.toggle("active", +b.dataset.df === id));
    routeLayers.forEach(r => {
      const show = id === 0 || r.day === id;
      r.line.setStyle({ opacity: show ? .55 : 0 });
      r.markers.forEach(m => m.getElement() && (m.getElement().style.display = show ? "" : "none"));
    });
    if (id !== 0) map.flyToBounds(dayStops(id).map(s => [s.lat, s.lng]), { padding: [60, 60], duration: .6 });
    else map.flyToBounds(T.sites.map(s => [s.lat, s.lng]), { padding: [50, 50], duration: .6 });
  }
  function wireMapToggles() {
    $("#tg-food").addEventListener("click", e => {
      showFood = !showFood; e.currentTarget.classList.toggle("on", showFood);
      foodMarkers.forEach(m => m.getElement() && (m.getElement().style.display = showFood ? "" : "none"));
    });
    $("#tg-attr").addEventListener("click", e => {
      showAttr = !showAttr; e.currentTarget.classList.toggle("on", showAttr);
      attractionMarkers.forEach(m => m.getElement() && (m.getElement().style.display = showAttr ? "" : "none"));
    });
    $("#tg-visited").addEventListener("click", e => {
      showVisited = !showVisited; e.currentTarget.classList.toggle("on", showVisited); refreshMapVisited();
    });
    $("#locate-btn").addEventListener("click", () => {
      const p = meMarker ? meMarker.getLatLng() : T.userStart;
      map.flyTo([p.lat, p.lng], 15, { duration: .7 });
      toast("📍", "המיקום שלך", settings().gps ? "עוקב אחרי ה-GPS שלך." : "אתה במרכז וינה, ליד שטפנספלאץ.");
    });
  }

  /* ---------- GPS אמיתי (אופציונלי) ---------- */
  let gpsWatch = null;
  function startGPS() {
    if (!navigator.geolocation || gpsWatch != null) return;
    gpsWatch = navigator.geolocation.watchPosition(
      pos => { const ll = [pos.coords.latitude, pos.coords.longitude]; if (meMarker) meMarker.setLatLng(ll); proximityScan(ll, null); },
      () => toast("📍", "מיקום לא זמין", "נשתמש במיקום מדומה במרכז וינה."),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  }
  function stopGPS() { if (gpsWatch != null) { navigator.geolocation.clearWatch(gpsWatch); gpsWatch = null; } }

  /* =====================================================
     מנוע קרבה — המלצות תוך כדי הליכה (מסלול גמיש)
     ===================================================== */
  const offered = new Set();
  let recBusy = false;
  function proxCandidates() {
    const food = T.food.map(f => ({ key: "f" + f.id, kind: "food", he: f.he, note: f.note, area: f.area, lat: f.lat, lng: f.lng, emoji: T.foodTypes[f.type].emoji, color: T.foodTypes[f.type].color, typeLabel: T.foodTypes[f.type].label }));
    const attr = (T.attractions || []).map(a => ({ key: "a" + a.id, kind: "attraction", he: a.he, note: a.note, area: a.area, lat: a.lat, lng: a.lng, emoji: a.emoji, color: ATTR_COLOR, typeLabel: "אטרקציה" }));
    return food.concat(attr);
  }
  function proximityScan(pos, dest) {
    if (recBusy) return;
    let best = null, bestD = 1e9;
    proxCandidates().forEach(c => {
      if (offered.has(c.key) || isVisited(c.key)) return;
      const d = haversine(pos, [c.lat, c.lng]);
      if (d < bestD) { bestD = d; best = c; }
    });
    if (best && bestD <= 200) {
      offered.add(best.key);
      const detour = dest ? Math.max(1, Math.round((haversine(pos, [best.lat, best.lng]) + haversine([best.lat, best.lng], dest) - haversine(pos, dest)) / 80)) : Math.round(bestD / 80);
      showRecommendation(best, Math.round(bestD), detour);
    }
  }
  function showRecommendation(c, meters, detourMin) {
    recBusy = true;
    const pop = document.createElement("div");
    pop.className = "rec-pop";
    pop.innerHTML = `
      <div class="rec-head">
        <div class="rec-em" style="background:${c.color}">${c.emoji}</div>
        <div style="flex:1">
          <div class="rec-t">${c.he} <span class="rec-dist">· ${meters} מ' ממך</span></div>
          <div class="rec-s">${c.note}</div>
        </div>
      </div>
      <div class="rec-detour">↪️ סטייה מהמסלול: <b>+${detourMin} דק'</b> · ${c.typeLabel} · ${c.area}</div>
      <div class="rec-cta">
        <button class="btn btn--accent btn--sm" style="flex:1" data-act="add">הוסף לעצירה (+${detourMin}׳)</button>
        <button class="btn btn--ghost btn--sm" style="flex:1" data-act="skip">תודה, ממשיכים</button>
      </div>`;
    document.querySelector(".app-body").appendChild(pop);
    requestAnimationFrame(() => pop.classList.add("show"));
    if (navigator.vibrate) navigator.vibrate(30);
    toast("✨", c.kind === "food" ? "המלצה מקומית בקרבת מקום" : "אטרקציה בקרבת מקום", `${c.he} — ${meters} מ' מכאן`);
    const close = () => { pop.classList.remove("show"); setTimeout(() => pop.remove(), 300); recBusy = false; };
    pop.querySelector('[data-act="add"]').addEventListener("click", () => {
      addJournal({ key: c.key, name: c.he, type: c.kind, lat: c.lat, lng: c.lng, day: currentDay(), spontaneous: true });
      toast("➕", "נוסף למסלול!", `${c.he} נוסף כעצירה ספונטנית. המסלול עודכן (+${detourMin} דק').`);
      close();
    });
    pop.querySelector('[data-act="skip"]').addEventListener("click", close);
    setTimeout(() => { if (document.body.contains(pop)) close(); }, 11000);
  }

  /* =====================================================
     Sheet — פרטי אתר + הידעת + דירוג
     ===================================================== */
  function ratingStars(key) {
    const cur = (ratings()[key] || {}).stars || 0;
    return `<div class="stars" data-stars="${key}">${[1,2,3,4,5].map(i => `<button class="${i <= cur ? "on" : ""}" data-v="${i}">★</button>`).join("")}</div>`;
  }
  function wireRating(root, key, name, extra) {
    const note = (ratings()[key] || {}).note || "";
    $$(`[data-stars="${key}"] button`, root).forEach(b => b.addEventListener("click", () => {
      const v = +b.dataset.v; setRating(key, { stars: v });
      $$(`[data-stars="${key}"] button`, root).forEach(x => x.classList.toggle("on", +x.dataset.v <= v));
      if (!isVisited(key)) addJournal(Object.assign({ key, name, type: extra.type, lat: extra.lat, lng: extra.lng, day: extra.day }, {}));
      toast("⭐", "הדירוג נשמר", `נתת ל${name} ${v} כוכבים — נשמר ביומן המסע.`);
    }));
    const ta = $(`#note-${key}`, root);
    if (ta) ta.addEventListener("change", () => { setRating(key, { note: ta.value }); });
  }

  function openSheet(n) {
    const s = siteByN(n), meta = dayMeta(s.day);
    const transIc = s.scope === "region" ? IC.car : IC.metro;
    const key = "s" + n;
    $("#sheet").innerHTML = `
      <div class="sheet__grab"></div>
      <div class="sheet__top">
        <span class="pin" style="background:${meta.color};position:relative">${pinLabel(s)}${isVisited(key) ? `<span class="visited-badge">${IC.check}</span>` : ""}</span>
        <div style="flex:1"><div class="sheet__name">${s.name}</div><div class="sheet__en">${s.en ? s.en + " · " : ""}יום ${s.day}</div></div>
      </div>
      <div class="sheet__facts">
        <div class="fct">${IC.clock}<div><b>שעות:</b> ${s.hours}</div></div>
        <div class="fct">${transIc}<div><b>הגעה:</b> ${s.transport}</div></div>
        <div class="fct">${IC.ticket}<div><b>מחיר:</b> ${s.price}</div></div>
      </div>
      <div class="didyouknow">
        <div class="didyouknow__h">💡 הידעת, שלומי?</div>
        <p class="didyouknow__t">${s.fact}</p>
        <div class="didyouknow__row">
          ${s.link ? `<a class="didyouknow__link" href="${s.link}" target="_blank" rel="noopener">${IC.link} קרא עוד לעומק</a>` : "<span></span>"}
          <button class="voice-btn voice-btn--ink" data-voice="site${s.n}" style="padding:8px 13px;margin:0"><span class="eq"><i></i><i></i><i></i><i></i></span> שמע מיפעת</button>
        </div>
      </div>
      <div class="rate-box">
        <div class="rb-h"><span class="t">היית כאן? דרג ותעד</span>${ratingStars(key)}</div>
        <textarea class="rate-note" id="note-${key}" placeholder="מה זכור לך מהביקור? (נשמר ביומן)">${(ratings()[key] || {}).note || ""}</textarea>
      </div>
      <div class="sheet__cta">
        <button class="btn btn--accent" style="flex:1" data-walk="${s.n}">${IC.nav} נווט אליי ברגל</button>
        <button class="btn btn--ghost" style="flex:0 0 auto;width:auto;padding:14px 18px" id="sheet-close-btn">סגור</button>
      </div>`;
    openSheetEl();
    $$("#sheet [data-voice]").forEach(b => b.addEventListener("click", e => playVoice(b.dataset.voice, e.currentTarget)));
    $$("#sheet [data-walk]").forEach(b => b.addEventListener("click", () => { closeSheet(); openWalk(+b.dataset.walk); }));
    $("#sheet-close-btn").addEventListener("click", closeSheet);
    wireRating($("#sheet"), key, s.name, { type: "site", lat: s.lat, lng: s.lng, day: s.day });
  }
  function openFoodSheet(id) {
    const f = foodById(id), ft = T.foodTypes[f.type], key = "f" + id;
    $("#sheet").innerHTML = `
      <div class="sheet__grab"></div>
      <div class="sheet__top">
        <span class="pin" style="background:${ft.color};position:relative">${ft.emoji}${isVisited(key) ? `<span class="visited-badge">${IC.check}</span>` : ""}</span>
        <div style="flex:1"><div class="sheet__name">${f.he}</div><div class="sheet__en">${f.name} · ${f.area}</div></div>
      </div>
      <div style="margin:6px 0 2px"><span class="food-type-chip" style="background:${ft.color}">${ft.emoji} ${ft.label}</span> <span class="hint-pill" style="margin-inline-start:6px">המלצת מקומיים</span></div>
      <div class="didyouknow" style="background:rgba(122,90,42,.06);border-color:rgba(122,90,42,.25);margin-top:12px">
        <div class="didyouknow__h" style="color:${ft.color}">📍 למה דווקא כאן?</div>
        <p class="didyouknow__t">${f.note}</p>
      </div>
      <div class="rate-box">
        <div class="rb-h"><span class="t">אכלת כאן? דרג</span>${ratingStars(key)}</div>
        <textarea class="rate-note" id="note-${key}" placeholder="מה אכלת? שווה?">${(ratings()[key] || {}).note || ""}</textarea>
      </div>
      <div class="sheet__cta">
        <button class="btn btn--accent" style="flex:1" data-walkfood="${id}">${IC.nav} נווט אליי</button>
        <button class="btn btn--ghost" style="flex:0 0 auto;width:auto;padding:14px 18px" id="sheet-close-btn">סגור</button>
      </div>`;
    openSheetEl();
    $("#sheet-close-btn").addEventListener("click", closeSheet);
    $$("#sheet [data-walkfood]").forEach(b => b.addEventListener("click", () => { closeSheet(); openWalk(null, foodById(b.dataset.walkfood)); }));
    wireRating($("#sheet"), key, f.he, { type: "food", lat: f.lat, lng: f.lng, day: currentDay() });
  }
  function openAttractionSheet(id) {
    const a = attractionById(id), key = "a" + id;
    $("#sheet").innerHTML = `
      <div class="sheet__grab"></div>
      <div class="sheet__top">
        <span class="pin" style="background:${ATTR_COLOR};position:relative">${a.emoji}${isVisited(key) ? `<span class="visited-badge">${IC.check}</span>` : ""}</span>
        <div style="flex:1"><div class="sheet__name">${a.he}</div><div class="sheet__en">${a.name} · ${a.area}</div></div>
      </div>
      <div style="margin:6px 0 2px"><span class="food-type-chip" style="background:${ATTR_COLOR}">🏛️ אטרקציה</span> <span class="hint-pill" style="margin-inline-start:6px">לא במסלול הקבוע — להוספה</span></div>
      <div class="didyouknow" style="background:rgba(53,94,138,.07);border-color:rgba(53,94,138,.25);margin-top:12px">
        <div class="didyouknow__h" style="color:${ATTR_COLOR}">💡 מה יש שם?</div>
        <p class="didyouknow__t">${a.note}</p>
        <a class="didyouknow__link" href="${a.link}" target="_blank" rel="noopener">${IC.link} קרא עוד</a>
      </div>
      <div class="rate-box">
        <div class="rb-h"><span class="t">היית כאן? דרג</span>${ratingStars(key)}</div>
        <textarea class="rate-note" id="note-${key}" placeholder="מה זכור לך?">${(ratings()[key] || {}).note || ""}</textarea>
      </div>
      <div class="sheet__cta">
        <button class="btn btn--accent" style="flex:1" data-walkattr="${id}">${IC.nav} נווט אליי</button>
        <button class="btn btn--ghost" style="flex:0 0 auto;width:auto;padding:14px 18px" id="sheet-close-btn">סגור</button>
      </div>`;
    openSheetEl();
    $("#sheet-close-btn").addEventListener("click", closeSheet);
    $$("#sheet [data-walkattr]").forEach(b => b.addEventListener("click", () => { closeSheet(); openWalk(null, null, attractionById(b.dataset.walkattr)); }));
    wireRating($("#sheet"), key, a.he, { type: "attraction", lat: a.lat, lng: a.lng, day: currentDay() });
  }
  function openSheetEl() { $("#sheet").classList.add("open"); $("#scrim").classList.add("open"); }
  function closeSheet() { $("#sheet").classList.remove("open"); $("#scrim").classList.remove("open"); }

  /* =====================================================
     מצב הליכה + קרבה חיה
     ===================================================== */
  let walkMap, walkMeMarker, walkTimer = null, walkAnim = null, walkProx = null;
  const WALK_STEPS = [
    { ins: "המשך ישר", dist: "200 מ' לפנייה הבאה", ic: "up" },
    { ins: "פנה ימינה", dist: "120 מ'", ic: "right" },
    { ins: "פנה שמאלה לרחוב הראשי", dist: "90 מ'", ic: "left" },
    { ins: "היעד נמצא מימינך", dist: "כמעט הגעת!", ic: "flag" },
  ];
  function openWalk(n, foodTarget, place) {
    const target = place
      ? { name: place.he, walk: "פנו לכיוון " + place.area + ".", lat: place.lat, lng: place.lng, color: ATTR_COLOR, label: place.emoji, key: "a" + place.id, day: currentDay() }
      : foodTarget
      ? { name: foodTarget.he, walk: "פנו לכיוון " + foodTarget.area + ".", lat: foodTarget.lat, lng: foodTarget.lng, color: T.foodTypes[foodTarget.type].color, label: T.foodTypes[foodTarget.type].emoji, key: "f" + foodTarget.id, day: currentDay() }
      : (() => { const s = siteByN(n), m = dayMeta(s.day); return { name: s.name, walk: s.walk, lat: s.lat, lng: s.lng, color: m.color, label: pinLabel(s), key: "s" + n, day: s.day, n: s.n }; })();
    $("#walk-pin").textContent = target.label;
    $("#walk-pin").style.background = target.color;
    $("#walk-nm").textContent = target.name;
    $("#walk-mt").textContent = target.walk;
    $("#walk").classList.add("open");
    offered.clear();

    if (!walkMap) { walkMap = L.map("leaf-walk", { zoomControl: false, attributionControl: false }); L.tileLayer(TILE, { maxZoom: 19 }).addTo(walkMap); }
    setTimeout(() => walkMap.invalidateSize(), 120);

    Object.values(walkMap._layers).forEach(l => { if (l instanceof L.Polyline || l instanceof L.Marker) walkMap.removeLayer(l); });
    const to = [target.lat, target.lng];
    const start = target.day > 2 ? [target.lat + 0.004, target.lng + 0.004] : [T.userStart.lat, T.userStart.lng];
    L.polyline([start, to], { color: target.color, weight: 5, opacity: .85, lineCap: "round" }).addTo(walkMap);
    L.marker(to, { icon: target.n ? numIcon(target.label, target.color) : L.divIcon({ className: "", html: `<div class="food-marker" style="background:${target.color}">${target.label}</div>`, iconSize: [28,28], iconAnchor: [14,14] }) }).addTo(walkMap);
    // מקומות מקומיים ואטרקציות לאורך הדרך
    T.food.forEach(f => L.marker([f.lat, f.lng], { icon: foodIcon(f), opacity: .9 }).addTo(walkMap).on("click", () => openFoodSheet(f.id)));
    (T.attractions || []).forEach(a => L.marker([a.lat, a.lng], { icon: attrIcon(a), opacity: .9 }).addTo(walkMap).on("click", () => openAttractionSheet(a.id)));
    walkMeMarker = L.marker(start, { icon: meIcon(), zIndexOffset: 1000 }).addTo(walkMap);
    walkMap.fitBounds([start, to], { padding: [70, 70] });
    runWalkSim(start, to, target);
  }
  function runWalkSim(start, to, target) {
    clearInterval(walkTimer); cancelAnimationFrame(walkAnim); clearInterval(walkProx);
    let stepI = 0, total = 16000, t0 = performance.now(), leftStart = Math.max(280, Math.round(haversine(start, to)));
    setStep(0);
    walkTimer = setInterval(() => { stepI++; if (stepI < WALK_STEPS.length) setStep(stepI); }, 3800);
    function setStep(i) { const st = WALK_STEPS[i]; $("#walk-ins").textContent = st.ins; $("#walk-dist").textContent = st.dist; $("#walk-dir-ic").innerHTML = IC[st.ic]; }
    function frame(now) {
      const p = Math.min(1, (now - t0) / total);
      const lat = start[0] + (to[0] - start[0]) * p, lng = start[1] + (to[1] - start[1]) * p;
      walkMeMarker.setLatLng([lat, lng]);
      $("#walk-left").textContent = Math.max(0, Math.round(leftStart * (1 - p))) + " מ'";
      $("#walk-eta").textContent = Math.max(0, Math.ceil((1 - p) * 7)) + " דק'";
      if (p < 1) walkAnim = requestAnimationFrame(frame);
    }
    walkAnim = requestAnimationFrame(frame);
    // סריקת קרבה חיה כל 2.5 שניות
    walkProx = setInterval(() => { if (walkMeMarker) { const c = walkMeMarker.getLatLng(); proximityScan([c.lat, c.lng], to); } }, 2500);
    $("#walk-arrive").textContent = fmtTime(addMin(new Date(), 7));
    $("#walk-arrived").onclick = () => arriveAt(target);
  }
  function arriveAt(target) {
    closeWalk();
    addJournal({ key: target.key, name: target.name, type: target.n ? "site" : "food", lat: target.lat, lng: target.lng, day: target.day });
    if (LS.get("dyk_on", true) && target.n) {
      toast("🎉", "הגעת ל" + target.name + "!", "פתחנו פינת ‹הידעת?› עם סיפור על המקום.");
      setTimeout(() => openSheet(target.n), 900);
    } else {
      toast("🎉", "הגעת ל" + target.name + "!", "סומן ביומן המסע. תיהנו 💛");
    }
  }
  function closeWalk() { $("#walk").classList.remove("open"); clearInterval(walkTimer); cancelAnimationFrame(walkAnim); clearInterval(walkProx); recBusy = false; }

  /* ---------- בית: יום נוכחי ---------- */
  function currentDay() { return LS.get("current_day", 1); }

  /* =====================================================
     נגן סרטון רגעים (סליידשואו בסגנון סטורי)
     ===================================================== */
  let playerTimer = null;
  function playMoments(frames, title, shareLabel) {
    const stage = $("#player-stage"), bars = $("#player-bars"), cap = $("#player-cap");
    $("#player-title").textContent = title;
    bars.innerHTML = frames.map(() => `<span><i></i></span>`).join("");
    $$("#player-stage .player__frame").forEach(f => f.remove());
    frames.forEach((fr, i) => {
      const el = document.createElement("div");
      el.className = "player__frame";
      el.innerHTML = fr.img ? `<img src="${fr.img}" alt="">` : `<div class="ph">${fr.emoji || "📸"}</div>`;
      stage.insertBefore(el, cap);
    });
    $("#player-scrim").classList.add("open"); $("#player").classList.add("open");
    let i = 0;
    const fEls = $$("#player-stage .player__frame"), bEls = $$("#player-bars span");
    function show(idx) {
      fEls.forEach((e, k) => e.classList.toggle("on", k === idx));
      bEls.forEach((e, k) => { e.classList.toggle("done", k < idx); e.classList.toggle("active", k === idx); });
      cap.textContent = frames[idx].cap;
    }
    function next() { if (i >= frames.length) { closePlayer(); return; } show(i); i++; playerTimer = setTimeout(next, 2600); }
    clearTimeout(playerTimer); next();
    $("#player-share").onclick = () => sharePrompt(shareLabel || title);
  }
  function closePlayer() { clearTimeout(playerTimer); $("#player-scrim").classList.remove("open"); $("#player").classList.remove("open"); }
  function sharePrompt(label) {
    const url = "https://vie4shlomi.app/m/" + Math.random().toString(36).slice(2, 8);
    if (navigator.share) { navigator.share({ title: "רגעים מהטיול בוינה", text: label, url }).catch(() => {}); }
    else { try { navigator.clipboard.writeText(url); } catch {} toast("🔗", "הקישור הועתק", label + " — כל מי שיש לו את הקישור יוכל לצפות."); }
  }
  $("#player-close") && $("#player-close").addEventListener("click", closePlayer);
  $("#player-scrim") && $("#player-scrim").addEventListener("click", closePlayer);

  /* ---------- שעון ---------- */
  function tickClock() { $("#sb-time").textContent = fmtTime(new Date()); }
  setInterval(tickClock, 10000); tickClock();

  /* ---------- חיווט בסיסי ---------- */
  $$(".tab").forEach(t => t.addEventListener("click", () => showScreen(t.dataset.screen)));
  $("#scrim").addEventListener("click", closeSheet);
  $("#walk-close").addEventListener("click", closeWalk);
  const mapMenuBtn = $("#map-menu-btn");
  if (mapMenuBtn) mapMenuBtn.addEventListener("click", () => showScreen("home"));

  /* ---------- ברכת פתיחה ---------- */
  function buildConfetti() {
    const c = $("#confetti"); if (!c) return;
    const cols = ["#d8c08a", "#fff", "#e8a0a8", "#b0832f", "#f0d9b5"];
    for (let i = 0; i < 26; i++) { const p = document.createElement("span"); p.className = "confetti-piece"; p.style.left = Math.random() * 100 + "%"; p.style.background = cols[i % cols.length]; p.style.animationDuration = (3 + Math.random() * 3) + "s"; p.style.animationDelay = (-Math.random() * 4) + "s"; c.appendChild(p); }
  }
  function dismissWelcome() { $("#welcome").classList.add("hidden"); LS.set("seen_welcome", true); setTimeout(() => toast("👋", "ברוך הבא, שלומי", "הקש על אתר במפה כדי לגלות סודות היסטוריים."), 700); }
  $("#welcome-cta").addEventListener("click", dismissWelcome);
  $("#welcome-skip").addEventListener("click", dismissWelcome);
  $("#welcome-voice").addEventListener("click", e => playVoice("welcome", e.currentTarget));

  /* ---------- Google Photos API ---------- */
  window.addEventListener("message", (e) => {
    if (e.data.type === "oauth_code") {
      const { code, service } = e.data;
      fetch("/api/google-oauth-exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, service })
      }).then(r => r.json()).then(data => {
        if (data.accessToken) {
          const auth = LS.get("google_auth", { photos: null, drive: null });
          auth[service] = data.accessToken;
          LS.set("google_auth", auth);
          toast("✅", "מחובר", `${service === "photos" ? "Google Photos" : "Drive"} מחובר בהצלחה!`);
          window.renderJournal?.();
        } else if (data.error) {
          toast("❌", "שגיאה", data.error);
        }
      }).catch(e => toast("❌", "שגיאה", "שגיאה בחיבור: " + e.message));
    } else if (e.data.type === "oauth_error") {
      toast("❌", "שגיאה בחיבור", e.data.error);
    }
  });

  async function fetchGooglePhotos(startDate, endDate) {
    const auth = LS.get("google_auth", { photos: null, drive: null });
    if (!auth.photos) return [];
    try {
      const r = await fetch("https://photoslibrary.googleapis.com/v1/mediaItems:search", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${auth.photos}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pageSize: 25,
          filters: {
            dateFilter: {
              ranges: [{
                startDate: { year: startDate.getFullYear(), month: startDate.getMonth() + 1, day: startDate.getDate() },
                endDate: { year: endDate.getFullYear(), month: endDate.getMonth() + 1, day: endDate.getDate() }
              }]
            }
          }
        })
      });
      return (await r.json()).mediaItems || [];
    } catch (e) {
      return [];
    }
  }

  // ממשק ציבורי
  return {
    T, LS, IC, $, $$, toast, playVoice, showScreen, openSheet, openFoodSheet, openAttractionSheet, openWalk,
    siteByN, foodById, attractionById, dayStops, dayAllStops, dayMeta, fmtTime, addMin, parseTime, haversine,
    routeEdits, setRouteEdits, clearRouteEdits, addedStops, setAddedStops, nextAddedN, pinLabel,
    settings, saveSettings, hotelArea, arrivalPlan, ratings, setRating, journal, addJournal, isVisited,
    currentDay, refreshMapVisited, refreshHotel, startGPS, stopGPS, playMoments, sharePrompt,
    buildConfetti, proximityScan, clearOffered: () => offered.clear(), closeWalk, fetchGooglePhotos,
  };
})();
