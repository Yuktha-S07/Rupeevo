// Chart.js setup for Rupeevo's financial visuals.
(function () {
  if (typeof Chart === "undefined") return;

  const emerald = "#10b981";
  const emeraldDark = "#047857";
  const blue = "#3b82f6";
  const violet = "#8b5cf6";
  const amber = "#f59e0b";
  const rose = "#f43f5e";
  const grid = "#eef1ec";
  const tick = "#8b978f";

  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = tick;

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#17211c",
        padding: 10,
        cornerRadius: 8,
        titleFont: { family: "'Inter', sans-serif", size: 11 },
        bodyFont: { family: "'Inter', sans-serif", size: 11 },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: {
        grid: { color: grid },
        border: { display: false },
        ticks: {
          callback: (value) => "₹" + (value >= 1000 ? value / 1000 + "k" : value),
        },
      },
    },
  };

  const makeLine = (id, datasets, labels) => {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    new Chart(canvas, {
      type: "line",
      data: { labels, datasets },
      options: lineOptions,
    });
  };

  const months = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];

  makeLine("cashFlowChart", [
    {
      label: "Income",
      data: [112000, 118000, 120500, 124000, 128000, 132500],
      borderColor: emeraldDark,
      backgroundColor: "rgba(16, 185, 129, 0.10)",
      fill: true,
      tension: 0.38,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
    },
    {
      label: "Expenses",
      data: [62000, 58400, 61200, 59800, 63200, 58940],
      borderColor: blue,
      backgroundColor: "rgba(59, 130, 246, 0.06)",
      fill: true,
      tension: 0.38,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
    },
  ], months);

  const donut = document.getElementById("spendingDonut");
  if (donut) {
    new Chart(donut, {
      type: "doughnut",
      data: {
        labels: ["Food & Dining", "Shopping", "Transport", "Utilities", "Entertainment"],
        datasets: [{
          data: [8420, 6750, 3200, 4180, 2490],
          backgroundColor: [emerald, blue, violet, amber, rose],
          borderWidth: 0,
          hoverOffset: 5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#17211c",
            cornerRadius: 8,
            callbacks: { label: (ctx) => " " + ctx.label + ": ₹" + ctx.parsed.toLocaleString("en-IN") },
          },
        },
      },
    });
  }

  const bar = document.getElementById("incomeExpenseChart");
  if (bar) {
    new Chart(bar, {
      type: "bar",
      data: {
        labels: months,
        datasets: [
          { label: "Income", data: [112000, 118000, 120500, 124000, 128000, 132500], backgroundColor: emerald, borderRadius: 6, barPercentage: 0.7 },
          { label: "Expenses", data: [62000, 58400, 61200, 59800, 63200, 58940], backgroundColor: "#a7efcf", borderRadius: 6, barPercentage: 0.7 },
        ],
      },
      options: {
        ...lineOptions,
        scales: {
          x: { grid: { display: false }, border: { display: false }, stacked: false },
          y: { grid: { color: grid }, border: { display: false }, ticks: { callback: (v) => "₹" + v / 1000 + "k" } },
        },
      },
    });
  }

  makeLine("savingsTrendChart", [{
    label: "Saved",
    data: [42000, 48000, 55000, 61000, 68000, 73560],
    borderColor: emerald,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    fill: true,
    tension: 0.4,
    pointRadius: 0,
    pointHoverRadius: 4,
    borderWidth: 2,
  }], months);

  const cashBar = document.getElementById("cashFlowBar");
  if (cashBar) {
    new Chart(cashBar, {
      type: "bar",
      data: {
        labels: months,
        datasets: [{
          label: "Net cash flow",
          data: [18000, -4200, 6500, -2800, 9200, -3500],
          backgroundColor: [emerald, rose, emerald, rose, emerald, rose],
          borderRadius: 6,
          barPercentage: 0.6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { grid: { color: grid }, border: { display: false }, ticks: { callback: (v) => "₹" + v / 1000 + "k" } },
        },
      },
    });
  }

  const cashDigital = document.getElementById("cashDigitalChart");
  if (cashDigital) {
    new Chart(cashDigital, {
      type: "doughnut",
      data: {
        labels: ["Digital", "Physical cash"],
        datasets: [{
          data: [46800, 12140],
          backgroundColor: [emerald, amber],
          borderWidth: 0,
          hoverOffset: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#17211c",
            cornerRadius: 8,
            callbacks: { label: (ctx) => " " + ctx.label + ": ₹" + ctx.parsed.toLocaleString("en-IN") },
          },
        },
      },
    });
  }

  const monthlySpending = document.getElementById("monthlySpendingChart");
  if (monthlySpending) {
    new Chart(monthlySpending, {
      type: "bar",
      data: {
        labels: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"],
        datasets: [{
          label: "Spending",
          data: [62000, 58400, 61200, 59800, 63200, 58940],
          backgroundColor: ["#c9f3df", "#c9f3df", "#c9f3df", "#c9f3df", "#c9f3df", emerald],
          borderRadius: 6,
          barPercentage: 0.58,
        }],
      },
      options: {
        ...lineOptions,
        plugins: { ...lineOptions.plugins, legend: { display: false } },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { grid: { color: grid }, border: { display: false }, ticks: { callback: (v) => "₹" + v / 1000 + "k" } },
        },
      },
    });
  }
})();
