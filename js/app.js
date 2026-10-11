// ============================================================
// PURI HOMESTAY
// CUSTOMER HOMEPAGE
// ============================================================

// ============================================================
// GLOBAL DATA
// ============================================================

let roomsData = [];

let homestayData = {};

let amenitiesData = [];

let bookingOfficesData = [];

// ============================================================
// LOAD ALL DATA
// ============================================================

async function loadData() {
  try {
    showInitialLoading();

    // ----------------------------------------------------
    // LOAD DATA FROM GOOGLE SHEETS
    // ----------------------------------------------------

    const [rooms, homestayRows, amenities, bookingOffices] = await Promise.all([
      fetchSheet(CONFIG.sheets.rooms),
      fetchSheet(CONFIG.sheets.homestay),
      fetchSheet(CONFIG.sheets.amenities),
      fetchSheet(CONFIG.sheets.bookingOffices),
    ]);

    // ----------------------------------------------------
    // STORE DATA
    // ----------------------------------------------------

    roomsData = Array.isArray(rooms) ? rooms : [];

    amenitiesData = Array.isArray(amenities) ? amenities : [];

    bookingOfficesData = Array.isArray(bookingOffices) ? bookingOffices : [];

    homestayData = convertHomestayData(homestayRows);

    console.log("Rooms:", roomsData);

    console.log("Homestay:", homestayData);

    console.log("Amenities:", amenitiesData);

    // ----------------------------------------------------
    // RENDER
    // ----------------------------------------------------

    renderPropertyInformation();

    renderRooms(roomsData);

    renderAmenities(amenitiesData);

    renderBookingOffices(bookingOfficesData);

    updateCurrentYear();
  } catch (error) {
    console.error("Failed to load homepage data:", error);

    showPageError(
      "We couldn't load the homestay information right now. Please refresh the page and try again.",
    );
  }
}

// ============================================================
// CONVERT HOMESTAY SHEET DATA
// ============================================================

function convertHomestayData(rows) {
  const result = {};

  if (!Array.isArray(rows)) {
    return result;
  }

  rows.forEach((row) => {
    if (row && row.key) {
      result[String(row.key).trim()] = row.value || "";
    }
  });

  return result;
}

// ============================================================
// RENDER PROPERTY INFORMATION
// ============================================================

function renderPropertyInformation() {
  const propertyName =
    homestayData.property_name || "Your Comfortable Home in Puri";

  const tagline =
    homestayData.tagline ||
    "A peaceful family-friendly stay with the comfort of home.";

  const location = homestayData.location || "Puri, Odisha";

  // --------------------------------------------------------
  // PAGE TITLE
  // --------------------------------------------------------

  document.title = propertyName + " | Puri";

  // --------------------------------------------------------
  // HEADER
  // --------------------------------------------------------

  setText("headerPropertyName", propertyName);

  // --------------------------------------------------------
  // HERO
  // --------------------------------------------------------

  setText("propertyName", propertyName);

  setText("tagline", tagline);

  setText("location", "📍 " + location);

  // --------------------------------------------------------
  // LOCATION SECTION
  // --------------------------------------------------------

  setText("locationText", location);

  // --------------------------------------------------------
  // FOOTER
  // --------------------------------------------------------

  setText("footerPropertyName", propertyName);
}

// ============================================================
// RENDER ROOMS
// ============================================================

