/**
 * Finance Dashboard — script.js
 * ============================================================
 * Vanilla JavaScript — no frameworks
 * Features:
 *  - LocalStorage persistence
 *  - Add Income / Expense transactions
 *  - Dynamic KPI calculation
 *  - Chart.js visualizations (4 charts)
 *  - Filter by type and category
 *  - Transaction list with delete
 *  - Toast notifications
 * ============================================================
 */

/* ============================================================
   1. CONSTANTS & STATE
   ============================================================ */

/** LocalStorage key */
const STORAGE_KEY = "finance_dashboard_transactions";

/**
 * Chart color palette — consistent across all charts
 */
const CHART_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#ef4444", // red
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#f97316", // orange
];

/**
 * Expense category badge colors (Tailwind classes)
 */
const CATEGORY_COLORS = {
  "Makanan & Minuman": "bg-amber-100 text-amber-700",
  "Transportasi":      "bg-blue-100 text-blue-700",
  "Kesehatan":         "bg-red-100 text-red-700",
  "Pendidikan":        "bg-violet-100 text-violet-700",
  "Hiburan":           "bg-pink-100 text-pink-700",
  "Belanja":           "bg-orange-100 text-orange-700",
  "Tagihan & Utilitas":"bg-cyan-100 text-cyan-700",
  "Lainnya":           "bg-slate-100 text-slate-600",
};

/** Month names in Indonesian */
const MONTHS_ID = [
  "Jan","Feb","Mar","Apr","Mei","Jun",
  "Jul","Agu","Sep","Okt","Nov","Des"
];

/**
 * Application state
 * @type {{ transactions: Array, filterType: string, filterCategory: string }}
 */
const state = {
  transactions: [],    // master data from LocalStorage
  filterType: "all",   // "all" | "income" | "expense"
  filterCategory: "all",
};

/** Chart instances — kept so we can destroy & recreate on update */
const charts = {
  monthly: null,
  category: null,
  biggestExpense: null,
  paymentMethod: null,
};


/* ============================================================
   2. LOCALSTORAGE HELPERS
   ============================================================ */

/**
 * Load transactions array from LocalStorage.
 * Returns an empty array when nothing is stored yet.
 */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save the current state.transactions array to LocalStorage.
 */
function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
}


/* ============================================================
   3. DATA HELPERS
   ============================================================ */

/**
 * Format a number as Indonesian Rupiah.
 * @param {number} amount
 * @returns {string}
 */
function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a Date object to a readable string in Indonesian locale.
 * @param {string} isoString
 * @returns {string}
 */
function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get "YYYY-MM" string from an ISO date string — used for monthly grouping.
 * @param {string} isoString
 * @returns {string}
 */
