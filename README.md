# hayk.saribekyan.me

A static site made of plain HTML files, served by GitHub Pages. It has no build step.

```
index.html                     home page
theme.css                      colours, shared by every page (scores included)
style.css                      layout for the home page and writing
music/<slug>/index.html        sing-along scores
writing/<slug>/index.html      writing
CNAME                          tells GitHub Pages the custom domain
.nojekyll                      tells GitHub to serve the files as-is
```

## Preview locally

    python3 -m http.server 8000     # then open http://localhost:8000

## Adding a score

Save it as `music/<slug>/index.html`. Then make two changes to its HTML:

- Just before `</head>`, add `<link rel="stylesheet" href="/theme.css">`. Its colours will then match the site.
- Right after `<body>`, add `<div class="home-bar"><a href="/">← hayk.saribekyan.me</a></div>`.

Finally, add a `<li>` for it under "Sheet music" in `index.html`.

## One-time setup

1. **GitHub:** create a public repo named exactly `saribekyan.github.io` (you'll need to own the GitHub account `saribekyan`). Then push this folder to it:

       git add -A && git commit -m "Initial site"
       git remote add origin git@github.com:saribekyan/saribekyan.github.io.git
       git push -u origin main

2. **Pages:** go to repo → Settings → Pages. Set Source to "Deploy from a branch", then choose branch `master` and folder `/ (root)`. Custom domain: `hayk.saribekyan.me` (set by the `CNAME` file).

3. **GoDaddy DNS:** add one record:

   | Type  | Name | Value                  |
   |-------|------|------------------------|
   | CNAME | hayk | saribekyan.github.io   |

   `saribekyan.me` itself is forwarded to `https://hayk.saribekyan.me` using GoDaddy's Forwarding (permanent 301, without masking).

4. **HTTPS:** once the DNS check passes in Pages settings, tick **Enforce HTTPS**.
