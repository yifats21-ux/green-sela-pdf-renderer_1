/* ===========================================================
   וינה לשלומי — Backend עבור Google OAuth ו-Google Photos
   הרץ עם: node backend.js
   =========================================================== */
const http = require("http");
const https = require("https");
const url = require("url");
const qs = require("querystring");

const PORT = 3001;

// מלאו את הפרטים מ-Google Cloud Console
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "YOUR_CLIENT_SECRET";
const REDIRECT_URI = "http://localhost:8080/oauth-callback.html";

function makeRequest(method, hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const options = { hostname, path, method, headers };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function exchangeCodeForToken(code) {
  const body = qs.stringify({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code"
  });

  const res = await makeRequest(
    "POST",
    "oauth2.googleapis.com",
    "/token",
    { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": body.length },
    body
  );

  if (res.status !== 200) {
    throw new Error(`OAuth token exchange failed: ${res.body}`);
  }

  return JSON.parse(res.body);
}

async function fetchPhotosFromDate(accessToken, startDate, endDate) {
  const body = JSON.stringify({
    pageSize: 25,
    filters: {
      dateFilter: {
        ranges: [{
          startDate: {
            year: startDate.getFullYear(),
            month: startDate.getMonth() + 1,
            day: startDate.getDate()
          },
          endDate: {
            year: endDate.getFullYear(),
            month: endDate.getMonth() + 1,
            day: endDate.getDate()
          }
        }]
      }
    }
  });

  const res = await makeRequest(
    "POST",
    "photoslibrary.googleapis.com",
    "/v1/mediaItems:search",
    {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Content-Length": body.length
    },
    body
  );

  if (res.status !== 200) {
    console.error(`Photos fetch failed: ${res.body}`);
    return { mediaItems: [] };
  }

  return JSON.parse(res.body);
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // OAuth token exchange endpoint
  if (pathname === "/api/google-oauth-exchange" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        const { code, service } = data;

        if (!code) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "קוד OAuth חסר" }));
          return;
        }

        const tokenData = await exchangeCodeForToken(code);
        console.log(`✅ User authenticated for ${service}`);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ accessToken: tokenData.access_token }));
      } catch (error) {
        console.error("OAuth error:", error.message);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Google Photos fetch endpoint
  if (pathname === "/api/google-photos-fetch" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        const { accessToken, startDate, endDate } = data;

        if (!accessToken) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "אין אישור גישה" }));
          return;
        }

        const photos = await fetchPhotosFromDate(
          accessToken,
          new Date(startDate),
          new Date(endDate)
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(photos));
      } catch (error) {
        console.error("Photos fetch error:", error.message);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "אנדפוינט לא קיים" }));
});

server.listen(PORT, () => {
  console.log(`\n🔐 Google OAuth Backend רץ על http://localhost:${PORT}`);
  console.log(`\nהגדרה נדרשת:`);
  console.log(`  export GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"`);
  console.log(`  export GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET"`);
  console.log(`  node backend.js\n`);

  if (GOOGLE_CLIENT_ID.includes("YOUR_")) {
    console.warn("⚠️  CLIENT_ID/SECRET עדיין לא הוגדרו!\n");
  }
});