function getYearMonth(isoString) {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Get label like "Okt 2025" from "2025-10".
 * @param {string} ym - "YYYY-MM"
 * @returns {string}
 */
function ymToLabel(ym) {
  const [y, m] = ym.split("-");
  return `${MONTHS_ID[parseInt(m, 10) - 1]} ${y}`;
}

/**
 * Generate a unique ID for a transaction.
 * @returns {string}
 */
function generateId() {
  return `txn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Maps raw source value → display label used in the filter dropdown */
const SOURCE_DISPLAY_MAP = {
  "bank_transfer": "Bank Transfer",
  "cash":          "Cash",
  "e-wallet":      "E-Wallet",
  "lainnya":       "Lainnya",
};

/**
 * Apply current filters (type + category) to the transactions array.
 * @returns {Array}
 */
function getFilteredTransactions() {
  return state.transactions.filter((t) => {
    const matchType =
      state.filterType === "all" || t.type === state.filterType;
    // Income sources are stored as raw values ("bank_transfer", "e-wallet", etc.).
    // The filter dropdown uses display labels — convert before comparing.
    const matchCategory =
      state.filterCategory === "all" ||
      (t.type === "income"
        ? (SOURCE_DISPLAY_MAP[t.source] || t.source) === state.filterCategory
        : t.category === state.filterCategory);
    return matchType && matchCategory;
  });
}


/* ============================================================
   4. KPI CALCULATIONS
   ============================================================ */

/**
 * Calculate totals from a given transactions array.
 * @param {Array} transactions
 * @returns {{ totalIncome: number, totalExpense: number, balance: number, count: number }}
 */
function calcTotals(transactions) {
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach((t) => {
    if (t.type === "income") totalIncome += t.amount;
    else totalExpense += t.amount;
  });

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    count: transactions.length,
  };
}


/* ============================================================
   5. KPI RENDERING
   ============================================================ */

/**
 * Update the 4 KPI cards with recalculated totals.
 * KPIs always reflect ALL transactions (not filtered),
 * so users can see the full picture regardless of filter.
 */
function renderKPIs() {
  const totals = calcTotals(state.transactions);

  document.getElementById("kpiIncome").textContent = formatRupiah(totals.totalIncome);
  document.getElementById("kpiExpense").textContent = formatRupiah(totals.totalExpense);

  const balanceEl = document.getElementById("kpiBalance");
  balanceEl.textContent = formatRupiah(totals.balance);
  // Color balance based on positive/negative
  balanceEl.className = `text-2xl font-bold ${totals.balance >= 0 ? "balance-positive" : "balance-negative"}`;

  document.getElementById("kpiTransactions").textContent = totals.count;
}


/* ============================================================
   6. CHART HELPERS
   ============================================================ */

/**
 * Destroy an existing chart instance to prevent canvas reuse errors.
 * @param {string} key - key in the `charts` object
 */
function destroyChart(key) {
  if (charts[key]) {
    charts[key].destroy();
    charts[key] = null;
  }
}

/**
 * Show or hide the "empty" placeholder for a chart section.
 * @param {string} emptyId - element ID of the empty message
 * @param {string} containerId - element ID of the chart container
 * @param {boolean} isEmpty
 */
function toggleChartEmpty(emptyId, containerId, isEmpty) {
  const emptyEl = document.getElementById(emptyId);
  // The canvas element's direct parentElement is the .chart-container div
  const containerEl = document.getElementById(containerId).parentElement;
  if (isEmpty) {
    emptyEl.classList.remove("hidden");
    containerEl.style.display = "none";
  } else {
    emptyEl.classList.add("hidden");
    containerEl.style.display = "block";
  }
}

/**
 * Common Chart.js default options shared across charts.
 */
const commonChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        font: { family: "-apple-system, 'Segoe UI', system-ui, sans-serif", size: 12 },
        color: "#475569",
        boxWidth: 12,
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: "#1e293b",
      titleFont: { size: 12, weight: "600" },
      bodyFont: { size: 12 },
      padding: 10,
      cornerRadius: 8,
    },
  },
};


/* ============================================================
   7. CHARTS RENDERING
   ============================================================ */

/**
 * Monthly Income vs Expense — Bar chart.
 * Groups ALL transactions by month.
 */
function renderMonthlyChart() {
  destroyChart("monthly");

  const allTxns = state.transactions;
  const isEmpty = allTxns.length === 0;
  toggleChartEmpty("monthlyEmpty", "monthlyChart", isEmpty);
  if (isEmpty) return;

  // Build a map: { "YYYY-MM": { income, expense } }
  const monthMap = {};
  allTxns.forEach((t) => {
    const ym = getYearMonth(t.date);
    if (!monthMap[ym]) monthMap[ym] = { income: 0, expense: 0 };
    if (t.type === "income") monthMap[ym].income += t.amount;
    else monthMap[ym].expense += t.amount;
  });

  // Sort months chronologically
  const sortedMonths = Object.keys(monthMap).sort();
  const labels = sortedMonths.map(ymToLabel);
  const incomeData = sortedMonths.map((ym) => monthMap[ym].income);
  const expenseData = sortedMonths.map((ym) => monthMap[ym].expense);

  charts.monthly = new Chart(document.getElementById("monthlyChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Pemasukkan",
          data: incomeData,
          backgroundColor: "#22c55e",
          borderRadius: 6,
          barPercentage: 0.6,
        },
        {
          label: "Pengeluaran",
          data: expenseData,
          backgroundColor: "#ef4444",
          borderRadius: 6,
          barPercentage: 0.6,
        },
      ],
    },
    options: {
      ...commonChartOptions,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#64748b", font: { size: 11 } },
        },
        y: {
          grid: { color: "#f1f5f9" },
          ticks: {
            color: "#64748b",
            font: { size: 11 },
            callback: (v) => formatRupiah(v),
          },
        },
      },
      plugins: {
        ...commonChartOptions.plugins,
        tooltip: {
          ...commonChartOptions.plugins.tooltip,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${formatRupiah(ctx.parsed.y)}`,
          },
        },
      },
    },
  });
}

