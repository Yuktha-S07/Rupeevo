// Cash management — physical wallet cash, in-memory UI prototype.
(function () {
  const cash = window.RUPEEVO_CASH || {};
  const opening = Number(cash.opening_balance) || 0;
  let actual = Number(cash.actual_balance) || 0;
  const entries = (cash.transactions || []).map((item) => ({ ...item }));

  const $ = (id) => document.getElementById(id);
  if (!$("recentCashRows")) return;

  const entryModal = $("cashEntryModal");
  const actualModal = $("actualModal");
  const historyModal = $("historyModal");
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

  function totals() {
    let received = 0;
    let spent = 0;
    entries.forEach((entry) => {
      if (entry.type === "in") received += Number(entry.amount) || 0;
      else spent += Number(entry.amount) || 0;
    });
    const expected = opening + received - spent;
    return { received, spent, expected, difference: expected - actual };
  }

  function sortedEntries() {
    return [...entries].sort((a, b) =>
      (b.date_iso || "").localeCompare(a.date_iso || "") || (b.id || 0) - (a.id || 0)
    );
  }

  function rowHtml(entry, showType) {
    const received = entry.type === "in";
    return `
      <tr>
        <td>
          <div class="tx-name">
            <span class="tx-icon ${received ? "" : "amber"}">${escapeHtml((entry.description || "?").slice(0, 1))}</span>
            <span><strong>${escapeHtml(entry.description)}</strong><small>${escapeHtml(entry.category || "Uncategorized")}</small></span>
          </div>
        </td>
        ${showType ? `<td class="muted">${escapeHtml(entry.category || "Uncategorized")}</td>` : ""}
        <td class="muted">${formatDate(entry.date_iso || entry.date)}</td>
        ${showType ? `<td>${received ? '<span class="badge badge-emerald">Received</span>' : '<span class="badge badge-warning">Spent</span>'}</td>` : ""}
        <td class="align-right amount ${received ? "amount-income" : ""}">${received ? "+" : "−"} ${formatINR(entry.amount)}</td>
      </tr>`;
  }

  function renderRecent() {
    const recent = sortedEntries().slice(0, 5);
    $("recentCashRows").innerHTML = recent.length
      ? recent.map((entry) => rowHtml(entry, false)).join("")
      : '<tr class="empty-row"><td colspan="3">No cash transactions recorded yet.</td></tr>';
  }

  function renderHistory() {
    const all = sortedEntries();
    $("historyRows").innerHTML = all.length
      ? all.map((entry) => rowHtml(entry, true)).join("")
      : '<tr class="empty-row"><td colspan="5">No cash transactions recorded yet.</td></tr>';
  }

  function renderReconciliation(values) {
    $("recExpected").textContent = formatINR(values.expected);
    $("recActual").textContent = formatINR(actual);
    $("recDifference").textContent = formatINR(Math.abs(values.difference));

    const matched = Math.abs(values.difference) < 0.005;
    $("recDifferenceRow").classList.toggle("match", matched);
    $("recDifferenceRow").classList.toggle("mismatch", !matched);
    $("recMessage").classList.toggle("match", matched);

    if (matched) {
      $("recMessageText").textContent =
        "Your wallet matches the expected cash balance. Your cash records are in sync.";
    } else if (values.difference > 0) {
      $("recMessageText").textContent =
        `Your actual cash is ${formatINR(values.difference)} less than expected. ` +
        "Review your recent cash transactions or add any forgotten expenses before deciding what caused the gap.";
    } else {
      $("recMessageText").textContent =
        `Your actual cash is ${formatINR(Math.abs(values.difference))} more than expected. ` +
        "Review your recent cash transactions or correct any entries you may have missed before deciding what caused the gap.";
    }
  }

  function render() {
    const values = totals();
    $("expectedBalance").textContent = formatINR(values.expected);
    $("totalReceived").textContent = formatINR(values.received);
    $("totalSpent").textContent = formatINR(values.spent);
    $("openingBalance").textContent = formatINR(opening);
    $("movementCount").textContent = entries.length;
    renderReconciliation(values);
    renderRecent();
    renderHistory();
  }

  function openModal(target) {
    lastFocused = document.activeElement;
    target.hidden = false;
    document.body.style.overflow = "hidden";
    const focusable = target.querySelector("input:not([type=hidden]), select, button");
    if (focusable) focusable.focus();
  }

  function closeModal(target) {
    target.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function openEntry(type) {
    $("cashEntryForm").reset();
    document.querySelector(`input[name="cashType"][value="${type}"]`).checked = true;
    $("cashAmount").value = "";
    $("cashDescription").value = "";
    $("cashDate").value = new Date().toISOString().slice(0, 10);
    $("cashCategory").value = "";
    $("cashAmountError").textContent = "";
    $("cashDescriptionError").textContent = "";
    $("cashDateError").textContent = "";
    $("cashEntryTitle").textContent = type === "in" ? "Add cash income" : "Add cash expense";
    $("cashAmount").setAttribute("aria-invalid", "false");
    $("cashDescription").setAttribute("aria-invalid", "false");
    $("cashDate").setAttribute("aria-invalid", "false");
    openModal(entryModal);
  }

  function openActual() {
    $("actualAmount").value = actual.toFixed(2);
    $("actualAmountError").textContent = "";
    $("actualAmount").setAttribute("aria-invalid", "false");
    openModal(actualModal);
  }

  function saveEntry(event) {
    event.preventDefault();
    let valid = true;

    const amount = Number($("cashAmount").value);
    const description = $("cashDescription").value.trim();
    const date = $("cashDate").value;

    $("cashAmountError").textContent = "";
    $("cashDescriptionError").textContent = "";
    $("cashDateError").textContent = "";
    $("cashAmount").setAttribute("aria-invalid", "false");
    $("cashDescription").setAttribute("aria-invalid", "false");
    $("cashDate").setAttribute("aria-invalid", "false");

    if (!amount || amount <= 0) {
      $("cashAmountError").textContent = "Enter an amount greater than zero.";
      $("cashAmount").setAttribute("aria-invalid", "true");
      valid = false;
    }
    if (!description) {
      $("cashDescriptionError").textContent = "Enter a short description.";
      $("cashDescription").setAttribute("aria-invalid", "true");
      valid = false;
    }
    if (!date) {
      $("cashDateError").textContent = "Choose a date.";
      $("cashDate").setAttribute("aria-invalid", "true");
      valid = false;
    }
    if (!valid) return;

    const type = document.querySelector('input[name="cashType"]:checked').value;
    entries.push({
      id: entries.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1,
      date_iso: date,
      date: formatDate(date),
      description,
      category: $("cashCategory").value,
      type,
      amount,
      notes: "",
    });

    closeModal(entryModal);
    render();
  }

  function saveActual(event) {
    event.preventDefault();
    const value = Number($("actualAmount").value);
    if ($("actualAmount").value === "" || Number.isNaN(value) || value < 0) {
      $("actualAmountError").textContent = "Enter a valid cash amount (zero or more).";
      $("actualAmount").setAttribute("aria-invalid", "true");
      return;
    }
    actual = value;
    closeModal(actualModal);
    render();
  }

  // Populate categories once.
  $("cashCategory").innerHTML =
    '<option value="">Uncategorized</option>' +
    (cash.categories || []).map((category) =>
      `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
    ).join("");

  $("addIncomeBtn").addEventListener("click", () => openEntry("in"));
  $("heroAddIncome").addEventListener("click", () => openEntry("in"));
  $("addExpenseBtn").addEventListener("click", () => openEntry("out"));
  $("heroAddExpense").addEventListener("click", () => openEntry("out"));
  $("updateActualBtn").addEventListener("click", openActual);
  $("recUpdateBtn").addEventListener("click", openActual);
  $("historyBtn").addEventListener("click", () => openModal(historyModal));
  $("recentViewAll").addEventListener("click", () => openModal(historyModal));

  $("cashEntryForm").addEventListener("submit", saveEntry);
  $("actualForm").addEventListener("submit", saveActual);

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-close-modal]");
    if (!trigger) return;
    const target = trigger.closest(".modal");
    if (target) closeModal(target);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    [entryModal, actualModal, historyModal].forEach((target) => {
      if (!target.hidden) closeModal(target);
    });
  });

  render();
})();
