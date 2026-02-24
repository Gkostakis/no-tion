// api/proxy.js  —  Vercel Serverless Function (Node.js runtime)
// Proxies your Notion page and strips all Notion branding.

const NOTION_BASE  = "https://constantinos.notion.site"; // ← your Notion subdomain
const CUSTOM_TITLE = "My Page";                          // ← browser tab title

// ─── CSS injected into every HTML page ───────────────────────
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

// ─── JS injected — MutationObserver to nuke bar on load ──────
const JS = `
<script>
(function(){
  function nuke(){
    [".notion-topbar","[class*='notionTopbar']","[class*='topBar']"].forEach(sel=>{
      document.querySelectorAll(sel).forEach(el=>{
        el.style.cssText="display:none!important;height:0!important;";
      });
    });
    document.querySelectorAll("body > div").forEach(el=>{
      const s=window.getComputedStyle(el);
      if(s.position==="fixed"&&parseInt(s.top)===0&&parseInt(s.zIndex)>100)
        el.style.cssText="display:none!important;";
    });
  }
  nuke();
  new MutationObserver(nuke).observe(document.documentElement,{childList:true,subtree:true});
})();
</script>
`;

// ─── Main handler ─────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // Build the upstream Notion URL
  const upstreamURL = NOTION_BASE + req.url;

  let notionRes;
  try {
    notionRes = await fetch(upstreamURL, {
      method:  req.method,
      headers: buildHeaders(req.headers),
      // forward body for POST requests (search, etc.)
      body: ["POST","PUT","PATCH"].includes(req.method) ? req : undefined,
    });
  } catch (e) {
    res.status(502).send("Upstream error: " + e.message);
    return;
  }

  const contentType = notionRes.headers.get("content-type") || "";

  // ── Pass-through non-HTML assets (JS, CSS, images, fonts…) ──
  if (!contentType.includes("text/html")) {
    res.status(notionRes.status);
    // Forward safe headers
    for (const [k, v] of notionRes.headers.entries()) {
      if (!BLOCKED_HEADERS.has(k.toLowerCase())) res.setHeader(k, v);
    }
    // Stream binary body
    const buffer = await notionRes.arrayBuffer();
    res.end(Buffer.from(buffer));
    return;
  }

  // ── Transform HTML ────────────────────────────────────────────
  let html = await notionRes.text();

  // 1. Inject our CSS + JS into <head>
  html = html.replace(
    "</head>",
    `<style id="notion-nuke">${CSS}</style>${JS}</head>`
  );

  // 2. Replace <title>
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${CUSTOM_TITLE}</title>`);

  // 3. Rewrite absolute Notion links so they go through the proxy
  const workerOrigin = `https://${req.headers.host}`;
  html = html.split(NOTION_BASE).join(workerOrigin);

  // 4. Send
  res.status(notionRes.status);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Remove headers that would break the proxy
  res.removeHeader("x-frame-options");
  res.removeHeader("content-security-policy");
  res.end(html);
};

// Headers we never forward to the client
const BLOCKED_HEADERS = new Set([
  "x-frame-options",
  "content-security-policy",
  "content-security-policy-report-only",
  "transfer-encoding",
  "connection",
  "keep-alive",
  "upgrade",
]);

function buildHeaders(incoming) {
  const out = { ...incoming };
  // Point host at Notion
  out["host"] = new URL(NOTION_BASE).host;
  // Remove Cloudflare / Vercel specific headers Notion doesn't need
  delete out["x-forwarded-for"];
  delete out["x-vercel-id"];
  delete out["x-real-ip"];
  return out;
}