/**
 * Expense by Category — Doughnut chart.
 * Uses filtered transactions.
 */
function renderCategoryChart() {
  destroyChart("category");

  // Only expense transactions from the filtered set
  const filtered = getFilteredTransactions().filter((t) => t.type === "expense");
  const isEmpty = filtered.length === 0;
  toggleChartEmpty("categoryEmpty", "categoryChart", isEmpty);
  if (isEmpty) return;

  // Group by category
  const catMap = {};
  filtered.forEach((t) => {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  });

  const labels = Object.keys(catMap);
  const data = labels.map((k) => catMap[k]);

  charts.category = new Chart(document.getElementById("categoryChart"), {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: CHART_COLORS.slice(0, labels.length),
          borderWidth: 2,
          borderColor: "#ffffff",
          hoverOffset: 8,
        },
      ],
    },
    options: {
      ...commonChartOptions,
      cutout: "60%",
      plugins: {
        ...commonChartOptions.plugins,
        tooltip: {
          ...commonChartOptions.plugins.tooltip,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatRupiah(ctx.parsed)}`,
          },
        },
      },
    },
  });
}

/**
 * Biggest Expenses — Horizontal Bar chart (top 7).
 * Uses filtered transactions.
 */
function renderBiggestExpenseChart() {
  destroyChart("biggestExpense");

  const filtered = getFilteredTransactions().filter((t) => t.type === "expense");
  const isEmpty = filtered.length === 0;
  toggleChartEmpty("biggestEmpty", "biggestExpenseChart", isEmpty);
  if (isEmpty) return;

  // Sort descending and take top 7
  const top7 = [...filtered]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 7);

  const labels = top7.map((t) =>
    t.description ? `${t.description} (${t.category})` : t.category
  );
  const data = top7.map((t) => t.amount);

  charts.biggestExpense = new Chart(document.getElementById("biggestExpenseChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Pengeluaran",
          data,
          backgroundColor: CHART_COLORS.slice(0, data.length).map((c) => c + "cc"),
          borderColor: CHART_COLORS.slice(0, data.length),
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.6,
        },
      ],
    },
    options: {
      ...commonChartOptions,
      indexAxis: "y", // horizontal bars
      scales: {
        x: {
          grid: { color: "#f1f5f9" },
          ticks: {
            color: "#64748b",
            font: { size: 11 },
            callback: (v) => formatRupiah(v),
          },
        },
        y: {
          grid: { display: false },
          ticks: {
            color: "#64748b",
            font: { size: 11 },
            // Truncate long labels on small screens
            callback: (_, i) => {
              const lbl = labels[i];
              return lbl.length > 22 ? lbl.slice(0, 20) + "…" : lbl;
            },
          },
        },
      },
      plugins: {
        ...commonChartOptions.plugins,
        legend: { display: false },
        tooltip: {
          ...commonChartOptions.plugins.tooltip,
          callbacks: {
            label: (ctx) => ` ${formatRupiah(ctx.parsed.x)}`,
          },
        },
      },
    },
  });
}

/**
 * Payment Method Usage — Pie chart.
 * Shows bank vs cash from income transactions (filtered).
 */
function renderPaymentMethodChart() {
  destroyChart("paymentMethod");

  const filtered = getFilteredTransactions().filter((t) => t.type === "income");
  const isEmpty = filtered.length === 0;
  toggleChartEmpty("paymentEmpty", "paymentMethodChart", isEmpty);
  if (isEmpty) return;

  // Count by source — dynamic, supports all 4 source values
  const SOURCE_DISPLAY = {
    "bank_transfer": "Bank Transfer",
    "cash":          "Cash",
    "e-wallet":      "E-Wallet",
    "lainnya":       "Lainnya",
  };
  const sourceMap = {};
  filtered.forEach((t) => {
    sourceMap[t.source] = (sourceMap[t.source] || 0) + t.amount;
  });

  const labels = Object.keys(sourceMap).map((k) => SOURCE_DISPLAY[k] || k);
  const data   = Object.values(sourceMap);

  charts.paymentMethod = new Chart(document.getElementById("paymentMethodChart"), {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: CHART_COLORS.slice(0, labels.length),
          borderWidth: 2,
          borderColor: "#ffffff",
          hoverOffset: 8,
        },
      ],
    },
    options: {
      ...commonChartOptions,
      plugins: {
        ...commonChartOptions.plugins,
        tooltip: {
          ...commonChartOptions.plugins.tooltip,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatRupiah(ctx.parsed)}`,
          },
        },
      },
    },
  });
}

