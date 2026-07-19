import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import process from "node:process";

const username = process.env.INSTAGRAM_USERNAME || "_littlespringscoffee_ma";
const maxPosts = clamp(Number(process.env.INSTAGRAM_POST_LIMIT || 6), 1, 12);
const outputPath = new URL("../data/instagram-posts.json", import.meta.url);
const imageDirectory = new URL("../assets/instagram/", import.meta.url);

const profileEndpoint = new URL("https://www.instagram.com/api/v1/users/web_profile_info/");
profileEndpoint.searchParams.set("username", username);

try {
  const profile = await fetchPublicProfile(profileEndpoint);
  const nodes = extractNodes(profile).slice(0, maxPosts);

  if (!nodes.length) {
    throw new Error("Instagram returned no public posts.");
  }

  await mkdir(imageDirectory, { recursive: true });

  const posts = [];

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const imageUrl = chooseImageUrl(node);

    if (!imageUrl) continue;

    const extension = chooseExtension(imageUrl);
    const filename = `${String(index + 1).padStart(2, "0")}-${node.shortcode}.${extension}`;
    const destination = new URL(filename, imageDirectory);

    await downloadImage(imageUrl, destination);

    const isVideo =
      node.is_video === true ||
      node.__typename === "GraphVideo" ||
      node.product_type === "clips";

    posts.push({
      permalink: `https://www.instagram.com/${isVideo ? "reel" : "p"}/${node.shortcode}/`,
      image: `assets/instagram/${filename}`,
      media_type: isVideo ? "VIDEO" : "IMAGE",
      timestamp: toIsoTimestamp(node.taken_at_timestamp),
      alt: buildAltText(node, index)
    });
  }

  if (!posts.length) {
    throw new Error("No downloadable public Instagram images were returned.");
  }

  await removeUnusedImages(new Set(posts.map((post) => post.image.split("/").pop())));

  const next = {
    account: username,
    updated_at: new Date().toISOString(),
    source: "instagram-public-web-profile",
    posts
  };

  await writeFile(outputPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(`Saved ${posts.length} Instagram gallery images for @${username}.`);
} catch (error) {
  console.error("Instagram update failed. Existing gallery files were preserved.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

async function fetchPublicProfile(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": `https://www.instagram.com/${encodeURIComponent(username)}/`,
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "X-IG-App-ID": "936619743392459",
      "X-Requested-With": "XMLHttpRequest"
    }
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Instagram returned HTTP ${response.status}: ${text.slice(0, 220)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Instagram returned a non-JSON response.");
  }
}

function extractNodes(payload) {
  const user = payload?.data?.user;
  const edges =
    user?.edge_owner_to_timeline_media?.edges ??
    user?.edge_felix_video_timeline?.edges ??
    [];

  return edges
    .map((edge) => edge?.node)
    .filter(Boolean)
    .filter((node) => typeof node.shortcode === "string" && node.shortcode.length > 0)
    .filter((node, index, all) =>
      all.findIndex((candidate) => candidate.shortcode === node.shortcode) === index
    )
    .sort((a, b) =>
      Number(b.taken_at_timestamp || 0) - Number(a.taken_at_timestamp || 0)
    );
}

function chooseImageUrl(node) {
  const resources = node?.display_resources;
  if (Array.isArray(resources) && resources.length) {
    return resources[resources.length - 1]?.src || resources[0]?.src || "";
  }

  return node.display_url || node.thumbnail_src || node.thumbnail_url || "";
}

async function downloadImage(url, destination) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "Referer": "https://www.instagram.com/",
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    }
  });

  if (!response.ok) {
    throw new Error(`Image download failed with HTTP ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Expected an image but received ${contentType || "unknown content"}.`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1000) {
    throw new Error("Downloaded image was unexpectedly small.");
  }

  await writeFile(destination, bytes);
}

async function removeUnusedImages(keep) {
  const files = await readdir(imageDirectory);

  await Promise.all(
    files
      .filter((name) => name !== ".gitkeep" && !keep.has(name))
      .map((name) => rm(new URL(name, imageDirectory), { force: true }))
  );
}

function buildAltText(node, index) {
  const caption =
    node?.edge_media_to_caption?.edges?.[0]?.node?.text ||
    node?.caption?.text ||
    "";

  const cleaned = caption.replace(/\s+/g, " ").trim();
  return cleaned
    ? cleaned.slice(0, 150)
    : `Little Springs Coffee Instagram post ${index + 1}`;
}

function chooseExtension(url) {
  const extension = extname(new URL(url).pathname).toLowerCase();
  if (extension === ".png") return "png";
  if (extension === ".webp") return "webp";
  return "jpg";
}

function toIsoTimestamp(value) {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : null;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.trunc(value), min), max);
}
