const FIELD_DEFS = [
  { key: "ORDER_TYPE", label: "Order Type" },
  { key: "account_type", label: "Account Type" },
  { key: "network_type", label: "Network Type" },
  { key: "service_type", label: "Service Type" },
  { key: "install_type", label: "Install Type" },
  { key: "technology_type", label: "Technology Type" },
  { key: "product_type", label: "Product Type" },
  { key: "action_type", label: "Action Type" }
];

const DATA_FILES = [
  "workflow_data_v2.json",
  "workflow_templates_master_clean.json",
  "workflow_templates_master_v2.json",
  "workflow_templates_master_v2(1).json"
];

const state = {
  data: [],
  selections: [],
  currentRows: []
};

document.addEventListener("DOMContentLoaded", () => {
  boot().catch((error) => showFatalError(error));
});

async function boot() {
  const filtersContainer = document.getElementById("filters");
  const taskSearch = document.getElementById("taskSearch");
  const taskTable = document.getElementById("taskTable");

  if (!filtersContainer || !taskSearch || !taskTable) {
    throw new Error("Required UI containers are missing from index.html.");
  }

  taskSearch.value = "";
  taskTable.innerHTML = "";
  clearDashboard();
  showWorkflowHint("Loading workflow data...");

  state.data = await loadWorkflowData();
  state.selections = [];
  state.currentRows = [];

  buildWizard();
  bindSearch();
  renderNoSelectionState();
}

async function loadWorkflowData() {
  let lastError = null;

  for (const fileName of DATA_FILES) {
    try {
      const response = await fetch(fileName, { cache: "no-store" });
      if (!response.ok) {
        lastError = new Error(`Unable to load ${fileName} (${response.status})`);
        continue;
      }

      const rawText = await response.text();
      const sanitized = sanitizeJsonText(rawText);
      const parsed = JSON.parse(sanitized);

      if (!Array.isArray(parsed)) {
        lastError = new Error(`File ${fileName} does not contain a JSON array.`);
        continue;
      }

      const normalized = parsed
        .map(normalizeRow)
        .filter((row) => row !== null);

      if (!normalized.length) {
        lastError = new Error(`File ${fileName} loaded, but no usable rows were found.`);
        continue;
      }

      return normalized;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Unable to load workflow data from any known filename.");
}

function sanitizeJsonText(text) {
  return String(text || "")
    .replace(/^\uFEFF/, "")
    .replace(/\bNaN\b/g, "null")
    .replace(/\bundefined\b/g, "null")
    .replace(/,\s*([}\]])/g, "$1");
}

function normalizeRow(row) {
  if (!row || typeof row !== "object") return null;

  const normalized = {};

  for (const field of FIELD_DEFS) {
    let value = getRawValue(row, field.key);
    value = cleanText(value);

    if (field.key === "account_type") {
      value = normalizeAccountType(value);
    }

    normalized[field.key] = value;
  }

  normalized.task_name = cleanText(getRawValue(row, "task_name")) || "(Unnamed Task)";
  normalized.orders_with_task = toNumber(getRawValue(row, "orders_with_task"));
  normalized.order_population = toNumber(getRawValue(row, "order_population"));
  normalized.task_percentage = toNumber(getRawValue(row, "task_percentage"));
  normalized.task_type = normalizeTaskType(cleanText(getRawValue(row, "task_type")));

  return normalized;
}

function getRawValue(row, key) {
  if (Object.prototype.hasOwnProperty.call(row, key)) {
    return row[key];
  }

  const upper = key.toUpperCase();
  const lower = key.toLowerCase();

  if (Object.prototype.hasOwnProperty.call(row, upper)) {
    return row[upper];
  }

  if (Object.prototype.hasOwnProperty.call(row, lower)) {
    return row[lower];
  }

  return "";
}

function cleanText(value) {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!text) return "";
  const lower = text.toLowerCase();
  if (lower === "nan" || lower === "undefined" || lower === "null") return "";
  return text;
}

function normalizeAccountType(value) {
  const raw = cleanText(value).toLowerCase();

  if (!raw) return "Unknown";
  if (raw === "residential") return "Residential";
  if (raw === "enterprise") return "Enterprise";
  if (raw === "wholesale") return "Wholesale";
  if (raw === "small business" || raw === "smb" || raw === "business") return "Small Business";
  if (raw === "unknown") return "Unknown";

  return titleCase(raw);
}

function normalizeTaskType(value) {
  const raw = cleanText(value).toUpperCase();
  if (!raw) return "OPTIONAL";
  if (raw === "MANDATORY" || raw === "EXPECTED" || raw === "OPTIONAL") return raw;
  return "OPTIONAL";
}

