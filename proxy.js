// api/proxy.js — Vercel Serverless Function
// Proxies your Notion page and strips all Notion branding.

const NOTION_BASE  = "https://constantinos.notion.site"; // public Notion subdomain
const CUSTOM_TITLE = "My Page";                          // ← change browser tab title here

// ─── CSS: hides all Notion UI elements ───────────────────────
const CSS = `
  /* Hide Notion top bar */
  .notion-topbar,
  .notion-topbar-share-menu,
  [class*="notionTopbar"],
  [class*="topBar"],
  header.notion-header,
  div[style*="z-index: 1000"][style*="position: fixed"][style*="top: 0"],
  div[style*="z-index:1000"][style*="position:fixed"][style*="top:0"] {
    display: none !important;
    height: 0 !important;
    overflow: hidden !important;
    pointer-events: none !important;
  }
  /* Remove top padding Notion adds for its bar */
  .notion-frame,
  .notion-page-content,
  .notion-cursor-listener {
    padding-top: 0 !important;
    margin-top: 0 !important;
    top: 0 !important;
  }
  /* Hide Notion footer / powered-by badge */
  .notion-spacer,
  div[class*="poweredBy"],
  footer { display: none !important; }
  /* Hide share/duplicate buttons */
  .notion-topbar-action-buttons { display: none !important; }
`;

// ─── JS: MutationObserver to catch dynamically added bar ─────
const JS = `
<script>
(function(){
  function nuke(){
    [".notion-topbar","[class*='notionTopbar']","[class*='topBar']"].forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){
        el.style.cssText="display:none!important;height:0!important;";
      });
    });
    document.querySelectorAll("body > div").forEach(function(el){
      var s=window.getComputedStyle(el);
      if(s.position==="fixed"&&parseInt(s.top)===0&&parseInt(s.zIndex)>100)
        el.style.cssText="display:none!important;";
    });
  }
  nuke();
  new MutationObserver(nuke).observe(document.documentElement,{childList:true,subtree:true});
})();
</script>
`;

// Headers we never forward to the browser
const BLOCKED_HEADERS = new Set([
  "x-frame-options",
  "content-security-policy",
  "content-security-policy-report-only",
  "transfer-encoding",
  "connection",
  "keep-alive",
  "upgrade",
]);

// ─── Vercel handler ───────────────────────────────────────────
export default async function handler(req, res) {
  // Build the upstream Notion URL from the incoming request path
  const upstreamURL = NOTION_BASE + req.url;

  let notionRes;
  try {
    notionRes = await fetch(upstreamURL, {
      method: req.method,
      headers: buildHeaders(req.headers),
      body: ["POST", "PUT", "PATCH"].includes(req.method) ? req : undefined,
    });
  } catch (e) {
    return res.status(502).send("Upstream error: " + e.message);
  }

  const contentType = notionRes.headers.get("content-type") || "";

  // ── Pass-through non-HTML (assets, fonts, JS bundles, etc.) ──
  if (!contentType.includes("text/html")) {
    res.status(notionRes.status);
    for (const [k, v] of notionRes.headers.entries()) {
      if (!BLOCKED_HEADERS.has(k.toLowerCase())) res.setHeader(k, v);
    }
    const buffer = await notionRes.arrayBuffer();
    return res.end(Buffer.from(buffer));
  }

  // ── Transform HTML ────────────────────────────────────────────
  let html = await notionRes.text();

  // 1. Inject CSS + JS before </head>
  html = html.replace("</head>", `<style>${CSS}</style>${JS}</head>`);

  // 2. Replace <title>
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${CUSTOM_TITLE}</title>`);

  // 3. Rewrite Notion absolute links to go through the proxy
  const proxyOrigin = `https://${req.headers.host}`;
  html = html.split(NOTION_BASE).join(proxyOrigin);

  // 4. Send response
  res.status(notionRes.status);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.end(html);
}

function buildHeaders(incoming) {
  const out = { ...incoming };
  out["host"] = new URL(NOTION_BASE).host;
  // Strip Vercel-specific headers Notion doesn't need
  delete out["x-forwarded-for"];
  delete out["x-vercel-id"];
  delete out["x-real-ip"];
  delete out["x-vercel-forwarded-for"];
  return out;
}
