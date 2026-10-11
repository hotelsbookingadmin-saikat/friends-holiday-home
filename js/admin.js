// ============================================================
// PURI HOMESTAY
// ADMIN DASHBOARD - STEP 1
// Authentication + Dashboard Foundation
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  // ========================================================
  // CONFIGURATION
  // ========================================================

  const params = new URLSearchParams(window.location.search);

  const propertyId = (params.get("propertyId") || "PURI001").trim();

  // ====================================================
  // LOGIN ELEMENTS
  // ====================================================

  const adminLogin = document.getElementById("adminLogin");

  const loginForm = document.getElementById("loginForm");

  const loginUsername = document.getElementById("loginUsername");

  const loginPassword = document.getElementById("loginPassword");

  const loginButton = document.getElementById("loginButton");

  const loginMessage = document.getElementById("loginMessage");

  // ====================================================
  // ADMIN ELEMENTS
  // ====================================================

  const adminPanel = document.getElementById("adminPanel");

  const adminUserInfo = document.getElementById("adminUserInfo");

  const logoutButton = document.getElementById("logoutButton");

  const dashboardMessage = document.getElementById("dashboardMessage");

  // ====================================================
  // MOBILE MENU
  // ====================================================

  const mobileMenuButton = document.getElementById("adminMobileMenuButton");

  const sidebar = document.querySelector(".admin-sidebar");

  // ====================================================
  // STORAGE
  // ====================================================

  const STORAGE_TOKEN = "puriHomestayAdminToken";

  const STORAGE_USER = "puriHomestayAdminUser";

  const STORAGE_EXPIRES = "puriHomestayAdminExpiresAt";

  // ====================================================
  // SESSION
  // ====================================================

  let adminToken = localStorage.getItem(STORAGE_TOKEN) || "";

  let adminUser = parseStoredUser(localStorage.getItem(STORAGE_USER));

  let adminExpiresAt = localStorage.getItem(STORAGE_EXPIRES) || "";

  // ====================================================
  // DASHBOARD DATA
  // ====================================================

  const dashboardData = {
    rooms: [],

    homestay: [],

    amenities: [],

    offices: [],
  };

  // ====================================================
  // INITIALIZE
  // ====================================================

  init();

  async function init() {
    if (!adminToken) {
      showLoginPanel();

      return;
    }

    const valid = await validateAdminSession();

    if (!valid) {
      clearAdminSession();

      showLoginPanel();

      return;
    }

    showAdminPanel();

    await loadDashboardData();
  }

  // ====================================================
  // LOGIN
  // ====================================================

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearLoginMessage();

    const username = loginUsername.value.trim();

    const password = loginPassword.value;

    if (!username || !password) {
      showLoginMessage("Username and password are required.", "error");

      return;
    }

    setButtonLoading(loginButton, true, "Signing in...");

    try {
      const body = new URLSearchParams();

      body.append("action", "login");

      body.append("username", username);

      body.append("password", password);

      const result = await postApi(body);

      if (!result.success || !result.token) {
        throw new Error(result.error || "Login failed.");
      }

      adminToken = result.token;

      adminUser = result.user || {
        username,
      };

      adminExpiresAt = result.expiresAt || "";

      saveAdminSession();

      loginPassword.value = "";

      showAdminPanel();

      await loadDashboardData();
    } catch (error) {
      console.error("Login failed:", error);

      showLoginMessage(error.message || "Login failed.", "error");
    } finally {
      setButtonLoading(loginButton, false, "Login");
    }
  });

  // ====================================================
  // LOGOUT
  // ====================================================

  logoutButton.addEventListener("click", async () => {
    try {
      if (adminToken) {
        const body = new URLSearchParams();

        body.append("action", "logout");

        body.append("token", adminToken);

        await postApi(body);
      }
    } catch (error) {
      console.warn("Logout API failed:", error);
    } finally {
      clearAdminSession();

      showLoginPanel();
    }
  });

  // ====================================================
  // LOAD DASHBOARD DATA
  // ====================================================

  async function loadDashboardData() {
    showDashboardMessage("Loading dashboard...", "loading");

    try {
      const results = await Promise.allSettled([
        fetchDashboardSheet("Rooms"),

        fetchDashboardSheet("Homestay"),

        fetchDashboardSheet("Amenities"),

        fetchDashboardSheet("BookingOffices"),
      ]);

      dashboardData.rooms = getResultData(results[0]);

      dashboardData.homestay = getResultData(results[1]);

      dashboardData.amenities = getResultData(results[2]);

      dashboardData.offices = getResultData(results[3]);

      updateDashboardCounts();

      const failed = results.filter((result) => result.status === "rejected");

      if (failed.length) {
        showDashboardMessage(
          "Some dashboard data could not be loaded.",
          "error",
        );
      } else {
        showDashboardMessage("", "");
      }
    } catch (error) {
      console.error("Dashboard loading failed:", error);

      showDashboardMessage(
        error.message || "Unable to load dashboard data.",
        "error",
      );
    }
  }

  // ====================================================
  // GENERIC SHEET FETCH
  // ====================================================

  async function fetchDashboardSheet(sheetName) {
    const url = `${CONFIG.apiUrl}` + `?sheet=${encodeURIComponent(sheetName)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`${sheetName}: HTTP ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || `Unable to load ${sheetName}.`);
    }

    return Array.isArray(result.data) ? result.data : [];
  }

  // ====================================================
  // RESULT DATA
  // ====================================================

  function getResultData(result) {
    if (result.status !== "fulfilled") {
      console.warn("Dashboard source failed:", result.reason);

      return [];
    }

    return result.value || [];
  }

  // ====================================================
  // UPDATE CARD COUNTS
  // ====================================================

  function updateDashboardCounts() {
    const rooms = dashboardData.rooms.filter(
      (room) => String(room.property_id || "").trim() === propertyId,
    );

    const homestay = dashboardData.homestay;

    const amenities = dashboardData.amenities;

    const offices = dashboardData.offices;

    setCount("roomsCount", rooms.length);

    setCount("homestayCount", homestay.length);

    setCount("amenitiesCount", amenities.length);

    setCount("officesCount", offices.length);
  }

  function setCount(elementId, count) {
    const element = document.getElementById(elementId);

    if (!element) {
      return;
    }

    element.textContent = Number.isFinite(count) ? count : "—";
  }

  // ====================================================
  // MODULE CARD CLICK
  // ====================================================

  document.querySelectorAll("[data-admin-module]").forEach((card) => {
    card.addEventListener("click", () => {
      const module = card.dataset.adminModule;

      openModulePlaceholder(module);
    });
  });

  // ====================================================
  // SIDEBAR NAVIGATION
  // ====================================================

  document.querySelectorAll("[data-admin-nav]").forEach((item) => {
    item.addEventListener("click", () => {
      const module = item.dataset.adminNav;

      setActiveNavigation(module);

      if (module !== "dashboard") {
        openModulePlaceholder(module);
      }

      closeMobileSidebar();
    });
  });

  // ========================================================
  // GENERIC CRUD MODAL
  // STEP 2 + STEP 3
  // ========================================================

  const crudModal = document.getElementById("adminCrudModal");

  const crudModalBackdrop = document.getElementById("adminCrudModalBackdrop");

  const crudModalClose = document.getElementById("adminCrudModalClose");

  const crudModalCancel = document.getElementById("adminCrudModalCancel");

  const crudModalKicker = document.getElementById("adminCrudModalKicker");

  const crudModalTitle = document.getElementById("adminCrudModalTitle");

  const crudModalDescription = document.getElementById(
    "adminCrudModalDescription",
  );

  const crudFormTitle = document.getElementById("adminCrudFormTitle");

  const crudFormContainer = document.getElementById("adminCrudFormContainer");

  const crudFormMessage = document.getElementById("adminCrudFormMessage");

  const crudTableTitle = document.getElementById("adminCrudTableTitle");

  const crudTableWrapper = document.getElementById("adminCrudTableWrapper");

  const crudSearch = document.getElementById("adminCrudSearch");

  const crudRecordCount = document.getElementById("adminCrudRecordCount");

  let activeCrudModule = "";

  let crudModalOpen = false;

  // ========================================================
  // ROOMS CRUD STATE
  // ========================================================

  let adminRoomsData = [];

  let roomEditMode = false;

  let editingRoomId = "";

  // ========================================================
  // MODULE DEFINITIONS
  // ========================================================

  const CRUD_MODULES = {
    rooms: {
      title: "Rooms",

      kicker: "ROOM MANAGEMENT",

      description: "Manage rooms, pricing, availability and room information.",

      formTitle: "Add New Room",

      tableTitle: "Room List",
    },

    homestay: {
      title: "Homestay",

      kicker: "HOMESTAY MANAGEMENT",

      description: "Manage your homestay property information and settings.",

      formTitle: "Add New Setting",

      tableTitle: "Homestay Settings",
    },

    amenities: {
      title: "Amenities",

      kicker: "AMENITIES MANAGEMENT",

      description: "Manage amenities displayed on the public website.",

      formTitle: "Add New Amenity",

      tableTitle: "Amenity List",
    },

    offices: {
      title: "Booking Offices",

      kicker: "BOOKING OFFICE MANAGEMENT",

      description: "Manage booking office locations and contact information.",

      formTitle: "Add New Booking Office",

      tableTitle: "Booking Office List",
    },
  };

  // ========================================================
  // OPEN MODULE
  // ========================================================

  function openModulePlaceholder(module) {
    openCrudModal(module);
  }

  // ========================================================
  // OPEN CRUD MODAL
  // ========================================================

  async function openCrudModal(module) {
    const config = CRUD_MODULES[module];

    if (!config) {
      console.error("Unknown CRUD module:", module);

      return;
    }

    activeCrudModule = module;

    crudModalKicker.textContent = config.kicker;

    crudModalTitle.textContent = config.title;

    crudModalDescription.textContent = config.description;

    crudFormTitle.textContent = config.formTitle;

    crudTableTitle.textContent = config.tableTitle;

    crudSearch.value = "";

    clearCrudFormMessage();

    crudModal.classList.add("is-open");

    crudModal.setAttribute("aria-hidden", "false");

    document.body.classList.add("admin-modal-open");

    crudModalOpen = true;

    // ====================================================
    // ROOMS MODULE
    // ====================================================

    if (module === "rooms") {
      renderRoomsForm();
      renderRoomsTable();

      await Promise.all([loadRoomsForCrud(), loadNextRoomId()]);
    } else if (module === "offices") {
      renderBookingOfficesForm();
      renderBookingOfficesTable();

      await loadBookingOfficesForCrud();
    } else {
      renderCrudFormPlaceholder(config);
      renderCrudTablePlaceholder(config);
    }

    setTimeout(() => {
      crudModalClose.focus();
    }, 50);
  }

  // ========================================================
  // CLOSE CRUD MODAL
  // ========================================================

  function closeCrudModal() {
    if (!crudModalOpen) {
      return;
    }

    crudModal.classList.remove("is-open");

    crudModal.setAttribute("aria-hidden", "true");

    document.body.classList.remove("admin-modal-open");

    activeCrudModule = "";

    crudModalOpen = false;

    crudSearch.value = "";

    clearCrudFormMessage();
  }

  // ========================================================
  // MODAL CLOSE EVENTS
  // ========================================================

  crudModalClose.addEventListener("click", closeCrudModal);

  crudModalCancel.addEventListener("click", closeCrudModal);

  crudModalBackdrop.addEventListener("click", closeCrudModal);

  // ========================================================
  // ESCAPE KEY
  // ========================================================

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && crudModalOpen) {
      closeCrudModal();
    }
  });

  // ========================================================
  // ROOM FORM
  // ========================================================

  function renderRoomsForm() {
    crudFormContainer.innerHTML = `

                <form
                    class="admin-crud-form"
                    id="roomCrudForm"
                >

                    <div class="admin-crud-form-grid">

                        <div class="form-group">

                            <label for="crud_property_id">
                                Property ID
                            </label>

                            <input
                                type="text"
                                id="crud_property_id"
                                value="${escapeHtml(propertyId)}"
                                readonly
                            >

                        </div>


                        <div class="form-group">

                            <label for="crud_room_id">
                                Room ID
                            </label>

                            
<input
        type="text"
    id="crud_room_id"
    placeholder="Generating Room ID..."
    readonly
    required
    aria-describedby="crudRoomIdHelp"
>

<small id="crudRoomIdHelp">
    Generated automatically from the Rooms sheet.
</small>


                        </div>


                        <div class="form-group">

                            <label for="crud_room_no">
                                Room Number
                            </label>

                            <input
                                type="text"
                                id="crud_room_no"
                                placeholder="Example: 101"
                                required
                            >

                        </div>


                        <div class="form-group">

                            <label for="crud_room_name">
                                Room Name
                            </label>

                            <input
                                type="text"
                                id="crud_room_name"
                                placeholder="Example: Sea View Family Room"
                                required
                            >

                        </div>


                        <div class="form-group">

                            <label for="crud_room_type">
                                Room Type
                            </label>

                            <select
                                id="crud_room_type"
                                required
                            >

                                <option value="">
                                    Select Room Type
                                </option>

                                <option value="Standard">
                                    Standard
                                </option>

                                <option value="Deluxe">
                                    Deluxe
                                </option>

                                <option value="Family">
                                    Family
                                </option>

                                <option value="Premium">
                                    Premium
                                </option>

                                <option value="Suite">
                                    Suite
                                </option>

                            </select>

                        </div>


                        <div class="form-group">

                            <label for="crud_floor">
                                Floor
                            </label>

                            <select
                                id="crud_floor"
                                required
                            >

                                <option value="">
                                    Select Floor
                                </option>

                                <option value="Ground Floor">
                                    Ground Floor
                                </option>

                                <option value="1st Floor">
                                    1st Floor
                                </option>

                                <option value="2nd Floor">
                                    2nd Floor
                                </option>

                                <option value="3rd Floor">
                                    3rd Floor
                                </option>

                                <option value="4th Floor">
                                    4th Floor
                                </option>

                                <option value="5th Floor">
                                    5th Floor
                                </option>

                            </select>

                        </div>


                        <div class="form-group">

                            <label for="crud_price_per_night">
                                Price Per Night
                            </label>

                            <input
                                type="number"
                                id="crud_price_per_night"
                                min="0"
                                step="1"
                                placeholder="Example: 2500"
                                required
                            >

                        </div>


                        <div class="form-group">

                            <label for="crud_max_guests">
                                Maximum Guests
                            </label>

                            <input
                                type="number"
                                id="crud_max_guests"
                                min="1"
                                step="1"
                                placeholder="Example: 4"
                                required
                            >

                        </div>


                        <div class="form-group">

                            <label for="crud_bed_info">
                                Bed Information
                            </label>

                            <input
                                type="text"
                                id="crud_bed_info"
                                placeholder="Example: 1 Double Bed"
                            >

                        </div>


                        <div class="form-group">

                            <label for="crud_cooking_facility">
                                Cooking Facility
                            </label>

                            <select
                                id="crud_cooking_facility"
                            >

                                <option value="">
                                    Select
                                </option>

                                <option value="Yes">
                                    Yes
                                </option>

                                <option value="No">
                                    No
                                </option>

                            </select>

                        </div>


                        <div class="form-group">

                            <label for="crud_status">
                                Status
                            </label>

                            <select
                                id="crud_status"
                            >

                                <option value="">
                                    Select Status
                                </option>

                                <option value="Available">
                                    Available
                                </option>

                                <option value="Maintenance">
                                    Maintenance
                                </option>

                                <option value="Unavailable">
                                    Unavailable
                                </option>

                            </select>

                        </div>


                        <div class="form-group">

                            <label for="crud_whatsapp_enabled">
                                WhatsApp Enquiry
                            </label>

                            <select
                                id="crud_whatsapp_enabled"
                            >

                                <option value="">
                                    Select
                                </option>

                                <option value="Yes">
                                    Yes
                                </option>

                                <option value="No">
                                    No
                                </option>

                            </select>

                        </div>


                        <div class="form-group admin-crud-form-full">

                            <label for="crud_description">
                                Description
                            </label>

                            <textarea
                                id="crud_description"
                                rows="3"
                                placeholder="Describe the room..."
                            ></textarea>

                        </div>


                        <div class="form-group admin-crud-form-full">

                            <label for="crud_amenities">
                                Amenities
                            </label>

                            <textarea
                                id="crud_amenities"
                                rows="2"
                                placeholder="Example: WiFi, AC, TV, Balcony"
                            ></textarea>

                        </div>


                        <div class="form-group admin-crud-form-full">

                            <label for="crud_kitchen_info">
                                Kitchen Information
                            </label>

                            <textarea
                                id="crud_kitchen_info"
                                rows="2"
                                placeholder="Describe available kitchen facilities..."
                            ></textarea>

                        </div>


                        <div class="form-group">

                            <label for="crud_image_1">
                                Image 1 URL
                            </label>

                            <input
                                type="url"
                                id="crud_image_1"
                                placeholder="https://..."
                            >

                        </div>


                        <div class="form-group">

                            <label for="crud_image_2">
                                Image 2 URL
                            </label>

                            <input
                                type="url"
                                id="crud_image_2"
                                placeholder="https://..."
                            >

                        </div>


                        <div class="form-group">

                            <label for="crud_image_3">
                                Image 3 URL
                            </label>

                            <input
                                type="url"
                                id="crud_image_3"
                                placeholder="https://..."
                            >

                        </div>

                    </div>


                    <div class="admin-crud-form-actions">

                        <button
                            type="button"
                            class="secondary-button"
                            id="roomCrudCancelButton"
                        >
                            Cancel
                        </button>


                        <button
                            type="submit"
                            class="primary-button"
                            id="roomCrudSubmitButton"
                        >
                            Add Room
                        </button>

                    </div>

                </form>

            `;

    const form = document.getElementById("roomCrudForm");

    form.addEventListener("submit", handleRoomSubmit);

    document
      .getElementById("roomCrudCancelButton")
      .addEventListener("click", resetRoomCrudForm);
  }

  async function loadNextRoomId() {
    const roomIdInput = document.getElementById("crud_room_id");

    const submitButton = document.getElementById("roomCrudSubmitButton");

    if (!roomIdInput || roomEditMode) {
      return;
    }

    roomIdInput.readOnly = true;
    roomIdInput.value = "";
    roomIdInput.placeholder = "Generating Room ID...";

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const url = new URL(CONFIG.apiUrl);

      url.searchParams.set("action", "getNextRoomId");
      url.searchParams.set("token", adminToken);

      const response = await fetch(url.toString());
      const result = await response.json();

      if (!result.success || !result.room_id) {
        throw new Error(result.error || "Unable to generate Room ID.");
      }

      roomIdInput.value = result.room_id;
      roomIdInput.placeholder = "";
    } catch (error) {
      console.error("Room ID generation failed:", error);

      roomIdInput.value = "";
      roomIdInput.placeholder = "Unable to generate ID";

      showCrudFormMessage(
        "Could not generate a Room ID. Check your session and Apps Script deployment, then try again.",
        "error",
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = !roomIdInput.value.trim();
      }
    }
  }

  /* =========================================================
   BOOKING OFFICES — FRONTEND CRUD
   ========================================================= */

  let adminBookingOfficesData = [];
  let officeEditMode = false;
  let editingOfficeId = "";

  /* ---------- FORM ---------- */

  function renderBookingOfficesForm() {
    crudFormContainer.innerHTML = `
    <form id="bookingOfficeCrudForm" class="admin-crud-form">
      <div class="admin-form-grid">

        <div class="admin-form-field">
          <label for="bo_office_id">Office ID *</label>
          <input id="bo_office_id" name="office_id"
            required maxlength="50"
            placeholder="BO001">
        </div>

        <div class="admin-form-field">
          <label for="bo_office_name">Office Name *</label>
          <input id="bo_office_name" name="office_name"
            required maxlength="150">
        </div>

        <div class="admin-form-field">
          <label for="bo_address">Address *</label>
          <input id="bo_address" name="address"
            required maxlength="500">
        </div>

        <div class="admin-form-field">
          <label for="bo_area">Area</label>
          <input id="bo_area" name="area" maxlength="150">
        </div>

        <div class="admin-form-field">
          <label for="bo_city">City *</label>
          <input id="bo_city" name="city"
            required maxlength="100">
        </div>

        <div class="admin-form-field">
          <label for="bo_state">State</label>
          <input id="bo_state" name="state" maxlength="100">
        </div>

        <div class="admin-form-field">
          <label for="bo_pincode">Pincode</label>
          <input id="bo_pincode" name="pincode"
            inputmode="numeric" maxlength="12">
        </div>

        <div class="admin-form-field">
          <label for="bo_contact_person">Contact Person</label>
          <input id="bo_contact_person" name="contact_person"
            maxlength="150">
        </div>

        <div class="admin-form-field">
          <label for="bo_phone">Phone *</label>
          <input id="bo_phone" name="phone"
            required maxlength="30" inputmode="tel">
        </div>

        <div class="admin-form-field">
          <label for="bo_whatsapp">WhatsApp</label>
          <input id="bo_whatsapp" name="whatsapp"
            maxlength="30" inputmode="tel">
        </div>

        <div class="admin-form-field">
          <label for="bo_email">Email</label>
          <input id="bo_email" name="email"
            type="email" maxlength="254">
        </div>

        <div class="admin-form-field">
          <label for="bo_working_hours">Working Hours</label>
          <input id="bo_working_hours" name="working_hours"
            maxlength="100" placeholder="9 AM - 6 PM">
        </div>

        <div class="admin-form-field">
          <label for="bo_map_url">Map URL</label>
          <input id="bo_map_url" name="map_url"
            type="url" maxlength="1000"
            placeholder="https://maps.google.com/...">
        </div>

        <div class="admin-form-field">
          <label for="bo_enabled">Enabled</label>
          <select id="bo_enabled" name="enabled">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>

      </div>

      <div class="admin-form-actions">
        <button type="submit" class="admin-button admin-button-primary"
          id="bookingOfficeSubmitButton">
          Add Booking Office
        </button>

        <button type="button" class="admin-button"
          id="bookingOfficeCancelButton">
          Clear Form
        </button>
      </div>
    </form>
  `;

    const form = document.getElementById("bookingOfficeCrudForm");

    form.addEventListener("submit", submitBookingOfficeForm);

    document
      .getElementById("bookingOfficeCancelButton")
      .addEventListener("click", resetBookingOfficeForm);
  }

  /* ---------- LOAD ---------- */

  async function loadBookingOfficesForCrud() {
    if (!adminToken) return;

    crudTableWrapper.innerHTML =
      '<div class="admin-crud-loading">Loading booking offices...</div>';

    try {
      const url =
        `${CONFIG.apiUrl}?action=getBookingOffices` +
        `&token=${encodeURIComponent(adminToken)}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        const error = new Error(
          result.error || "Failed to load booking offices.",
        );
        error.code = result.code;
        throw error;
      }

      adminBookingOfficesData = Array.isArray(result.data) ? result.data : [];

      renderBookingOfficesTable();
    } catch (error) {
      console.error("Load booking offices failed:", error);

      if (isSessionError(error)) {
        clearAdminSession();
        closeCrudModal();
        showLoginPanel();
        return;
      }

      crudTableWrapper.innerHTML = `<div class="admin-crud-error">${escapeHtml(
        error.message || "Unable to load booking offices.",
      )}</div>`;
    }
  }

  /* ---------- TABLE ---------- */

  function renderBookingOfficesTable(offices = adminBookingOfficesData) {
    if (!Array.isArray(offices) || offices.length === 0) {
      crudTableWrapper.innerHTML = `
      <div class="admin-crud-empty">
        <strong>No booking offices found</strong>
        <p>Add your first booking office using the form above.</p>
      </div>`;

      crudRecordCount.textContent = "0 records";
      return;
    }

    crudRecordCount.textContent = `${offices.length} record${offices.length === 1 ? "" : "s"}`;

    crudTableWrapper.innerHTML = `
    <table class="admin-crud-table">
      <thead>
        <tr>
          <th>Office ID</th>
          <th>Office Name</th>
          <th>City</th>
          <th>Contact Person</th>
          <th>Phone</th>
          <th>Email</th>
          <th>Enabled</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${offices
          .map((office) => {
            const id = String(office.office_id || "");
            const enabled = String(office.enabled || "Yes");

            return `
            <tr>
              <td>${escapeHtml(id)}</td>
              <td>${escapeHtml(office.office_name || "")}</td>
              <td>${escapeHtml(office.city || "")}</td>
              <td>${escapeHtml(office.contact_person || "")}</td>
              <td>${escapeHtml(office.phone || "")}</td>
              <td>${escapeHtml(office.email || "")}</td>
              <td>${escapeHtml(enabled)}</td>
              <td>
                <button type="button"
                  class="admin-button"
                  data-office-crud-action="edit"
                  data-office-id="${escapeHtml(id)}">
                  Edit
                </button>
                <button type="button"
                  class="admin-button"
                  data-office-crud-action="delete"
                  data-office-id="${escapeHtml(id)}">
                  Delete
                </button>
              </td>
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>`;
  }

  /* ---------- FORM VALUES ---------- */

  function getBookingOfficeFormData() {
    const fieldNames = [
      "office_id",
      "office_name",
      "address",
      "area",
      "city",
      "state",
      "pincode",
      "contact_person",
      "phone",
      "whatsapp",
      "email",
      "working_hours",
      "map_url",
      "enabled",
    ];

    const office = {};

    fieldNames.forEach((name) => {
      const field = document.getElementById(`bo_${name}`);
      office[name] = field ? field.value.trim() : "";
    });

    return office;
  }

  function validateBookingOffice(office) {
    const required = [
      ["office_id", "Office ID"],
      ["office_name", "Office Name"],
      ["address", "Address"],
      ["city", "City"],
      ["phone", "Phone"],
    ];

    for (const [key, label] of required) {
      if (!office[key]) return `${label} is required.`;
    }

    if (office.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(office.email)) {
      return "Enter a valid email address.";
    }

    if (office.map_url) {
      try {
        const parsed = new URL(office.map_url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return "Map URL must use HTTP or HTTPS.";
        }
      } catch (_) {
        return "Enter a valid map URL.";
      }
    }

    if (!["Yes", "No"].includes(office.enabled)) {
      return "Enabled must be Yes or No.";
    }

    return "";
  }

  /* ---------- ADD / UPDATE ---------- */

  async function submitBookingOfficeForm(event) {
    event.preventDefault();

    const office = getBookingOfficeFormData();
    const validationError = validateBookingOffice(office);

    if (validationError) {
      showCrudFormMessage(validationError, "error");
      return;
    }

    const submitButton = document.getElementById("bookingOfficeSubmitButton");

    submitButton.disabled = true;

    try {
      const action = officeEditMode
        ? "updateBookingOffice"
        : "addBookingOffice";

      const payload = new URLSearchParams();

      payload.set("action", action);
      payload.set("token", adminToken);
      payload.set("office", JSON.stringify(office));

      const response = await fetch(CONFIG.apiUrl, {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        const error = new Error(
          result.error || "Unable to save booking office.",
        );
        error.code = result.code;
        throw error;
      }

      showCrudFormMessage(
        result.message || "Booking office saved successfully.",
        "success",
      );

      await loadBookingOfficesForCrud();

      resetBookingOfficeForm();

      showCrudFormMessage(
        result.message || "Booking office saved successfully.",
        "success",
      );
    } catch (error) {
      console.error("Save booking office failed:", error);

      if (isSessionError(error)) {
        clearAdminSession();
        closeCrudModal();
        showLoginPanel();
        return;
      }

      showCrudFormMessage(
        error.message || "Unable to save booking office.",
        "error",
      );
    } finally {
      submitButton.disabled = false;
    }
  }

  /* ---------- EDIT ---------- */

  function editBookingOffice(officeId) {
    const office = adminBookingOfficesData.find(
      (item) =>
        String(item.office_id || "").trim() === String(officeId || "").trim(),
    );

    if (!office) {
      showCrudFormMessage("Booking office not found.", "error");
      return;
    }

    Object.keys(office).forEach((key) => {
      const field = document.getElementById(`bo_${key}`);

      if (field) {
        field.value = office[key] == null ? "" : String(office[key]);
      }
    });

    officeEditMode = true;
    editingOfficeId = String(office.office_id || "").trim();

    const idInput = document.getElementById("bo_office_id");
    idInput.readOnly = true;

    document.getElementById("bookingOfficeSubmitButton").textContent =
      "Update Booking Office";

    crudFormTitle.textContent = "Edit Booking Office";

    showCrudFormMessage(`Editing ${editingOfficeId}`, "info");
  }

  /* ---------- RESET ---------- */

  function resetBookingOfficeForm() {
    const form = document.getElementById("bookingOfficeCrudForm");

    if (form) form.reset();

    officeEditMode = false;
    editingOfficeId = "";

    const idInput = document.getElementById("bo_office_id");
    if (idInput) idInput.readOnly = false;

    const button = document.getElementById("bookingOfficeSubmitButton");
    if (button) button.textContent = "Add Booking Office";

    crudFormTitle.textContent = "Add New Booking Office";
    clearCrudFormMessage();
  }

  /* ---------- DELETE ---------- */

  async function deleteBookingOffice(officeId) {
    const office = adminBookingOfficesData.find(
      (item) =>
        String(item.office_id || "").trim() === String(officeId || "").trim(),
    );

    if (!office) {
      showCrudFormMessage("Booking office not found.", "error");
      return;
    }

    if (
      !confirm(
        `Delete booking office "${office.office_name}" (${office.office_id})?`,
      )
    ) {
      return;
    }

    try {
      const payload = new URLSearchParams();

      payload.set("action", "deleteBookingOffice");
      payload.set("token", adminToken);
      payload.set("office_id", String(office.office_id));

      const response = await fetch(CONFIG.apiUrl, {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        const error = new Error(
          result.error || "Unable to delete booking office.",
        );
        error.code = result.code;
        throw error;
      }

      resetBookingOfficeForm();
      await loadBookingOfficesForCrud();

      showCrudFormMessage(
        result.message || "Booking office deleted successfully.",
        "success",
      );
    } catch (error) {
      console.error("Delete booking office failed:", error);

      if (isSessionError(error)) {
        clearAdminSession();
        closeCrudModal();
        showLoginPanel();
        return;
      }

      showCrudFormMessage(
        error.message || "Unable to delete booking office.",
        "error",
      );
    }
  }

  // ========================================================
  // ROOM FORM SUBMIT
  // ========================================================

  async function handleRoomSubmit(event) {
    event.preventDefault();

    clearCrudFormMessage();

    if (!adminToken) {
      showCrudFormMessage(
        "Your admin session has expired. Please log in again.",
        "error",
      );

      closeCrudModal();

      showLoginPanel();

      return;
    }

    const room = collectCrudRoomFormData();

    const validationError = validateCrudRoom(room);

    if (validationError) {
      showCrudFormMessage(validationError, "error");

      return;
    }

    const button = document.getElementById("roomCrudSubmitButton");

    setButtonLoading(
      button,
      true,
      roomEditMode ? "Updating Room..." : "Adding Room...",
    );

    try {
      const body = new URLSearchParams();

      body.append("action", roomEditMode ? "updateRoom" : "addRoom");

      body.append("token", adminToken);

      body.append("room", JSON.stringify(room));

      const result = await postApi(body);

      if (!result.success) {
        throw new Error(result.error || "Unable to save room.");
      }

      showCrudFormMessage(
        result.message ||
          (roomEditMode
            ? "Room updated successfully."
            : "Room added successfully."),
        "success",
      );

      await loadRoomsForCrud();

      resetRoomCrudForm();
    } catch (error) {
      console.error("Save room failed:", error);

      if (isSessionError(error)) {
        clearAdminSession();

        closeCrudModal();

        showLoginPanel();

        return;
      }

      showCrudFormMessage(error.message || "Unable to save room.", "error");
    } finally {
      setButtonLoading(
        button,
        false,
        roomEditMode ? "Update Room" : "Add Room",
      );
    }
  }

  // ========================================================
  // COLLECT ROOM FORM DATA
  // ========================================================

  function collectCrudRoomFormData() {
    return {
      property_id: propertyId,

      room_id: getCrudValue("crud_room_id"),

      room_no: getCrudValue("crud_room_no"),

      room_name: getCrudValue("crud_room_name"),

      room_type: getCrudValue("crud_room_type"),

      floor: getCrudValue("crud_floor"),

      price_per_night: getCrudValue("crud_price_per_night"),

      max_guests: getCrudValue("crud_max_guests"),

      bed_info: getCrudValue("crud_bed_info"),

      description: getCrudValue("crud_description"),

      amenities: getCrudValue("crud_amenities"),

      cooking_facility: getCrudValue("crud_cooking_facility"),

      kitchen_info: getCrudValue("crud_kitchen_info"),

      image_1: getCrudValue("crud_image_1"),

      image_2: getCrudValue("crud_image_2"),

      image_3: getCrudValue("crud_image_3"),

      status: getCrudValue("crud_status"),

      whatsapp_enabled: getCrudValue("crud_whatsapp_enabled"),
    };
  }

  function getCrudValue(id) {
    const element = document.getElementById(id);

    if (!element) {
      return "";
    }

    return String(element.value || "").trim();
  }

  // ========================================================
  // VALIDATE ROOM
  // ========================================================

  function validateCrudRoom(room) {
    const requiredFields = [
      ["room_id", "Room ID"],

      ["room_no", "Room number"],

      ["room_name", "Room name"],

      ["room_type", "Room type"],

      ["floor", "Floor"],

      ["price_per_night", "Price per night"],

      ["max_guests", "Maximum guests"],
    ];

    for (const [field, label] of requiredFields) {
      if (!String(room[field] || "").trim()) {
        return label + " is required.";
      }
    }

    const price = Number(room.price_per_night);

    if (!Number.isFinite(price) || price < 0) {
      return "Price per night must be a valid non-negative number.";
    }

    const guests = Number(room.max_guests);

    if (!Number.isInteger(guests) || guests < 1) {
      return "Maximum guests must be at least 1.";
    }

    return "";
  }

  // ========================================================
  // LOAD ROOMS FOR CRUD MODAL
  // ========================================================

  async function loadRoomsForCrud() {
    if (!adminToken) {
      return;
    }

    crudTableWrapper.innerHTML = `

                <div class="admin-crud-loading">

                    <span>
                        Loading rooms...
                    </span>

                </div>

            `;

    try {
      const url =
        `${CONFIG.apiUrl}` +
        `?action=getRooms` +
        `&token=${encodeURIComponent(adminToken)}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to load rooms.");
      }

      adminRoomsData = Array.isArray(result.data)
        ? result.data.filter(
            (room) => String(room.property_id || "").trim() === propertyId,
          )
        : [];

      renderRoomsTable();
    } catch (error) {
      console.error("Load rooms failed:", error);

      if (isSessionError(error)) {
        clearAdminSession();

        closeCrudModal();

        showLoginPanel();

        return;
      }

      crudTableWrapper.innerHTML = `

                    <div class="admin-crud-error">

                        ${escapeHtml(error.message || "Unable to load rooms.")}

                    </div>

                `;
    }
  }

  // ========================================================
  // RENDER ROOM TABLE
  // ========================================================

  function renderRoomsTable(rooms = adminRoomsData) {
    if (!Array.isArray(rooms) || rooms.length === 0) {
      crudTableWrapper.innerHTML = `

                    <div class="admin-crud-empty">

                        <strong>
                            No rooms found
                        </strong>

                        <p>
                            Add your first room using the form above.
                        </p>

                    </div>

                `;

      crudRecordCount.textContent = "0 records";

      return;
    }

    crudTableWrapper.innerHTML = `

                <table
                    class="admin-crud-table"
                >

                    <thead>

                        <tr>

                            <th>
                                Room ID
                            </th>

                            <th>
                                Room No.
                            </th>

                            <th>
                                Name
                            </th>

                            <th>
                                Type
                            </th>

                            <th>
                                Floor
                            </th>

                            <th>
                                Price
                            </th>

                            <th>
                                Guests
                            </th>

                            <th>
                                Status
                            </th>

                            <th>
                                Actions
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        ${rooms.map((room) => renderRoomRow(room)).join("")}

                    </tbody>

                </table>

            `;

    crudRecordCount.textContent = `${rooms.length} room${
      rooms.length === 1 ? "" : "s"
    }`;
  }

  function renderRoomRow(room) {
    const roomId = String(room.room_id || "").trim();

    const status = String(room.status || "").trim() || "—";

    return `

                <tr>

                    <td>

                        <strong>
                            ${escapeHtml(roomId)}
                        </strong>

                    </td>


                    <td>
                        ${escapeHtml(room.room_no)}
                    </td>


                    <td>
                        ${escapeHtml(room.room_name)}
                    </td>


                    <td>
                        ${escapeHtml(room.room_type)}
                    </td>


                    <td>
                        ${escapeHtml(room.floor)}
                    </td>


                    <td>
                        ${formatPrice(room.price_per_night)}
                    </td>


                    <td>
                        ${escapeHtml(room.max_guests)}
                    </td>


                    <td>

                        <span
                            class="admin-status-badge ${getStatusClass(status)}"
                        >
                            ${escapeHtml(status)}
                        </span>

                    </td>


                    <td>

                        <div
                            class="admin-room-actions"
                        >

                            <button
                                type="button"
                                class="admin-edit-button"
                                data-room-crud-action="edit"
                                data-room-id="${escapeHtml(roomId)}"
                            >
                                Edit
                            </button>


                            <button
                                type="button"
                                class="admin-delete-button"
                                data-room-crud-action="delete"
                                data-room-id="${escapeHtml(roomId)}"
                            >
                                Delete
                            </button>

                        </div>

                    </td>

                </tr>

            `;
  }

  // ========================================================
  // EDIT ROOM
  // ========================================================

  function editCrudRoom(roomId) {
    const room = adminRoomsData.find(
      (item) => String(item.room_id || "").trim() === String(roomId).trim(),
    );

    if (!room) {
      showCrudFormMessage("The selected room could not be found.", "error");

      return;
    }

    roomEditMode = true;

    editingRoomId = String(room.room_id || "").trim();

    setCrudValue("crud_property_id", propertyId);

    setCrudValue("crud_room_id", room.room_id);

    setCrudValue("crud_room_no", room.room_no);

    setCrudValue("crud_room_name", room.room_name);

    setCrudValue("crud_room_type", room.room_type);

    setCrudValue("crud_floor", room.floor);

    setCrudValue("crud_price_per_night", room.price_per_night);

    setCrudValue("crud_max_guests", room.max_guests);

    setCrudValue("crud_bed_info", room.bed_info);

    setCrudValue("crud_description", room.description);

    setCrudValue("crud_amenities", room.amenities);

    setCrudValue("crud_cooking_facility", room.cooking_facility);

    setCrudValue("crud_kitchen_info", room.kitchen_info);

    setCrudValue("crud_image_1", room.image_1);

    setCrudValue("crud_image_2", room.image_2);

    setCrudValue("crud_image_3", room.image_3);

    setCrudValue("crud_status", room.status);

    setCrudValue("crud_whatsapp_enabled", room.whatsapp_enabled);

    const roomIdInput = document.getElementById("crud_room_id");

    if (roomIdInput) {
      roomIdInput.readOnly = true;
    }

    crudFormTitle.textContent = "Edit Room";

    document.getElementById("roomCrudSubmitButton").textContent = "Update Room";

    document.getElementById("roomCrudCancelButton").textContent = "Cancel Edit";

    clearCrudFormMessage();

    document.getElementById("crud_room_name")?.focus();
  }

  function setCrudValue(id, valueToSet) {
    const element = document.getElementById(id);

    if (!element) {
      return;
    }

    element.value = valueToSet == null ? "" : String(valueToSet);
  }

  // ========================================================
  // DELETE ROOM
  // ========================================================

  async function deleteCrudRoom(roomId) {
    const room = adminRoomsData.find(
      (item) => String(item.room_id || "").trim() === String(roomId).trim(),
    );

    if (!room) {
      showCrudFormMessage("The selected room could not be found.", "error");

      return;
    }

    const roomName = String(room.room_name || roomId).trim();

    const confirmed = window.confirm(
      `Delete "${roomName}" ` +
        `(Room ID: ${roomId})?` +
        `\n\n` +
        `This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      crudTableWrapper.innerHTML = `

                    <div class="admin-crud-loading">

                        Deleting room...

                    </div>

                `;

      const body = new URLSearchParams();

      body.append("action", "deleteRoom");

      body.append("token", adminToken);

      body.append("room_id", roomId);

      const result = await postApi(body);

      if (!result.success) {
        throw new Error(result.error || "Unable to delete room.");
      }

      if (editingRoomId === roomId) {
        resetRoomCrudForm();
      }

      await loadRoomsForCrud();

      showCrudFormMessage(
        result.message || "Room deleted successfully.",
        "success",
      );
    } catch (error) {
      console.error("Delete room failed:", error);

      if (isSessionError(error)) {
        clearAdminSession();

        closeCrudModal();

        showLoginPanel();

        return;
      }

      showCrudFormMessage(error.message || "Unable to delete room.", "error");

      await loadRoomsForCrud();
    }
  }

  // ========================================================
  // RESET ROOM CRUD FORM
  // ========================================================

  function resetRoomCrudForm() {
    const form = document.getElementById("roomCrudForm");

    if (form) {
      form.reset();
    }

    roomEditMode = false;

    editingRoomId = "";

    const propertyInput = document.getElementById("crud_property_id");

    if (propertyInput) {
      propertyInput.value = propertyId;
    }

    const roomIdInput = document.getElementById("crud_room_id");

    if (roomIdInput) {
      roomIdInput.readOnly = false;
    }

    crudFormTitle.textContent = "Add New Room";

    const submitButton = document.getElementById("roomCrudSubmitButton");

    if (submitButton) {
      submitButton.textContent = "Add Room";
    }

    const cancelButton = document.getElementById("roomCrudCancelButton");

    if (cancelButton) {
      cancelButton.textContent = "Cancel";
    }

    clearCrudFormMessage();

    loadNextRoomId();
  }

  // ========================================================
  // ROOM TABLE ACTIONS
  // ========================================================

  crudTableWrapper.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-office-crud-action]");

    if (!button) return;

    const action = button.dataset.officeCrudAction;
    const officeId = button.dataset.officeId || "";

    if (action === "edit") {
      editBookingOffice(officeId);
    } else if (action === "delete") {
      await deleteBookingOffice(officeId);
    }
  });

  crudTableWrapper.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-room-crud-action]");

    if (!button) {
      return;
    }

    const action = button.dataset.roomCrudAction;

    const roomId = button.dataset.roomId || "";

    if (action === "edit") {
      editCrudRoom(roomId);

      return;
    }

    if (action === "delete") {
      await deleteCrudRoom(roomId);
    }
  });

  // ========================================================
  // CRUD FORM MESSAGE
  // ========================================================

  function showCrudFormMessage(message, type) {
    if (!crudFormMessage) {
      return;
    }

    crudFormMessage.textContent = message || "";

    crudFormMessage.className = `admin-message ${type || ""}`;
  }

  function clearCrudFormMessage() {
    showCrudFormMessage("", "");
  }

  // ========================================================
  // CRUD PLACEHOLDER FORM
  // ========================================================

  function renderCrudFormPlaceholder(config) {
    crudFormContainer.innerHTML = `

                <div class="admin-crud-placeholder">

                    <span
                        class="admin-crud-placeholder-icon"
                    >
                        +
                    </span>

                    <strong>
                        ${escapeHtml(config.formTitle)}
                    </strong>

                    <p>
                        The form fields for
                        ${escapeHtml(config.title)}
                        will be added in the next CRUD step.
                    </p>

                </div>

            `;
  }

  // ========================================================
  // CRUD PLACEHOLDER TABLE
  // ========================================================

  function renderCrudTablePlaceholder(config) {
    crudTableWrapper.innerHTML = `

                <div class="admin-crud-placeholder">

                    <span
                        class="admin-crud-placeholder-icon"
                    >
                        ☰
                    </span>

                    <strong>
                        ${escapeHtml(config.tableTitle)}
                    </strong>

                    <p>
                        The data table for
                        ${escapeHtml(config.title)}
                        will be connected in the next CRUD step.
                    </p>

                </div>

            `;

    crudRecordCount.textContent = "0 records";
  }

  // ========================================================
  // SEARCH FOUNDATION
  // ========================================================

  crudSearch.addEventListener("input", () => {
    if (activeCrudModule === "rooms") {
      const query = crudSearch.value.trim().toLowerCase();

      if (!query) {
        renderRoomsTable(adminRoomsData);

        return;
      }

      const filteredRooms = adminRoomsData.filter((room) => {
        const searchableText = [
          room.room_id,

          room.room_no,

          room.room_name,

          room.room_type,

          room.floor,

          room.status,
        ]
          .map((value) => String(value ?? "").toLowerCase())
          .join(" ");

        return searchableText.includes(query);
      });

      renderRoomsTable(filteredRooms);
    } else if (activeCrudModule === "offices") {
      const query = crudSearch.value.trim().toLowerCase();

      const filtered = adminBookingOfficesData.filter((office) =>
        [
          office.office_id,
          office.office_name,
          office.address,
          office.area,
          office.city,
          office.state,
          office.pincode,
          office.contact_person,
          office.phone,
          office.whatsapp,
          office.email,
          office.working_hours,
          office.enabled,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query),
        ),
      );

      renderBookingOfficesTable(filtered);
    }
  });

  // ========================================================
  // ACTIVE NAVIGATION
  // ========================================================

  function setActiveNavigation(module) {
    document.querySelectorAll("[data-admin-nav]").forEach((item) => {
      item.classList.toggle("active", item.dataset.adminNav === module);
    });
  }

  // ========================================================
  // MOBILE SIDEBAR
  // ========================================================

  if (mobileMenuButton) {
    mobileMenuButton.addEventListener("click", () => {
      if (sidebar) {
        sidebar.classList.toggle("mobile-open");
      }
    });
  }

  function closeMobileSidebar() {
    if (sidebar) {
      sidebar.classList.remove("mobile-open");
    }
  }

  // ====================================================
  // SESSION VALIDATION
  // ====================================================

  async function validateAdminSession() {
    if (!adminToken) {
      return false;
    }

    try {
      const url =
        `${CONFIG.apiUrl}` +
        `?action=validateSession` +
        `&token=${encodeURIComponent(adminToken)}`;

      const response = await fetch(url);

      const result = await response.json();

      if (!response.ok || !result.success || !result.authenticated) {
        return false;
      }

      adminUser = result.user || adminUser;

      adminExpiresAt = result.expiresAt || adminExpiresAt;

      saveAdminSession();

      return true;
    } catch (error) {
      console.error("Session validation failed:", error);

      return false;
    }
  }

  // ====================================================
  // SAVE SESSION
  // ====================================================

  function saveAdminSession() {
    localStorage.setItem(STORAGE_TOKEN, adminToken);

    localStorage.setItem(STORAGE_USER, JSON.stringify(adminUser || {}));

    localStorage.setItem(STORAGE_EXPIRES, adminExpiresAt || "");
  }

  // ====================================================
  // CLEAR SESSION
  // ====================================================

  function clearAdminSession() {
    adminToken = "";

    adminUser = null;

    adminExpiresAt = "";

    localStorage.removeItem(STORAGE_TOKEN);

    localStorage.removeItem(STORAGE_USER);

    localStorage.removeItem(STORAGE_EXPIRES);
  }

  // ====================================================
  // SHOW ADMIN
  // ====================================================

  function showAdminPanel() {
    adminLogin.hidden = true;

    adminPanel.hidden = false;

    const username = getUsername(adminUser) || "Admin";

    adminUserInfo.textContent = `Logged in as ${username}`;
  }

  // ====================================================
  // SHOW LOGIN
  // ====================================================

  function showLoginPanel() {
    adminLogin.hidden = false;

    adminPanel.hidden = true;
  }

  // ====================================================
  // POST API
  // ====================================================

  async function postApi(body) {
    const response = await fetch(CONFIG.apiUrl, {
      method: "POST",

      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },

      body: body.toString(),
    });

    let result;

    try {
      result = await response.json();
    } catch (error) {
      throw new Error(`Invalid API response. HTTP ${response.status}`);
    }

    if (!response.ok) {
      throw new Error(result.error || `HTTP Error: ${response.status}`);
    }

    if (
      result.code === "INVALID_SESSION" ||
      result.code === "SESSION_EXPIRED"
    ) {
      const sessionError = new Error(result.error || "Admin session expired.");

      sessionError.code = result.code;

      throw sessionError;
    }

    return result;
  }

  // ====================================================
  // SESSION ERROR CHECK
  // ====================================================

  function isSessionError(error) {
    return (
      error &&
      (error.code === "INVALID_SESSION" || error.code === "SESSION_EXPIRED")
    );
  }

  // ====================================================
  // LOGIN MESSAGE
  // ====================================================

  function showLoginMessage(message, type) {
    if (!loginMessage) {
      return;
    }

    loginMessage.textContent = message || "";

    loginMessage.className = `admin-message ${type || ""}`;
  }

  function clearLoginMessage() {
    showLoginMessage("", "");
  }

  // ====================================================
  // DASHBOARD MESSAGE
  // ====================================================

  function showDashboardMessage(message, type) {
    if (!dashboardMessage) {
      return;
    }

    dashboardMessage.textContent = message || "";

    dashboardMessage.className = `admin-message ${type || ""}`;
  }

  // ====================================================
  // BUTTON LOADING
  // ====================================================

  function setButtonLoading(button, loading, text) {
    if (!button) {
      return;
    }

    button.disabled = loading;

    if (typeof text === "string") {
      button.textContent = text;
    }
  }

  // ====================================================
  // STORED USER
  // ====================================================

  function parseStoredUser(valueToParse) {
    if (!valueToParse) {
      return null;
    }

    try {
      return JSON.parse(valueToParse);
    } catch (error) {
      return {
        username: valueToParse,
      };
    }
  }

  function getUsername(user) {
    if (!user) {
      return "";
    }

    if (typeof user === "string") {
      return user;
    }

    return String(user.username || user.userName || "").trim();
  }

  // ========================================================
  // FORMAT PRICE
  // ========================================================

  function formatPrice(valueToFormat) {
    const value = Number(valueToFormat);

    if (!Number.isFinite(value)) {
      return "—";
    }

    return "₹" + value.toLocaleString("en-IN");
  }

  // ========================================================
  // STATUS CLASS
  // ========================================================

  function getStatusClass(status) {
    const normalized = String(status || "")
      .trim()
      .toLowerCase();

    if (normalized === "available") {
      return "admin-status-available";
    }

    if (normalized === "maintenance") {
      return "admin-status-maintenance";
    }

    if (normalized === "unavailable") {
      return "admin-status-unavailable";
    }

    return "";
  }

  // ========================================================
  // ESCAPE HTML
  // ========================================================

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
