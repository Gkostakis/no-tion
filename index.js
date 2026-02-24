// pages/index.js

const NOTION_URL = "https://constantinos.notion.site/30fcf770ef3d806ca1e7ef068971c759?v=30fcf770ef3d80d2aad1000c829c9fc0";
const CUSTOM_TITLE = "My Page"; // ← change this

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

const JS = `
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
`;

export default function Page() {
  return null;
}

export async function getServerSideProps({ res }) {
  let notionRes;
  try {
    notionRes = await fetch(NOTION_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NotionProxy/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
  } catch (e) {
    res.statusCode = 502;
    res.end("Could not reach Notion: " + e.message);
    return { props: {} };
  }

  let html = await notionRes.text();

  // Inject our CSS + JS
  html = html.replace("</head>", `<style>${CSS}</style><script>${JS}</script></head>`);

  // Replace title
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${CUSTOM_TITLE}</title>`);

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
  res.end(html);

  return { props: {} };
}
