/* === core: accounts, prefs, store (no backend) ====================== */
const ACCOUNTS_KEY = "fbmAccounts_v3";
const CURRENT_KEY  = "fbmCurrentUser_v1";            // {userId}
const PREFS_KEY    = uid => `fbmPrefs_v2_${uid}`;    // per-user prefs
const STORE_KEY    = (uid, session) => `${session ? "S" : "L"}_fbmStore_v5_${uid}`;

const DEFAULT_PREFS = {
  focusMode: true,
  blindHistory: true,
  privateSession: false,
  showPath: true,
  showSeq: false,
  graphDays: 14,
  selectedBehaviorId: null
};

function rid(n = 16) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(str) {
  const buf = new TextEncoder().encode(str);
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function storageOf(session) {
  return session ? sessionStorage : localStorage;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, m => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
  ));
}

function loadAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || []; }
  catch { return []; }
}
function saveAccounts(list) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
}

function getCurrent() {
  try {
    const cur = JSON.parse(localStorage.getItem(CURRENT_KEY));
    if (!cur) return null;
    const acc = loadAccounts().find(a => a.userId === cur.userId);
    return acc || null;
  } catch { return null; }
}
function setCurrent(user) {
  localStorage.setItem(CURRENT_KEY, JSON.stringify({ userId: user.userId }));
}
function signOut() {
  localStorage.removeItem(CURRENT_KEY);
  location.href = "login.html";
}

function getPrefs(uid) {
  try { return { ...DEFAULT_PREFS, ...(JSON.parse(localStorage.getItem(PREFS_KEY(uid))) || {}) }; }
  catch { return { ...DEFAULT_PREFS }; }
}
function setPrefs(uid, prefs) {
  localStorage.setItem(PREFS_KEY(uid), JSON.stringify(prefs));
}

function getStore(uid, prefs) {
  const s = storageOf(!!prefs.privateSession);
  try {
    return JSON.parse(s.getItem(STORE_KEY(uid, !!prefs.privateSession))) || { behaviors: [], entries: [] };
  } catch { return { behaviors: [], entries: [] }; }
}
function setStore(uid, prefs, store) {
  const s = storageOf(!!prefs.privateSession);
  s.setItem(STORE_KEY(uid, !!prefs.privateSession), JSON.stringify(store));
}

/* === models === */
class Behavior {
  constructor(id, title, anchor = "", tiny = "") {
    this.id = id; this.title = title; this.anchor = anchor; this.tiny = tiny;
    this.createdAt = new Date().toISOString();
  }
}
class Entry {
  constructor(id, behaviorId, datetimeISO, m, a, did, note = "") {
    this.id = id; this.behaviorId = behaviorId; this.datetimeISO = datetimeISO;
    this.dateISO = datetimeISO.slice(0, 10);
    this.time = new Date(datetimeISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    this.motivation = m; this.ability = a; this.did = did; this.note = note;
  }
}
function aboveActionLine(m, a) { return m >= (12 - a); }

/* === guards === */
function requireAuth() {
  const u = getCurrent();
  if (!u) { location.href = "login.html"; throw new Error("No auth"); }
  return u;
}

/* expose on window */
window.FBMCore = {
  // utils
  rid, sha256Hex, esc, storageOf,
  // accounts
  loadAccounts, saveAccounts, getCurrent, setCurrent, signOut, requireAuth,
  // prefs/store
  getPrefs, setPrefs, getStore, setStore,
  // models
  Behavior, Entry, aboveActionLine
};
