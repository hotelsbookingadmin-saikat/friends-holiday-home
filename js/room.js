document.addEventListener("DOMContentLoaded", () => {
  initializeRoomPage();
});

async function initializeRoomPage() {
  setCurrentYear();

  showLoading();

  const roomId = new URLSearchParams(window.location.search).get("roomId");

  if (!roomId) {
    showError();

    return;
  }

  try {
    const [rooms, homestay] = await Promise.all([
      fetchSheet(CONFIG.sheets.rooms),

      fetchSheet(CONFIG.sheets.homestay),
    ]);

    const homestayData = convertHomestayData(homestay);

    renderPropertyInformation(homestayData);

    const room = rooms.find(
      (item) => String(item.room_id).trim() === String(roomId).trim(),
    );

    if (!room) {
      showError();

      return;
    }

    renderRoom(room, homestayData);

    hideLoading();

    document.getElementById("roomDetails").hidden = false;
  } catch (error) {
    console.error("Room page loading error:", error);

    showError();
  }
}

/* =====================================================
   PROPERTY INFORMATION
===================================================== */

function convertHomestayData(rows) {
  const result = {};

  if (!Array.isArray(rows)) {
    return result;
  }

  rows.forEach((row) => {
    if (row && row.key) {
      result[String(row.key).trim()] = row.value ?? "";
    }
  });

  return result;
}

function renderPropertyInformation(homestay) {
  const propertyName = homestay.property_name || "Puri Homestay";

  document.title = `${propertyName} | Room Details`;

  setText("headerPropertyName", propertyName);

  setText("footerPropertyName", propertyName);
}

/* =====================================================
   ROOM RENDERING
===================================================== */

function renderRoom(room, homestay) {
  const roomName = room.room_name || "Comfortable Room";

  setText("roomName", roomName);

  setText("roomType", room.room_type || "Room");

  setText("roomNumber", room.room_no ? `Room No. ${room.room_no}` : "");

  setText("roomPrice", formatPrice(room.price_per_night) + " / night");

  setText("roomGuests", room.max_guests ? `${room.max_guests} Guests` : "—");

  setText("roomBed", room.bed_info || "Comfortable bedding");

  setText("roomFloor", room.floor || "—");

  setText("roomNo", room.room_no || "—");

  setText(
    "roomDescription",
    room.description || "A comfortable room for a peaceful stay in Puri.",
  );

  renderCookingInformation(room);

  renderAmenities(room);

  renderGallery(room);

  renderStatus(room);

  setupWhatsAppButton(room, homestay);
}

/* =====================================================
   IMAGE GALLERY
===================================================== */

function renderGallery(room) {
  const imageUrls = [room.image_1, room.image_2, room.image_3]
    .map(normalizeDriveImageUrl)
    .filter(isValidImageUrl);

  const mainImage = document.getElementById("roomMainImage");

  const placeholder = document.getElementById("roomMainPlaceholder");

  const thumbnails = document.getElementById("roomThumbnails");

  thumbnails.innerHTML = "";

  if (imageUrls.length === 0) {
    mainImage.hidden = true;

    placeholder.hidden = false;

    return;
  }

  mainImage.hidden = false;

  placeholder.hidden = true;

  mainImage.src = imageUrls[0];

  mainImage.alt = room.room_name || "Room";

  imageUrls.forEach((imageUrl, index) => {
    const thumbnail = document.createElement("button");

    thumbnail.type = "button";

    thumbnail.className = "room-thumbnail";

    if (index === 0) {
      thumbnail.classList.add("active");
    }

    const image = document.createElement("img");

    image.src = imageUrl;

    image.alt = `${room.room_name || "Room"} image ${index + 1}`;

    image.loading = "lazy";

    thumbnail.appendChild(image);

    thumbnail.addEventListener("click", () => {
      mainImage.src = imageUrl;

      document
        .querySelectorAll(".room-thumbnail")
        .forEach((item) => item.classList.remove("active"));

      thumbnail.classList.add("active");
    });

    thumbnails.appendChild(thumbnail);
  });
}

/* =====================================================
   COOKING INFORMATION
===================================================== */

function renderCookingInformation(room) {
  const cookingSection = document.getElementById("roomCooking");

  const cookingFacility = String(room.cooking_facility || "")
    .trim()
    .toLowerCase();

  const kitchenInfo = String(room.kitchen_info || "").trim();

  const cookingAvailable = ["yes", "true", "1", "available"].includes(
    cookingFacility,
  );

  if (cookingAvailable || kitchenInfo) {
    cookingSection.hidden = false;

    setText(
      "roomKitchenInfo",
      kitchenInfo || "Self-cooking facility is available for guests.",
    );
  } else {
    cookingSection.hidden = true;
  }
}

