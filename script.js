const MENU_DATA_URL = "data/menu.json";

document.addEventListener("DOMContentLoaded", () => {
  setCurrentYear();
  setupMobileNavigation();
  setupRevealAnimations();
  renderOpenStatus();
  loadMenu();
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

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
