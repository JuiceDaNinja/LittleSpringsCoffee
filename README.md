# Little Springs Coffee — Instagram profile version

This static website is ready for GitHub Pages.

## Instagram setup

The site now shows the public Instagram profile directly through Instagram's
official embed script and also includes a normal link to the profile.

No access token, API key, GitHub Action, image downloader, scheduled workflow,
or locally stored Instagram photos are required.

Instagram profile:

https://www.instagram.com/_littlespringscoffee_ma/

## Upload to GitHub Pages

1. Upload all files from this folder to the root of your GitHub repository.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)`.
5. Save.

## Important

The Instagram account must remain public and website embedding must be enabled
in the Instagram account settings.

Some browsers, Brave Shields, tracking protection, cookie blocking, or content
blockers may prevent Instagram's embed from loading. The site always includes
an **Open Instagram profile** button as a fallback.

## Local preview

Run:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Menu updates

Edit:

```text
data/menu.json
```
