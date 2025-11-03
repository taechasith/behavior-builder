/* ========================= Accounts & Storage ========================= */
const ACCOUNTS_KEY = "fbmAccounts_v1";
const CURRENT_USER_KEY = "fbmCurrentUserId";
const OLD_STORE_KEY = "fbmStore_v2"; // migration
function userStoreKey(uid){ return `fbmStore_v3_${uid}`; }

function getAccounts(){
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || []; }
  catch { return []; }
}
function saveAccounts(list){
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
}
function getCurrentUserId(){ return localStorage.getItem(CURRENT_USER_KEY); }
function setCurrentUserId(uid){
  if(uid) localStorage.setItem(CURRENT_USER_KEY, uid);
  else localStorage.removeItem(CURRENT_USER_KEY);
}

function loadStoreFor(uid){
  const key = userStoreKey(uid);
  try {
    return JSON.parse(localStorage.getItem(key)) || { behaviors: [], entries: [] };
  } catch {
    return { behaviors: [], entries: [] };
  }
}
function saveStoreFor(uid, store){
  localStorage.setItem(userStoreKey(uid), JSON.stringify(store));
}

function cryptoRandomId(n=16){
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function sha256Hex(text){
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

/* ========================= Data Models ========================= */
class Behavior {
  constructor(id, title, anchor, tiny){
    this.id = id;
    this.title = title;
    this.anchor = anchor || "";
    this.tiny = tiny || "";
    this.createdAt = new Date().toISOString();
  }
}
class Entry {
  constructor(id, behaviorId, dateISO, motivation, ability, did, note){
    this.id = id;
    this.behaviorId = behaviorId;
    this.dateISO = dateISO; // YYYY-MM-DD
    this.motivation = motivation; // 0..10
    this.ability = ability;       // 0..10
    this.did = did;               // "yes" | "no"
    this.note = note || "";
  }
}

/* ========================= App State ========================= */
let accounts = getAccounts();
let currentUserId = getCurrentUserId();
let store = null; // will load per user

let uiState = {
  selectedBehaviorId: null,
  editBehaviorId: null,
  historyRange: 7 // days | "all"
};

/* ========================= DOM ========================= */
const els = {
  today: document.getElementById("today"),
  currentUserBadge: document.getElementById("currentUserBadge"),
  switchUserBtn: document.getElementById("switchUserBtn"),

  behaviorList: document.getElementById("behaviorList"),
  addBehaviorBtn: document.getElementById("addBehaviorBtn"),
  behaviorModal: document.getElementById("behaviorModal"),
  behaviorModalTitle: document.getElementById("behaviorModalTitle"),
  behaviorForm: document.getElementById("behaviorForm"),
  behaviorTitle: document.getElementById("behaviorTitle"),
  behaviorAnchor: document.getElementById("behaviorAnchor"),
  behaviorTiny: document.getElementById("behaviorTiny"),

  selectedBehaviorName: document.getElementById("selectedBehaviorName"),

  motivation: document.getElementById("motivation"),
  ability: document.getElementById("ability"),
  motivationVal: document.getElementById("motivationVal"),
  abilityVal: document.getElementById("abilityVal"),
  didToggle: document.getElementById("didToggle"),
  note: document.getElementById("note"),
  saveEntryBtn: document.getElementById("saveEntryBtn"),
  suggestionBox: document.getElementById("suggestionBox"),

  svg: document.getElementById("fbmGraph"),
  historyTableBody: document.querySelector("#historyTable tbody"),
  filterBtns: Array.from(document.querySelectorAll(".filter-btn")),

  exportOptionsBtn: document.getElementById("exportOptionsBtn"),
  exportModal: document.getElementById("exportModal"),
  exportForm: document.getElementById("exportForm"),
  optCSV: document.getElementById("optCSV"),
  optJSON: document.getElementById("optJSON"),
  optNotes: document.getElementById("optNotes"),
  optBehaviorMeta: document.getElementById("optBehaviorMeta"),
  doExportBtn: document.getElementById("doExportBtn"),

  importBtn: document.getElementById("importBtn"),
  importFile: document.getElementById("importFile"),

  resetBtn: document.getElementById("resetBtn"),
  confirmModal: document.getElementById("confirmModal"),
  cancelReset: document.getElementById("cancelReset"),
  confirmReset: document.getElementById("confirmReset"),

  loginModal: document.getElementById("loginModal"),
  accountList: document.getElementById("accountList"),
  newUserName: document.getElementById("newUserName"),
  newUserEmail: document.getElementById("newUserEmail"),
  newUserPin: document.getElementById("newUserPin"),
  cancelLogin: document.getElementById("cancelLogin"),
  createUserBtn: document.getElementById("createUserBtn"),

  pinModal: document.getElementById("pinModal"),
  pinPrompt: document.getElementById("pinPrompt"),
  pinInput: document.getElementById("pinInput"),
  cancelPin: document.getElementById("cancelPin"),
  confirmPin: document.getElementById("confirmPin"),
};

let pendingUnlockUserId = null;

/* ========================= Init ========================= */
init();

function init(){
  displayToday();
  migrateIfNeeded();
  if(!currentUserId || !accounts.find(a=>a.userId===currentUserId)){
    openLoginModal();
  }else{
    loadUser(currentUserId);
  }
  wireGlobalHandlers();
}

/* ========================= Migration from old single-user store ========================= */
function migrateIfNeeded(){
  if(accounts.length === 0){
    const old = localStorage.getItem(OLD_STORE_KEY);
    if(old){
      const userId = cryptoRandomId();
      const newAcc = { userId, name: "Imported User", email: "", pinHash: null, createdAt: new Date().toISOString(), studyId: "" };
      accounts = [newAcc];
      saveAccounts(accounts);
      localStorage.setItem(userStoreKey(userId), old);
      setCurrentUserId(userId);
      currentUserId = userId;
      localStorage.removeItem(OLD_STORE_KEY);
    }
  }
}

/* ========================= User load / UI ========================= */
function loadUser(uid){
  currentUserId = uid;
  setCurrentUserId(uid);
  store = loadStoreFor(uid);
  if(!store || !store.behaviors) store = { behaviors: [], entries: [] };
  uiState.selectedBehaviorId = store.behaviors[0]?.id || null;
  updateUserBadge();
  renderBehaviors();
  refreshCenterAndRight();
}

function updateUserBadge(){
  const acc = accounts.find(a=>a.userId===currentUserId);
  els.currentUserBadge.textContent = `User: ${acc ? acc.name : "—"}`;
}

/* ========================= Login / Accounts ========================= */
function openLoginModal(){
  renderAccountList();
  els.loginModal.showModal();
}

function renderAccountList(){
  els.accountList.innerHTML = "";
  const list = accounts.slice().sort((a,b)=> (a.createdAt||"").localeCompare(b.createdAt||""));
  if(list.length === 0){
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "No users yet. Create one below.";
    els.accountList.appendChild(empty);
    return;
  }
  list.forEach(acc=>{
    const card = document.createElement("div");
    card.className = "account-card";
    const left = document.createElement("div");
    left.innerHTML = `<strong>${escapeHtml(acc.name)}</strong><br><span class="muted">${escapeHtml(acc.email||"")}</span>`;

    const right = document.createElement("div");
    right.className = "account-actions";
    const useBtn = document.createElement("button");
    useBtn.className = "btn small primary";
    useBtn.textContent = "Use";
    useBtn.addEventListener("click", ()=> selectAccount(acc.userId));

    const delBtn = document.createElement("button");
    delBtn.className = "btn small danger";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", ()=>{
      if(!confirm(`Delete user "${acc.name}" and all local data?`)) return;
      // remove user store and account
      localStorage.removeItem(userStoreKey(acc.userId));
      accounts = accounts.filter(a=>a.userId!==acc.userId);
      saveAccounts(accounts);
      if(currentUserId === acc.userId){
        setCurrentUserId(null);
        currentUserId = null;
      }
      renderAccountList();
    });

    right.append(useBtn, delBtn);
    card.append(left, right);
    els.accountList.appendChild(card);
  });
}

