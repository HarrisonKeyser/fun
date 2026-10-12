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
4. Visit `https://senet-data.<your-subdomain>.workers.dev/health`. It should say `senet5: 25 of 25 files, all the right size (17.12 GB). Ready!`
5. Put that address (without `/health`) in `SOLUTION_URL` in `src/pages/SenetPage/grandmaster.js`.

To update the Worker later, repeat step 2.

## Allowed sites

`ALLOWED_ORIGINS` in `worker.js` lists the sites whose pages may read the data (the live site plus `localhost` for `npm run dev` / `npm run preview`). Add an address there if the site ever moves.
