# Serina Li Marketing Portfolio — static export

This is a fully static, framework-free export of the portfolio. No build
step, no Node, no server-side code required — just HTML, CSS, vanilla JS,
and the image/video assets, ready to serve from nginx.

## What's in here

```
index.html        Homepage (hero, about, all projects, skills cart, footer)
project1.html      Project 01 — Social media content
project2.html      Project 02 — Branding + Product Marketing
project3.html      Project 03 — Web, SEO and copy
project4.html      Project 04 — Event engagement
assets/            Images, videos, and favicon
assets/js/main.js  Vanilla JS for the homepage's interactive bits:
                   hamburger menu, project-list hover reveal, the
                   "shopping cart" skills animation, the footer bunny
                   mascot that follows your cursor, and scroll-reveal
                   animations. The four project pages are plain static
                   HTML/CSS and need no JS at all.
nginx/serinali-portfolio.conf   Ready-to-edit nginx server block
```

Total size is about 17 MB, mostly the photo/video assets.

## Deploying to your VM

1. Copy the whole `export/` folder to your VM, e.g. from your machine:

   ```
   rsync -avz ./export/ youruser@your-vm-ip:/var/www/serinali-portfolio/
   ```

   (or `scp -r export youruser@your-vm-ip:/tmp/` then `mv` it into place).

2. On the VM, install the nginx config:

   ```
   sudo cp /var/www/serinali-portfolio/nginx/serinali-portfolio.conf \
       /etc/nginx/sites-available/serinali-portfolio
   sudo ln -s /etc/nginx/sites-available/serinali-portfolio \
       /etc/nginx/sites-enabled/
   ```

   Open the copied conf file and replace `example.com` with your real
   domain (or the VM's IP if you're not using a domain yet), and double
   check `root` points at wherever you put the files
   (`/var/www/serinali-portfolio` by default).

3. Test and reload nginx:

   ```
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. (Optional, recommended) Add HTTPS with Let's Encrypt, once a domain
   points at the VM:

   ```
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d example.com -d www.example.com
   ```

   Certbot edits the nginx config for you and sets up auto-renewal.

That's it — no PHP, no WSGI, no reverse proxy to a Node process. nginx is
just handing out files.

## Notes on how this was exported

The original was built as an interactive, multi-board design artifact.
This export:

- Flattened each board into a plain, self-contained HTML page.
- Downloaded every embedded image/video out of the artifact's asset
  store into `assets/`, and rewrote all references to point at the local
  copies.
- Rewrote the cross-page links (`Main.dc.html`, `Project1.dc.html`, …) to
  plain relative links (`index.html`, `project1.html`, …).
- Reimplemented the homepage's interactive behavior (menu, hover-reveal
  project list, skills cart reveal, footer bunny mascot, scroll-reveal)
  as plain vanilla JavaScript in `assets/js/main.js` — there's no
  framework or runtime dependency left anywhere in the site.

If you ever want to pull a fresh copy after editing the original artifact
again, just ask and this export can be regenerated.

## Updating the site later

Since it's static files, updating is just: edit the HTML/CSS/JS (or swap
an image in `assets/`), then re-sync to the VM with the same `rsync`
command and reload nginx if you changed the config. No deploy pipeline
needed.