function wireGlobalHandlers(){
  // login modal actions
  els.cancelLogin.addEventListener("click", ()=> els.loginModal.close());
  els.createUserBtn.addEventListener("click", createUser);
  els.switchUserBtn.addEventListener("click", openLoginModal);

  // pin modal actions
  els.cancelPin.addEventListener("click", ()=> { pendingUnlockUserId=null; els.pinModal.close(); });
  els.confirmPin.addEventListener("click", confirmPin);

  // behavior modal
  els.addBehaviorBtn.addEventListener("click", () => openBehaviorModal());
  els.behaviorForm.addEventListener("submit", onSaveBehavior);

  // sliders
  els.motivation.addEventListener("input", ()=> els.motivationVal.textContent = els.motivation.value);
  els.ability.addEventListener("input", ()=> els.abilityVal.textContent = els.ability.value);

  // did toggle
  els.didToggle.addEventListener("click", toggleDid);
  els.didToggle.addEventListener("keydown", (e)=>{
    if(e.key===" "||e.key==="Enter"){ e.preventDefault(); toggleDid(); }
  });

  // save entry
  els.saveEntryBtn.addEventListener("click", saveEntry);

  // export
  els.exportOptionsBtn.addEventListener("click", ()=> els.exportModal.showModal());
  els.doExportBtn.addEventListener("click", doExport);

  // import
  els.importBtn.addEventListener("click", ()=> els.importFile.click());
  els.importFile.addEventListener("change", importData);

  // reset
  els.resetBtn.addEventListener("click", ()=> els.confirmModal.showModal());
  els.cancelReset.addEventListener("click", ()=> els.confirmModal.close());
  els.confirmReset.addEventListener("click", doReset);

  // filters
  els.filterBtns.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      els.filterBtns.forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      const r = btn.getAttribute("data-range");
      uiState.historyRange = (r==="all") ? "all" : parseInt(r,10);
      renderHistory();
    });
  });
}

