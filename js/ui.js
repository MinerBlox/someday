// ============================================================
//  SOMEDAY — UI Helpers
// ============================================================

const UI = {

  // ---- Pill labels ----
  priorityLabel: { low: 'Low', medium: 'Medium', high: 'High', dream: '✦ Dream' },
  statusLabel:   {
    not_started: 'Not Started',
    planned:     'Planned',
    in_progress: 'In Progress',
    completed:   'Completed',
  },

  priorityPillClass: {
    low:    'pill',
    medium: 'pill',
    high:   'pill priority-high',
    dream:  'pill priority-dream',
  },

  // ---- Date formatting ----
  formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  },
  formatDateShort(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  },
  timeAgo(ts) {
    const diff = Date.now() - ts;
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30)  return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
    const years = Math.floor(months / 12);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  },

  // ---- Greeting ----
  greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  },

  // ---- Category color dot ----
  categoryDot(color) {
    return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color || '#ccc'};margin-right:5px;flex-shrink:0"></span>`;
  },

  // ---- Build item card HTML ----
  itemCardHTML(item) {
    const cat  = DB.getCategoryById(item.categoryId);
    const done = item.status === 'completed';
    const catDot = cat ? UI.categoryDot(cat.color) : '';

    return `
    <div class="item-card ${done ? 'completed' : ''}" data-id="${item.id}">
      <div class="item-card-top">
        <div class="item-card-title">${UI.esc(item.title)}</div>
        <button class="item-check-btn ${done ? 'done' : ''}" data-check="${item.id}" aria-label="${done ? 'Reopen' : 'Complete'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>
      <div class="item-card-meta">
        ${cat ? `<span class="pill" style="border-left:3px solid ${cat.color}">${catDot}${UI.esc(cat.name)}</span>` : ''}
        <span class="${UI.priorityPillClass[item.priority] || 'pill'}">${UI.priorityLabel[item.priority] || item.priority}</span>
        ${done ? `<span class="pill status-completed">${UI.formatDateShort(item.completedAt)}</span>` : ''}
      </div>
      ${item.notes ? `<p class="item-card-note">${UI.esc(item.notes)}</p>` : ''}
    </div>`;
  },

  // ---- Build archive card HTML ----
  archiveCardHTML(item) {
    const cat = DB.getCategoryById(item.categoryId);
    return `
    <div class="archive-card" data-id="${item.id}">
      <div class="archive-card-check">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      ${cat ? `<div class="pill" style="display:inline-flex;margin-bottom:10px;border-left:3px solid ${cat.color}">${UI.categoryDot(cat.color)}${UI.esc(cat.name)}</div>` : ''}
      <div class="archive-card-title">${UI.esc(item.title)}</div>
      <div class="archive-card-date">Completed ${UI.formatDate(item.completedAt)}</div>
      ${item.memory ? `<div class="archive-card-memory">"${UI.esc(item.memory)}"</div>` : ''}
      ${item.completedWith ? `<div class="archive-with">With ${UI.esc(item.completedWith)}</div>` : ''}
    </div>`;
  },

  // ---- Progress ring ----
  updateProgressRing(pct) {
    const circle = document.querySelector('.ring-fg');
    if (!circle) return;
    const r = 28;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    circle.style.strokeDasharray  = `${circ}`;
    circle.style.strokeDashoffset = `${offset}`;
    const txt = document.querySelector('.ring-text');
    if (txt) txt.textContent = `${pct}%`;
  },

  // ---- Escape HTML ----
  esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  // ---- Modal open/close ----
  openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
  },
  closeModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('open');
    document.body.style.overflow = '';
  },
  closeAllModals() {
    document.querySelectorAll('.modal.open').forEach(m => {
      m.classList.remove('open');
    });
    document.body.style.overflow = '';
  },

  // ---- Celebration ----
  celebrate() {
    const el = document.getElementById('celebration');
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 1800);
  },

  // ---- Toast ----
  toast(msg) {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:calc(var(--nav-h) + var(--safe-bottom) + 80px);
      left:50%;transform:translateX(-50%);background:#1A1916;color:#F8F7F4;
      padding:10px 20px;border-radius:100px;font-size:14px;z-index:500;
      white-space:nowrap;animation:fade-in .2s ease;pointer-events:none;`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  },

  // ---- Category select options ----
  populateCategorySelect(selectEl, selectedId = null) {
    const cats = DB.getCategories();
    selectEl.innerHTML = `<option value="">No category</option>` +
      cats.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${UI.esc(c.name)}</option>`).join('');
  },

  // ---- Detail modal ----
  renderDetail(item) {
    const cat  = DB.getCategoryById(item.categoryId);
    const done = item.status === 'completed';

    let actionsHTML;
    if (done) {
      actionsHTML = `
        <button class="btn-secondary" id="detail-edit-btn">Edit</button>
        <button class="btn-reopen" id="detail-reopen-btn">Mark as Not Completed</button>`;
    } else {
      actionsHTML = `
        <button class="btn-complete" id="detail-complete-btn">Mark as Completed ✓</button>
        <button class="btn-secondary" id="detail-edit-btn">Edit</button>`;
    }

    const infoRows = [];
    if (item.targetDate) infoRows.push({ label: 'Target', val: UI.esc(item.targetDate) });
    if (item.location)   infoRows.push({ label: 'Location', val: UI.esc(item.location) });
    if (done) {
      infoRows.push({ label: 'Completed', val: UI.formatDate(item.completedAt) });
      if (item.completedWith) infoRows.push({ label: 'With', val: UI.esc(item.completedWith) });
    }

    return `
    <div class="detail-inner">
      <button class="back-btn" id="detail-back-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </button>
      <h1 class="detail-title">${UI.esc(item.title)}</h1>
      <div class="detail-pills">
        ${cat ? `<span class="pill" style="border-left:3px solid ${cat.color}">${UI.categoryDot(cat.color)}${UI.esc(cat.name)}</span>` : ''}
        <span class="${UI.priorityPillClass[item.priority] || 'pill'}">${UI.priorityLabel[item.priority]}</span>
        <span class="pill">${UI.statusLabel[item.status] || item.status}</span>
      </div>

      ${item.notes ? `
      <div class="detail-section">
        <div class="detail-section-label">Notes</div>
        <div class="detail-section-value">${UI.esc(item.notes)}</div>
      </div>` : ''}

      ${item.memory ? `
      <div class="detail-section">
        <div class="detail-section-label">Memory</div>
        <div class="detail-section-value" style="font-style:italic">"${UI.esc(item.memory)}"</div>
      </div>` : ''}

      ${infoRows.map(r => `
      <div class="detail-section">
        <div class="detail-section-label">${r.label}</div>
        <div class="detail-section-value">${r.val}</div>
      </div>`).join('')}

      <div class="detail-section">
        <div class="detail-section-label">Added</div>
        <div class="detail-section-value">${UI.timeAgo(item.createdAt)}</div>
      </div>

      <div class="detail-actions">
        ${actionsHTML}
      </div>
    </div>`;
  },
};
