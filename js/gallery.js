document.addEventListener("DOMContentLoaded", loadGalleryPage);

async function loadGalleryPage() {
  const container = document.getElementById("galleryContainer");
  const filters = document.getElementById("galleryFilters");
  const status = document.getElementById("galleryStatus");

  document.getElementById("currentYear").textContent = new Date().getFullYear();

  try {
    const rows = await fetchSheet(CONFIG.sheets.gallery);

    const isEnabled = (value) =>
      ["yes", "true", "1", "enabled"].includes(
        String(value ?? "")
          .trim()
          .toLowerCase(),
      );

    const images = (Array.isArray(rows) ? rows : [])
      .filter(
        (row) =>
          row &&
          isEnabled(row.enabled) &&
          /^https?:\/\//i.test(String(row.image_url || "").trim()),
      )
      .sort(
        (a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0),
      );

    if (!images.length) {
      status.textContent = "No gallery photos are available yet.";
      return;
    }

    status.hidden = true;

    const categories = [
      "All",
      ...new Set(
        images.map((row) => String(row.category || "").trim()).filter(Boolean),
      ),
    ];

    filters.innerHTML = "";

    categories.forEach((category, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gallery-filter" + (index === 0 ? " active" : "");
      button.textContent = category;
      button.setAttribute("aria-pressed", String(index === 0));

      button.addEventListener("click", () => {
        filters.querySelectorAll("button").forEach((item) => {
          item.classList.toggle("active", item === button);
          item.setAttribute("aria-pressed", String(item === button));
        });
        renderImages(category);
      });

      filters.appendChild(button);
    });

    function renderImages(category) {
      const visible =
        category === "All"
          ? images
          : images.filter(
              (row) => String(row.category || "").trim() === category,
            );

      container.replaceChildren();

      visible.forEach((row) => {
        const card = document.createElement("article");
        card.className = "gallery-card";

        const image = document.createElement("img");
        image.src = String(row.image_url).trim();
        image.alt = String(row.title || "Puri Homestay photo");
        image.loading = "lazy";
        image.decoding = "async";

        image.addEventListener("click", () => {
          const lightbox = document.getElementById("galleryLightbox");
          document.getElementById("galleryLargeImage").src = image.src;
          document.getElementById("galleryLargeImage").alt = image.alt;
          document.getElementById("galleryLargeTitle").textContent = String(
            row.title || "",
          );
          lightbox.classList.add("open");
          document.body.style.overflow = "hidden";
        });

        image.addEventListener(
          "error",
          () => {
            card.remove();
          },
          { once: true },
        );

        const caption = document.createElement("div");
        caption.className = "gallery-caption";

        const title = document.createElement("h3");
        title.textContent = String(row.title || "Puri Homestay");

        const categoryText = document.createElement("p");
        categoryText.textContent = String(row.category || "");

        caption.append(title, categoryText);
        card.append(image, caption);
        container.appendChild(card);
      });
    }

    renderImages("All");
  } catch (error) {
    console.error("Gallery loading failed:", error);
    status.textContent =
      "Unable to load gallery photos. Please refresh and try again.";
  }
}

function closeGalleryLightbox() {
  document.getElementById("galleryLightbox").classList.remove("open");
  document.body.style.overflow = "";
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("galleryClose")
    .addEventListener("click", closeGalleryLightbox);

  document
    .getElementById("galleryLightbox")
    .addEventListener("click", (event) => {
      if (event.target.id === "galleryLightbox") {
        closeGalleryLightbox();
      }
    });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeGalleryLightbox();
  });
});
