// ============================================================
//  SOMEDAY — Data Layer (localStorage)
// ============================================================

const DB = {
  ITEMS_KEY:      'someday_items',
  CATS_KEY:       'someday_categories',
  SETTINGS_KEY:   'someday_settings',

  // ---- Helpers ----
  _read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  },
  _readObj(key, def = {}) {
    try { return JSON.parse(localStorage.getItem(key)) || def; }
    catch { return def; }
  },
  _write(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },
  _id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  // ---- Settings ----
  getSettings() {
    return this._readObj(this.SETTINGS_KEY, { name: 'Your' });
  },
  saveSettings(obj) {
    const s = { ...this.getSettings(), ...obj };
    this._write(this.SETTINGS_KEY, s);
    return s;
  },

  // ---- Categories ----
  getCategories() {
    return this._read(this.CATS_KEY);
  },
  addCategory(name, color = '#A3B18A') {
    const cats = this.getCategories();
    const cat = { id: this._id(), name, color, createdAt: Date.now() };
    cats.push(cat);
    this._write(this.CATS_KEY, cats);
    return cat;
  },
  deleteCategory(id) {
    const cats = this.getCategories().filter(c => c.id !== id);
    this._write(this.CATS_KEY, cats);
    // Move items in that category to "Uncategorised"
    const items = this.getItems();
    items.forEach(item => { if (item.categoryId === id) item.categoryId = null; });
    this._write(this.ITEMS_KEY, items);
  },
  getCategoryById(id) {
    return this.getCategories().find(c => c.id === id) || null;
  },
  ensureDefaultCategories() {
    if (this.getCategories().length > 0) return;
    const defaults = [
      { name: 'Travel',            color: '#8E9AAF' },
      { name: 'Adventure',         color: '#A3B18A' },
      { name: 'Food & Drink',      color: '#C9A96E' },
      { name: 'Personal Growth',   color: '#B69AC0' },
      { name: 'Career',            color: '#7C9EB2' },
      { name: 'Relationships',     color: '#C98B8B' },
      { name: 'Creative',          color: '#BDB08E' },
      { name: 'Wellness',          color: '#8FBCB0' },
      { name: 'Nature',            color: '#7AAD7A' },
      { name: 'Once-in-a-Lifetime',color: '#C0814B' },
    ];
    defaults.forEach(d => this.addCategory(d.name, d.color));
  },

  // ---- Items ----
  getItems() {
    return this._read(this.ITEMS_KEY);
  },
  saveItem(data) {
    const items = this.getItems();
    if (data.id) {
      const idx = items.findIndex(i => i.id === data.id);
      if (idx >= 0) { items[idx] = { ...items[idx], ...data, updatedAt: Date.now() }; }
    } else {
      const item = {
        id: this._id(),
        title: '',
        notes: '',
        categoryId: null,
        status: 'not_started',
        priority: 'medium',
        targetDate: '',
        location: '',
        completedAt: null,
        memory: '',
        completedWith: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...data,
      };
      items.unshift(item);
    }
    this._write(this.ITEMS_KEY, items);
    return data.id ? items.find(i => i.id === data.id) : items[0];
  },
  getItemById(id) {
    return this.getItems().find(i => i.id === id) || null;
  },
  deleteItem(id) {
    const items = this.getItems().filter(i => i.id !== id);
    this._write(this.ITEMS_KEY, items);
  },
  completeItem(id, { memory, completedWith, completedAt }) {
    const items = this.getItems();
    const idx = items.findIndex(i => i.id === id);
    if (idx < 0) return;
    items[idx].status      = 'completed';
    items[idx].completedAt  = completedAt || Date.now();
    items[idx].memory       = memory || '';
    items[idx].completedWith= completedWith || '';
    items[idx].updatedAt    = Date.now();
    this._write(this.ITEMS_KEY, items);
    return items[idx];
  },
  reopenItem(id) {
    const items = this.getItems();
    const idx = items.findIndex(i => i.id === id);
    if (idx < 0) return;
    items[idx].status       = 'not_started';
    items[idx].completedAt  = null;
    items[idx].memory       = '';
    items[idx].completedWith= '';
    items[idx].updatedAt    = Date.now();
    this._write(this.ITEMS_KEY, items);
    return items[idx];
  },

  // ---- Stats ----
  getStats() {
    const items = this.getItems();
    const total     = items.length;
    const completed = items.filter(i => i.status === 'completed').length;
    const planned   = items.filter(i => i.status === 'planned').length;
    const pct       = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, planned, pct };
  },

  // ---- Export / Import ----
  exportJSON() {
    return JSON.stringify({
      items:      this.getItems(),
      categories: this.getCategories(),
      settings:   this.getSettings(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  },
  importJSON(jsonStr) {
    const data = JSON.parse(jsonStr);
    if (data.items)      this._write(this.ITEMS_KEY, data.items);
    if (data.categories) this._write(this.CATS_KEY,  data.categories);
    if (data.settings)   this._write(this.SETTINGS_KEY, data.settings);
  },
};
