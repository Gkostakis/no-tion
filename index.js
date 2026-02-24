// api/index.js — Vercel Serverless Function (CommonJS)

const NOTION_BASE  = "https://constantinos.notion.site";
const CUSTOM_TITLE = "My Page"; // ← change your page title here

const CSS = `
  .notion-topbar,
  .notion-topbar-share-menu,
  [class*="notionTopbar"],
  [class*="topBar"],
  header.notion-header,
  div[style*="z-index: 1000"][style*="position: fixed"][style*="top: 0"] {
    display: none !important;
    height: 0 !important;
    overflow: hidden !important;
    pointer-events: none !important;
  }
  .notion-frame, .notion-page-content, .notion-cursor-listener {
    padding-top: 0 !important;
    margin-top: 0 !important;
    top: 0 !important;
  }
  .notion-spacer, div[class*="poweredBy"], footer,
  .notion-topbar-action-buttons { display: none !important; }
`;

const JS = `<script>
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
</script>`;

const BLOCKED = new Set([
  "x-frame-options","content-security-policy",
  "content-security-policy-report-only",
  "transfer-encoding","connection","keep-alive","upgrade"
]);

module.exports = async function handler(req, res) {
  const upstreamURL = NOTION_BASE + req.url;

  let notionRes;
  try {
    notionRes = await fetch(upstreamURL, {
      method: req.method,
      headers: buildHeaders(req.headers),
    });
  } catch (e) {
    return res.status(502).send("Proxy error: " + e.message);
  }

  const contentType = notionRes.headers.get("content-type") || "";

  // Pass-through non-HTML assets
  if (!contentType.includes("text/html")) {
    res.status(notionRes.status);
    for (const [k, v] of notionRes.headers.entries()) {
      if (!BLOCKED.has(k.toLowerCase())) res.setHeader(k, v);
    }
    const buf = await notionRes.arrayBuffer();
    return res.end(Buffer.from(buf));
  }

  // Transform HTML
  let html = await notionRes.text();
  html = html.replace("</head>", `<style>${CSS}</style>${JS}</head>`);
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${CUSTOM_TITLE}</title>`);
  const origin = "https://" + req.headers.host;
  html = html.split(NOTION_BASE).join(origin);

  res.status(notionRes.status);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.end(html);
};

function buildHeaders(h) {
  const out = Object.assign({}, h);
  out["host"] = "constantinos.notion.site";
  delete out["x-forwarded-for"];
  delete out["x-vercel-id"];
  delete out["x-real-ip"];
  delete out["x-vercel-forwarded-for"];
  return out;
}