/**
 * Re-render all 4 charts.
 */
function renderAllCharts() {
  renderMonthlyChart();
  renderCategoryChart();
  renderBiggestExpenseChart();
  renderPaymentMethodChart();
}


/* ============================================================
   8. TRANSACTION LIST RENDERING
   ============================================================ */

/**
 * Build and insert HTML for the transaction list.
 * Respects current filter state.
 */
function renderTransactionList() {
  const filtered = getFilteredTransactions();
  const listEl = document.getElementById("transactionList");
  const emptyEl = document.getElementById("emptyState");

  if (filtered.length === 0) {
    listEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }

  emptyEl.classList.add("hidden");

  // Sort: newest first
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  listEl.innerHTML = sorted.map((t) => buildTransactionHTML(t)).join("");
}

/**
 * Build the HTML string for a single transaction item.
 * @param {Object} t - transaction object
 * @returns {string}
 */
function buildTransactionHTML(t) {
  const isIncome = t.type === "income";

  // Icon: plus (green) for income, minus (red) for expense
  const iconHTML = isIncome
    ? `<span class="flex-shrink-0 w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
         <svg class="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6v12M6 12h12"/>
         </svg>
       </span>`
    : `<span class="flex-shrink-0 w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
         <svg class="w-5 h-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 12h12"/>
         </svg>
       </span>`;

  // Category/source badge — mapped per source value
  const SOURCE_BADGE = {
    "bank_transfer": "bg-blue-100 text-blue-700",
    "cash":          "bg-green-100 text-green-700",
    "e-wallet":      "bg-violet-100 text-violet-700",
    "lainnya":       "bg-slate-100 text-slate-600",
  };
  const SOURCE_LABEL = {
    "bank_transfer": "Bank Transfer",
    "cash":          "Cash",
    "e-wallet":      "E-Wallet",
    "lainnya":       "Lainnya",
  };
  const badgeClass = isIncome
    ? (SOURCE_BADGE[t.source] || "bg-slate-100 text-slate-600")
    : (CATEGORY_COLORS[t.category] || "bg-slate-100 text-slate-600");

  const badgeLabel = isIncome
    ? (SOURCE_LABEL[t.source] || t.source)
    : t.category;

  // Description text
  const description = t.description || (isIncome ? "Pemasukkan" : "Pengeluaran");

  // Amount with sign
  const amountClass = isIncome ? "text-success font-semibold" : "text-danger font-semibold";
  const amountSign = isIncome ? "+" : "−";

  return `
    <div class="transaction-item flex items-center gap-3 px-3 py-3 cursor-default" data-id="${t.id}">
      ${iconHTML}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="text-sm font-medium text-slate-700 truncate">${escapeHtml(description)}</p>
          <span class="text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}">${escapeHtml(badgeLabel)}</span>
        </div>
        <p class="text-xs text-slate-400 mt-0.5">${formatDate(t.date)}</p>
      </div>
      <div class="flex items-center gap-3 flex-shrink-0">
        <span class="${amountClass} text-sm">${amountSign} ${formatRupiah(t.amount)}</span>
        <button
          class="delete-btn text-slate-300 hover:text-danger transition-colors"
          onclick="deleteTransaction('${t.id}')"
          title="Hapus transaksi"
          aria-label="Hapus transaksi ${escapeHtml(description)}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    </div>`;
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


/* ============================================================
   9. FILTER DROPDOWN — CATEGORY OPTIONS
   ============================================================ */

/**
 * Rebuild the category filter dropdown based on current transactions.
 * Adds all unique category/source values found in the data.
 */
function rebuildCategoryFilter() {
  const select = document.getElementById("filterCategory");
  const current = select.value; // preserve current selection if still valid

  // Gather unique labels
  const SOURCE_LABEL_MAP = {
    "bank_transfer": "Bank Transfer",
    "cash":          "Cash",
    "e-wallet":      "E-Wallet",
    "lainnya":       "Lainnya",
  };
  const categories = new Set();
  state.transactions.forEach((t) => {
    if (t.type === "income") {
      categories.add(SOURCE_LABEL_MAP[t.source] || t.source);
    } else {
      categories.add(t.category);
    }
  });

  // Clear and repopulate
  select.innerHTML = `<option value="all">Semua Kategori</option>`;
  [...categories].sort().forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });

  // Restore selection if it still exists
  if ([...select.options].some((o) => o.value === current)) {
    select.value = current;
  } else {
    select.value = "all";
    state.filterCategory = "all";
  }
}


