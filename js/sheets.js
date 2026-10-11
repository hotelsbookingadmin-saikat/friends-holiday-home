/**
 * =========================================
 * GOOGLE SHEETS API
 * =========================================
 *
 * Fetches data from our Google Apps Script
 * Web App.
 *
 */

async function fetchSheet(sheetName) {
  /*
   * Build API URL
   */

  const url = `${CONFIG.apiUrl}` + `?sheet=${encodeURIComponent(sheetName)}`;

  console.log(`Fetching ${sheetName}:`, url);

  try {
    /*
     * Send request
     */

    const response = await fetch(url);

    /*
     * Check HTTP status
     */

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    /*
     * Convert response to JSON
     */

    const result = await response.json();

    console.log(`${sheetName} API response:`, result);

    /*
     * Check API-level success
     */

    if (!result.success) {
      throw new Error(result.error || "Unknown API error");
    }

    /*
     * Return actual data
     */

    return result.data;
  } catch (error) {
    console.error(`Failed to fetch sheet: ${sheetName}`, error);

    throw error;
  }
}

/**
 * Normalize Google Drive image URLs for website display.
 * Standard Drive sharing links are converted to thumbnail URLs.
 * Other image URLs are returned unchanged.
 */
function normalizeDriveImageUrl(url) {
  if (!url || typeof url !== "string") {
    return "";
  }

  const input = url.trim();

  if (!input) {
    return "";
  }

  try {
    const parsed = new URL(input);
    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname === "drive.google.com" ||
      hostname === "www.drive.google.com"
    ) {
      const parts = parsed.pathname.split("/").filter(Boolean);

      let fileId = "";

      // Standard sharing link:
      // /file/d/FILE_ID/view
      if (parts[0] === "file" && parts[1] === "d" && parts[2]) {
        fileId = parts[2];
      } else {
        // Supports thumbnail, open and uc links
        fileId = parsed.searchParams.get("id") || "";
      }

      if (fileId) {
        return (
          "https://drive.google.com/thumbnail?id=" +
          encodeURIComponent(fileId) +
          "&sz=w1200"
        );
      }
    }

    return input;
  } catch (error) {
    return input;
  }
}
