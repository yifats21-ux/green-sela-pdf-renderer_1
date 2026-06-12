/* ===========================================================
   וינה לשלומי — שכבת הגישור לנייטיב (Capacitor)
   נטען לפני סקריפטי האפליקציה ואחראי על:
   1. מסך מלא על מכשיר אמיתי (body.native-shell)
   2. אחסון עמיד: שיקוף localStorage ל-Capacitor Preferences
      (iOS עלולה לפנות localStorage — Preferences לא נמחק)
   3. GPS אמיתי: navigator.geolocation מנותב לפלאגין Geolocation
   4. סטטוס-בר, splash, וכפתור Back של אנדרואיד
   האפליקציה עצמה (app.js וכו') לא יודעת שהיא רצה בנייטיב.
   =========================================================== */
(function () {
  "use strict";

  var cap = window.Capacitor;
  var isNative = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  var P = (cap && cap.Plugins) || {};
  var KEY_PREFIX = "vie_";

  /* ---------- 1. מעטפת מסך מלא ---------- */
  var smallScreen = window.matchMedia("(max-width: 520px)").matches;
  if (isNative || smallScreen) {
    document.documentElement.classList.add("native-shell");
    document.addEventListener("DOMContentLoaded", function () {
      document.body.classList.add("native-shell");
    });
  }

  /* ---------- 3. GPS אמיתי דרך הפלאגין ---------- */
  function bridgeGeolocation() {
    var G = P.Geolocation;
    if (!isNative || !G || !navigator.geolocation) return;
    var watches = {};
    var nextId = 1;
    navigator.geolocation.getCurrentPosition = function (ok, err, opts) {
      G.getCurrentPosition(opts || { enableHighAccuracy: true }).then(ok, err || function () {});
    };
    navigator.geolocation.watchPosition = function (ok, err, opts) {
      var id = nextId++;
      watches[id] = G.watchPosition(opts || { enableHighAccuracy: true }, function (pos, e) {
        if (e) { if (err) err(e); return; }
        if (pos) ok(pos);
      });
      return id;
    };
    navigator.geolocation.clearWatch = function (id) {
      var p = watches[id];
      delete watches[id];
      if (p) p.then(function (nativeId) { G.clearWatch({ id: nativeId }); });
    };
  }

  /* ---------- 2. אחסון עמיד (Preferences) ---------- */
  function mirrorStorageWrites() {
    var Prefs = P.Preferences;
    if (!isNative || !Prefs) return;
    var origSet = Storage.prototype.setItem;
    var origRemove = Storage.prototype.removeItem;
    Storage.prototype.setItem = function (k, v) {
      origSet.call(this, k, v);
      if (this === window.localStorage && k.indexOf(KEY_PREFIX) === 0) {
        Prefs.set({ key: k, value: String(v) }).catch(function () {});
      }
    };
    Storage.prototype.removeItem = function (k) {
      origRemove.call(this, k);
      if (this === window.localStorage && k.indexOf(KEY_PREFIX) === 0) {
        Prefs.remove({ key: k }).catch(function () {});
      }
    };
  }

  function hydrateStorage() {
    var Prefs = P.Preferences;
    if (!isNative || !Prefs) return Promise.resolve();
    return Prefs.keys().then(function (res) {
      var keys = (res.keys || []).filter(function (k) { return k.indexOf(KEY_PREFIX) === 0; });
      return Promise.all(keys.map(function (k) {
        return Prefs.get({ key: k }).then(function (r) {
          if (r.value != null) {
            try { localStorage.setItem(k, r.value); } catch (e) {}
          }
        });
      }));
    }).catch(function () {});
  }

  /* ---------- 4. כרום נייטיבי ---------- */
  function nativeChrome() {
    if (!isNative) return;
    if (P.StatusBar) {
      P.StatusBar.setOverlaysWebView({ overlay: true }).catch(function () {});
      P.StatusBar.setStyle({ style: "DARK" }).catch(function () {}); // אייקונים כהים על נייר בהיר
    }
    if (P.App) {
      P.App.addListener("backButton", function (ev) {
        // סוגר שכבות-על פתוחות לפני יציאה מהאפליקציה
        var welcome = document.getElementById("welcome");
        var walk = document.getElementById("walk");
        var sheet = document.getElementById("sheet");
        var scrim = document.getElementById("scrim");
        var player = document.getElementById("player");
        if (player && player.classList.contains("open")) {
          var pc = document.getElementById("player-close"); if (pc) pc.click();
        } else if (walk && walk.classList.contains("open")) {
          var c = document.getElementById("walk-close"); if (c) c.click();
        } else if (sheet && sheet.classList.contains("open")) {
          if (scrim) scrim.click();
        } else if (welcome && !welcome.classList.contains("hidden")) {
          var s = document.getElementById("welcome-skip"); if (s) s.click();
        } else if (!ev.canGoBack) {
          P.App.minimizeApp ? P.App.minimizeApp() : P.App.exitApp();
        }
      });
    }
  }

  /* ---------- אתחול: קודם שחזור אחסון, ואז סקריפטי האפליקציה ---------- */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  var APP_SCRIPTS = ["app/image-slot.js", "app/data.js", "app/app.js", "app/app-plan.js"];

  function boot() {
    // כשרצים כאתר/PWA (לא בתוך האפליקציה הנייטיבית) — עבודה אופליין
    if (!isNative && "serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
    mirrorStorageWrites();
    bridgeGeolocation();
    hydrateStorage().then(function () {
      return APP_SCRIPTS.reduce(function (chain, src) {
        return chain.then(function () { return loadScript(src); });
      }, Promise.resolve());
    }).then(function () {
      nativeChrome();
      if (isNative && P.SplashScreen) P.SplashScreen.hide().catch(function () {});
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