function renderRooms(rooms) {
  const container = document.getElementById("roomsContainer");

  if (!container) {
    return;
  }

  // --------------------------------------------------------
  // NO ROOMS
  // --------------------------------------------------------

  if (!Array.isArray(rooms) || rooms.length === 0) {
    container.innerHTML = `

            <div class="empty-state">

                <div class="empty-state-icon">
                    🏡
                </div>

                <h3>
                    Rooms Coming Soon
                </h3>

                <p>
                    Our room information will appear here
                    once rooms are added.
                </p>

            </div>

        `;

    return;
  }

  // --------------------------------------------------------
  // FILTER AVAILABLE ROOMS
  // --------------------------------------------------------

  const visibleRooms = rooms.filter((room) => {
    const status = String(room.status || "")
      .trim()
      .toLowerCase();

    return !status || status === "available";
  });

  // --------------------------------------------------------
  // IF ALL ROOMS ARE UNAVAILABLE
  // --------------------------------------------------------

  if (visibleRooms.length === 0) {
    container.innerHTML = `

            <div class="empty-state">

                <div class="empty-state-icon">
                    🛏️
                </div>

                <h3>
                    No Rooms Currently Available
                </h3>

                <p>
                    Please check again later for
                    available accommodation.
                </p>

            </div>

        `;

    return;
  }

  // --------------------------------------------------------
  // CAROUSEL CONFIGURATION
  // --------------------------------------------------------

  function getCardsPerPage() {
    const width = window.innerWidth;

    if (width <= 700) {
      return 1;
    }

    if (width <= 1050) {
      return 2;
    }

    return 3;
  }

  const cardsPerPage = getCardsPerPage();

  const pageCount = Math.ceil(visibleRooms.length / cardsPerPage);

  // --------------------------------------------------------
  // BUILD CAROUSEL PAGES
  //
  // Each page is exactly 100% of the viewport.
  // --------------------------------------------------------

  const pages = [];

  for (let index = 0; index < visibleRooms.length; index += cardsPerPage) {
    const pageRooms = visibleRooms.slice(index, index + cardsPerPage);

    pages.push(`

            <div class="rooms-carousel-page">

                ${pageRooms.map((room) => createRoomCard(room)).join("")}

            </div>

        `);
  }

  const showControls = pageCount > 1;

  container.innerHTML = `

        <div class="rooms-carousel">

            ${
              showControls
                ? `
                        <button
                            type="button"
                            class="rooms-carousel-arrow rooms-carousel-prev"
                            aria-label="Previous rooms"
                        >
                            ‹
                        </button>
                    `
                : ""
            }


            <div class="rooms-carousel-viewport">

                <div class="rooms-carousel-track">

                    ${pages.join("")}

                </div>

            </div>


            ${
              showControls
                ? `
                        <button
                            type="button"
                            class="rooms-carousel-arrow rooms-carousel-next"
                            aria-label="Next rooms"
                        >
                            ›
                        </button>
                    `
                : ""
            }

        </div>


        ${
          showControls
            ? `
                    <div class="rooms-carousel-controls">

                        <div
                            class="rooms-carousel-dots"
                            aria-label="Room pages"
                        >

                            ${pages
                              .map(
                                (_, index) => `
                                            <button
                                                type="button"
                                                class="rooms-carousel-dot${
                                                  index === 0 ? " active" : ""
                                                }"
                                                data-page="${index}"
                                                aria-label="Go to room page ${index + 1}"
                                            ></button>
                                        `,
                              )
                              .join("")}

                        </div>

                    </div>
                `
            : ""
        }

    `;

  if (!showControls) {
    return;
  }

  // --------------------------------------------------------
  // CAROUSEL ELEMENTS
  // --------------------------------------------------------

  const viewport = container.querySelector(".rooms-carousel-viewport");

  const track = container.querySelector(".rooms-carousel-track");

  const previousButton = container.querySelector(".rooms-carousel-prev");

  const nextButton = container.querySelector(".rooms-carousel-next");

  const dots = Array.from(container.querySelectorAll(".rooms-carousel-dot"));

  let currentPage = 0;

  // --------------------------------------------------------
  // GO TO PAGE
  // --------------------------------------------------------

  function goToPage(page) {
    currentPage = Math.max(0, Math.min(page, pageCount - 1));

    const pageWidth = viewport.clientWidth;

    track.style.transform = `translate3d(-${currentPage * pageWidth}px, 0, 0)`;

    dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === currentPage);
    });

    previousButton.disabled = currentPage === 0;

    nextButton.disabled = currentPage === pageCount - 1;
  }

  // --------------------------------------------------------
  // ARROW EVENTS
  // --------------------------------------------------------

  previousButton.addEventListener("click", () => {
    goToPage(currentPage - 1);
  });

  nextButton.addEventListener("click", () => {
    goToPage(currentPage + 1);
  });

  // --------------------------------------------------------
  // DOT EVENTS
  // --------------------------------------------------------

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      goToPage(Number(dot.dataset.page));
    });
  });

  // --------------------------------------------------------
  // TOUCH / SWIPE SUPPORT
  // --------------------------------------------------------

  let touchStartX = 0;

  let touchEndX = 0;

  viewport.addEventListener(
    "touchstart",
    (event) => {
      touchStartX = event.changedTouches[0].screenX;
    },
    {
      passive: true,
    },
  );

  viewport.addEventListener(
    "touchend",
    (event) => {
      touchEndX = event.changedTouches[0].screenX;

      const distance = touchEndX - touchStartX;

      if (Math.abs(distance) < 50) {
        return;
      }

      if (distance < 0) {
        goToPage(currentPage + 1);
      } else {
        goToPage(currentPage - 1);
      }
    },
    {
      passive: true,
    },
  );

  // --------------------------------------------------------
  // KEEP CAROUSEL CORRECT AFTER RESIZE
  // --------------------------------------------------------

  let resizeTimer = null;

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {
      const newCardsPerPage = getCardsPerPage();

      if (newCardsPerPage !== cardsPerPage) {
        renderRooms(rooms);

        return;
      }

      goToPage(currentPage);
    }, 150);
  });

  // --------------------------------------------------------
  // INITIAL STATE
  // --------------------------------------------------------

  goToPage(0);
}