function toNumber(value) {
  const cleaned = cleanText(value);
  if (!cleaned) return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function titleCase(value) {
  return String(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildWizard() {
  const container = document.getElementById("filters");
  container.innerHTML = "";

  const visibleCount = Math.min(state.selections.length + 1, FIELD_DEFS.length);

  for (let index = 0; index < visibleCount; index++) {
    const group = createFilterGroup(index);
    container.appendChild(group);
  }

  if (state.selections.length >= FIELD_DEFS.length) {
    updateResults();
  }
}

function createFilterGroup(index) {
  const field = FIELD_DEFS[index];
  const group = document.createElement("div");
  group.className = "filter-group";

  const label = document.createElement("label");
  label.setAttribute("for", field.key);
  label.textContent = field.label;

  const select = document.createElement("select");
  select.id = field.key;

  const options = getOptionsForField(index);

  if (!options.length) {
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "No options available";
    select.appendChild(emptyOption);
    select.disabled = true;
  } else {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select...";
    select.appendChild(placeholder);

    for (const optionValue of options) {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionValue;
      select.appendChild(option);
    }

    select.disabled = false;
  }

  const currentValue = state.selections[index] || "";
  if (currentValue && options.includes(currentValue)) {
    select.value = currentValue;
  }

  select.addEventListener("change", () => handleSelectionChange(index, select.value));

  group.appendChild(label);
  group.appendChild(select);

  return group;
}

function getOptionsForField(index) {
  const rows = getRowsMatchingPrefix(index);
  const fieldKey = FIELD_DEFS[index].key;

  return [...new Set(rows.map((row) => row[fieldKey]).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" })
  );
}

function getRowsMatchingPrefix(limitExclusive) {
  return state.data.filter((row) => {
    for (let i = 0; i < limitExclusive; i++) {
      const selected = state.selections[i];
      if (!selected) continue;
      const fieldKey = FIELD_DEFS[i].key;
      if (String(row[fieldKey]) !== String(selected)) return false;
    }
    return true;
  });
}

function handleSelectionChange(index, value) {
  const cleaned = cleanText(value);

  if (cleaned) {
    state.selections[index] = cleaned;
    state.selections = state.selections.slice(0, index + 1);
  } else {
    state.selections = state.selections.slice(0, index);
  }

  buildWizard();
  updateResults();
}

function updateResults() {
  if (!state.selections.length) {
    state.currentRows = [];
    clearDashboard();
    showWorkflowHint("Select Order Type to begin.");
    renderTasks();
    return;
  }

  state.currentRows = state.data.filter((row) => {
    for (let i = 0; i < state.selections.length; i++) {
      const selected = state.selections[i];
      const fieldKey = FIELD_DEFS[i].key;
      if (selected && String(row[fieldKey]) !== String(selected)) return false;
    }
    return true;
  });

  if (!state.currentRows.length) {
    clearDashboard();
    showWorkflowHint("No workflow matches the selected filters.");
    renderTasks();
    return;
  }

  updateSummaryCards();
  updateWorkflowSummary();
  renderTasks();
}

function updateSummaryCards() {
  const populationEl = document.getElementById("population");
  const mandatoryEl = document.getElementById("mandatoryCount");
  const expectedEl = document.getElementById("expectedCount");
  const optionalEl = document.getElementById("optionalCount");

  const populations = [...new Set(state.currentRows.map((row) => row.order_population).filter((n) => n > 0))];

  if (populations.length === 1) {
    populationEl.textContent = Number(populations[0]).toLocaleString();
  } else if (populations.length > 1) {
    populationEl.textContent = `Mixed (${populations.length})`;
  } else {
    populationEl.textContent = "0";
  }

  mandatoryEl.textContent = state.currentRows.filter((row) => row.task_type === "MANDATORY").length.toLocaleString();
  expectedEl.textContent = state.currentRows.filter((row) => row.task_type === "EXPECTED").length.toLocaleString();
  optionalEl.textContent = state.currentRows.filter((row) => row.task_type === "OPTIONAL").length.toLocaleString();
}

function updateWorkflowSummary() {
  const summaryEl = document.getElementById("workflowSummary");

  const selectionLines = FIELD_DEFS
    .slice(0, state.selections.length)
    .map((field, index) => {
      const value = state.selections[index];
      return value ? `<div><b>${field.label}:</b> ${escapeHtml(value)}</div>` : "";
    })
    .filter(Boolean)
    .join("");

  const signatureCount = countDistinctSignatures(state.currentRows);
  const populationCount = [...new Set(state.currentRows.map((row) => row.order_population).filter((n) => n > 0))].length;

  const warning =
    signatureCount > 1
      ? `<div style="margin-top:12px;padding:12px 14px;border-left:4px solid #f59e0b;background:#fff7ed;border-radius:8px;">
           More than one workflow signature matches these filters. Continue selecting the next filter to narrow it down.
         </div>`
      : "";

  summaryEl.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
      <div style="padding:14px 16px;border-radius:10px;background:#f8fafc;border:1px solid #e5e7eb;">
        <div style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Selected Workflow</div>
        <div style="margin-top:8px;line-height:1.7;">${selectionLines || "No filters selected."}</div>
      </div>
      <div style="padding:14px 16px;border-radius:10px;background:#f8fafc;border:1px solid #e5e7eb;">
        <div style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Matching Workflow Signatures</div>
        <div style="margin-top:8px;font-size:22px;font-weight:800;">${signatureCount.toLocaleString()}</div>
      </div>
      <div style="padding:14px 16px;border-radius:10px;background:#f8fafc;border:1px solid #e5e7eb;">
        <div style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Population Scope</div>
        <div style="margin-top:8px;font-size:22px;font-weight:800;">
          ${populationCount === 1 ? "1 Population" : `${populationCount.toLocaleString()} Populations`}
        </div>
      </div>
    </div>
    ${warning}
  `;
}

function countDistinctSignatures(rows) {
  const signatures = new Set();

  for (const row of rows) {
    const signature = FIELD_DEFS.map((field) => row[field.key] || "").join(" | ");
    signatures.add(signature);
  }

  return signatures.size;
}

function renderTasks() {
  const tbody = document.getElementById("taskTable");
  const searchTerm = cleanText(document.getElementById("taskSearch").value).toLowerCase();

  tbody.innerHTML = "";

  if (!state.currentRows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="padding:18px;color:#64748b;">
          Select filters to view workflow tasks.
        </td>
      </tr>
    `;
    return;
  }

  const filteredRows = state.currentRows
    .filter((row) => {
      const taskName = cleanText(row.task_name).toLowerCase();
      return !searchTerm || taskName.includes(searchTerm);
    })
    .sort((a, b) => {
      const diff = b.task_percentage - a.task_percentage;
      if (diff !== 0) return diff;
      return String(a.task_name).localeCompare(String(b.task_name), undefined, { numeric: true, sensitivity: "base" });
    });

  if (!filteredRows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="padding:18px;color:#64748b;">
          No tasks match your search.
        </td>
      </tr>
    `;
    return;
  }

  for (const row of filteredRows) {
    const badgeClass =
      row.task_type === "MANDATORY"
        ? "badge-mandatory"
        : row.task_type === "EXPECTED"
          ? "badge-expected"
          : "badge-optional";

    const taskName = escapeHtml(row.task_name);
    const taskPercentage = Number(row.task_percentage || 0);
    const ordersWithTask = Number(row.orders_with_task || 0).toLocaleString();
    const percentText = Number.isFinite(taskPercentage) ? taskPercentage.toFixed(2).replace(/\.00$/, "") : "0";

    tbody.insertAdjacentHTML(
      "beforeend",
      `
      <tr>
        <td>${taskName}</td>
        <td>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div class="progress-bar">
              <div class="progress-fill" style="width:${Math.max(0, Math.min(100, taskPercentage))}%"></div>
            </div>
            <span>${percentText}%</span>
            <span style="color:#64748b;font-size:12px;">(${ordersWithTask} orders)</span>
          </div>
        </td>
        <td>
          <span class="badge ${badgeClass}">${row.task_type}</span>
        </td>
      </tr>
      `
    );
  }
}

function bindSearch() {
  const search = document.getElementById("taskSearch");
  search.addEventListener("input", () => renderTasks());
}

function renderNoSelectionState() {
  clearDashboard();
  showWorkflowHint("Select Order Type to begin.");
  renderTasks();
}

function clearDashboard() {
  document.getElementById("population").textContent = "0";
  document.getElementById("mandatoryCount").textContent = "0";
  document.getElementById("expectedCount").textContent = "0";
  document.getElementById("optionalCount").textContent = "0";
  document.getElementById("workflowSummary").innerHTML = "";
}

function showWorkflowHint(message) {
  const summaryEl = document.getElementById("workflowSummary");
  summaryEl.innerHTML = `
    <div style="padding:14px 16px;border-radius:10px;background:#f8fafc;border:1px solid #e5e7eb;color:#334155;">
      ${escapeHtml(message)}
    </div>
  `;
}

function showFatalError(error) {
  const filters = document.getElementById("filters");
  const taskTable = document.getElementById("taskTable");

  if (filters) filters.innerHTML = "";
  if (taskTable) {
    taskTable.innerHTML = `
      <tr>
        <td colspan="3" style="padding:18px;color:#b91c1c;">
          Failed to load workflow data: ${escapeHtml(error && error.message ? error.message : String(error))}
        </td>
      </tr>
    `;
  }

  clearDashboard();

  const summary = document.getElementById("workflowSummary");
  if (summary) {
    summary.innerHTML = `
      <div style="padding:14px 16px;border-radius:10px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;">
        Failed to load workflow data. Check the JSON file name, file contents, and browser console.
      </div>
    `;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
