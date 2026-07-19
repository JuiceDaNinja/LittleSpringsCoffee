# Little Springs Coffee — polished photo gallery version

This static website is ready for GitHub Pages and does not require an Instagram access token.

## What changed

The site no longer uses Instagram iframe embeds. The GitHub Action now:

1. Reads the newest public posts from the Instagram profile.
2. Downloads the post preview images into `assets/instagram/`.
3. Updates `data/instagram-posts.json`.
4. Commits the images and JSON file back to the repository.

The website displays those local images in a fast, responsive gallery. Clicking an image opens its original Instagram post.

## First-time setup

1. Upload all files and folders to a GitHub repository.
2. Open **Settings → Pages**.
3. Choose **Deploy from a branch**.
4. Select `main` and `/ (root)`.
5. Open the **Actions** tab.
6. Select **Update Instagram gallery**.
7. Click **Run workflow**.

The first workflow run is required to download the initial gallery images. No token, password, Meta app, or GitHub Secret is needed.

After the first successful run, images will be stored in:

```text
assets/instagram/
```

The site checks for new public posts every six hours.

## Local preview

Before the first workflow run, the site shows a clean gallery placeholder.

After the workflow has downloaded the photos, clone or download the updated repository and run:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Do not double-click `index.html` and open it through `file://`, because browsers commonly block local JSON requests.

## Reliability note

Instagram does not provide a guaranteed token-free API for listing a profile's latest posts. This project uses public profile data without logging in. Instagram may occasionally rate-limit or change this endpoint.

If an update fails, the workflow preserves the previously downloaded images and feed file, so the live website continues displaying the last successful gallery.

## Update the menu

Edit:

```text
data/menu.json
```

## Change the Instagram account

Edit `INSTAGRAM_USERNAME` inside:

```text
.github/workflows/update-instagram.yml
```

The profile must be public.