// ============================================================
// CREATE ROOM CARD
// ============================================================

function createRoomCard(room) {
  const roomId = escapeHTML(room.room_id || "");

  const roomName = escapeHTML(room.room_name || "Comfortable Room");

  const roomType = escapeHTML(room.room_type || "Homestay Room");

  const floor = escapeHTML(room.floor || "Floor information unavailable");

  const roomNo = escapeHTML(room.room_no || "N/A");

  const maxGuests = escapeHTML(room.max_guests || "N/A");

  const bedInfo = escapeHTML(room.bed_info || "Comfortable bedding");

  const description = escapeHTML(
    room.description || "A comfortable room for a relaxing stay in Puri.",
  );

  const cookingFacility = String(room.cooking_facility || "")
    .trim()
    .toLowerCase();

  const price = formatPrice(room.price_per_night);

  const status = escapeHTML(room.status || "Available");

  // --------------------------------------------------------
  // IMAGE
  // --------------------------------------------------------

  const imageUrl = normalizeDriveImageUrl(room.image_1 || "");

  let imageHTML;

  if (isValidImageUrl(imageUrl)) {
    imageHTML = `

            <img
                src="${escapeHTML(imageUrl)}"
                alt="${roomName}"
                class="room-image"
                loading="lazy"
                onerror="this.parentElement.innerHTML='<div class=&quot;room-image-placeholder&quot;><span>🏡</span><small>Room Image</small></div>';"
            >

        `;
  } else {
    imageHTML = `

            <div class="room-image-placeholder">

                <span>
                    🏡
                </span>

                <small>
                    Room Image
                </small>

            </div>

        `;
  }

  // --------------------------------------------------------
  // COOKING FACILITY
  // --------------------------------------------------------

  let cookingHTML = "";

  if (cookingFacility === "yes") {
    const kitchenInfo = escapeHTML(
      room.kitchen_info || "Self-cooking facility available.",
    );

    cookingHTML = `

            <div class="room-cooking">

                <span
                    class="room-cooking-icon"
                >
                    🍳
                </span>

                <span>
                    Self-cooking facility:
                    ${kitchenInfo}
                </span>

            </div>

        `;
  }

  // --------------------------------------------------------
  // RETURN CARD
  // --------------------------------------------------------

  return `

        <article
            class="room-card"
            data-room-id="${roomId}"
        >

            <div class="room-image-wrapper">

                ${imageHTML}

                <span class="room-status">
                    ${status}
                </span>

            </div>


            <div class="room-content">

                <div class="room-topline">

                    <h3 class="room-name">
                        ${roomName}
                    </h3>

                    <div class="room-price">

                        ${price}

                        <small>
                            per night
                        </small>

                    </div>

                </div>


                <div class="room-type">

                    ${roomType}
                    · Room ${roomNo}

                </div>


                <div class="room-meta">

                    <div class="room-meta-item">

                        👥
                        ${maxGuests} Guests

                    </div>


                    <div class="room-meta-item">

                        📍
                        ${floor}

                    </div>


                    <div class="room-meta-item">

                        🛏️
                        ${bedInfo}

                    </div>


                    <div class="room-meta-item">

                        🏠
                        Homestay

                    </div>

                </div>


                <p class="room-description">

                    ${description}

                </p>


                ${cookingHTML}


                <a
                    class="view-room-btn"
                    href="room.html?roomId=${encodeURIComponent(room.room_id || "")}"
                >
                    View Room
                </a>

            </div>

        </article>

    `;
}

