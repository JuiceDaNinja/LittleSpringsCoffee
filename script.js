const INSTAGRAM_DATA_URL = "data/instagram-posts.json";
const MENU_DATA_URL = "data/menu.json";

document.addEventListener("DOMContentLoaded", () => {
  setCurrentYear();
  setupMobileNavigation();
  setupRevealAnimations();
  renderOpenStatus();
  loadMenu();
  loadInstagramFeed();
});

function setCurrentYear() {
  document.getElementById("year").textContent = new Date().getFullYear();
}

function setupMobileNavigation() {
  const button = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");

  button.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    button.setAttribute("aria-expanded", String(open));
  });

  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      links.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
    });
  });
}

function setupRevealAnimations() {
  const items = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver((entries, instance) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        instance.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });

  items.forEach((item) => observer.observe(item));
}

function renderOpenStatus() {
  const status = document.getElementById("open-status");
  const heroStatus = document.getElementById("hero-feed-status");
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = dayMap[parts.weekday];
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);

  let isOpen = false;
  let closing = "";

  if (day >= 1 && day <= 5) {
    isOpen = minutes >= 450 && minutes < 960;
    closing = "4:00 PM";
  } else if (day === 6) {
    isOpen = minutes >= 540 && minutes < 900;
    closing = "3:00 PM";
  }

  status.textContent = isOpen ? `Open now · closes ${closing}` : "Currently closed";
  status.dataset.state = isOpen ? "open" : "closed";
  heroStatus.textContent = isOpen ? "Open today" : "Latest from Instagram";
}

async function loadMenu() {
  try {
    const response = await fetch(`${MENU_DATA_URL}?v=${Date.now()}`);
    if (!response.ok) throw new Error(`Menu request failed: ${response.status}`);

    const menu = await response.json();
    renderMenu("main-menu", menu.main || []);
    renderMenu("seasonal-menu", menu.seasonal || []);
  } catch (error) {
    console.error(error);
    document.getElementById("main-menu").innerHTML =
      '<p class="feed-error">The menu could not be loaded.</p>';
  }
}

function renderMenu(containerId, items) {
  const container = document.getElementById(containerId);

  container.innerHTML = items.map((item) => `
    <article class="menu-item">
      <div>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.description)}</p>
      </div>
      <span class="menu-price">${escapeHtml(item.price)}</span>
    </article>
  `).join("");
}

async function loadInstagramFeed() {
  const hero = document.getElementById("hero-instagram");
  const feed = document.getElementById("instagram-feed");
  const updated = document.getElementById("feed-updated");

  try {
    const response = await fetch(`${INSTAGRAM_DATA_URL}?v=${Date.now()}`);
    if (!response.ok) throw new Error(`Instagram feed request failed: ${response.status}`);

    const payload = await response.json();
    const posts = Array.isArray(payload.posts) ? payload.posts : [];

    if (!posts.length) throw new Error("No Instagram posts are configured.");

    hero.innerHTML = createHeroPhoto(posts[0]);

    feed.innerHTML = posts.slice(0, 6).map((post, index) =>
      createGalleryCard(post, index)
    ).join("");

    if (payload.updated_at) {
      const date = new Date(payload.updated_at);
      if (!Number.isNaN(date.getTime())) {
        updated.textContent = `Gallery last checked ${new Intl.DateTimeFormat("en-US", {
          dateStyle: "medium",
          timeStyle: "short"
        }).format(date)}`;
      }
    }
  } catch (error) {
    console.error(error);
    hero.innerHTML = galleryFallback(true);
    feed.innerHTML = galleryFallback(false);
  }
}

function createHeroPhoto(post) {
  const permalink = sanitizeInstagramUrl(post.permalink);
  const image = sanitizeLocalImage(post.image);

  if (!permalink || !image) return galleryFallback(true);

  return `
    <a class="hero-photo-link" href="${permalink}" target="_blank" rel="noopener"
       aria-label="View newest Little Springs Coffee post on Instagram">
      <img src="${image}" alt="${escapeHtml(post.alt || "Newest Little Springs Coffee Instagram post")}"
           width="1080" height="1350" loading="eager" decoding="async">
      <span class="photo-overlay">
        <span>Newest post</span>
        <strong>View on Instagram ↗</strong>
      </span>
    </a>
  `;
}

function createGalleryCard(post, index) {
  const permalink = sanitizeInstagramUrl(post.permalink);
  const image = sanitizeLocalImage(post.image);

  if (!permalink || !image) return "";

  const type = post.media_type === "VIDEO" ? "Reel" : "Post";
  const timestamp = post.timestamp ? formatPostDate(post.timestamp) : "";
  const alt = escapeHtml(post.alt || `Little Springs Coffee Instagram ${type.toLowerCase()}`);

  return `
    <a class="photo-card photo-card-${(index % 3) + 1}"
       href="${permalink}" target="_blank" rel="noopener">
      <img src="${image}" alt="${alt}" width="1080" height="1080"
           loading="lazy" decoding="async">
      <span class="photo-card-overlay">
        <span class="photo-type">${type}</span>
        <span class="photo-meta">${timestamp || "View on Instagram"} ↗</span>
      </span>
    </a>
  `;
}

function sanitizeInstagramUrl(value) {
  try {
    const url = new URL(value);
    if (!["instagram.com", "www.instagram.com"].includes(url.hostname)) return "";
    if (!/^\/(p|reel)\/[^/]+\/?$/.test(url.pathname)) return "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function sanitizeLocalImage(value) {
  const path = String(value || "");
  return /^assets\/instagram\/[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(path)
    ? path
    : "";
}

function formatPostDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(date);
}

function galleryFallback(isHero) {
  return `
    <div class="gallery-fallback ${isHero ? "gallery-fallback-hero" : ""}">
      <span class="fallback-mark" aria-hidden="true">◎</span>
      <p>The photo gallery will appear after the Instagram update workflow runs.</p>
      <a href="https://www.instagram.com/_littlespringscoffee_ma/"
         target="_blank" rel="noopener">
        Visit Instagram ↗
      </a>
    </div>
  `;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
