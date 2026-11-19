// Shared interactions for the Rupeevo application shell.
document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const menuButton = document.getElementById("menuButton");
  const overlay = document.getElementById("sidebarOverlay");

  const setSidebar = (open) => {
    body.classList.toggle("sidebar-open", open);
    if (overlay) overlay.hidden = !open;
    if (menuButton) menuButton.setAttribute("aria-expanded", String(open));
  };

  if (menuButton) {
    menuButton.addEventListener("click", () => {
      setSidebar(!body.classList.contains("sidebar-open"));
    });
  }

  if (overlay) overlay.addEventListener("click", () => setSidebar(false));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setSidebar(false);

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      const search = document.querySelector(".search-box input, .toolbar-search input");
      if (search) {
        event.preventDefault();
        search.focus();
      }
    }
  });

  // Filter chips: keep the active state in sync within each group.
  document.querySelectorAll(".chip-row").forEach((row) => {
    row.addEventListener("click", (event) => {
      const chip = event.target.closest(".chip");
      if (!chip) return;

      row.querySelectorAll(".chip").forEach((item) => item.classList.remove("active"));
      chip.classList.add("active");

      const filter = chip.dataset.filter;
      const table = row.closest(".card")?.querySelector("table");
      if (!table || !filter) return;

      table.querySelectorAll("tbody tr").forEach((tr) => {
        tr.hidden = filter !== "all" && tr.dataset.category !== filter;
      });
    });
  });
});