// ============================================================
// RENDER AMENITIES
// ============================================================

function renderAmenities(amenities) {
  const container = document.getElementById("amenitiesContainer");

  if (!container) {
    return;
  }

  // --------------------------------------------------------
  // FILTER ENABLED AMENITIES
  // --------------------------------------------------------

  const enabledAmenities = Array.isArray(amenities)
    ? amenities.filter((amenity) => {
        const enabled = String(amenity.enabled || "")
          .trim()
          .toLowerCase();

        return enabled === "yes" || enabled === "true" || enabled === "1";
      })
    : [];

  // --------------------------------------------------------
  // NO AMENITIES
  // --------------------------------------------------------

  if (enabledAmenities.length === 0) {
    container.innerHTML = `

            <div class="empty-state">

                <div class="empty-state-icon">
                    ✨
                </div>

                <h3>
                    Amenities Information Coming Soon
                </h3>

                <p>
                    Our available facilities will be
                    listed here.
                </p>

            </div>

        `;

    return;
  }

  // --------------------------------------------------------
  // RENDER
  // --------------------------------------------------------

  container.innerHTML = enabledAmenities
    .map((amenity) => createAmenityCard(amenity))
    .join("");
}

// ============================================================
// CREATE AMENITY CARD
// ============================================================

function createAmenityCard(amenity) {
  const name = escapeHTML(amenity.name || "Amenity");

  const icon = escapeHTML(amenity.icon || "✨");

  const description = escapeHTML(
    amenity.description || "Available for our guests.",
  );

  return `

        <article class="amenity-card">

            <div class="amenity-icon">
                ${icon}
            </div>

            <h3>
                ${name}
            </h3>

            <p>
                ${description}
            </p>

        </article>

    `;
}

/* ============================================================
   RENDER BOOKING OFFICES
============================================================ */

