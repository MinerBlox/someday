// ============================================================
//  SOMEDAY — App Logic
// ============================================================

// ---- State ----
const State = {
  currentScreen:    'today',
  listFilter:       { category: null, status: null, search: '' },
  currentCatId:     null,   // for category detail view
  pendingCompleteId: null,  // item awaiting completion modal
};

// ---- Init ----
function init() {
  DB.ensureDefaultCategories();
  setupNav();
  setupFAB();
  setupModals();
  renderAll();

  // Check for iOS install prompt
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone === true;
  const dismissed = localStorage.getItem('someday_install_dismissed');
  if (isIOS && !isStandalone && !dismissed) {
    showInstallBanner();
  }
}

// ---- Render all screens ----
function renderAll() {
  renderToday();
  renderList();
  renderCategories();
  renderArchive();
  renderSettings();
}

// ============================================================
//  NAVIGATION
// ============================================================
function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      switchScreen(screen);
    });
  });
}

function switchScreen(name) {
  State.currentScreen = name;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.screen === name);
  });
  // Re-render on switch to keep fresh
  if (name === 'today')      renderToday();
  if (name === 'list')       renderList();
  if (name === 'categories') renderCategories();
  if (name === 'archive')    renderArchive();
  if (name === 'settings')   renderSettings();
}

