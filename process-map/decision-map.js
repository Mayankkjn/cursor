// Static, hand-laid-out example of a decision-node process map: a single
// decision point near the start ("Cost") fans out into three structurally
// distinct downstream processes, each with its own task list, deviation
// count, duration, and recorded session. This is one illustrative example,
// not a generic renderer — the geometry in decision-map.html is fixed.

const PATH_TASKS = {
  1: ['Create Request', 'Manager Approval', 'Finance Review', 'Budget Check', 'Legal Review', 'Vendor Selection', 'PO Creation', 'Goods Receipt', 'Invoice Match', 'Payment'],
  2: ['Create Request', 'Auto-Approval', 'Payment'],
  3: ['Create Request', 'Manager Approval', 'Finance Review', 'Executive Approval', 'Vendor Selection', 'PO Creation', 'Payment'],
};

function buildTaskListHtml(pathId) {
  const tasks = PATH_TASKS[pathId] || [];
  const items = tasks
    .map((task, i) => `<li><span class="dm-task-list-index">${i + 1}</span>${task}</li>`)
    .join('');
  return `<p class="dm-task-list-heading">Path ${pathId} tasks</p><ol>${items}</ol>`;
}

const tooltip = document.getElementById('dm-tooltip');

function showTooltip(evt, text) {
  tooltip.textContent = text;
  tooltip.style.display = 'block';
  tooltip.style.left = `${evt.clientX + 14}px`;
  tooltip.style.top = `${evt.clientY + 14}px`;
}

function hideTooltip() {
  tooltip.style.display = 'none';
}

document.querySelectorAll('.dm-task-chip').forEach((chip) => {
  const pathId = chip.getAttribute('data-path');
  const panel = document.querySelector(`.dm-task-list-fo[data-path="${pathId}"]`);
  const listDiv = panel ? panel.querySelector('.dm-task-list') : null;
  if (listDiv) listDiv.innerHTML = buildTaskListHtml(pathId);

  chip.addEventListener('click', () => {
    const isOpen = chip.classList.toggle('open');
    if (panel) panel.style.display = isOpen ? 'block' : 'none';
  });
});

document.querySelectorAll('.dm-watch-btn').forEach((btn) => {
  btn.addEventListener('click', (evt) => {
    showTooltip(evt, btn.getAttribute('data-tip') || 'Session playback is not available in this demo example.');
    setTimeout(hideTooltip, 2200);
  });
});

document.querySelectorAll('.dm-icon-kebab').forEach((kebab) => {
  kebab.style.cursor = 'pointer';
  kebab.addEventListener('click', (evt) => {
    showTooltip(evt, 'More options are not available in this demo example.');
    setTimeout(hideTooltip, 2200);
  });
});