function renderBookingOffices(offices) {
  const container = document.getElementById("bookingOfficesContainer");

  if (!container) {
    return;
  }

  const enabledOffices = Array.isArray(offices)
    ? offices.filter((office) => {
        const enabled = String(office.enabled || "")
          .trim()
          .toLowerCase();

        return enabled === "yes" || enabled === "true" || enabled === "1";
      })
    : [];

  if (enabledOffices.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📍</div>
                <h3>Booking Assistance Available</h3>
                <p>
                    Please contact us directly for booking
                    assistance and enquiries.
                </p>
            </div>
        `;

    return;
  }

  container.innerHTML = enabledOffices
    .map((office) => createBookingOfficeCard(office))
    .join("");
}

/* ============================================================
   CREATE BOOKING OFFICE CARD
============================================================ */

function createBookingOfficeCard(office) {
  const officeName = escapeHTML(office.office_name || "Booking Office");

  const area = [office.area, office.city, office.state]
    .filter(Boolean)
    .map((value) => escapeHTML(value))
    .join(", ");

  const address = escapeHTML(
    office.address || "Contact us for the office address.",
  );

  const contactPerson = escapeHTML(office.contact_person || "");

  const workingHours = escapeHTML(office.working_hours || "");

  const phone = String(office.phone || "").trim();

  const whatsapp = String(office.whatsapp || "").replace(/\D/g, "");

  const mapUrl = String(office.map_url || "").trim();

  const phoneLink = /^[+\d][\d\s()+-]{5,24}$/.test(phone)
    ? phone.replace(/[^\d+]/g, "")
    : "";

  const safeMapUrl = (() => {
    try {
      const parsed = new URL(mapUrl);

      return parsed.protocol === "https:" &&
        (parsed.hostname === "maps.google.com" ||
          parsed.hostname === "www.google.com" ||
          parsed.hostname === "google.com" ||
          parsed.hostname === "maps.app.goo.gl")
        ? parsed.href
        : "";
    } catch {
      return "";
    }
  })();

  const actions = [];

  if (phoneLink) {
    actions.push(`
            <a href="tel:${escapeHTML(phoneLink)}">
                ☎ Call
            </a>
        `);
  }

  if (whatsapp.length >= 8 && whatsapp.length <= 15) {
    const message = encodeURIComponent(
      `Hello, I would like to enquire about booking at ${office.office_name || "Puri Homestay"}.`,
    );

    actions.push(`
            <a
                href="https://wa.me/${whatsapp}?text=${message}"
                target="_blank"
                rel="noopener noreferrer"
            >
                WhatsApp
            </a>
        `);
  }

  if (safeMapUrl) {
    actions.push(`
            <a
                href="${escapeHTML(safeMapUrl)}"
                target="_blank"
                rel="noopener noreferrer"
            >
                📍 Directions
            </a>
        `);
  }

  return `
        <article class="booking-office-card">

            <div class="booking-office-icon" aria-hidden="true">
                📍
            </div>

            <h3>${officeName}</h3>

            ${
              area
                ? `
                <p class="booking-office-location">
                    ${area}
                </p>
            `
                : ""
            }

            <p class="booking-office-address">
                ${address}
            </p>

            ${
              contactPerson
                ? `
                <p class="booking-office-contact">
                    Contact: ${contactPerson}
                </p>
            `
                : ""
            }

            ${
              workingHours
                ? `
                <p class="booking-office-hours">
                    🕒 ${workingHours}
                </p>
            `
                : ""
            }

            ${
              actions.length
                ? `
                <div class="booking-office-actions">
                    ${actions.join("")}
                </div>
            `
                : ""
            }

        </article>
    `;
}

// ============================================================
// VIEW ROOM
// ============================================================

function viewRoom(roomId) {
  const room = roomsData.find(
    (item) => String(item.room_id) === String(roomId),
  );

  if (!room) {
    console.error("Room not found:", roomId);

    return;
  }

  /*
   * Stage 1:
   * We only show the room information.
   *
   * Stage 2 will replace this with a
   * complete room details experience.
   */

  const roomName = room.room_name || "Room";

  const price = formatPrice(room.price_per_night);

  const message = [
    `Room: ${roomName}`,

    `Room No: ${room.room_no || "N/A"}`,

    `Floor: ${room.floor || "N/A"}`,

    `Price: ${price} per night`,

    `Guests: ${room.max_guests || "N/A"}`,
  ].join("\n");

  alert(message);
}

// ============================================================
// FORMAT PRICE
// ============================================================

function formatPrice(value) {
  const number = Number(value);

  if (isNaN(number)) {
    return "Price on request";
  }

  return "₹" + number.toLocaleString("en-IN");
}

// ============================================================
// IMAGE URL VALIDATION
// ============================================================

function isValidImageUrl(url) {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);

    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// ============================================================
// SET TEXT SAFELY
// ============================================================

function setText(elementId, value) {
  const element = document.getElementById(elementId);

  if (element) {
    element.textContent = value;
  }
}

// ============================================================
// INITIAL LOADING
// ============================================================

function showInitialLoading() {
  const roomsContainer = document.getElementById("roomsContainer");

  const amenitiesContainer = document.getElementById("amenitiesContainer");

  const bookingOfficesContainer = document.getElementById(
    "bookingOfficesContainer",
  );

  if (roomsContainer) {
    roomsContainer.innerHTML = `

            <div class="loading">

                <div class="loading-spinner"></div>

                <p>
                    Loading rooms...
                </p>

            </div>

        `;
  }

  if (amenitiesContainer) {
    amenitiesContainer.innerHTML = `

            <div class="loading">

                <div class="loading-spinner"></div>

                <p>
                    Loading amenities...
                </p>

            </div>

        `;
  }
  if (bookingOfficesContainer) {
    bookingOfficesContainer.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <p>Loading booking offices...</p>
        </div>
    `;
  }
}

// ============================================================
// PAGE ERROR
// ============================================================

function showPageError(message) {
  const errorContainer = document.getElementById("pageError");

  if (!errorContainer) {
    return;
  }

  errorContainer.innerHTML = `

        <div class="error-message">

            ${escapeHTML(message)}

        </div>

    `;
}

// ============================================================
// CURRENT YEAR
// ============================================================

function updateCurrentYear() {
  const yearElement = document.getElementById("currentYear");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================
// ESCAPE JAVASCRIPT STRING
// ============================================================

function escapeJS(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

// ============================================================
// START APPLICATION
// ============================================================

loadData();
