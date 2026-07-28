const PAGE_SIZE = 16;

const state = {
  all: generateProcessCatalog(),
  search: '',
  businessUnit: '',
  sortDir: null, // null = as-discovered order; 'asc' | 'desc' once the Title header is clicked
  page: 1,
};

function getFiltered() {
  let rows = state.all;
  if (state.businessUnit) rows = rows.filter((r) => r.businessUnit === state.businessUnit);
  if (state.search) {
    const q = state.search.toLowerCase();
    rows = rows.filter((r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
  }
  if (state.sortDir) {
    rows = rows.slice().sort((a, b) => (state.sortDir === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)));
  }
  return rows;
}

function renderStats() {
  document.getElementById('stat-total-processes').textContent = state.all.length;
  document.getElementById('stat-total-users').textContent = state.all.reduce((s, r) => s + r.users, 0).toLocaleString();
  document.getElementById('stat-total-roles').textContent = new Set(state.all.map((r) => r.role)).size;
  document.getElementById('stat-total-bu').textContent = new Set(state.all.map((r) => r.businessUnit)).size;
}

function renderFilterOptions() {
  const select = document.getElementById('filter-bu');
  const units = Array.from(new Set(state.all.map((r) => r.businessUnit))).sort();
  units.forEach((u) => {
    const opt = document.createElement('option');
    opt.value = u;
    opt.textContent = u;
    select.appendChild(opt);
  });
}

function openProcess(row) {
  if (row.targetPage) {
    window.location.href = row.targetPage;
    return;
  }
  sessionStorage.setItem('selectedProcessName', row.title);
  if (row.datasetRaw) {
    sessionStorage.setItem('selectedProcessData', JSON.stringify(row.datasetRaw));
  } else {
    sessionStorage.removeItem('selectedProcessData');
  }
  window.location.href = 'index.html';
}

function renderTable() {
  const filtered = getFiltered();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  state.page = Math.min(state.page, totalPages);
  const start = (state.page - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  const tbody = document.getElementById('process-tbody');
  tbody.innerHTML = '';
  document.getElementById('empty-state').classList.toggle('hidden', pageRows.length > 0);

  pageRows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="process-title">${escapeHtml(row.title)}</div>
        <div class="process-description">${escapeHtml(row.description)}</div>
      </td>
      <td>${escapeHtml(row.role)}</td>
      <td>${escapeHtml(row.businessUnit)}</td>
      <td class="num">${formatMedianDuration(row.medianDurationSeconds)}</td>
      <td class="num">${row.processCount}</td>
      <td class="num">${row.users.toLocaleString()}</td>
    `;
    tr.addEventListener('click', () => openProcess(row));
    tbody.appendChild(tr);
  });

  const rangeStart = filtered.length === 0 ? 0 : start + 1;
  const rangeEnd = Math.min(start + PAGE_SIZE, filtered.length);
  document.getElementById('rows-summary').textContent = `Rows ${rangeStart}-${rangeEnd} of ${filtered.length}`;

  renderPagination(totalPages);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderPagination(totalPages) {
  const el = document.getElementById('pagination');
  el.innerHTML = '';

  const addPageBtn = (label, page, opts = {}) => {
    const btn = document.createElement('button');
    btn.className = `page-btn${opts.active ? ' active' : ''}`;
    btn.textContent = label;
    btn.disabled = !!opts.disabled;
    btn.addEventListener('click', () => { state.page = page; renderTable(); });
    el.appendChild(btn);
  };

  addPageBtn('‹', state.page - 1, { disabled: state.page <= 1 });

  const pageNumbers = new Set([1, totalPages, state.page, state.page - 1, state.page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = Array.from(pageNumbers).sort((a, b) => a - b);
  let prev = 0;
  sorted.forEach((p) => {
    if (p - prev > 1) {
      const span = document.createElement('span');
      span.className = 'page-ellipsis';
      span.textContent = '…';
      el.appendChild(span);
    }
    addPageBtn(String(p), p, { active: p === state.page });
    prev = p;
  });

  addPageBtn('›', state.page + 1, { disabled: state.page >= totalPages });
}

document.getElementById('search-input').addEventListener('input', (e) => {
  state.search = e.target.value;
  state.page = 1;
  renderTable();
});

document.getElementById('filter-button').addEventListener('click', () => {
  document.getElementById('filter-panel').classList.toggle('hidden');
});
document.addEventListener('click', (e) => {
  const wrap = document.querySelector('.filter-wrap');
  if (!wrap.contains(e.target)) document.getElementById('filter-panel').classList.add('hidden');
});
document.getElementById('filter-bu').addEventListener('change', (e) => {
  state.businessUnit = e.target.value;
  state.page = 1;
  renderTable();
});

document.getElementById('sort-title').addEventListener('click', () => {
  state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
  state.page = 1;
  renderTable();
});

document.getElementById('sidebar-collapse').addEventListener('click', () => {
  document.getElementById('side-nav').classList.toggle('collapsed');
});

renderStats();
renderFilterOptions();
renderTable();
