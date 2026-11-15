# bradleykakiz.com

Static personal site: plain HTML and CSS, with no build step.

- `index.html`: home (about, experience, projects, contact)
- `signalnorth.html`: SignalNorth project page (walkthrough video, screenshots, sample downloads)
- `css/site.css`: all styles
- `img/`: headshot, screenshots, favicon
- `media/signalnorth-walkthrough.mp4`: walkthrough video
- `samples/`: downloadable sample workbooks (illustrative numbers only)
- `cv/Bradley-Kakiz-CV.pdf`: CV without the phone number

## Publish on GitHub Pages

1. Create a public repo named `BBradleyyy.github.io`.
2. Upload everything in this folder to the repo root.
3. Go to Settings → Pages → Source and choose "Deploy from a branch", branch `main`, folder `/ (root)`.
4. The site is live at https://bbradleyyy.github.io within a minute or two.

## Custom domain (bradleykakiz.com)

1. Buy the domain, for example at Cloudflare Registrar.
2. Add these DNS records:
   - four `A` records for `@`: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
   - `CNAME` `www` → `bbradleyyy.github.io`
   - On Cloudflare, set these records to "DNS only" (grey cloud).
3. In the repo, go to Settings → Pages → Custom domain, enter `bradleykakiz.com`, then tick "Enforce HTTPS" once it appears.

To redirect a second domain (dogukankakiz.com), use a Cloudflare Redirect Rule: send everything to `https://bradleykakiz.com` with a 301.

## Updating

- To add a sample, put the `.xlsx` in `samples/` and add a row where `SAMPLE-ROWS` is marked in `signalnorth.html`.
- To update the CV, replace `cv/Bradley-Kakiz-CV.pdf` and keep the same file name.
