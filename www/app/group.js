/* ===========================================================
   וינה לשלומי — שיתוף מיקום קבוצתי בזמן אמת
   דורש: Firebase Realtime Database (חינמי)
   =========================================================== */
(function () {
  "use strict";

  /* ---------- הגדרת Firebase ---------- */
  const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyCiwDDwtl_J8nUHSvgSZuTWECbE7PngV2Q",
    authDomain:        "vienna-with-shlomi.firebaseapp.com",
    databaseURL:       "https://vienna-with-shlomi-default-rtdb.firebaseio.com",
    projectId:         "vienna-with-shlomi",
    storageBucket:     "vienna-with-shlomi.firebasestorage.app",
    messagingSenderId: "415704711354",
    appId:             "1:415704711354:web:d4547e1905ad786b1c4283"
  };
  const FIREBASE_READY = FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";

  const A   = window.APP;
  const LS  = A.LS;
  const $   = A.$;
  const $$  = A.$$;

  /* ---------- מצב קבוצה ---------- */
  let db           = null;   // Firebase Database instance
  let groupRef     = null;   // reference to trips/{groupId}/members
  let myRef        = null;   // reference to my own entry
  let gpsWatch     = null;   // navigator.geolocation watchId
  let memberMarkers = {};    // { userId: L.Marker }
  let offlineTimers = {};    // { userId: setIntervalId }

  function groupId()   { return LS.get("group_id",   null); }
  function myUserId()  { return LS.get("group_uid",  null); }
  function myProfile() { return LS.get("group_me",   { name: "אורח", avatar: "🙂", sharing: false }); }
  function setProfile(p){ LS.set("group_me", p); }
  function setGroupId(id){ LS.set("group_id", id); }
  function setMyUserId(id){ LS.set("group_uid", id); }

  /* ---------- זיהוי משתמש ---------- */
  function ensureUserId() {
    let uid = myUserId();
    if (!uid) { uid = Math.random().toString(36).slice(2, 10); setMyUserId(uid); }
    return uid;
  }

  /* ---------- אתחול Firebase ---------- */
  function initFirebase() {
    if (db) return Promise.resolve(db);
    if (!FIREBASE_READY) return Promise.resolve(null);
    return new Promise((resolve) => {
      if (window.firebase && window.firebase.database) {
        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.database();
        resolve(db);
        return;
      }
      /* טוען את Firebase SDK רק כשצריך */
      const scripts = [
        "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js",
        "https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js"
      ];
      let loaded = 0;
      scripts.forEach(src => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = () => {
          loaded++;
          if (loaded === scripts.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
            db = firebase.database();
            resolve(db);
          }
        };
        document.head.appendChild(s);
      });
    });
  }

  /* ---------- הצטרפות / יצירת קבוצה ---------- */
  async function joinGroup(gid, profile) {
    await initFirebase();
    if (!db) { A.toast("⚠️", "Firebase לא מוגדר", "פנו למפתח להשלמת ההגדרה."); return false; }
    setGroupId(gid);
    const uid = ensureUserId();
    setProfile(profile);

    groupRef = db.ref(`groups/${gid}/members`);
    myRef    = groupRef.child(uid);

    const now = Date.now();
    await myRef.set({
      name:    profile.name,
      avatar:  profile.avatar,
      sharing: profile.sharing,
      lat:     null,
      lng:     null,
      ts:      now,
      online:  true
    });

    /* presence — כשמנותק: online=false */
    myRef.child("online").onDisconnect().set(false);
    myRef.child("ts").onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);

    /* האזן לשאר החברים */
    groupRef.on("value", snap => {
      const members = snap.val() || {};
      const myId = uid;
      refreshMemberMarkers(members, myId);
      updateMembersList(members, myId);
    });

    if (profile.sharing) startSharingGPS();
    return true;
  }

  /* ---------- יצירת קבוצה חדשה ---------- */
  function createGroup() {
    const gid = Math.random().toString(36).slice(2, 9).toUpperCase();
    return gid;
  }

  /* ---------- GPS שיתוף ---------- */
  function startSharingGPS() {
    if (gpsWatch) return;
    if (!navigator.geolocation) return;
    gpsWatch = navigator.geolocation.watchPosition(pos => {
      if (!myRef) return;
      const { latitude: lat, longitude: lng } = pos.coords;
      myRef.update({ lat, lng, ts: Date.now(), online: true, sharing: true });
    }, null, { enableHighAccuracy: true, maximumAge: 10000 });
  }

  function stopSharingGPS() {
    if (gpsWatch != null) { navigator.geolocation.clearWatch(gpsWatch); gpsWatch = null; }
    if (myRef) myRef.update({ sharing: false });
    const me = myProfile(); me.sharing = false; setProfile(me);
    /* הסר את המרקר שלי מהמפה של האחרים */
    if (myRef) myRef.update({ lat: null, lng: null });
  }

  /* ---------- מרקרים במפה ---------- */
  function memberIcon(name, avatar, online) {
    const initials = name ? name.charAt(0) : "?";
    const opacity  = online ? 1 : 0.55;
    return L.divIcon({
      className: "",
      html: `<div class="member-pin" style="opacity:${opacity}">
               <div class="member-pin__av">${avatar || initials}</div>
               <div class="member-pin__name">${name}</div>
             </div>`,
      iconSize:   [48, 52],
      iconAnchor: [24, 50]
    });
  }

  function refreshMemberMarkers(members, myId) {
    const map = window._APP_MAP;
    if (!map) return;

    Object.entries(members).forEach(([uid, m]) => {
      if (uid === myId) return;              // אני לא מציג את עצמי
      if (!m.sharing || !m.lat) {           // לא משתף / אין מיקום
        if (memberMarkers[uid]) { map.removeLayer(memberMarkers[uid]); delete memberMarkers[uid]; }
        return;
      }
      const icon = memberIcon(m.name, m.avatar, m.online);
      if (memberMarkers[uid]) {
        memberMarkers[uid].setLatLng([m.lat, m.lng]).setIcon(icon);
      } else {
        memberMarkers[uid] = L.marker([m.lat, m.lng], { icon, zIndexOffset: 900 }).addTo(map);
        memberMarkers[uid].bindTooltip(
          () => {
            const member = members[uid] || {};
            const ago = member.ts ? timeSince(member.ts) : "";
            const status = member.online ? "🟢 מחובר" : `🔴 לפני ${ago}`;
            return `<b>${member.name}</b><br>${status}`;
          },
          { permanent: false, direction: "top" }
        );
      }
    });

    /* הסר מרקרים של חברים שעזבו */
    Object.keys(memberMarkers).forEach(uid => {
      if (!members[uid]) { map.removeLayer(memberMarkers[uid]); delete memberMarkers[uid]; }
    });
  }

  function timeSince(ts) {
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 60) return `${sec} שניות`;
    if (sec < 3600) return `${Math.floor(sec / 60)} דק'`;
    return `${Math.floor(sec / 3600)} שע'`;
  }

  /* ---------- רשימת חברים בפאנל ---------- */
  function updateMembersList(members, myId) {
    const el = document.getElementById("group-members-list");
    if (!el) return;
    const html = Object.entries(members).map(([uid, m]) => {
      const isMe = uid === myId;
      const status = m.online ? "🟢" : `🔴 ${m.ts ? timeSince(m.ts) : ""}`;
      const locText = m.sharing
        ? (m.lat ? "📍 משתף מיקום" : "⏳ ממתין למיקום")
        : "🚫 לא משתף";
      return `<div class="member-row">
        <span class="member-av">${m.avatar || m.name.charAt(0)}</span>
        <div class="member-info">
          <div class="member-nm">${m.name}${isMe ? " (אני)" : ""}</div>
          <div class="member-st">${status} · ${locText}</div>
        </div>
        ${isMe ? `<button class="mt-btn${m.sharing ? " on" : ""}" id="toggle-sharing-btn" style="font-size:11px;padding:6px 10px">${m.sharing ? "📍 פעיל" : "🚫 כבוי"}</button>` : ""}
      </div>`;
    }).join("");
    el.innerHTML = html || "<div class='empty-note'>אין חברים בקבוצה עדיין.</div>";

    const toggleBtn = document.getElementById("toggle-sharing-btn");
    if (toggleBtn) toggleBtn.addEventListener("click", toggleMySharing);
  }

  function toggleMySharing() {
    const me = myProfile();
    me.sharing = !me.sharing;
    setProfile(me);
    if (me.sharing) startSharingGPS();
    else stopSharingGPS();
    if (myRef) myRef.update({ sharing: me.sharing });
    renderGroupPanel();
  }

  /* ---------- בדיקה: האם בתאריכי הטיול ---------- */
  function isWithinTripDates() {
    const s = A.settings();
    if (!s.flightArrDate || !s.flightBackDate) return true; // אם לא הוגדרו — מאפשר תמיד
    const now = new Date().toISOString().slice(0, 10);
    return now >= s.flightArrDate && now <= s.flightBackDate;
  }

  /* ---------- פאנל קבוצה ב-UI ---------- */
  function renderGroupPanel() {
    const el = document.getElementById("group-panel");
    if (!el) return;
    const gid   = groupId();
    const me    = myProfile();
    const inGrp = !!gid && !!db;
    const link  = gid ? (location.origin + location.pathname + "?group=" + gid) : "";

    el.innerHTML = inGrp ? `
      <div class="gp-header">
        <span class="gp-badge">👥 קבוצה: <b>${gid}</b></span>
        <button class="mt-btn on" id="gp-leave">עזוב</button>
      </div>
      <div class="gp-link-row">
        <span class="gp-link" id="gp-link">${link}</span>
        <button class="mt-btn" id="gp-copy">📋 העתק</button>
        <button class="mt-btn" id="gp-qr">QR</button>
      </div>
      <div class="gp-members" id="group-members-list"></div>
    ` : `
      <div class="gp-join">
        <div class="gp-my-profile">
          <div class="gp-avatar-pick" id="gp-avatar-pick">${me.avatar || "🙂"}</div>
          <input class="gp-name-input" id="gp-name-input" type="text" placeholder="השם שלך" value="${me.name === "אורח" ? "" : me.name}" maxlength="20">
        </div>
        <label class="toggle gp-consent">
          <div class="tx">שתף את המיקום שלי עם הקבוצה</div>
          <label class="switch"><input type="checkbox" id="gp-sharing" ${me.sharing ? "checked" : ""}><span class="sl"></span></label>
        </label>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn--accent" style="flex:1" id="gp-create">➕ צור קבוצה</button>
          <button class="btn btn--ghost" style="flex:1" id="gp-join-btn">🔗 הצטרף</button>
        </div>
      </div>
    `;

    wireGroupPanel(inGrp);
  }

  const AVATARS = ["🙂","😎","🦁","🌟","🐺","🦊","🐧","🌈","🎩","🏔️","🎸","🍕"];
  let avatarIdx = 0;

  function wireGroupPanel(inGroup) {
    if (inGroup) {
      document.getElementById("gp-leave")?.addEventListener("click", leaveGroup);
      document.getElementById("gp-copy")?.addEventListener("click", () => {
        const link = document.getElementById("gp-link")?.textContent;
        if (link) navigator.clipboard?.writeText(link).then(() => A.toast("📋", "הועתק!", "שלחו את הקישור לחברים."));
      });
      document.getElementById("gp-qr")?.addEventListener("click", showQR);
    } else {
      document.getElementById("gp-avatar-pick")?.addEventListener("click", () => {
        avatarIdx = (avatarIdx + 1) % AVATARS.length;
        document.getElementById("gp-avatar-pick").textContent = AVATARS[avatarIdx];
      });
      document.getElementById("gp-create")?.addEventListener("click", async () => {
        const name    = document.getElementById("gp-name-input")?.value.trim() || "אורח";
        const avatar  = document.getElementById("gp-avatar-pick")?.textContent || "🙂";
        const sharing = document.getElementById("gp-sharing")?.checked ?? false;
        if (!sharing && !confirm("אתה בוחר לא לשתף מיקום. האחרים לא יראו אותך במפה. להמשיך?")) return;
        const gid   = createGroup();
        const ok    = await joinGroup(gid, { name, avatar, sharing });
        if (ok) { A.toast("👥", "קבוצה נוצרה!", "שלחו את הקישור לחברים."); renderGroupPanel(); }
      });
      document.getElementById("gp-join-btn")?.addEventListener("click", async () => {
        const code = prompt("הזינו קוד קבוצה:");
        if (!code) return;
        const name    = document.getElementById("gp-name-input")?.value.trim() || "אורח";
        const avatar  = document.getElementById("gp-avatar-pick")?.textContent || "🙂";
        const sharing = document.getElementById("gp-sharing")?.checked ?? false;
        const ok = await joinGroup(code.trim().toUpperCase(), { name, avatar, sharing });
        if (ok) { A.toast("✅", "הצטרפת!", "המיקום שלך מוצג לחברי הקבוצה."); renderGroupPanel(); }
      });
    }
  }

  /* ---------- QR Code ---------- */
  function showQR() {
    const gid  = groupId();
    if (!gid) return;
    const link = location.origin + location.pathname + "?group=" + gid;
    /* qrcodejs — נטען לפי דרישה */
    function openQRModal() {
      let modal = document.getElementById("qr-modal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "qr-modal";
        modal.className = "scrim open";
        modal.style.cssText = "display:flex;align-items:center;justify-content:center;z-index:900;";
        modal.innerHTML = `<div class="card" style="text-align:center;padding:24px;max-width:280px">
          <div style="font-weight:700;font-size:17px;margin-bottom:16px">📲 סרקו להצטרפות</div>
          <div id="qr-canvas"></div>
          <div style="font-size:12px;color:var(--muted);margin-top:12px;word-break:break-all">${link}</div>
          <button class="btn btn--ghost" style="margin-top:16px;width:100%" id="qr-close">סגור</button>
        </div>`;
        document.querySelector(".phone__screen").appendChild(modal);
        document.getElementById("qr-close").addEventListener("click", () => modal.remove());
        modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
      }
      if (window.QRCode) {
        new QRCode(document.getElementById("qr-canvas"), { text: link, width: 220, height: 220 });
      } else {
        /* fallback: API-based QR image */
        const img = document.createElement("img");
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(link)}`;
        img.style.width = "220px";
        document.getElementById("qr-canvas").appendChild(img);
      }
    }
    openQRModal();
  }

  /* ---------- עזיבת קבוצה ---------- */
  function leaveGroup() {
    stopSharingGPS();
    if (groupRef) groupRef.off();
    if (myRef) myRef.update({ online: false, sharing: false });
    Object.values(memberMarkers).forEach(m => { try { window._APP_MAP && window._APP_MAP.removeLayer(m); } catch(e){} });
    memberMarkers = {};
    db = null; groupRef = null; myRef = null;
    LS.set("group_id", null);
    A.toast("🔌", "עזבת את הקבוצה", "");
    renderGroupPanel();
  }

  /* ---------- הצטרפות אוטומטית מקישור ---------- */
  function checkGroupInvite() {
    const params = new URLSearchParams(location.search);
    const gid    = params.get("group");
    if (!gid) return;
    /* נקה מה-URL מבלי לרענן */
    history.replaceState({}, "", location.pathname);
    /* שמור ב-session לטיפול אחרי קביעת פרופיל */
    sessionStorage.setItem("pending_group", gid);
    A.toast("👥", "הוזמנת לקבוצה", `קוד: ${gid} — עברו למפה כדי להצטרף.`, 5000);
  }

  /* ---------- כפתור קבוצה על מסך המפה ---------- */
  function injectGroupButton() {
    if (document.getElementById("group-fab")) return;
    const btn = document.createElement("button");
    btn.id = "group-fab";
    btn.className = "group-fab";
    btn.setAttribute("aria-label", "קבוצה");
    btn.innerHTML = `<span id="group-fab-ic">👥</span>`;
    document.getElementById("screen-map")?.appendChild(btn);
    btn.addEventListener("click", openGroupDrawer);
  }

  let drawerOpen = false;
  function openGroupDrawer() {
    let drawer = document.getElementById("group-drawer");
    if (!drawer) {
      drawer = document.createElement("div");
      drawer.id = "group-drawer";
      drawer.className = "group-drawer";
      document.querySelector(".phone__screen").appendChild(drawer);
    }
    drawerOpen = !drawerOpen;
    drawer.classList.toggle("open", drawerOpen);
    if (drawerOpen) {
      /* הצג קוד ממתין אם הגיע מקישור */
      const pending = sessionStorage.getItem("pending_group");
      if (pending && !groupId()) {
        sessionStorage.removeItem("pending_group");
        setTimeout(async () => {
          const name    = myProfile().name !== "אורח" ? myProfile().name : "";
          const avatar  = myProfile().avatar || "🙂";
          const sharing = true;
          if (name) {
            await joinGroup(pending, { name, avatar, sharing });
            renderGroupPanel();
          }
          /* אם אין שם, המשתמש יצטרך למלא */
        }, 200);
      }
      renderGroupPanel();
    }
  }

  /* ---------- חשיפת API ---------- */
  window.GROUP = {
    init: function() {
      injectGroupButton();
      checkGroupInvite();
      /* חזור לקבוצה קיימת אחרי רענון */
      const gid = groupId();
      if (gid && myProfile().name !== "אורח") {
        const me = myProfile();
        initFirebase().then(() => {
          if (db) joinGroup(gid, me);
        });
      }
    },
    renderPanel:    renderGroupPanel,
    leaveGroup,
    toggleSharing:  toggleMySharing,
  };

  /* ---------- אתחול אחרי טעינת המפה ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    /* ממתין לאתחול APP ואז מפעיל */
    const waitForApp = setInterval(() => {
      if (window.APP && window.APP.T) {
        clearInterval(waitForApp);
        window.GROUP.init();
      }
    }, 200);
  });

})();
