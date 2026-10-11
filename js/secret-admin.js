/**
 * Puri Homestay — Private Admin Shortcut
 *
 * Windows/Linux: Ctrl + Shift + Alt + A
 * Mac:          Cmd + Shift + Option + A
 *
 * This shortcut only hides the admin entry point.
 * Admin authentication remains mandatory.
 */

(function () {
  "use strict";

  document.addEventListener("keydown", function (event) {
    const isShortcut =
      (event.ctrlKey || event.metaKey) &&
      event.shiftKey &&
      event.altKey &&
      event.code === "KeyA";

    if (!isShortcut) {
      return;
    }

    // Avoid interfering with text entry.
    const target = event.target;
    const tagName = target?.tagName?.toLowerCase();

    if (
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select" ||
      target?.isContentEditable
    ) {
      return;
    }

    event.preventDefault();

    window.location.href = "admin.html?propertyId=PURI001";
  });
})();
