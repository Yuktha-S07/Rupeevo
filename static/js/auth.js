// Show/hide controls for password fields on authentication screens.
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".password-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.target);
      if (!input) return;

      const revealing = input.type === "password";
      input.type = revealing ? "text" : "password";
      button.textContent = revealing ? "Hide" : "Show";
      button.setAttribute("aria-label", (revealing ? "Hide" : "Show") + " password");
      button.setAttribute("aria-pressed", String(revealing));
    });
  });
});