/* ============================================================
   10. FULL DASHBOARD REFRESH
   ============================================================ */

/**
 * Re-render every part of the dashboard.
 * Called after any data change or filter change.
 */
function refreshDashboard() {
  renderKPIs();
  rebuildCategoryFilter();
  renderAllCharts();
  renderTransactionList();
}


/* ============================================================
   11. FORM SUBMISSION HANDLERS
   ============================================================ */

/**
 * Handle income form submission.
 * @param {Event} e
 */
function handleIncomeSubmit(e) {
  e.preventDefault();

  const amountEl = document.getElementById("incomeAmount");
  const sourceEl = document.getElementById("incomeSource");
  const descEl   = document.getElementById("incomeDescription");

  const amount = parseFloat(amountEl.value);

  // Validation
  if (!amount || amount <= 0) {
    showToast("Jumlah pemasukkan harus lebih dari 0.", "error");
    amountEl.focus();
    return;
  }

  /** @type {Object} New transaction object */
  const transaction = {
    id: generateId(),
    type: "income",
    amount,
    source: sourceEl.value,        // "bank" | "cash"
    description: descEl.value.trim(),
    date: new Date().toISOString(),
  };

  // Add to state and persist
  state.transactions.push(transaction);
  saveToStorage();
  refreshDashboard();

  showToast("Pemasukkan berhasil ditambahkan!", "success");

  // Reset form
  amountEl.value = "";
  descEl.value = "";
  amountEl.focus();
}

/**
 * Handle expense form submission.
 * @param {Event} e
 */
function handleExpenseSubmit(e) {
  e.preventDefault();

  const amountEl   = document.getElementById("expenseAmount");
  const categoryEl = document.getElementById("expenseCategory");
  const descEl     = document.getElementById("expenseDescription");

  const amount = parseFloat(amountEl.value);

  // Validation
  if (!amount || amount <= 0) {
    showToast("Jumlah pengeluaran harus lebih dari 0.", "error");
    amountEl.focus();
    return;
  }

  /** @type {Object} New transaction object */
  const transaction = {
    id: generateId(),
    type: "expense",
    amount,
    category: categoryEl.value,    // expense category string
    description: descEl.value.trim(),
    date: new Date().toISOString(),
  };

  // Add to state and persist
  state.transactions.push(transaction);
  saveToStorage();
  refreshDashboard();

  showToast("Pengeluaran berhasil ditambahkan!", "success");

  // Reset form
  amountEl.value = "";
  descEl.value = "";
  amountEl.focus();
}