// ============================================================
//  TODAY SCREEN
// ============================================================
function renderToday() {
  const screen = document.getElementById('screen-today');
  const settings = DB.getSettings();
  const stats = DB.getStats();
  const items = DB.getItems();
  const active = items.filter(i => i.status !== 'completed');
  const recent = items.filter(i => i.status === 'completed')
    .sort((a,b) => b.completedAt - a.completedAt).slice(0, 3);

  // Pick featured (random unfinished)
  const featured = active.length > 0
    ? active[Math.floor(Math.random() * Math.min(active.length, 5))]
    : null;

  let featuredHTML;
  if (featured) {
    const cat = DB.getCategoryById(featured.categoryId);
    featuredHTML = `
    <div class="featured-card" data-id="${featured.id}" id="featured-card-tap">
      <div class="featured-tag">${cat ? UI.esc(cat.name) : 'Dream'} · ${UI.priorityLabel[featured.priority]}</div>
      <div class="featured-title">${UI.esc(featured.title)}</div>
      <div class="featured-meta">Added ${UI.timeAgo(featured.createdAt)}</div>
    </div>`;
  } else {
    featuredHTML = `
    <div class="featured-empty">
      <p>Your list is waiting.</p>
      <span>Add something you want to experience someday.</span>
    </div>`;
  }

  let recentHTML = '';
  if (recent.length > 0) {
    recentHTML = `
    <div class="section-label">Recently Completed</div>
    <div class="items-list recent-list">
      ${recent.map(i => UI.itemCardHTML(i)).join('')}
    </div>`;
  }

  screen.innerHTML = `
  <div class="today-header">
    <div class="today-greeting">${UI.greeting()}, ${UI.esc(settings.name || 'there')}.</div>
    <div class="today-sub">${stats.completed > 0
      ? `You've completed ${stats.completed} dream${stats.completed !== 1 ? 's' : ''}.`
      : 'Start building your life list.'}</div>
  </div>

  <div class="progress-ring-wrap">
    <svg class="progress-ring-svg" viewBox="0 0 72 72">
      <circle class="ring-bg" cx="36" cy="36" r="28"/>
      <circle class="ring-fg" cx="36" cy="36" r="28" stroke-dasharray="175.9" stroke-dashoffset="175.9"/>
      <text class="ring-text" x="36" y="41" text-anchor="middle">0%</text>
    </svg>
    <div class="progress-stats">
      <div class="stat-row">
        <div class="stat-item">
          <div class="stat-num">${stats.total}</div>
          <div class="stat-label">Total dreams</div>
        </div>
        <div class="stat-item">
          <div class="stat-num">${stats.completed}</div>
          <div class="stat-label">Completed</div>
        </div>
        <div class="stat-item">
          <div class="stat-num">${stats.total - stats.completed}</div>
          <div class="stat-label">Still ahead</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section-label">Dream of the Moment</div>
  ${featuredHTML}

  ${recentHTML}
  `;

  UI.updateProgressRing(stats.pct);

  // Event: featured card tap
  const featCard = document.getElementById('featured-card-tap');
  if (featCard) {
    featCard.addEventListener('click', () => openDetail(featured.id));
  }

  // Event: recent cards
  screen.querySelectorAll('.item-card[data-id]').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('[data-check]')) return;
      openDetail(el.dataset.id);
    });
  });
  screen.querySelectorAll('[data-check]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      handleCheckTap(btn.dataset.check);
    });
  });
}

// ============================================================
//  LIST SCREEN
// ============================================================
function renderList() {
  const screen = document.getElementById('screen-list');
  const allItems = DB.getItems();
  const cats = DB.getCategories();

  let items = allItems.filter(i => i.status !== 'completed');

  // Apply filters
  if (State.listFilter.category) {
    items = items.filter(i => i.categoryId === State.listFilter.category);
  }
  if (State.listFilter.status) {
    items = allItems.filter(i => i.status === State.listFilter.status);
  }
  if (State.listFilter.search) {
    const q = State.listFilter.search.toLowerCase();
    items = items.filter(i =>
      i.title.toLowerCase().includes(q) || (i.notes || '').toLowerCase().includes(q)
    );
  }

  const catChips = cats.map(c => `
    <button class="filter-chip ${State.listFilter.category === c.id ? 'active' : ''}"
      data-cat-filter="${c.id}">${UI.esc(c.name)}</button>`).join('');

  screen.innerHTML = `
  <div class="screen-header">
    <div class="screen-title">Your List</div>
    <div class="screen-sub">${allItems.filter(i => i.status !== 'completed').length} dreams ahead</div>
  </div>

  <div class="search-bar">
    <div class="search-input-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input class="search-input" type="text" placeholder="Search dreams…"
        id="list-search" value="${UI.esc(State.listFilter.search)}" />
    </div>
  </div>

  <div class="filter-row">
    <button class="filter-chip ${!State.listFilter.category && !State.listFilter.status ? 'active' : ''}" data-cat-filter="all">All</button>
    ${catChips}
    <button class="filter-chip ${State.listFilter.status === 'planned' ? 'active' : ''}" data-status-filter="planned">Planned</button>
    <button class="filter-chip ${State.listFilter.status === 'in_progress' ? 'active' : ''}" data-status-filter="in_progress">In Progress</button>
    <button class="filter-chip ${State.listFilter.status === 'completed' ? 'active' : ''}" data-status-filter="completed">Completed</button>
  </div>

  <div class="items-list" id="list-items">
    ${items.length === 0 ? `
    <div class="empty-state">
      <div class="empty-state-icon">✦</div>
      <h3>Nothing here yet.</h3>
      <p>Tap + to add your first dream.</p>
    </div>` : items.map(i => UI.itemCardHTML(i)).join('')}
  </div>
  `;

  // Search
  const searchInput = screen.querySelector('#list-search');
  searchInput.addEventListener('input', e => {
    State.listFilter.search = e.target.value;
    renderList();
  });

  // Category filters
  screen.querySelectorAll('[data-cat-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.catFilter;
      State.listFilter.status = null;
      State.listFilter.category = v === 'all' ? null : v;
      renderList();
    });
  });

  // Status filters
  screen.querySelectorAll('[data-status-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.statusFilter;
      State.listFilter.category = null;
      State.listFilter.status = State.listFilter.status === v ? null : v;
      if (State.listFilter.status === 'completed') {
        // Show completed in this filter
        renderListWithCompleted();
        return;
      }
      renderList();
    });
  });

  // Card taps
  bindListCards(screen);
}

function renderListWithCompleted() {
  const screen = document.getElementById('screen-list');
  const listEl = screen.querySelector('#list-items');
  if (!listEl) return;
  const items = DB.getItems().filter(i => i.status === 'completed');
  listEl.innerHTML = items.length === 0
    ? `<div class="empty-state"><div class="empty-state-icon">✦</div><h3>No completed dreams yet.</h3><p>That makes the first one special.</p></div>`
    : items.map(i => UI.itemCardHTML(i)).join('');
  bindListCards(screen);
}

function bindListCards(screen) {
  screen.querySelectorAll('.item-card[data-id]').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('[data-check]')) return;
      openDetail(el.dataset.id);
    });
  });
  screen.querySelectorAll('[data-check]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      handleCheckTap(btn.dataset.check);
    });
  });
}

// ============================================================
//  CATEGORIES SCREEN
// ============================================================
function renderCategories() {
  const screen = document.getElementById('screen-categories');

  // Are we in category detail mode?
  if (State.currentCatId) {
    renderCategoryDetail(State.currentCatId);
    return;
  }

  const cats = DB.getCategories();
  const items = DB.getItems();

  const cards = cats.map(cat => {
    const total = items.filter(i => i.categoryId === cat.id).length;
    const done  = items.filter(i => i.categoryId === cat.id && i.status === 'completed').length;
    return `
    <div class="cat-card" data-cat-id="${cat.id}" style="--cat-color:${cat.color}">
      <div class="cat-icon">●</div>
      <div class="cat-name">${UI.esc(cat.name)}</div>
      <div class="cat-count">${total} dream${total !== 1 ? 's' : ''} · ${done} done</div>
    </div>`;
  }).join('');

  screen.innerHTML = `
  <div class="screen-header">
    <div class="screen-title">Categories</div>
    <div class="screen-sub">${cats.length} categories</div>
  </div>
  <div class="categories-grid">
    ${cards}
    <div class="cat-add-card" id="add-cat-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      New category
    </div>
  </div>
  `;

  screen.querySelectorAll('.cat-card').forEach(el => {
    el.addEventListener('click', () => {
      State.currentCatId = el.dataset.catId;
      renderCategoryDetail(State.currentCatId);
    });
  });

  document.getElementById('add-cat-btn').addEventListener('click', openCategoryModal);
}

function renderCategoryDetail(catId) {
  const screen = document.getElementById('screen-categories');
  const cat = DB.getCategoryById(catId);
  if (!cat) { State.currentCatId = null; renderCategories(); return; }

  const items = DB.getItems().filter(i => i.categoryId === catId);
  const active    = items.filter(i => i.status !== 'completed');
  const completed = items.filter(i => i.status === 'completed');

  screen.innerHTML = `
  <div class="cat-detail-header">
    <button class="back-btn" id="cat-back-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="15 18 9 12 15 6"/></svg>
      Categories
    </button>
    <div class="screen-title" style="border-left:4px solid ${cat.color};padding-left:12px">${UI.esc(cat.name)}</div>
    <div class="screen-sub">${items.length} dreams · ${completed.length} completed</div>
  </div>

  ${active.length > 0 ? `
  <div class="section-label">Dreams Ahead</div>
  <div class="items-list" id="cat-active-list">
    ${active.map(i => UI.itemCardHTML(i)).join('')}
  </div>` : ''}

  ${completed.length > 0 ? `
  <div class="section-label" style="margin-top:24px">Completed</div>
  <div class="items-list" id="cat-done-list">
    ${completed.map(i => UI.itemCardHTML(i)).join('')}
  </div>` : ''}

  ${items.length === 0 ? `<div class="empty-state">
    <div class="empty-state-icon">✦</div>
    <h3>Nothing here yet.</h3>
    <p>Add something to ${UI.esc(cat.name)}.</p>
  </div>` : ''}
  `;

  document.getElementById('cat-back-btn').addEventListener('click', () => {
    State.currentCatId = null;
    renderCategories();
  });

  screen.querySelectorAll('.item-card[data-id]').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('[data-check]')) return;
      openDetail(el.dataset.id);
    });
  });
  screen.querySelectorAll('[data-check]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      handleCheckTap(btn.dataset.check);
    });
  });
}

// ============================================================
//  ARCHIVE SCREEN
// ============================================================
function renderArchive() {
  const screen = document.getElementById('screen-archive');
  const completed = DB.getItems()
    .filter(i => i.status === 'completed')
    .sort((a, b) => b.completedAt - a.completedAt);

  screen.innerHTML = `
  <div class="screen-header">
    <div class="screen-title">Archive</div>
    <div class="screen-sub">${completed.length} memor${completed.length !== 1 ? 'ies' : 'y'} made</div>
  </div>
  <div class="archive-wall">
    ${completed.length === 0 ? `
    <div class="empty-state">
      <div class="empty-state-icon">✦</div>
      <h3>No completed dreams yet.</h3>
      <p>That makes the first one special.</p>
    </div>` : completed.map(i => UI.archiveCardHTML(i)).join('')}
  </div>
  `;

  screen.querySelectorAll('.archive-card[data-id]').forEach(el => {
    el.addEventListener('click', () => openDetail(el.dataset.id));
  });
}

// ============================================================
//  SETTINGS SCREEN
// ============================================================
function renderSettings() {
  const screen = document.getElementById('screen-settings');
  const settings = DB.getSettings();
  const stats = DB.getStats();

  screen.innerHTML = `
  <div class="screen-header">
    <div class="screen-title">Settings</div>
  </div>

  <div class="settings-section-title">Your Name</div>
  <div class="settings-section">
    <div class="settings-row" id="settings-name-row">
      <div class="settings-row-left">
        <div class="settings-row-title">${UI.esc(settings.name || 'Set your name')}</div>
        <div class="settings-row-sub">Used in your greeting</div>
      </div>
      <div class="settings-row-right">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>
  </div>

  <div class="settings-section-title">Stats</div>
  <div class="settings-section">
    <div class="settings-row" style="cursor:default">
      <div class="settings-row-left">
        <div class="settings-row-title">${stats.total} total dreams</div>
        <div class="settings-row-sub">${stats.completed} completed · ${stats.total - stats.completed} remaining</div>
      </div>
    </div>
  </div>

  <div class="settings-section-title">Data</div>
  <div class="settings-section">
    <div class="settings-row" id="settings-export">
      <div class="settings-row-left">
        <div class="settings-row-title">Export Data</div>
        <div class="settings-row-sub">Download all your dreams as JSON</div>
      </div>
      <div class="settings-row-right">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </div>
    </div>
    <div class="settings-row" id="settings-import">
      <div class="settings-row-left">
        <div class="settings-row-title">Import Data</div>
        <div class="settings-row-sub">Restore from a JSON backup</div>
      </div>
      <div class="settings-row-right">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      </div>
    </div>
  </div>

  <div class="settings-section-title">Danger Zone</div>
  <div class="settings-section">
    <div class="settings-row" id="settings-clear">
      <div class="settings-row-left">
        <div class="settings-row-title settings-danger">Clear All Data</div>
        <div class="settings-row-sub">Permanently delete everything</div>
      </div>
    </div>
  </div>

  <div style="padding:20px 16px;text-align:center">
    <p style="font-family:var(--font-display);font-size:20px;font-weight:300;color:var(--text-3)">Someday</p>
    <p style="font-size:12px;color:var(--text-3);margin-top:4px">A quiet place for the life you still want to live.</p>
  </div>
  <input type="file" id="import-file-input" accept=".json" style="display:none" />
  `;

  // Name
  screen.querySelector('#settings-name-row').addEventListener('click', () => {
    const name = prompt('Your name:', settings.name || '');
    if (name !== null) {
      DB.saveSettings({ name: name.trim() || 'Your' });
      renderSettings();
      renderToday();
    }
  });

  // Export
  screen.querySelector('#settings-export').addEventListener('click', () => {
    const json = DB.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'someday-backup.json';
    a.click(); URL.revokeObjectURL(url);
    UI.toast('Data exported!');
  });

  // Import
  screen.querySelector('#settings-import').addEventListener('click', () => {
    screen.querySelector('#import-file-input').click();
  });
  screen.querySelector('#import-file-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        DB.importJSON(ev.target.result);
        renderAll();
        UI.toast('Data imported!');
      } catch {
        alert('Could not read that file. Please use a valid Someday backup JSON.');
      }
    };
    reader.readAsText(file);
  });

  // Clear
  screen.querySelector('#settings-clear').addEventListener('click', () => {
    if (confirm('Delete ALL data? This cannot be undone.')) {
      localStorage.removeItem(DB.ITEMS_KEY);
      localStorage.removeItem(DB.CATS_KEY);
      DB.ensureDefaultCategories();
      renderAll();
      UI.toast('Data cleared.');
    }
  });
}

// ============================================================
//  FAB — Add Item
// ============================================================
function setupFAB() {
  document.getElementById('fab').addEventListener('click', () => openItemModal(null));
}

// ============================================================
//  ITEM MODAL (Add / Edit)
// ============================================================
function openItemModal(itemId) {
  const modalTitle = document.getElementById('modal-item-title');
  const idField    = document.getElementById('item-id');
  const titleField = document.getElementById('item-title');
  const catField   = document.getElementById('item-category');
  const priField   = document.getElementById('item-priority');
  const statusField= document.getElementById('item-status');
  const notesField = document.getElementById('item-notes');
  const targetField= document.getElementById('item-target');
  const locField   = document.getElementById('item-location');
  const deleteBtn  = document.getElementById('btn-delete-item');

  UI.populateCategorySelect(catField);

  if (itemId) {
    const item = DB.getItemById(itemId);
    modalTitle.textContent  = 'Edit Dream';
    idField.value           = item.id;
    titleField.value        = item.title;
    catField.value          = item.categoryId || '';
    priField.value          = item.priority;
    statusField.value       = item.status === 'completed' ? 'not_started' : item.status;
    notesField.value        = item.notes || '';
    targetField.value       = item.targetDate || '';
    locField.value          = item.location || '';
    deleteBtn.classList.remove('hidden');
  } else {
    modalTitle.textContent  = 'New Dream';
    idField.value           = '';
    titleField.value        = '';
    catField.value          = '';
    priField.value          = 'medium';
    statusField.value       = 'not_started';
    notesField.value        = '';
    targetField.value       = '';
    locField.value          = '';
    deleteBtn.classList.add('hidden');
  }

  UI.openModal('modal-item');
  setTimeout(() => titleField.focus(), 320);
}

function saveItem() {
  const title = document.getElementById('item-title').value.trim();
  if (!title) { UI.toast('Add a title for your dream.'); return; }

  const id = document.getElementById('item-id').value;
  DB.saveItem({
    id:         id || undefined,
    title,
    categoryId: document.getElementById('item-category').value || null,
    priority:   document.getElementById('item-priority').value,
    status:     document.getElementById('item-status').value,
    notes:      document.getElementById('item-notes').value.trim(),
    targetDate: document.getElementById('item-target').value.trim(),
    location:   document.getElementById('item-location').value.trim(),
  });

  UI.closeModal('modal-item');
  renderAll();
  UI.toast(id ? 'Dream updated.' : 'Dream added ✦');
}

// ============================================================
//  COMPLETION FLOW
// ============================================================
function openCompleteModal(itemId) {
  State.pendingCompleteId = itemId;
  const item = DB.getItemById(itemId);
  document.getElementById('complete-item-name').textContent = item.title;
  document.getElementById('complete-memory').value = '';
  document.getElementById('complete-with').value   = '';
  document.getElementById('complete-date').value   =
    new Date().toISOString().slice(0, 10);
  UI.openModal('modal-complete');
}

function saveComplete() {
  const id = State.pendingCompleteId;
  if (!id) return;

  const dateVal = document.getElementById('complete-date').value;
  DB.completeItem(id, {
    memory:        document.getElementById('complete-memory').value.trim(),
    completedWith: document.getElementById('complete-with').value.trim(),
    completedAt:   dateVal ? new Date(dateVal).getTime() : Date.now(),
  });

  UI.closeModal('modal-complete');
  UI.closeModal('modal-detail');
  renderAll();
  UI.celebrate();
  State.pendingCompleteId = null;
}

// ---- Handle check button taps ----
function handleCheckTap(itemId) {
  const item = DB.getItemById(itemId);
  if (!item) return;
  if (item.status === 'completed') {
    DB.reopenItem(itemId);
    renderAll();
    UI.toast('Marked as not completed.');
  } else {
    openCompleteModal(itemId);
  }
}

// ============================================================
//  DETAIL MODAL
// ============================================================
function openDetail(itemId) {
  const item = DB.getItemById(itemId);
  if (!item) return;
  const content = document.getElementById('detail-content');
  content.innerHTML = UI.renderDetail(item);

  // Back
  content.querySelector('#detail-back-btn').addEventListener('click', () => {
    UI.closeModal('modal-detail');
  });

  // Edit
  content.querySelector('#detail-edit-btn').addEventListener('click', () => {
    UI.closeModal('modal-detail');
    openItemModal(itemId);
  });

  // Complete
  const completeBtn = content.querySelector('#detail-complete-btn');
  if (completeBtn) {
    completeBtn.addEventListener('click', () => {
      UI.closeModal('modal-detail');
      openCompleteModal(itemId);
    });
  }

  // Reopen
  const reopenBtn = content.querySelector('#detail-reopen-btn');
  if (reopenBtn) {
    reopenBtn.addEventListener('click', () => {
      DB.reopenItem(itemId);
      UI.closeModal('modal-detail');
      renderAll();
      UI.toast('Dream reopened.');
    });
  }

  UI.openModal('modal-detail');
}

// ============================================================
//  CATEGORY MODAL
// ============================================================
const CAT_COLORS = [
  '#8E9AAF','#A3B18A','#C9A96E','#B69AC0','#7C9EB2',
  '#C98B8B','#BDB08E','#8FBCB0','#7AAD7A','#C0814B',
  '#A0A0A0','#D4A5A5',
];

function openCategoryModal() {
  document.getElementById('cat-name').value = '';
  // Build colour picker
  const picker = document.getElementById('cat-color-picker');
  picker.innerHTML = CAT_COLORS.map((c, i) =>
    `<span class="color-dot ${i === 0 ? 'selected' : ''}" style="background:${c}" data-color="${c}"></span>`
  ).join('');
  picker.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      picker.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
      dot.classList.add('selected');
    });
  });
  UI.openModal('modal-category');
  setTimeout(() => document.getElementById('cat-name').focus(), 320);
}

function saveCategory() {
  const name = document.getElementById('cat-name').value.trim();
  if (!name) { UI.toast('Add a category name.'); return; }
  const selected = document.querySelector('#cat-color-picker .color-dot.selected');
  const color = selected ? selected.dataset.color : '#A3B18A';
  DB.addCategory(name, color);
  UI.closeModal('modal-category');
  renderCategories();
  // Also refresh category selects
  UI.populateCategorySelect(document.getElementById('item-category'));
  UI.toast('Category added.');
}

// ============================================================
//  MODAL SETUP (delegates)
// ============================================================
function setupModals() {
  // Save item
  document.getElementById('btn-save-item').addEventListener('click', saveItem);
  // Delete item
  document.getElementById('btn-delete-item').addEventListener('click', () => {
    const id = document.getElementById('item-id').value;
    if (!id) return;
    if (confirm('Delete this dream?')) {
      DB.deleteItem(id);
      UI.closeModal('modal-item');
      renderAll();
      UI.toast('Dream deleted.');
    }
  });
  // Save complete
  document.getElementById('btn-save-complete').addEventListener('click', saveComplete);
  // Save category
  document.getElementById('btn-save-category').addEventListener('click', saveCategory);

  // Close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => UI.closeAllModals());
  });

  // Backdrop taps
  document.querySelectorAll('.modal-backdrop').forEach(bd => {
    bd.addEventListener('click', () => UI.closeAllModals());
  });

  // Enter key in item title
  document.getElementById('item-title').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveItem();
  });
}

// ============================================================
//  INSTALL BANNER (iOS)
// ============================================================
function showInstallBanner() {
  const screen = document.getElementById('screen-today');
  const banner = document.createElement('div');
  banner.className = 'install-banner';
  banner.id = 'install-banner';
  banner.innerHTML = `
    <p>Add Someday to your Home Screen for the full app experience.</p>
    <button class="install-banner-close" id="dismiss-install">✕</button>
  `;
  // Insert after today-header
  const header = screen.querySelector('.today-header');
  if (header) header.after(banner);
  else screen.prepend(banner);

  document.getElementById('dismiss-install').addEventListener('click', () => {
    banner.remove();
    localStorage.setItem('someday_install_dismissed', '1');
  });
}

// ============================================================
//  BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', init);