async function selectAccount(uid){
  const acc = accounts.find(a=>a.userId===uid);
  if(!acc) return;
  if(acc.pinHash){
    pendingUnlockUserId = uid;
    els.pinPrompt.textContent = `Enter PIN for ${acc.name}`;
    els.pinInput.value = "";
    els.pinModal.showModal();
  }else{
    els.loginModal.close();
    loadUser(uid);
  }
}

async function confirmPin(){
  const pin = els.pinInput.value || "";
  const acc = accounts.find(a=>a.userId===pendingUnlockUserId);
  if(!acc){ els.pinModal.close(); return; }
  const hash = await sha256Hex(pin);
  if(hash === acc.pinHash){
    els.pinModal.close();
    els.loginModal.close();
    loadUser(acc.userId);
    pendingUnlockUserId = null;
  }else{
    alert("Wrong PIN.");
  }
}

async function createUser(){
  const name = (els.newUserName.value||"").trim();
  const email = (els.newUserEmail.value||"").trim();
  const pin = (els.newUserPin.value||"").trim();
  if(!name){ alert("Please enter a display name."); return; }
  const userId = cryptoRandomId();
  const pinHash = pin ? await sha256Hex(pin) : null;
  const acc = { userId, name, email, pinHash, createdAt: new Date().toISOString(), studyId: "" };
  accounts.push(acc);
  saveAccounts(accounts);
  els.newUserName.value = ""; els.newUserEmail.value = ""; els.newUserPin.value = "";

  // initialize empty store
  saveStoreFor(userId, { behaviors: [], entries: [] });

  // use it
  els.loginModal.close();
  loadUser(userId);
}

/* ========================= Header ========================= */
function displayToday(){
  const d = new Date();
  els.today.textContent = d.toLocaleDateString(undefined, {year:"numeric",month:"short",day:"numeric"});
}