/* ============================================================
   12. DELETE TRANSACTION
   ============================================================ */

/**
 * Delete a single transaction by its ID.
 * This function is called from inline onclick in the list HTML.
 * @param {string} id
 */
function deleteTransaction(id) {
  state.transactions = state.transactions.filter((t) => t.id !== id);
  saveToStorage();
  refreshDashboard();
  showToast("Transaksi dihapus.", "info");
}

/**
 * Clear ALL transactions (with confirmation).
 */
function clearAllTransactions() {
  if (state.transactions.length === 0) {
    showToast("Tidak ada transaksi untuk dihapus.", "info");
    return;
  }
  if (!confirm("Hapus semua transaksi? Tindakan ini tidak dapat dibatalkan.")) return;
  state.transactions = [];
  saveToStorage();
  state.filterType = "all";
  state.filterCategory = "all";
  document.getElementById("filterType").value = "all";
  document.getElementById("filterCategory").value = "all";
  refreshDashboard();
  showToast("Semua transaksi telah dihapus.", "info");
}


/* ============================================================
   13. FILTER EVENT HANDLERS
   ============================================================ */

/**
 * Handle type filter change (all / income / expense).
 * Updates state and re-renders the whole dashboard.
 */
function handleFilterTypeChange(e) {
  state.filterType = e.target.value;
  state.filterCategory = "all";
  document.getElementById("filterCategory").value = "all";
  refreshDashboard();
}

/**
 * Handle category filter change.
 * Updates state and re-renders the whole dashboard.
 */
function handleFilterCategoryChange(e) {
  state.filterCategory = e.target.value;
  refreshDashboard();
}


/* ============================================================
   14. TOAST NOTIFICATIONS
   ============================================================ */

/** Active toast timeout ID */
let toastTimeout = null;

/**
 * Show a toast notification.
 * @param {string} message - Text to display
 * @param {"success"|"error"|"info"} type
 */
function showToast(message, type = "info") {
  const toast  = document.getElementById("toast");
  const msgEl  = document.getElementById("toastMessage");
  const iconEl = document.getElementById("toastIcon");

  // Set icon based on type
  const icons = {
    success: `<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
    error:   `<svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
    info:    `<svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  };

  iconEl.innerHTML = icons[type] || icons.info;
  msgEl.textContent = message;

  // Clear previous timeout if a toast is already showing
  if (toastTimeout) clearTimeout(toastTimeout);

  toast.classList.remove("hidden");
  toast.classList.remove("hide");
  toast.classList.add("show");

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("hide");
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, 3000);
}


/* ============================================================
   15. HEADER DATE
   ============================================================ */

/**
 * Display the current date in the header.
 */
function renderCurrentDate() {
  const el = document.getElementById("currentDate");
  el.textContent = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}


/* ============================================================
   16. INITIALISATION
   ============================================================ */

/**
 * Bootstrap the application:
 *  1. Load data from LocalStorage
 *  2. Attach event listeners
 *  3. Render the full dashboard
 */
function init() {
  // Load persisted transactions
  state.transactions = loadFromStorage();

  // Render header date
  renderCurrentDate();

  // Attach form listeners
  document.getElementById("incomeForm").addEventListener("submit", handleIncomeSubmit);
  document.getElementById("expenseForm").addEventListener("submit", handleExpenseSubmit);

  // Attach filter listeners
  document.getElementById("filterType").addEventListener("change", handleFilterTypeChange);
  document.getElementById("filterCategory").addEventListener("change", handleFilterCategoryChange);

  // Attach clear-all button
  document.getElementById("clearAll").addEventListener("click", clearAllTransactions);

  // Initial render
  refreshDashboard();
}

// Run when DOM is ready
document.addEventListener("DOMContentLoaded", init);
