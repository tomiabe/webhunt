(() => {
  "use strict";

  const gallery = document.getElementById("gallery");
  const emptyState = document.getElementById("empty-state");
  const searchInput = document.getElementById("search");
  const typeFiltersEl = document.getElementById("type-filters");
  const colsLabel = document.getElementById("cols-label");
  const colsInc = document.getElementById("cols-inc");
  const colsDec = document.getElementById("cols-dec");
  const themeToggle = document.getElementById("theme-toggle");
  const modal = document.getElementById("detail-modal");
  const modalClose = document.getElementById("modal-close");
  const modalImage = document.getElementById("modal-image");
  const modalType = document.getElementById("modal-type");
  const modalTitle = document.getElementById("modal-title");
  const modalMeta = document.getElementById("modal-meta");
  const modalBlurb = document.getElementById("modal-blurb");
  const modalTags = document.getElementById("modal-tags");
  const modalLink = document.getElementById("modal-link");

  const MIN_COLS = 2;
  const MAX_COLS = 8;
  const DEFAULT_COLS = 4;

  let entries = [];
  let activeType = "All";
  let query = "";

  // ---------- Theme ----------

  function applyTheme(theme) {
    if (theme) {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  function initTheme() {
    const saved = localStorage.getItem("webhunt:theme");
    if (saved) applyTheme(saved);
  }

  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = current ? current === "dark" : prefersDark;
    const next = isDark ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem("webhunt:theme", next);
  });

  // ---------- Columns ----------

  function setCols(n) {
    const clamped = Math.min(MAX_COLS, Math.max(MIN_COLS, n));
    document.documentElement.style.setProperty("--cols", clamped);
    colsLabel.textContent = String(clamped);
    localStorage.setItem("webhunt:cols", String(clamped));
  }

  function initCols() {
    const saved = parseInt(localStorage.getItem("webhunt:cols"), 10);
    setCols(Number.isFinite(saved) ? saved : DEFAULT_COLS);
  }

  colsInc.addEventListener("click", () => {
    const cur = parseInt(colsLabel.textContent, 10);
    setCols(cur + 1);
  });
  colsDec.addEventListener("click", () => {
    const cur = parseInt(colsLabel.textContent, 10);
    setCols(cur - 1);
  });

  // ---------- Data + rendering ----------

  const TYPES = [
    "Product / Startup",
    "Agency / Studio",
    "Portfolio",
    "E-commerce",
    "Media / Blog",
    "Institution / Academic / NGO",
    "Community / Event",
    "Tool / Open Source",
  ];

  function renderTypeFilters() {
    const all = ["All", ...TYPES];
    typeFiltersEl.innerHTML = all
      .map(
        (t) =>
          `<button type="button" class="type-chip" data-type="${escapeHtml(t)}" aria-pressed="${t === activeType}">${escapeHtml(t)}</button>`
      )
      .join("");
  }

  typeFiltersEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".type-chip");
    if (!btn) return;
    activeType = btn.dataset.type;
    [...typeFiltersEl.children].forEach((c) =>
      c.setAttribute("aria-pressed", String(c === btn))
    );
    renderGallery();
  });

  searchInput.addEventListener("input", () => {
    query = searchInput.value.trim().toLowerCase();
    renderGallery();
  });

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  function matches(entry) {
    if (activeType !== "All" && entry.type !== activeType) return false;
    if (!query) return true;
    const haystack = [entry.title, ...(entry.tags || [])].join(" ").toLowerCase();
    return haystack.includes(query);
  }

  let observer;

  function renderGallery() {
    const visible = entries.filter((e) => e.image && e.link && matches(e));
    gallery.innerHTML = "";

    if (!visible.length) {
      emptyState.hidden = false;
    } else {
      emptyState.hidden = true;
    }

    if (observer) observer.disconnect();
    observer = new IntersectionObserver(
      (obsEntries) => {
        obsEntries.forEach((obsEntry) => {
          if (obsEntry.isIntersecting) {
            obsEntry.target.classList.add("in-view");
            observer.unobserve(obsEntry.target);
          }
        });
      },
      { rootMargin: "80px" }
    );

    const frag = document.createDocumentFragment();
    visible.forEach((entry) => {
      const card = document.createElement("article");
      card.className = "card";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `View details for ${entry.title}`);
      card.dataset.id = entry.id;

      card.innerHTML = `
        <div class="card-media">
          <img src="${escapeHtml(entry.image)}" alt="${escapeHtml(entry.title)}" loading="lazy" />
        </div>
        <div class="card-info">
          <p class="card-title">${escapeHtml(entry.title)}</p>
          <p class="card-type">${escapeHtml(entry.type || "")}</p>
        </div>
      `;

      const open = () => openModal(entry, card);
      card.addEventListener("click", open);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });

      frag.appendChild(card);
      observer.observe(card);
    });
    gallery.appendChild(frag);
  }

  // ---------- Modal ----------

  function openModal(entry, cardEl) {
    modalImage.src = entry.image || "";
    modalImage.alt = entry.title || "";
    modalType.textContent = entry.type || "";
    modalTitle.textContent = entry.title || "";

    const metaParts = [];
    if (entry.date) metaParts.push(formatDate(entry.date));
    if (entry.credit && entry.credit.type) {
      metaParts.push(
        entry.credit.name ? `${entry.credit.type} — ${entry.credit.name}` : entry.credit.type
      );
    }
    modalMeta.textContent = metaParts.join(" · ");

    modalBlurb.textContent = entry.blurb || "";

    modalTags.innerHTML = (entry.tags || [])
      .slice(0, 10)
      .map((t) => `<span>${escapeHtml(t)}</span>`)
      .join("");

    if (entry.link) {
      modalLink.href = entry.link;
      modalLink.style.display = "";
    } else {
      modalLink.style.display = "none";
    }

    const img = cardEl ? cardEl.querySelector("img") : null;
    const supportsVT = typeof document.startViewTransition === "function";

    if (supportsVT && img) {
      img.style.viewTransitionName = "morph-image";
      modalImage.style.viewTransitionName = "morph-image";
      document.startViewTransition(() => {
        modal.showModal();
      }).finished.finally(() => {
        img.style.viewTransitionName = "";
        modalImage.style.viewTransitionName = "";
      });
    } else {
      modal.showModal();
    }
  }

  function closeModal() {
    if (modal.open) modal.close();
  }

  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  modal.addEventListener("cancel", () => closeModal());

  // ---------- Init ----------

  async function init() {
    initTheme();
    initCols();
    renderTypeFilters();

    try {
      const res = await fetch("data.json");
      entries = await res.json();
    } catch (err) {
      entries = [];
      console.error("Failed to load gallery data", err);
    }

    renderGallery();
  }

  init();
})();