/* ========================= Behaviors ========================= */
function renderBehaviors(){
  els.behaviorList.innerHTML = "";
  if(store.behaviors.length === 0){
    const li = document.createElement("li");
    li.className = "beh-item";
    li.innerHTML = `<div>No behaviors yet</div><div></div>`;
    els.behaviorList.appendChild(li);
    return;
  }

  store.behaviors
    .slice()
    .sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt))
    .forEach(b=>{
      const li = document.createElement("li");
      li.className = "beh-item";
      li.tabIndex = 0;

      const left = document.createElement("div");
      left.innerHTML = `<strong>${escapeHtml(b.title)}</strong><br/>
        <span class="muted">${escapeHtml(b.anchor || "No anchor")}</span>`;

      const right = document.createElement("div");
      right.className = "beh-actions";
      const selectBtn = document.createElement("button");
      selectBtn.className = "icon-btn";
      selectBtn.title = "Select";
      selectBtn.textContent = "✅";
      selectBtn.addEventListener("click", ()=>{
        uiState.selectedBehaviorId = b.id;
        refreshCenterAndRight();
        highlightSelected(li);
      });

      const editBtn = document.createElement("button");
      editBtn.className = "icon-btn";
      editBtn.title = "Edit";
      editBtn.textContent = "✏️";
      editBtn.addEventListener("click", ()=> openBehaviorModal(b));

      const delBtn = document.createElement("button");
      delBtn.className = "icon-btn";
      delBtn.title = "Delete";
      delBtn.textContent = "🗑️";
      delBtn.addEventListener("click", ()=>{
        if(confirm(`Delete behavior "${b.title}" and its entries?`)){
          store.entries = store.entries.filter(e=> e.behaviorId !== b.id);
          store.behaviors = store.behaviors.filter(x=> x.id !== b.id);
          saveStoreFor(currentUserId, store);
          if(uiState.selectedBehaviorId === b.id) uiState.selectedBehaviorId = null;
          renderBehaviors();
          refreshCenterAndRight();
        }
      });

      right.append(selectBtn, editBtn, delBtn);
      li.append(left, right);
      li.addEventListener("click", (e)=>{
        if(e.target.closest(".icon-btn")) return;
        uiState.selectedBehaviorId = b.id;
        refreshCenterAndRight();
        highlightSelected(li);
      });
      els.behaviorList.appendChild(li);

      if(uiState.selectedBehaviorId === b.id) highlightSelected(li);
    });
}

function highlightSelected(li){
  Array.from(els.behaviorList.children).forEach(n=> n.style.outline = "none");
  li.style.outline = "3px solid rgba(59,130,246,.25)";
}

function openBehaviorModal(behavior){
  uiState.editBehaviorId = behavior ? behavior.id : null;
  els.behaviorModalTitle.textContent = behavior ? "Edit Behavior" : "Add Behavior";
  els.behaviorTitle.value  = behavior ? behavior.title  : "";
  els.behaviorAnchor.value = behavior ? behavior.anchor : "";
  els.behaviorTiny.value   = behavior ? behavior.tiny   : "";
  els.behaviorModal.showModal();
  setTimeout(()=> els.behaviorTitle.focus(), 10);
}

function onSaveBehavior(e){
  e.preventDefault();
  const title  = els.behaviorTitle.value.trim();
  const anchor = els.behaviorAnchor.value.trim();
  const tiny   = els.behaviorTiny.value.trim();
  if(!title){ alert("Please provide a title."); return; }

  if(uiState.editBehaviorId){
    const b = store.behaviors.find(x=> x.id === uiState.editBehaviorId);
    if(b){ b.title = title; b.anchor = anchor; b.tiny = tiny; }
  }else{
    const id = cryptoRandomId();
    store.behaviors.push(new Behavior(id, title, anchor, tiny));
    uiState.selectedBehaviorId = id;
  }
  saveStoreFor(currentUserId, store);
  els.behaviorModal.close();
  renderBehaviors();
  refreshCenterAndRight();
}

/* ========================= Daily Log ========================= */
function toggleDid(){
  const off = els.didToggle.classList.toggle("off");
  els.didToggle.setAttribute("aria-pressed", String(!off));
  els.didToggle.textContent = off ? "No" : "Yes";
}

