# 🚀 Notion Branding Remover — Vercel Deploy Guide

Removes the Notion top bar, branding, and buttons from your published Notion page.
**Cost: FREE** (Vercel free tier = 100GB bandwidth / mo, plenty for personal use)

---

## Option A — Deploy via Vercel CLI (fastest)

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Deploy this folder
```bash
cd notion-proxy
vercel
```
- Log in when prompted (creates a free account if you don't have one)
- Answer the setup questions (all defaults are fine)
- Done! Vercel gives you a URL like: `https://notion-proxy-abc123.vercel.app`

---

## Option B — Deploy via GitHub (easiest long-term)

1. Push this folder to a **GitHub repo** (public or private)
2. Go to → https://vercel.com/new
3. Click **"Import Git Repository"** and select your repo
4. Leave all settings as default → click **"Deploy"**
5. Done ✅

Any future `git push` auto-redeploys the proxy.

---

## Option C — Drag & Drop (no Git, no CLI)

1. Go to → https://vercel.com/new
2. Drag the entire `notion-proxy` **folder** onto the page
3. Click **"Deploy"**
4. Done ✅

---

## After Deploy — Test It

Visit your Vercel URL + your Notion page path:

```
https://YOUR-PROJECT.vercel.app/30fcf770ef3d806ca1e7ef068971c759?v=30fcf770ef3d80d2aad1000c829c9fc0
```

You should see your Notion content with **zero Notion branding**. 🎉

---

## Add a Custom Domain (Free)

1. In your Vercel project → **Settings → Domains**
2. Add e.g. `mypage.yourdomain.com`
3. Add the DNS record Vercel shows you (a CNAME)
4. Done — SSL is automatic

---

## Customise

Open `api/proxy.js` and edit the top two lines:

```js
const NOTION_BASE  = "https://constantinos.notion.site"; // ← your Notion subdomain
const CUSTOM_TITLE = "My Page";                          // ← browser tab title
```

To find **your** Notion subdomain, look at your published Notion URL:
`https://YOUR-NAME.notion.site/...`  → use `https://YOUR-NAME.notion.site`

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Top bar still visible | Open DevTools → find the element's class → add it to `CSS` in `proxy.js` |
| Page shows error | Check that `NOTION_BASE` matches your Notion subdomain exactly |
| Images not loading | Normal — images come from Notion's CDN directly, they still work |
| Function timeout | Vercel free tier has a 10s limit; Notion usually responds in <2s |

---

## Files in This Project

```
notion-proxy/
├── api/
│   └── proxy.js     ← the proxy logic (edit NOTION_BASE and CUSTOM_TITLE here)
├── vercel.json      ← routes all traffic through the proxy
├── package.json     ← Node 18 config
└── README.md        ← this file
```