/* =====================================================
   AMENITIES
===================================================== */

function renderAmenities(room) {
  const block = document.getElementById("roomAmenitiesBlock");

  const container = document.getElementById("roomAmenities");

  container.innerHTML = "";

  if (!room.amenities) {
    block.hidden = true;

    return;
  }

  const amenities = String(room.amenities)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (amenities.length === 0) {
    block.hidden = true;

    return;
  }

  amenities.forEach((amenity) => {
    const item = document.createElement("div");

    item.className = "room-amenity-item";

    item.innerHTML = `
                <span class="room-amenity-check">✓</span>
                <span>${escapeHTML(amenity)}</span>
            `;

    container.appendChild(item);
  });

  block.hidden = false;
}

/* =====================================================
   ROOM STATUS
===================================================== */

function renderStatus(room) {
  const statusElement = document.getElementById("roomStatus");

  const status = String(room.status || "Available").trim();

  statusElement.textContent = status;

  statusElement.className = "room-details-status";

  if (status.toLowerCase() === "available") {
    statusElement.classList.add("available");
  } else {
    statusElement.classList.add("unavailable");
  }
}

/* =====================================================
   WHATSAPP ENQUIRY
===================================================== */

function setupWhatsAppButton(room, homestay) {
  const button = document.getElementById("whatsappButton");

  if (!button) {
    return;
  }

  /*
       WhatsApp number comes from
       the Homestay Google Sheet.

       Homestay:

       key                  value
       --------------------------------
       whatsapp_number      919876543210
    */

  const whatsappNumber = normalizeWhatsAppNumber(homestay.whatsapp_number);

  if (!whatsappNumber) {
    button.href = "#";

    button.addEventListener("click", (event) => {
      event.preventDefault();

      alert(
        "WhatsApp contact is currently unavailable. Please contact the homestay directly.",
      );
    });

    return;
  }

  const propertyName = homestay.property_name || "Puri Homestay";

  const roomName = room.room_name || "Room";

  const roomType = room.room_type || "Room";

  const roomNo = room.room_no || "N/A";

  const price = room.price_per_night
    ? formatPrice(room.price_per_night)
    : "Not specified";

  const maxGuests = room.max_guests || "Not specified";

  const message =
    `Hello ${propertyName},` +
    `\n\n` +
    `I would like to enquire about a room.` +
    `\n\n` +
    `Room Name: ${roomName}` +
    `\n` +
    `Room Type: ${roomType}` +
    `\n` +
    `Room No: ${roomNo}` +
    `\n` +
    `Price: ${price} per night` +
    `\n` +
    `Maximum Guests: ${maxGuests}` +
    `\n\n` +
    `Please let me know the availability.`;

  const whatsappUrl =
    `https://wa.me/${whatsappNumber}` + `?text=${encodeURIComponent(message)}`;

  button.href = whatsappUrl;

  button.target = "_blank";

  button.rel = "noopener noreferrer";
}

/* =====================================================
   WHATSAPP NUMBER NORMALIZATION
===================================================== */

function normalizeWhatsAppNumber(value) {
  if (!value) {
    return "";
  }

  let number = String(value).trim();

  /*
       Remove:

       +
       spaces
       -
       brackets
    */

  number = number.replace(/[\s+\-()]/g, "");

  /*
       If an Indian 10-digit number
       was accidentally entered,
       automatically add 91.
    */

  if (/^\d{10}$/.test(number)) {
    number = "91" + number;
  }

  /*
       Only allow numeric
       international format.
    */

  if (!/^\d{10,15}$/.test(number)) {
    return "";
  }

  return number;
}

/* =====================================================
   LOADING / ERROR
===================================================== */

function showLoading() {
  document.getElementById("roomLoading").hidden = false;

  document.getElementById("roomDetails").hidden = true;

  document.getElementById("roomError").hidden = true;
}

function hideLoading() {
  document.getElementById("roomLoading").hidden = true;
}

function showError() {
  document.getElementById("roomLoading").hidden = true;

  document.getElementById("roomDetails").hidden = true;

  document.getElementById("roomError").hidden = false;
}

/* =====================================================
   HELPERS
===================================================== */

function setText(elementId, value) {
  const element = document.getElementById(elementId);

  if (!element) {
    return;
  }

  element.textContent = value ?? "";
}

function formatPrice(value) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return "₹0";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(number);
}

function isValidImageUrl(url) {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(String(url).trim());

    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setCurrentYear() {
  const yearElement = document.getElementById("currentYear");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}