function saveEntry(){
  if(!uiState.selectedBehaviorId){ alert("Select a behavior first."); return; }
  const m = parseInt(els.motivation.value, 10);
  const a = parseInt(els.ability.value, 10);
  if(Number.isNaN(m) || Number.isNaN(a)){ alert("Set Motivation and Ability."); return; }

  const did = els.didToggle.classList.contains("off") ? "no" : "yes";
  const note = els.note.value.trim();
  const id = cryptoRandomId();
  const dateISO = new Date().toISOString().slice(0,10);

  store.entries.push(new Entry(id, uiState.selectedBehaviorId, dateISO, m, a, did, note));
  saveStoreFor(currentUserId, store);

  els.saveEntryBtn.disabled = true;
  els.saveEntryBtn.textContent = "Saved ✓";
  setTimeout(()=>{ els.saveEntryBtn.disabled=false; els.saveEntryBtn.textContent="Save today"; }, 1200);

  showSuggestions(m, a, did);
  renderHistory();
  drawGraph();
}

/* ========================= Suggestions ========================= */
function showSuggestions(m, a, did){
  const tips = [];

  if(a < 4) tips.push("Make it tiny and remove friction (prep tools, pre-open app, 30-sec version).");
  if(m < 4 && a >= 6) tips.push("Boost motivation: pair with music, small reward, or a vivid ‘why’. ");
  if(did === "no" && m >= 6 && a >= 6) tips.push("Refine the prompt: attach to a strong anchor, place a visible cue.");
  if(m >= 6 && a >= 6 && did === "yes") tips.push("Great! Consider nudging difficulty slightly next week.");
  const recent = store.entries.filter(e=> e.behaviorId === uiState.selectedBehaviorId).slice(-3);
  if(recent.length === 3 && recent.every(e=> e.did === "no")){
    tips.push("Reset tiny scope (halve it) and isolate one barrier to fix.");
  }

  els.suggestionBox.textContent = tips.length ? tips.join(" ") : "Keep going — consistency compounds.";
  els.suggestionBox.classList.remove("hidden");
}

/* ========================= Graph (SVG) ========================= */
function drawGraph(){
  const svg = els.svg;
  svg.innerHTML = "";

  const W = 420, H = 420, m = 36;
  const toX = a => m + (a/10)*(W-2*m);
  const toY = v => H - m - (v/10)*(H-2*m);

  // axes
  const axes = [
    line(m, H-m, W-m, H-m, "#94a3b8", 1.2), // x
    line(m, H-m, m,   m,   "#94a3b8", 1.2)  // y
  ];
  axes.forEach(el=> svg.appendChild(el));

  // labels
  svg.appendChild(text(W/2, H-6, "Ability ➜", "middle"));
  svg.appendChild(text(12, H/2, "Motivation ▲", "middle", -90));

  // action line (threshold = 12 - ability)
  const d = [];
  for(let a=0;a<=10;a+=0.25){
    const mot = Math.max(0, 12 - a);
    d.push(`${d.length?"L":"M"} ${toX(a)} ${toY(mot)}`);
  }
  const path = document.createElementNS("http://www.w3.org/2000/svg","path");
  path.setAttribute("d", d.join(" "));
  path.setAttribute("stroke", "#f59e0b");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke-dasharray", "5,4");
  svg.appendChild(path);

  // points
  const points = store.entries
    .filter(e=> !uiState.selectedBehaviorId || e.behaviorId === uiState.selectedBehaviorId)
    .slice(-300);

  points.forEach(e=>{
    const cx = toX(e.ability), cy = toY(e.motivation);
    const successZone = aboveActionLine(e.motivation, e.ability);
    const color = e.did === "yes" ? (successZone ? "#16a34a" : "#f59e0b") : "#475569";
    const c = circle(cx, cy, 5, color);
    c.setAttribute("opacity", ".9");
    c.title = `${e.dateISO} • M:${e.motivation} A:${e.ability} • ${e.did.toUpperCase()}`;
    svg.appendChild(c);
  });

  function line(x1,y1,x2,y2,stroke="#000",w=1){
    const el = document.createElementNS("http://www.w3.org/2000/svg","line");
    el.setAttribute("x1", x1); el.setAttribute("y1", y1);
    el.setAttribute("x2", x2); el.setAttribute("y2", y2);
    el.setAttribute("stroke", stroke); el.setAttribute("stroke-width", w);
    return el;
  }
  function circle(cx,cy,r,fill){
    const el = document.createElementNS("http://www.w3.org/2000/svg","circle");
    el.setAttribute("cx", cx); el.setAttribute("cy", cy);
    el.setAttribute("r", r); el.setAttribute("fill", fill);
    el.style.transition = "r .15s ease";
    el.addEventListener("mouseenter", ()=> el.setAttribute("r","7"));
    el.addEventListener("mouseleave", ()=> el.setAttribute("r","5"));
    return el;
  }
  function text(x,y,txt,anchor="start",rotate=0){
    const el = document.createElementNS("http://www.w3.org/2000/svg","text");
    el.setAttribute("x", x); el.setAttribute("y", y);
    el.setAttribute("text-anchor", anchor);
    el.setAttribute("fill", "#334155");
    el.setAttribute("font-size", "12");
    if(rotate){ el.setAttribute("transform", `rotate(${rotate} ${x} ${y})`); }
    el.textContent = txt;
    return el;
  }
}
function aboveActionLine(m, a){
  const threshold = 12 - a;
  return m >= threshold;
}

