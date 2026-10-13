# Senet data Worker

Serves the solved Senet tables to the website's Grandmaster (`src/pages/SenetPage/grandmaster.js`).

- **Storage:** Cloudflare R2 bucket `senet`, holding the 25 files `senet5-layer-<a>-<b>.u16` from the solver (about 17 GB, roughly $0.11/month beyond R2's free 10 GB).
- **Worker:** `worker.js`. It answers small byte-range requests (2 bytes per lookup) from harrisonkeyser.fun, and refuses anything larger than 64 KB, so the tables can't be bulk-downloaded through it.
- **Address:** the Worker's free `workers.dev` address, so the domain's DNS (and Namecheap email forwarding) stay untouched. Free plan: 100,000 requests per day; a game against Grandmaster uses about 150–200.

## Uploading the solution (PowerShell, with rclone)

```
rclone copy C:\senet\five r2:senet --include "*.u16" --s3-upload-cutoff=100M --s3-chunk-size=100M --transfers 4 --progress
rclone check C:\senet\five r2:senet --include "*.u16" --one-way
```

## Creating the Worker (Cloudflare dashboard)

1. **Workers & Pages** → **Create** → start from the **Hello World** Worker → name it `senet-data` → **Deploy**.
2. **Edit code**: replace everything with the contents of `worker.js` → **Deploy**.
3. Open the Worker's **Settings** → **Bindings** → **Add** → **R2 bucket**. Variable name: `BUCKET`; bucket: `senet`. Save (and deploy again if asked).
4. Visit `https://senet-data.<your-subdomain>.workers.dev/health`. It should say `senet5-layer-5-5.u16 is in the bucket and the right size (10.10 GB). Ready!` (To check all 25 files, run the `rclone check` line above.)
5. Put that address (without `/health`) in `SOLUTION_URL` in `src/pages/SenetPage/grandmaster.js`.

To update the Worker later, repeat step 2.

## Allowed sites

`ALLOWED_ORIGINS` in `worker.js` lists the sites whose pages may read the data (the live site plus `localhost` for `npm run dev` / `npm run preview`). Add an address there if the site ever moves.

## Keeping the bill near zero

Cloudflare has no hard spending cap, so the setup itself keeps costs bounded:

- **The Worker stays on the Workers Free plan.** It allows 100,000 requests a day; past that, Cloudflare refuses requests (error 1027) until midnight UTC and charges nothing. The site then falls back to Medium and the review shows "Try Again". Upgrading to Workers Paid removes that cap, so don't.
- **Each request makes at most one cheap R2 read** ("Class B": a lookup, or the single check on `/health`). 100,000 a day is about 3.1 million a month, under R2's free 10 million. Don't add `bucket.list()` or loops of reads to the Worker; listing is the expensive kind ("Class A").
- **No other way in:** the bucket's public `r2.dev` address stays off, with no custom domain, and no R2 API tokens are kept around (make one for an upload, then delete it).
- A **budget alert** (Billing → Billable Usage) emails if spending ever passes $1. It only warns; it doesn't stop anything.

Worst case with all of that in place: storage only, about $0.11/month.
