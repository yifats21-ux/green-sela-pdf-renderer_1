/* ===========================================================
   וינה לשלומי — מסכי תכנון, יומן, תמונות וסרטוני רגעים
   =========================================================== */
(function () {
  const A = window.APP, T = A.T, LS = A.LS, IC = A.IC, $ = A.$, $$ = A.$$;
  const money = s => s;
  let teaserIdx = 0;

  /* =====================================================
     מסך בית
     ===================================================== */
  function arrivalCard() {
    const plan = A.arrivalPlan();
    if (!plan || A.currentDay() !== 1) return "";
    return `
      <div class="section-label">יום ההגעה — מהמטוס למלון</div>
      <div class="card">
        <div class="row-list">
          ${plan.steps.map(s => `
            <div class="ri" style="cursor:default">
              <span class="pin sm" style="background:${s.start ? "var(--green)" : "var(--accent)"};font-size:15px">${s.ic}</span>
              <div><div class="nm">${s.nm}</div><div class="mt">${s.sub}</div></div>
              <span class="time">${s.time}</span>
            </div>`).join("")}
        </div>
        <div class="mini-summary" style="margin-top:12px">🚶 <span>תחילת הסיור הראשון משוערת ב-<b>${A.fmtTime(plan.firstStart)}</b> — המסלול מתחשב בזמן ההגעה למלון.</span></div>
      </div>`;
  }

  window.renderHome = function () {
    const d = A.currentDay(), meta = A.dayMeta(d), stops = A.dayStops(d), first = stops[0];
    const tz = T.teasers[teaserIdx % T.teasers.length];
    const dots = T.teasers.map((_, i) => `<span class="${i === teaserIdx % T.teasers.length ? "on" : ""}"></span>`).join("");
    const startTimes = ["09:00", "11:30", "14:00", "16:30"];
    $("#screen-home").innerHTML = `
      <div class="scr-head"><div class="scr-kicker">בוקר טוב, שלומי 👋</div><h1 class="scr-title">מה עושים היום</h1></div>
      <div class="teaser" id="teaser">
        <div class="teaser__emoji">${tz.emoji}</div>
        <div class="teaser__t">${tz.t}</div>
        <div class="teaser__s">${tz.s}</div>
        <div class="teaser__dots">${dots}</div>
      </div>
      ${arrivalCard()}
      <div class="card" style="margin-top:14px">
        <div style="display:flex;align-items:center;gap:9px;margin-bottom:13px">
          <span class="daychip" style="background:${meta.color}">יום ${d} · ${meta.title}</span>
        </div>
        <div class="next-row">
          <span class="pin">${A.pinLabel(first)}</span>
          <div><div class="nm">${first.name}</div><div class="mt">התחנה הראשונה היום</div></div>
          <div class="countdown"><b>${startTimes[0]}</b><small>יציאה</small></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:15px">
          <button class="btn btn--sm" style="flex:1" data-walk="${first.n}">${IC.nav} נווט אליי</button>
          <button class="btn btn--ghost btn--sm" style="flex:1" data-site="${first.n}">פרטים</button>
        </div>
      </div>

      <div class="card" style="margin-top:13px;display:flex;align-items:center;gap:13px">
        <div style="font-size:26px">🧭</div>
        <div style="flex:1"><div style="font-weight:700;font-size:14.5px">מצב סיור חי</div><div style="font-size:12px;color:var(--muted)">תוך כדי הליכה נמליץ על מקומות מקומיים קרובים</div></div>
        <button class="btn btn--sm" data-demo-rec>נסה</button>
      </div>

      <div class="section-label">תחנות היום</div>
      <div class="card"><div class="row-list">
        ${stops.map((s, i) => `
          <div class="ri" data-site="${s.n}">
            <span class="pin sm" style="position:relative">${A.pinLabel(s)}${A.isVisited("s" + s.n) ? `<span class="visited-badge">${IC.check}</span>` : ""}</span>
            <div><div class="nm">${s.name}</div><div class="mt">${s.price}</div></div>
            <span class="time">${startTimes[i] || ""}</span>${IC.chev}
          </div>`).join("")}
      </div></div>

      <div class="section-label">לאן ממשיכים?</div>
      <div style="display:flex;gap:10px">
        ${T.days.map(dd => `<button class="df ${dd.id === d ? "active" : ""}" data-setday="${dd.id}" style="flex:1;text-align:center">יום ${dd.id}</button>`).join("")}
      </div>

      <div class="card" style="margin-top:16px;display:flex;align-items:center;gap:13px">
        <div style="font-size:30px">🎁</div>
        <div style="flex:1"><div style="font-weight:700;font-size:15px">מתנה מיפעת</div><div style="font-size:12.5px;color:var(--muted)">לחץ לשמוע שוב את הברכה</div></div>
        <button class="voice-btn voice-btn--ink" data-voice="welcome" style="padding:9px 14px"><span class="eq"><i></i><i></i><i></i><i></i></span> נגן</button>
      </div>`;
    wireHome();
  };
  function wireHome() {
    $$("#screen-home [data-site]").forEach(b => b.addEventListener("click", () => A.openSheet(+b.dataset.site)));
    $$("#screen-home [data-walk]").forEach(b => b.addEventListener("click", () => A.openWalk(+b.dataset.walk)));
    $$("#screen-home [data-voice]").forEach(b => b.addEventListener("click", e => A.playVoice(b.dataset.voice, e.currentTarget)));
    $$("#screen-home [data-setday]").forEach(b => b.addEventListener("click", () => { LS.set("current_day", +b.dataset.setday); window.renderHome(); }));
    const tz = $("#teaser"); if (tz) tz.addEventListener("click", () => { teaserIdx++; refreshTeaser(); });
    const demo = $("#screen-home [data-demo-rec]");
    if (demo) demo.addEventListener("click", () => {
      A.clearOffered();
      A.toast("🚶", "מתחילים סיור חי…", "מדמים הליכה ברחובות וינה ליד נקודות מומלצות.");
      setTimeout(() => A.proximityScan([48.2048, 16.3690], [48.2065, 16.3657]), 1400);
    });
  }
  function refreshTeaser() {
    const t = $("#teaser"); if (!t) return;
    const tz = T.teasers[teaserIdx % T.teasers.length];
    t.querySelector(".teaser__emoji").textContent = tz.emoji;
    t.querySelector(".teaser__t").textContent = tz.t;
    t.querySelector(".teaser__s").textContent = tz.s;
    t.querySelector(".teaser__dots").innerHTML = T.teasers.map((_, i) => `<span class="${i === teaserIdx % T.teasers.length ? "on" : ""}"></span>`).join("");
  }
  setInterval(() => { if ($("#screen-home").classList.contains("active") && $("#welcome").classList.contains("hidden")) { teaserIdx++; refreshTeaser(); } }, 6000);

  /* =====================================================
     מסך מסלול
     ===================================================== */
  function tripDates() {
    const start = LS.get("start_date", null); if (!start) return null;
    const base = new Date(start + "T00:00:00");
    return T.days.map((d, i) => { const dt = new Date(base); dt.setDate(base.getDate() + i); return dt.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" }); });
  }
  let tripEdit = false;     // מצב עריכת מסלול
  let addPanelDay = null;   // היום שפאנל "הוסף תחנה" פתוח עבורו

  function editedRoute() {
    const ed = A.routeEdits();
    return Object.keys(ed.day).length || Object.keys(ed.order).length || ed.skip.length || A.addedStops().length;
  }
  function normalizeDayOrder(ed, day) {
    // לפי הסדר האפקטיבי (ord), לא לפי מיקום במערך — שעדיין לא מוין מחדש
    A.dayAllStops(day).slice().sort((a, b) => a.ord - b.ord).forEach((s, i) => { ed.order[s.n] = day * 100 + i; });
  }
  function afterRouteEdit() { window.renderTrip(); window.renderHome(); }

  function moveStop(n, dir) {
    const s = A.siteByN(n), ed = A.routeEdits();
    const list = A.dayAllStops(s.day);
    const i = list.indexOf(s), j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((x, k) => { ed.order[x.n] = s.day * 100 + k; });
    A.setRouteEdits(ed); afterRouteEdit();
  }
  function moveStopToDay(n, day) {
    const s = A.siteByN(n); if (s.day === day) return;
    if (!s.skip && A.dayStops(s.day).length <= 1) {
      A.toast("⚠️", "אי אפשר", "חייבת להישאר לפחות תחנה אחת בכל יום."); afterRouteEdit(); return;
    }
    const from = s.day, ed = A.routeEdits();
    if (day === s.day0) delete ed.day[n]; else ed.day[n] = day;
    s.day = day; s.ord = day * 100 + 99; // זמני, לצורך נרמול — לסוף היום החדש
    normalizeDayOrder(ed, day); normalizeDayOrder(ed, from);
    A.setRouteEdits(ed);
    A.toast("📅", "התחנה הועברה", `"${s.name}" עברה ליום ${day}.`);
    afterRouteEdit();
  }
  function toggleSkip(n) {
    const s = A.siteByN(n), ed = A.routeEdits();
    if (!s.skip && A.dayStops(s.day).length <= 1) {
      A.toast("⚠️", "אי אפשר", "חייבת להישאר לפחות תחנה אחת בכל יום."); return;
    }
    ed.skip = s.skip ? ed.skip.filter(x => x !== n) : ed.skip.concat([n]);
    A.setRouteEdits(ed);
    A.toast(s.skip ? "↩️" : "🚫", s.skip ? "התחנה חזרה למסלול" : "מדלגים על התחנה", `"${s.name}"`);
    afterRouteEdit();
  }

  /* ---------- הוספת תחנות ליום ---------- */
  function addStop(day, src) {
    const n = A.nextAddedN();
    let entry;
    if (src.kind === "attr") {
      const a = A.attractionById(src.refId);
      entry = { n, day, refId: a.id, name: a.he, en: a.name, lat: a.lat, lng: a.lng, transport: a.area, fact: a.note, link: a.link || "" };
    } else if (src.kind === "food") {
      const f = A.foodById(src.refId);
      entry = { n, day, refId: f.id, name: f.he, en: f.name, lat: f.lat, lng: f.lng, transport: f.area, fact: f.note };
    } else {
      // תחנה חופשית — ממוקמת במרכז אזור היום במפה
      const stops = A.dayStops(day);
      const lat = stops.reduce((sum, x) => sum + x.lat, 0) / stops.length;
      const lng = stops.reduce((sum, x) => sum + x.lng, 0) / stops.length;
      entry = { n, day, name: src.name, lat, lng };
    }
    A.setAddedStops(A.addedStops().concat([entry]));
    A.toast("➕", "נוספה תחנה ליום " + day, `"${entry.name}" נכנסה לסוף היום.`);
    afterRouteEdit();
  }
  function removeAddedStop(n) {
    const s = A.siteByN(n);
    if (!s.skip && A.dayStops(s.day).length <= 1) {
      A.toast("⚠️", "אי אפשר", "חייבת להישאר לפחות תחנה אחת בכל יום."); return;
    }
    const ed = A.routeEdits();
    delete ed.day[n]; delete ed.order[n];
    ed.skip = ed.skip.filter(x => x !== n);
    A.setRouteEdits(ed);
    A.setAddedStops(A.addedStops().filter(a => a.n !== n));
    A.toast("🗑️", "התחנה הוסרה", `"${s.name}" ירדה מהמסלול.`);
    afterRouteEdit();
  }
  function addPanelHtml(day) {
    const usedRefs = A.addedStops().map(a => a.refId).filter(Boolean);
    const attrs = (T.attractions || []).filter(a => !usedRefs.includes(a.id));
    const foods = T.food.filter(f => !usedRefs.includes(f.id));
    const item = (emoji, name, sub, dataAttrs) => `
      <div class="ap-item">
        <span class="ap-em">${emoji}</span>
        <div style="flex:1;min-width:0"><div class="nm">${name}</div><div class="mt">${sub}</div></div>
        <button class="ap-add" ${dataAttrs} aria-label="הוסף">＋</button>
      </div>`;
    const empty = '<div class="ap-empty">הכל כבר נוסף 🎉</div>';
    return `
    <div class="add-panel">
      <div class="ap-h">🏛️ אטרקציות מהברושור</div>
      ${attrs.map(a => item(a.emoji, a.he, a.area, `data-add-attr="${a.id}" data-add-day="${day}"`)).join("") || empty}
      <div class="ap-h">🍽️ אוכל מקומי</div>
      ${foods.map(f => item(T.foodTypes[f.type].emoji, f.he, f.area, `data-add-food="${f.id}" data-add-day="${day}"`)).join("") || empty}
      <div class="ap-h">✏️ תחנה משלכם</div>
      <div class="ap-custom">
        <input type="text" id="ap-custom-name" placeholder="למשל: קונצרט ערב, חנות מזכרות…">
        <button class="ap-add" data-add-custom="${day}" aria-label="הוסף">＋</button>
      </div>
    </div>`;
  }

  window.renderTrip = function () {
    const dates = tripDates();
    $("#screen-trip").innerHTML = `
      <div class="scr-head trip-head"><div>
        <div class="scr-kicker">4 ימים · ${T.sites.filter(s => !s.skip).length} אתרים</div><h1 class="scr-title">המסלול שלך</h1>
        <div class="scr-sub">${tripEdit ? "סדרו, העבירו בין ימים, דלגו או הוסיפו תחנות" : dates ? "התאריכים שובצו — ההתראות פעילות" : "קבע תאריכים אמיתיים בלשונית ‹תכנון›"}</div></div>
        <button class="btn btn--ghost btn--sm trip-edit-btn ${tripEdit ? "on" : ""}" id="trip-edit-btn">${tripEdit ? "✓ סיום" : "✏️ ערוך"}</button>
      </div>
      ${T.days.map(d => {
        const stops = tripEdit ? A.dayAllStops(d.id) : A.dayStops(d.id);
        const walkable = A.dayStops(d.id);
        return `
        <div class="section-label" style="display:flex;align-items:center;gap:9px">
          <span class="daychip" style="background:${d.color}">יום ${d.id}</span>${d.title} ${dates ? `· <span style="color:var(--ink-soft)">${dates[d.id - 1]}</span>` : ""}
        </div>
        <div class="card"><div class="row-list">
          ${stops.map(s => `
            <div class="ri ${s.skip ? "skip" : ""}" ${tripEdit ? "" : `data-site="${s.n}"`}>
              <span class="pin sm" style="background:${d.color};position:relative">${A.pinLabel(s)}${A.isVisited("s" + s.n) ? `<span class="visited-badge">${IC.check}</span>` : ""}</span>
              <div><div class="nm">${s.name}</div><div class="mt">${s.skip ? "בדילוג — לא במסלול" : s.hours.split("·")[0]}</div></div>
              ${tripEdit ? `
              <span class="edit-ctl">
                <button data-up="${s.n}" aria-label="העלה">↑</button>
                <button data-down="${s.n}" aria-label="הורד">↓</button>
                <select data-dayof="${s.n}" aria-label="העבר ליום">${T.days.map(x => `<option value="${x.id}" ${x.id === s.day ? "selected" : ""}>יום ${x.id}</option>`).join("")}</select>
                ${s.added
                  ? `<button data-remove="${s.n}" aria-label="הסר תחנה">🗑</button>`
                  : `<button data-skip="${s.n}" aria-label="${s.skip ? "החזר למסלול" : "דלג"}">${s.skip ? "↩" : "✕"}</button>`}
              </span>` : `
              <span class="time">${s.price.replace("לזוג", "").trim()}</span>${IC.chev}`}
            </div>`).join("")}
        </div>
        ${tripEdit ? `
          <button class="btn btn--ghost btn--sm add-stop-btn ${addPanelDay === d.id ? "on" : ""}" style="margin-top:11px;width:100%" data-addpanel="${d.id}">＋ הוסף תחנה ליום ${d.id}</button>
          ${addPanelDay === d.id ? addPanelHtml(d.id) : ""}` : ""}
        ${walkable.length && !tripEdit ? `<button class="btn btn--ghost btn--sm" style="margin-top:13px;width:100%" data-walk="${walkable[0].n}">${IC.nav} צא למסלול היום</button>` : ""}</div>`;
      }).join("")}
      ${tripEdit && editedRoute() ? `<button class="btn btn--ghost btn--sm" style="width:100%;margin-top:4px" id="trip-reset">↺ אפס מסלול לברירת המחדל</button>` : ""}
      <div style="height:6px"></div>`;

    $("#trip-edit-btn").addEventListener("click", () => { tripEdit = !tripEdit; if (!tripEdit) addPanelDay = null; window.renderTrip(); if (!tripEdit) A.toast("✓", "המסלול נשמר", "השינויים שלך נשמרו במכשיר."); });
    const reset = $("#trip-reset");
    if (reset) reset.addEventListener("click", () => { A.clearRouteEdits(); afterRouteEdit(); A.toast("↺", "המסלול אופס", "חזרנו למסלול המקורי של יפעת."); });
    $$("#screen-trip [data-site]").forEach(b => b.addEventListener("click", () => A.openSheet(+b.dataset.site)));
    $$("#screen-trip [data-walk]").forEach(b => b.addEventListener("click", () => A.openWalk(+b.dataset.walk)));
    $$("#screen-trip [data-up]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); moveStop(+b.dataset.up, -1); }));
    $$("#screen-trip [data-down]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); moveStop(+b.dataset.down, 1); }));
    $$("#screen-trip [data-skip]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); toggleSkip(+b.dataset.skip); }));
    $$("#screen-trip [data-dayof]").forEach(sel => sel.addEventListener("change", () => moveStopToDay(+sel.dataset.dayof, +sel.value)));
    $$("#screen-trip [data-remove]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); removeAddedStop(+b.dataset.remove); }));
    $$("#screen-trip [data-addpanel]").forEach(b => b.addEventListener("click", () => {
      addPanelDay = addPanelDay === +b.dataset.addpanel ? null : +b.dataset.addpanel;
      window.renderTrip();
    }));
    $$("#screen-trip [data-add-attr]").forEach(b => b.addEventListener("click", () => addStop(+b.dataset.addDay, { kind: "attr", refId: b.dataset.addAttr })));
    $$("#screen-trip [data-add-food]").forEach(b => b.addEventListener("click", () => addStop(+b.dataset.addDay, { kind: "food", refId: b.dataset.addFood })));
    $$("#screen-trip [data-add-custom]").forEach(b => b.addEventListener("click", () => {
      const inp = $("#ap-custom-name"), name = (inp && inp.value || "").trim();
      if (!name) { A.toast("✏️", "רגע רגע", "כתבו שם לתחנה לפני ההוספה."); return; }
      addStop(+b.dataset.addCustom, { kind: "custom", name });
    }));
  };

  /* =====================================================
     מסך יומן — ציר זמן, תמונות, סרטוני רגעים, הקדשה
     ===================================================== */
  function connectState() { return LS.get("google_auth", { photos: null, drive: null }); }
  function gIcon() { return '<svg class="g" viewBox="0 0 24 24"><path fill="#4285F4" d="M22 12.2c0-.7-.06-1.4-.18-2H12v3.9h5.6a4.8 4.8 0 0 1-2.08 3.15v2.6h3.36C20.84 18.1 22 15.4 22 12.2z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.64-2.45l-3.36-2.6c-.93.62-2.12.98-3.28.98-2.52 0-4.66-1.7-5.42-4H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.58 13.93a6 6 0 0 1 0-3.86V7.47H3.1a10 10 0 0 0 0 9.06z"/><path fill="#EA4335" d="M12 6.6c1.47 0 2.78.5 3.82 1.5l2.85-2.85A10 10 0 0 0 3.1 7.47l3.48 2.6C7.34 8.3 9.48 6.6 12 6.6z"/></svg>'; }

  async function googleOAuthFlow(service) {
    const auth = connectState();
    if (auth[service]) {
      auth[service] = null;
      LS.set("google_auth", auth);
      A.toast("🔌", "מנותק", `${service === "photos" ? "Google Photos" : "Drive"} מנותק.`);
      if (service === "photos") await A.fetchGooglePhotos(new Date(A.settings().flightArrDate), new Date(A.settings().flightBackDate));
      window.renderJournal();
      return;
    }

    const scope = service === "photos"
      ? "https://www.googleapis.com/auth/photoslibrary.readonly"
      : "https://www.googleapis.com/auth/drive.file";

    // הערה: החלף CLIENT_ID בפרטים שלך מ-Google Cloud Console
    const clientId = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
    const redirectUri = (window.location.hostname === "localhost"
      ? "http://localhost:8080"
      : window.location.origin) + "/oauth-callback.html";

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${service}`;

    A.toast("🔄", "מתחבר ל-Google...", "עברו לחלון התחברות.");
    window.open(authUrl, "_blank", "width=500,height=600");
  }

  function slotSrc(id) {
    const el = document.getElementById(id);
    const img = el && el.shadowRoot && el.shadowRoot.querySelector(".frame img");
    return img && img.src && img.style.display !== "none" ? img.src : null;
  }
  function dayPhotoIds(day) { return [1, 2, 3, 4].map(i => `ph-d${day}-${i}`); }
  function dayMomentFrames(day) {
    const meta = A.dayMeta(day), stops = A.dayStops(day), r = A.ratings();
    const frames = [{ emoji: "🎬", cap: `יום ${day} · ${meta.title}` }];
    dayPhotoIds(day).forEach(id => { const src = slotSrc(id); if (src) frames.push({ img: src, cap: meta.title }); });
    stops.forEach(s => { const st = (r["s" + s.n] || {}).stars; frames.push({ emoji: "📸", cap: s.name + (st ? "  " + "★".repeat(st) : "") }); });
    frames.push({ emoji: "💛", cap: "עוד יום מושלם בוינה" });
    return frames;
  }

  window.renderJournal = function () {
    const j = A.journal(), cs = connectState();
    const r = A.ratings();
    const entriesByDay = {};
    j.forEach(e => { (entriesByDay[e.day] = entriesByDay[e.day] || []).push(e); });

    $("#screen-journal").innerHTML = `
      <div class="scr-head"><div class="scr-kicker">ציר הזמן של הטיול</div><h1 class="scr-title">יומן המסע</h1>
        <div class="scr-sub">המפה זוכרת איפה הייתם — דרגו, תעדו ובנו סרטון רגעים לכל יום.</div></div>

      <div class="section-label">תמונות וזיכרונות</div>
      <div class="card">
        <div style="font-size:13px;color:var(--ink-soft);margin-bottom:11px">חברו את גוגל פוטוס / דרייב — והתמונות מהטיול ייסרקו אוטומטית לפי תאריך ומיקום אל היום המתאים.</div>
        <div class="connect-row">
          <button class="connect-btn ${cs.photos ? "connected" : ""}" data-connect="photos">${gIcon()} ${cs.photos ? "Google Photos מחובר ✓" : "חבר Google Photos"}</button>
          <button class="connect-btn ${cs.drive ? "connected" : ""}" data-connect="drive">${gIcon()} ${cs.drive ? "Drive מחובר ✓" : "חבר Drive"}</button>
        </div>
      </div>

      ${T.days.map(d => {
        const meta = A.dayMeta(d.id);
        const ents = entriesByDay[d.id] || [];
        return `
        <div class="section-label" style="display:flex;align-items:center;gap:9px"><span class="daychip" style="background:${meta.color}">יום ${d.id}</span>${meta.title}</div>
        <div class="card journal-day">
          ${ents.length ? ents.map(e => {
            const rt = (r[e.key] || {});
            return `<div class="j-entry"><div class="j-rail"></div>
              <span class="j-dot" style="background:${e.type === "food" ? "var(--accent)" : meta.color}">${e.type === "food" ? "🍽️" : "✓"}</span>
              <div class="j-body">
                <div class="nm">${e.name}${e.spontaneous ? ' <span class="hint-pill" style="padding:2px 8px;font-size:10px">עצירה ספונטנית</span>' : ""}</div>
                <div class="meta">${rt.stars ? `<span class="j-stars">${"★".repeat(rt.stars)}</span>` : "טרם דורג"} · ${new Date(e.ts).toLocaleDateString("he-IL", { day: "numeric", month: "short" })}</div>
                ${rt.note ? `<div class="note">"${rt.note}"</div>` : ""}
              </div></div>`;
          }).join("") : `<div class="empty-note">עוד לא ביקרתם באתרים מהיום הזה. סמנו ביקור או דרגו מתוך כרטיס האתר.</div>`}

          <div class="section-label" style="margin:14px 2px 8px">תמונות מהיום</div>
          <div class="photo-grid">
            ${dayPhotoIds(d.id).map(id => `<image-slot id="${id}" shape="rounded" radius="12" placeholder="הוסף תמונה"></image-slot>`).join("")}
          </div>

          <div class="moments-card" style="margin-top:13px">
            <div class="mc-h">🎞️ סרטון רגעים — יום ${d.id}</div>
            <div class="mc-s">סוף יום: מקבץ קצר מהרגעים המיוחדים, מוכן לשיתוף בקישור.</div>
            <div class="mc-thumbs">${A.dayStops(d.id).slice(0, 4).map(() => `<span>📸</span>`).join("")}</div>
            <div style="display:flex;gap:9px">
              <button class="btn btn--accent btn--sm" style="flex:1" data-moments="${d.id}">▶ צפה בסרטון</button>
              <button class="share-btn" data-shareday="${d.id}">שתף</button>
            </div>
          </div>
        </div>`;
      }).join("")}

      <div class="section-label">סוף הטיול</div>
      <div class="tribute">
        <div class="tr-cake">🎂</div>
        <div class="tr-t">סרטון יום ההולדת של שלומי</div>
        <div class="tr-s">מקבץ הרגעים היפים מכל הטיול, עם הקדשה אישית מיפעת — נשלח אוטומטית כשעה אחרי הנחיתה בחזרה.</div>
        <div class="tr-lock" id="tribute-lock">🔒 ${tributeLockText()}</div>
        <div style="margin-top:14px"><button class="btn btn--accent" id="tribute-preview" style="background:#fdf6ea">▶ צפה בתצוגה מקדימה</button></div>
      </div>
      <div style="height:8px"></div>`;

    $$("#screen-journal [data-connect]").forEach(b => b.addEventListener("click", () => toggleConnect(b.dataset.connect)));
    $$("#screen-journal [data-moments]").forEach(b => b.addEventListener("click", () => {
      const day = +b.dataset.moments;
      A.playMoments(dayMomentFrames(day), `סרטון רגעים · יום ${day}`, `רגעים מיום ${day} בוינה`);
    }));
    $$("#screen-journal [data-shareday]").forEach(b => b.addEventListener("click", () => A.sharePrompt(`רגעים מיום ${b.dataset.shareday} בוינה`)));
    $("#tribute-preview").addEventListener("click", () => A.playMoments(tributeFrames(), "סרטון יום ההולדת 🎂", "מתנת יום ההולדת לשלומי"));
  };
  function tributeLockText() {
    const s = A.settings();
    if (s.flightBackDate && s.flightBackTime) {
      const land = A.parseTime(s.flightBackTime, new Date(s.flightBackDate + "T00:00:00"));
      const unlock = A.addMin(land, 60);
      return `ייפתח ב-${unlock.toLocaleDateString("he-IL", { day: "numeric", month: "short" })} בשעה ${A.fmtTime(unlock)}`;
    }
    return "ייפתח שעה אחרי הנחיתה בחזרה";
  }
  function tributeFrames() {
    const r = A.ratings();
    const frames = [{ emoji: "🎂", cap: "שלומי — יום הולדת שמח" }, { emoji: "✈️", cap: "ארבעה ימים. עיר אחת. אלף זיכרונות." }];
    T.days.forEach(d => {
      frames.push({ emoji: "📍", cap: `יום ${d.id} · ${A.dayMeta(d.id).title}` });
      dayPhotoIds(d.id).forEach(id => { const src = slotSrc(id); if (src) frames.push({ img: src, cap: A.dayMeta(d.id).title }); });
    });
    frames.push({ emoji: "💛", cap: "מהאישה שאוהבת אותך — יפעת" });
    frames.push({ emoji: "🥂", cap: "זה הגיל להתחיל לחיות. לחיים, אהובי." });
    return frames;
  }
  function toggleConnect(which) {
    googleOAuthFlow(which);
  }

  /* =====================================================
     מסך תכנון — טיסות, מלון, הגעה, התראות
     ===================================================== */
  function buildReminders() {
    const start = LS.get("start_date", null); if (!start) return [];
    const base = new Date(start + "T00:00:00"); const out = [];
    T.days.forEach((d, i) => {
      const dt = new Date(base); dt.setDate(base.getDate() + i);
      const ds = dt.toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" });
      const stops = A.dayStops(d.id);
      out.push({ t: i === 0 && A.arrivalPlan() ? A.fmtTime(A.arrivalPlan().firstStart) : "08:30", nm: `יום ${d.id}: ${d.title}`, ms: `צאו לכיוון ${stops[0].name}`, d: ds });
      const closer = stops.find(s => /17:30|16:30/.test(s.hours));
      if (closer) out.push({ t: "15:45", nm: "לא לפספס!", ms: `${closer.name} נסגר בקרוב`, d: ds });
    });
    return out;
  }
  window.renderPlan = function () {
    const s = A.settings(), reminders = buildReminders();
    const on = LS.get("reminders_on", true), dyk = LS.get("dyk_on", true), voice = LS.get("voice_on", true);
    const isTaxi = s.transferMethod === "taxi";
    $("#screen-plan").innerHTML = `
      <div class="scr-head"><div class="scr-kicker">תכנון אישי</div><h1 class="scr-title">תכנון הטיול</h1>
        <div class="scr-sub">טיסות, מלון, הגעה מהשדה והתראות — הכל נשמר ומשבץ את המסלול.</div></div>

      <div class="section-label">טיסות</div>
      <div class="card">
        <div class="field-grid">
          <div class="field focusable"><label>המראה (יציאה)</label><input type="date" id="f-outd" value="${s.flightOutDate}"></div>
          <div class="field focusable"><label>שעת המראה</label><input type="time" id="f-outt" value="${s.flightOutTime}"></div>
          <div class="field focusable"><label>נחיתה בוינה — תאריך</label><input type="date" id="f-arrd" value="${s.flightArrDate}"></div>
          <div class="field focusable"><label>שעת נחיתה בוינה</label><input type="time" id="f-arrt" value="${s.flightArrTime}"></div>
          <div class="field focusable"><label>טיסת חזור — תאריך</label><input type="date" id="f-backd" value="${s.flightBackDate}"></div>
          <div class="field focusable"><label>שעת נחיתה בארץ</label><input type="time" id="f-backt" value="${s.flightBackTime}"></div>
        </div>
        ${s.flightArrTime ? `<div class="mini-summary">✈️ <span>הנחיתה בוינה ב-<b>${s.flightArrTime}</b> — יום 1 ייפתח אחרי ההגעה למלון.</span></div>` : ""}
      </div>

      <div class="section-label">המלון</div>
      <div class="card">
        <div class="field focusable field--full" style="margin-bottom:10px"><label>שם המלון</label><input type="text" id="h-name" value="${s.hotelName}" placeholder="לדוגמה: Hotel Am Brillantengrund"></div>
        <div class="field focusable field--full"><label>אזור / מיקום</label>
          <select id="h-area">${T.hotelAreas.map(a => `<option value="${a.id}" ${a.id === s.hotelAreaId ? "selected" : ""}>${a.label}</option>`).join("")}</select>
        </div>
        ${s.hotelName ? `<div class="mini-summary">🏨 <span><b>${s.hotelName}</b> סומן על המפה ומשמש כנקודת הבית של הטיול.</span></div>` : ""}
      </div>

      <div class="section-label">איך מגיעים מהשדה למלון</div>
      <div class="card">
        <div class="seg" id="transfer-seg">
          ${[["cat", "🚆 רכבת CAT"], ["taxi", "🚕 מונית שהוזמנה"], ["transfer", "🚐 שאטל/העברה"], ["train", "🚉 רכבת S7"]].map(([v, l]) => `<button class="${s.transferMethod === v ? "on" : ""}" data-tm="${v}">${l}</button>`).join("")}
        </div>
        ${isTaxi ? `
        <div class="field-grid" style="margin-top:12px">
          <div class="field focusable"><label>חברת מונית</label><input type="text" id="t-co" value="${s.taxiCompany}" placeholder="40100 / Uber"></div>
          <div class="field focusable"><label>שעת איסוף</label><input type="time" id="t-time" value="${s.taxiTime}"></div>
          <div class="field focusable field--full"><label>מס' הזמנה / קוד נהג</label><input type="text" id="t-code" value="${s.taxiCode}" placeholder="לדוגמה: #A4821"></div>
        </div>` : ""}
        <div class="field focusable field--full" style="margin-top:10px"><label>פרטים נוספים (יעד, שם נהג, מחיר מוסכם)</label><textarea id="t-details" placeholder="לשמירה — יוצג לכם ביום ההגעה">${s.transferDetails}</textarea></div>
        <button class="btn btn--sm" id="save-transfer" style="margin-top:12px;width:100%">${IC.check} שמור פרטי הגעה</button>
      </div>

      <div class="section-label">התראות והעדפות</div>
      <div class="card">
        <div class="toggle"><div><div class="tx">תזכורות והתראות</div><div class="ts">קפיצה לפי לוח הזמנים של היום</div></div><label class="switch"><input type="checkbox" id="tg-rem" ${on ? "checked" : ""}><span class="sl"></span></label></div>
        <div class="toggle"><div><div class="tx">פינות ‹הידעת?›</div><div class="ts">מידע היסטורי בכל אתר שמגיעים אליו</div></div><label class="switch"><input type="checkbox" id="tg-dyk" ${dyk ? "checked" : ""}><span class="sl"></span></label></div>
        <div class="toggle"><div><div class="tx">הקול של יפעת</div><div class="ts">ברכות והכוונה קוליות לאורך הדרך</div></div><label class="switch"><input type="checkbox" id="tg-voice" ${voice ? "checked" : ""}><span class="sl"></span></label></div>
        <div class="toggle"><div><div class="tx">מיקום חי (GPS)</div><div class="ts">המלצות מקומיות תוך כדי הליכה</div></div><label class="switch"><input type="checkbox" id="tg-gps" ${s.gps ? "checked" : ""}><span class="sl"></span></label></div>
      </div>
      <button class="btn" id="demo-notif" style="margin-top:4px">${IC.bell} הדגם לי איך עובדות ההתראות</button>

      <div class="section-label">${reminders.length ? "התזכורות שלך" : ""}</div>
      ${reminders.length ? `<div class="card"><div>${reminders.map(r => `<div class="reminder"><span class="rt">${r.t}</span><div class="rb"><div class="nm">${r.nm}</div><div class="ms">${r.ms}</div></div><span class="rd">${r.d}</span></div>`).join("")}</div></div>`
        : `<div class="card"><div class="empty-note">מלאו את תאריך הנחיתה בוינה למעלה כדי לראות כאן את לוח התזכורות המלא.</div></div>`}
      <div style="height:6px"></div>`;
    wirePlan();
  };
  function wirePlan() {
    const bind = (id, key, ev = "change") => { const el = $("#" + id); if (el) el.addEventListener(ev, () => { A.saveSettings({ [key]: el.value }); afterSettings(); }); };
    bind("f-outd", "flightOutDate"); bind("f-outt", "flightOutTime");
    bind("f-arrd", "flightArrDate"); bind("f-arrt", "flightArrTime");
    bind("f-backd", "flightBackDate"); bind("f-backt", "flightBackTime");
    bind("h-name", "hotelName", "input"); bind("h-area", "hotelAreaId");
    $$("#transfer-seg button").forEach(b => b.addEventListener("click", () => { A.saveSettings({ transferMethod: b.dataset.tm }); window.renderPlan(); }));
    const sv = $("#save-transfer");
    if (sv) sv.addEventListener("click", () => {
      A.saveSettings({ transferDetails: ($("#t-details") || {}).value || "", taxiCompany: ($("#t-co") || {}).value || "", taxiTime: ($("#t-time") || {}).value || "", taxiCode: ($("#t-code") || {}).value || "" });
      A.toast("✅", "פרטי ההגעה נשמרו", "יוצגו לכם אוטומטית ביום הנחיתה.");
    });
    $("#tg-rem").addEventListener("change", e => LS.set("reminders_on", e.target.checked));
    $("#tg-dyk").addEventListener("change", e => LS.set("dyk_on", e.target.checked));
    $("#tg-voice").addEventListener("change", e => LS.set("voice_on", e.target.checked));
    $("#tg-gps").addEventListener("change", e => { A.saveSettings({ gps: e.target.checked }); if (e.target.checked) { A.startGPS(); A.toast("📍", "מיקום חי הופעל", "נבקש הרשאת מיקום ונמליץ על מקומות תוך כדי הליכה."); } else A.stopGPS(); });
    $("#demo-notif").addEventListener("click", demoNotifications);
  }
  function afterSettings() { window.renderPlan(); window.renderHome(); window.renderTrip(); A.refreshHotel(); }
  let savedToastOnce = false;
  function demoNotifications() {
    const seq = [
      ["⏰", "תזכורת בוקר", "09:00 — צאו לכיוון קתדרלת סטפנוס. מזג האוויר: 24°, שמשי."],
      ["📍", "אתה מתקרב להופבורג", "300 מ' — הקש לקבלת הכוונה רגלית."],
      ["✨", "המלצה מקומית", "ביצינגר במרחק 80 מ' — הנקניקיות שהווינאים אוהבים. +3 דק'."],
      ["💡", "הידעת?", "בארמון הופבורג מעל 2,600 חדרים — לחץ לקריאה."],
    ];
    seq.forEach((x, i) => setTimeout(() => A.toast(x[0], x[1], x[2], 3800), i * 1500));
  }

  /* =====================================================
     אתחול
     ===================================================== */
  A.buildConfetti();
  window.renderHome(); window.renderTrip();
  // בכניסה הראשונה הברכה נשארת עד לחיצה; בכניסות הבאות היא מוצגת
  // לכמה שניות (ברכת "ברוך השב") וממשיכה לבד לאפליקציה.
  const WELCOME_REVISIT_MS = 6000;
  if (LS.get("seen_welcome", false)) {
    $("#welcome-cta").textContent = "ממשיכים לטייל ✈️";
    setTimeout(() => $("#welcome").classList.add("hidden"), WELCOME_REVISIT_MS);
  }
  const lastTab = LS.get("tab", "home");
  if (lastTab !== "home") A.showScreen(lastTab);
})();