/* ========================= History ========================= */
function renderHistory(){
  const body = els.historyTableBody;
  body.innerHTML = "";

  let rows = store.entries
    .filter(e=> !uiState.selectedBehaviorId || e.behaviorId === uiState.selectedBehaviorId)
    .sort((a,b)=> b.dateISO.localeCompare(a.dateISO));

  if(uiState.historyRange !== "all"){
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - uiState.historyRange + 1);
    const cISO = cutoff.toISOString().slice(0,10);
    rows = rows.filter(e=> e.dateISO >= cISO);
  }

  rows.slice(0, 100).forEach(e=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.dateISO}</td>
      <td>${e.motivation}</td>
      <td>${e.ability}</td>
      <td>${e.did}</td>
      <td>${escapeHtml(e.note || "")}</td>
    `;
    body.appendChild(tr);
  });
}

/* ========================= Export / Import ========================= */
function doExport(e){
  e.preventDefault();
  const includeCSV = els.optCSV.checked;
  const includeJSON = els.optJSON.checked;
  const includeNotes = els.optNotes.checked;
  const includeBehaviorMeta = els.optBehaviorMeta.checked;

  if(!includeCSV && !includeJSON){ alert("Select at least one format."); return; }

  const acc = accounts.find(a=>a.userId===currentUserId);
  const uname = (acc?.name || "user").replace(/\s+/g,"_");
  const stamp = new Date().toISOString().replace(/[:.]/g,"-");

  if(includeCSV){
    const csv = buildEntriesCSV({ includeNotes, includeBehaviorMeta, userId: currentUserId });
    downloadText(csv, `fbm_entries_${uname}_${stamp}.csv`, "text/csv");
  }
  if(includeJSON){
    const pkg = buildJSONPackage({ includeNotes, userId: currentUserId });
    downloadText(JSON.stringify(pkg, null, 2), `fbm_package_${uname}_${stamp}.json`, "application/json");
  }
  els.exportModal.close();
}

function buildEntriesCSV({ includeNotes, includeBehaviorMeta, userId }){
  const header = [
    "user_id","behavior_id","behavior_title","date","motivation","ability",
    "did","did_numeric","note","anchor","tiny"
  ];
  const lines = [header.join(",")];
  const bMap = new Map(store.behaviors.map(b=>[b.id,b]));
  store.entries.forEach(e=>{
    const b = bMap.get(e.behaviorId);
    const didNum = e.did==="yes" ? 1 : 0;
    const note = includeNotes ? (e.note || "") : "";
    const anchor = includeBehaviorMeta ? (b?.anchor || "") : "";
    const tiny = includeBehaviorMeta ? (b?.tiny || "") : "";
    const row = [
      userId,
      e.behaviorId,
      csvEsc(b?.title || ""),
      e.dateISO,
      e.motivation,
      e.ability,
      e.did,
      didNum,
      csvEsc(note),
      csvEsc(anchor),
      csvEsc(tiny)
    ];
    lines.push(row.join(","));
  });
  return lines.join("\n");
}

function buildJSONPackage({ includeNotes, userId }){
  // minimal codebook
  const codebook = {
    version: "1.0",
    variables: {
      user_id: "Anonymized local user identifier",
      behavior_id: "Unique behavior identifier",
      behavior_title: "Behavior title at time of export",
      date: "ISO date YYYY-MM-DD",
      motivation: "Self-rated 0–10",
      ability: "Self-rated 0–10",
      did: "yes/no",
      did_numeric: "1 if yes else 0",
      note: includeNotes ? "Free text note" : "Excluded",
      anchor: "Behavior prompt (optional)",
      tiny: "≤ 2 minute tiny version"
    },
    fbm_rule: "Success region approx above action line m >= (12 - a)"
  };

  const acc = accounts.find(a=>a.userId===userId);
  return {
    package_version: "1.0",
    exported_at: new Date().toISOString(),
    user: { user_id: userId, name: acc?.name || "", email: acc?.email || "" },
    codebook,
    behaviors: store.behaviors,
    entries: store.entries.map(e=>{
      const did_numeric = e.did==="yes" ? 1 : 0;
      return {
        id: e.id,
        behaviorId: e.behaviorId,
        dateISO: e.dateISO,
        motivation: e.motivation,
        ability: e.ability,
        did: e.did,
        did_numeric,
        note: includeNotes ? e.note : ""
      };
    })
  };
}

function csvEsc(s){
  const needs = /[",\n]/.test(s);
  return needs ? `"${s.replace(/"/g,'""')}"` : s;
}
function downloadText(text, filename, mime){
  const blob = new Blob([text], {type: mime});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function importData(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (evt)=>{
    try{
      const txt = evt.target.result;
      // try JSON first
      let data;
      try { data = JSON.parse(txt); } catch { data = null; }
      if(data && data.behaviors && data.entries){
        store.behaviors = data.behaviors;
        store.entries = data.entries;
        saveStoreFor(currentUserId, store);
        uiState.selectedBehaviorId = store.behaviors[0]?.id || null;
        renderBehaviors(); refreshCenterAndRight();
        alert("Imported JSON package.");
      }else{
        // treat as CSV of entries (expects header columns from our exporter)
        const rows = txt.split(/\r?\n/).filter(Boolean);
        const header = rows.shift().split(",");
        const idx = Object.fromEntries(header.map((h,i)=>[h,i]));
        const newEntries = rows.map(line=>{
          const cols = parseCSVLine(line);
          return new Entry(
            cryptoRandomId(),
            cols[idx["behavior_id"]],
            cols[idx["date"]],
            parseInt(cols[idx["motivation"]],10),
            parseInt(cols[idx["ability"]],10),
            (cols[idx["did"]]||"no").toLowerCase()==="yes"?"yes":"no",
            cols[idx["note"]] || ""
          );
        });
        // keep existing behaviors; just append entries
        store.entries.push(...newEntries);
        saveStoreFor(currentUserId, store);
        renderHistory(); drawGraph();
        alert(`Imported ${newEntries.length} CSV entries.`);
      }
    }catch{
      alert("Import failed: unsupported file.");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}
function parseCSVLine(line){
  // simple CSV parser handling quotes
  const out = [];
  let cur = "", inQ = false;
  for(let i=0;i<line.length;i++){
    const ch = line[i];
    if(inQ){
      if(ch === '"' && line[i+1] === '"'){ cur+='"'; i++; }
      else if(ch === '"'){ inQ = false; }
      else cur += ch;
    }else{
      if(ch === '"'){ inQ = true; }
      else if(ch === ','){ out.push(cur); cur=""; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/* ========================= Reset ========================= */
function doReset(){
  store = { behaviors: [], entries: [] };
  saveStoreFor(currentUserId, store);
  uiState.selectedBehaviorId = null;
  els.confirmModal.close();
  renderBehaviors();
  refreshCenterAndRight();
}

/* ========================= Utilities ========================= */
function refreshCenterAndRight(){
  if(uiState.selectedBehaviorId){
    const b = store.behaviors.find(x=> x.id === uiState.selectedBehaviorId);
    els.selectedBehaviorName.textContent = b ? b.title : "Unknown behavior";
  }else{
    els.selectedBehaviorName.textContent = "No behavior selected";
  }
  els.note.value = "";
  els.suggestionBox.classList.add("hidden");
  renderHistory();
  drawGraph();
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* ========================= End ========================= */
