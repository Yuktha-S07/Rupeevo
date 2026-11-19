// Transactions management — interactive UI prototype using in-memory data.
(function () {
  const transactions = Array.isArray(window.RUPEEVO_TRANSACTIONS)
    ? window.RUPEEVO_TRANSACTIONS.map((item) => ({ ...item }))
    : [];
  const options = window.RUPEEVO_OPTIONS || {};

  const $ = (id) => document.getElementById(id);
  const rowsEl = $("transactionRows");
  if (!rowsEl) return;

  const form = $("transactionForm");
  const modal = $("transactionModal");
  const viewModal = $("viewModal");
  const deleteModal = $("deleteModal");
  let activeTab = "all";
  let editingId = null;
  let deletingId = null;
  let lastFocused = null;

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[char]));

  function formatINR(value) {
    const number = Number(value) || 0;
    const sign = number < 0 ? "-" : "";
    const [whole, fraction] = Math.abs(number).toFixed(2).split(".");
    let grouped = whole;
    if (whole.length > 3) {
      const lastThree = whole.slice(-3);
      let rest = whole.slice(0, -3);
      const parts = [];
      while (rest.length) {
        parts.unshift(rest.slice(-2));
        rest = rest.slice(0, -2);
      }
      grouped = parts.join(",") + "," + lastThree;
    }
    return `${sign}₹${grouped}.${fraction}`;
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const date = new Date(iso + "T00:00:00");
    if (Number.isNaN(date.getTime())) return escapeHtml(iso);
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function uniqueValues(key) {
    const values = transactions.map((item) => item[key]).filter(Boolean);
    return Array.from(new Set(values));
  }

  function fillSelect(select, values, placeholder, preserveEmpty = true) {
    if (!select) return;
    const current = select.value;
    select.innerHTML =
      (preserveEmpty ? `<option value="">${escapeHtml(placeholder)}</option>` : "") +
      values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
    if (current && values.includes(current)) select.value = current;
  }

  function populateSelects() {
    const categories = Array.from(new Set([...(options.categories || []), ...uniqueValues("category")]));
    const methods = Array.from(new Set([...(options.methods || []), ...uniqueValues("method")]));
    const accounts = Array.from(new Set([...(options.accounts || []), ...uniqueValues("account")]));

    fillSelect($("filterCategory"), categories, "All categories");
    $("filterCategory").insertAdjacentHTML(
      "beforeend",
      '<option value="__uncategorized__">Uncategorized</option>'
    );
    fillSelect($("filterMethod"), methods, "All methods");
    fillSelect($("filterAccount"), accounts, "All accounts");

    fillSelect($("txCategory"), categories, "Uncategorized");
    fillSelect($("txOnlineMethod"), ["UPI", "Card", "Net Banking", "AutoPay", "NEFT"], "Select method", false);
    fillSelect($("txAccount"), accounts.filter((item) => item !== "Cash in hand"), "Select account", false);
  }

  function getFiltered() {
    const query = ($("searchInput").value || "").trim().toLowerCase();
    const from = $("filterFrom").value;
    const to = $("filterTo").value;
    const type = $("filterType").value;
    const category = $("filterCategory").value;
    const method = $("filterMethod").value;
    const account = $("filterAccount").value;

    return transactions.filter((tx) => {
      if (activeTab !== "all" && tx.type !== activeTab) return false;
      if (type && tx.type !== type) return false;
      if (category === "__uncategorized__" && tx.category) return false;
      if (category && category !== "__uncategorized__" && tx.category !== category) return false;
      if (method && tx.method !== method) return false;
      if (account && tx.account !== account) return false;

      const date = tx.date_iso || "";
      if (from && date && date < from) return false;
      if (to && date && date > to) return false;

      if (query) {
        const haystack = [tx.name, tx.description, tx.notes, tx.category, tx.method, tx.account]
          .join(" ").toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }

  function renderSummary() {
    let income = 0;
    let expenses = 0;
    let uncategorized = 0;
    transactions.forEach((tx) => {
      if (tx.type === "income") income += Number(tx.amount) || 0;
      else expenses += Number(tx.amount) || 0;
      if (!tx.category) uncategorized += 1;
    });

    $("sumIncome").textContent = formatINR(income);
    $("sumExpense").textContent = formatINR(expenses);
    $("sumNet").textContent = formatINR(income - expenses);
    $("sumCount").textContent = transactions.length;
    $("tabAllCount").textContent = transactions.length;
    $("tabIncomeCount").textContent = transactions.filter((tx) => tx.type === "income").length;
    $("tabExpenseCount").textContent = transactions.filter((tx) => tx.type === "expense").length;

    $("uncategorizedNote").textContent = uncategorized
      ? `${uncategorized} need a category`
      : "All categorized";
    $("uncategorizedNotice").hidden = uncategorized === 0;
    $("uncategorizedText").textContent =
      uncategorized === 1
        ? "1 transaction is uncategorized."
        : `${uncategorized} transactions are uncategorized.`;
  }

  function rowHtml(tx) {
    const missing = !tx.category;
    const income = tx.type === "income";
    return `
      <tr class="${missing ? "row-uncategorized" : ""}">
        <td>
          <div class="tx-name">
            <span class="tx-icon ${income ? "" : "blue"}">${escapeHtml((tx.name || "?").slice(0, 1))}</span>
            <span><strong>${escapeHtml(tx.name)}</strong><small>${escapeHtml(tx.description || "—")}</small></span>
          </div>
        </td>
        <td class="align-right amount ${income ? "amount-income" : ""}">${income ? "+" : "−"} ${formatINR(tx.amount)}</td>
        <td>${missing ? '<span class="badge badge-warning category-missing">Uncategorized</span>' : escapeHtml(tx.category)}</td>
        <td class="muted">${formatDate(tx.date_iso || tx.date)}</td>
        <td class="muted">${escapeHtml(tx.method || "—")}</td>
        <td class="muted">${escapeHtml(tx.account || "—")}</td>
        <td>${income ? '<span class="badge badge-emerald">Income</span>' : '<span class="badge">Expense</span>'}</td>
        <td>
          <div class="action-group">
            <button class="action-btn" type="button" data-action="view" data-id="${tx.id}">View</button>
            <button class="action-btn" type="button" data-action="edit" data-id="${tx.id}">Edit</button>
            <button class="action-btn danger" type="button" data-action="delete" data-id="${tx.id}">Delete</button>
          </div>
        </td>
      </tr>`;
  }

  function renderTable() {
    const filtered = getFiltered();
    rowsEl.innerHTML = filtered.length
      ? filtered.map(rowHtml).join("")
      : '<tr class="empty-row"><td colspan="8">No transactions match your filters.</td></tr>';
    $("resultCount").textContent = `Showing ${filtered.length} of ${transactions.length} transactions`;
  }

  function render() {
    renderSummary();
    renderTable();
  }

  function openModal(target) {
    lastFocused = document.activeElement;
    target.hidden = false;
    document.body.style.overflow = "hidden";
    const focusable = target.querySelector("input:not([type=hidden]), select, textarea, button");
    if (focusable) focusable.focus();
  }

  function closeModal(target) {
    target.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function clearErrors() {
    document.querySelectorAll("#transactionModal .error").forEach((el) => { el.textContent = ""; });
    document.querySelectorAll("#transactionModal [aria-invalid]").forEach((el) => {
      el.setAttribute("aria-invalid", "false");
    });
  }

  function setError(inputId, errorId, message) {
    const input = $(inputId);
    const error = $(errorId);
    if (error) error.textContent = message;
    if (input) input.setAttribute("aria-invalid", "true");
  }

  function toggleOnlineFields() {
    const online = $("txMode").value === "Online";
    $("txOnlineMethodField").hidden = !online;
    $("txAccountField").hidden = !online;
  }

  function openAdd() {
    editingId = null;
    form.reset();
    clearErrors();
    $("editId").value = "";
    $("transactionModalTitle").textContent = "Add transaction";
    $("saveTransactionBtn").textContent = "Add transaction";
    $("txDate").value = new Date().toISOString().slice(0, 10);
    $("txAmount").value = "";
    $("txDescription").value = "";
    $("txNotes").value = "";
    toggleOnlineFields();
    openModal(modal);
    $("txAmount").focus();
  }

  function openEdit(tx) {
    editingId = tx.id;
    form.reset();
    clearErrors();
    $("editId").value = tx.id;
    $("transactionModalTitle").textContent = "Edit transaction";
    $("saveTransactionBtn").textContent = "Save changes";
    document.querySelector(`input[name="type"][value="${tx.type}"]`).checked = true;
    $("txAmount").value = tx.amount;
    $("txDescription").value = tx.name;
    $("txCategory").value = tx.category || "";
    $("txDate").value = tx.date_iso || "";
    $("txMode").value = tx.mode || (tx.method === "Cash" ? "Cash" : "Online");
    if ($("txMode").value === "Online") {
      const methodOption = Array.from($("txOnlineMethod").options).find((o) => o.value === tx.method);
      $("txOnlineMethod").value = methodOption ? tx.method : "UPI";
      $("txAccount").value = tx.account || $("txAccount").options[0].value;
    }
    $("txNotes").value = tx.notes || "";
    toggleOnlineFields();
    openModal(modal);
  }

  function openView(tx) {
    const income = tx.type === "income";
    $("viewAmount").textContent = `${income ? "+" : "−"} ${formatINR(tx.amount)}`;
    $("viewAmount").className = `detail-amount ${income ? "text-emerald" : ""}`;
    $("viewTypeBadge").innerHTML = income
      ? '<span class="badge badge-emerald">Income</span>'
      : '<span class="badge">Expense</span>';
    const details = [
      ["Description", tx.description || "—"],
      ["Category", tx.category || "Uncategorized"],
      ["Date", formatDate(tx.date_iso || tx.date)],
      ["Payment method", tx.method || "—"],
      ["Payment mode", tx.mode || "—"],
      ["Account", tx.account || "—"],
      ["Notes", tx.notes || "—"],
    ];
    $("viewDetails").innerHTML = details.map(([label, value]) => `
      <div class="detail-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>
    `).join("");
    openModal(viewModal);
  }

  function validateForm() {
    clearErrors();
    let valid = true;

    const amount = Number($("txAmount").value);
    if (!amount || amount <= 0) {
      setError("txAmount", "txAmountError", "Enter an amount greater than zero.");
      valid = false;
    }
    if (!$("txDescription").value.trim()) {
      setError("txDescription", "txDescriptionError", "Enter a description.");
      valid = false;
    }
    if (!$("txDate").value) {
      setError("txDate", "txDateError", "Choose a date.");
      valid = false;
    }
    if ($("txMode").value === "Online" && !$("txAccount").value) {
      setError("txAccount", "txAccountError", "Select a bank account.");
      valid = false;
    }
    return valid;
  }

  function saveTransaction(event) {
    event.preventDefault();
    if (!validateForm()) return;

    const online = $("txMode").value === "Online";
    const dateIso = $("txDate").value;
    const type = document.querySelector('input[name="type"]:checked').value;
    const name = $("txDescription").value.trim();
    const category = $("txCategory").value;
    const method = online ? $("txOnlineMethod").value : "Cash";
    const account = online ? $("txAccount").value : "Cash in hand";
    const amount = Number($("txAmount").value);

    const payload = {
      name,
      description: name,
      amount,
      type,
      category,
      date_iso: dateIso,
      date: formatDate(dateIso),
      method,
      mode: $("txMode").value,
      account,
      notes: $("txNotes").value.trim(),
      icon: type === "income" ? "trend" : "wallet",
      uncategorized: !category,
      status: "Completed",
    };

    if (editingId !== null) {
      const index = transactions.findIndex((item) => item.id === editingId);
      if (index !== -1) transactions[index] = { ...transactions[index], ...payload };
    } else {
      const nextId = transactions.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
      transactions.push({ id: nextId, ...payload });
    }

    closeModal(modal);
    render();
  }

  function exportCsv() {
    const visible = getFiltered();
    const headers = ["Name", "Description", "Amount", "Type", "Category", "Date", "Payment method", "Account", "Notes"];
    const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = [headers.map(quote).join(",")];
    visible.forEach((tx) => {
      lines.push([
        tx.name, tx.description, tx.amount, tx.type, tx.category || "Uncategorized",
        tx.date_iso || tx.date, tx.method, tx.account, tx.notes,
      ].map(quote).join(","));
    });

    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rupeevo-transactions.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ---------- Events ----------

  $("addTransactionBtn").addEventListener("click", openAdd);
  form.addEventListener("submit", saveTransaction);
  $("txMode").addEventListener("change", toggleOnlineFields);
  $("exportBtn").addEventListener("click", exportCsv);

  ["searchInput", "filterFrom", "filterTo", "filterType", "filterCategory", "filterMethod", "filterAccount"]
    .forEach((id) => $(id).addEventListener("input", renderTable));

  $("clearFilters").addEventListener("click", () => {
    ["searchInput", "filterFrom", "filterTo", "filterType", "filterCategory", "filterMethod", "filterAccount"]
      .forEach((id) => { $(id).value = ""; });
    renderTable();
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((item) => {
        item.classList.remove("active");
        item.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      activeTab = tab.dataset.tab;
      renderTable();
    });
  });

  $("showUncategorized").addEventListener("click", () => {
    $("filterCategory").value = "__uncategorized__";
    renderTable();
    rowsEl.closest(".card").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  rowsEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const tx = transactions.find((item) => item.id === Number(button.dataset.id));
    if (!tx) return;

    if (button.dataset.action === "view") openView(tx);
    if (button.dataset.action === "edit") openEdit(tx);
    if (button.dataset.action === "delete") {
      deletingId = tx.id;
      $("deleteModalText").textContent = `“${tx.name}” will be removed from your transactions.`;
      openModal(deleteModal);
    }
  });

  $("confirmDeleteBtn").addEventListener("click", () => {
    const index = transactions.findIndex((item) => item.id === deletingId);
    if (index !== -1) transactions.splice(index, 1);
    deletingId = null;
    closeModal(deleteModal);
    render();
  });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-close-modal]");
    if (!trigger) return;
    const target = trigger.closest(".modal");
    if (target) closeModal(target);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    [modal, viewModal, deleteModal].forEach((target) => {
      if (!target.hidden) closeModal(target);
    });
  });

  populateSelects();
  render();
})();
