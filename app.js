/* =============== Data Models =============== */
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
const store = loadStore();

/* =============== DOM =============== */
const els = {
  today: document.getElementById("today"),
  behaviorList: document.getElementById("behaviorList"),
  addBehaviorBtn: document.getElementById("addBehaviorBtn"),
  behaviorModal: document.getElementById("behaviorModal"),
  behaviorModalTitle: document.getElementById("behaviorModalTitle"),
  behaviorForm: document.getElementById("behaviorForm"),
  behaviorTitle: document.getElementById("behaviorTitle"),
  behaviorAnchor: document.getElementById("behaviorAnchor"),
  behaviorTiny: document.getElementById("behaviorTiny"),
  saveBehaviorBtn: document.getElementById("saveBehaviorBtn"),

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

  exportBtn: document.getElementById("exportBtn"),
  importBtn: document.getElementById("importBtn"),
  importFile: document.getElementById("importFile"),
  resetBtn: document.getElementById("resetBtn"),
  confirmModal: document.getElementById("confirmModal"),
  cancelReset: document.getElementById("cancelReset"),
  confirmReset: document.getElementById("confirmReset"),
};

let uiState = {
  selectedBehaviorId: null,
  editBehaviorId: null,
  historyRange: 7 // days; or "all"
};

/* =============== Init =============== */
displayToday();
renderBehaviors();
syncBehaviorSelectionAfterRender();
wireControls();
refreshCenterAndRight();

/* =============== Store Helpers =============== */
function loadStore(){
  const raw = localStorage.getItem("fbmStore_v2");
  if(raw){
    try { return JSON.parse(raw); } catch { /* fallthrough */ }
  }
  return { behaviors: [], entries: [] };
}
function saveStore(){
  localStorage.setItem("fbmStore_v2", JSON.stringify(store));
}

/* =============== UI Wiring =============== */
function wireControls(){
  els.addBehaviorBtn.addEventListener("click", () => openBehaviorModal());
  els.behaviorForm.addEventListener("submit", onSaveBehavior);

  els.motivation.addEventListener("input", () => {
    els.motivationVal.textContent = els.motivation.value;
  });
  els.ability.addEventListener("input", () => {
    els.abilityVal.textContent = els.ability.value;
  });

  els.didToggle.addEventListener("click", toggleDid);
  els.didToggle.addEventListener("keydown", (e)=>{
    if(e.key === " " || e.key === "Enter"){ e.preventDefault(); toggleDid(); }
  });

  els.saveEntryBtn.addEventListener("click", saveEntry);

  els.exportBtn.addEventListener("click", exportData);
  els.importBtn.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", importData);

  els.resetBtn.addEventListener("click", ()=> els.confirmModal.showModal());
  els.cancelReset.addEventListener("click", ()=> els.confirmModal.close());
  els.confirmReset.addEventListener("click", doReset);

  els.filterBtns.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      els.filterBtns.forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      const r = btn.getAttribute("data-range");
      uiState.historyRange = (r === "all") ? "all" : parseInt(r,10);
      renderHistory();
    });
  });
}

/* =============== Header =============== */
function displayToday(){
  const d = new Date();
  const opts = { year:"numeric", month:"short", day:"numeric" };
  els.today.textContent = d.toLocaleDateString(undefined, opts);
}

/* =============== Behaviors =============== */
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
      editBtn.addEventListener("click", ()=>{
        openBehaviorModal(b);
      });

      const delBtn = document.createElement("button");
      delBtn.className = "icon-btn";
      delBtn.title = "Delete";
      delBtn.textContent = "🗑️";
      delBtn.addEventListener("click", ()=>{
        if(confirm(`Delete behavior "${b.title}" and its entries?`)){
          // delete entries for this behavior
          store.entries = store.entries.filter(e=> e.behaviorId !== b.id);
          // delete behavior
          store.behaviors = store.behaviors.filter(x=> x.id !== b.id);
          saveStore();
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

      // highlight if selected
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
    const id = Date.now();
    store.behaviors.push(new Behavior(id, title, anchor, tiny));
    uiState.selectedBehaviorId = id;
  }
  saveStore();
  els.behaviorModal.close();
  renderBehaviors();
  refreshCenterAndRight();
}

function syncBehaviorSelectionAfterRender(){
  if(store.behaviors.length && !uiState.selectedBehaviorId){
    uiState.selectedBehaviorId = store.behaviors[0].id;
  }
}

/* =============== Daily Log =============== */
function toggleDid(){
  const off = els.didToggle.classList.toggle("off");
  els.didToggle.setAttribute("aria-pressed", String(!off));
  els.didToggle.textContent = off ? "No" : "Yes";
}

function saveEntry(){
  if(!uiState.selectedBehaviorId){
    alert("Select a behavior first.");
    return;
  }
  const m = parseInt(els.motivation.value, 10);
  const a = parseInt(els.ability.value, 10);
  if(Number.isNaN(m) || Number.isNaN(a)){ alert("Set Motivation and Ability."); return; }

  const did = els.didToggle.classList.contains("off") ? "no" : "yes";
  const note = els.note.value.trim();
  const id = Date.now();
  const dateISO = new Date().toISOString().slice(0,10);

  store.entries.push(new Entry(id, uiState.selectedBehaviorId, dateISO, m, a, did, note));
  saveStore();

  // UX sugar
  els.saveEntryBtn.disabled = true;
  els.saveEntryBtn.textContent = "Saved ✓";
  setTimeout(()=>{
    els.saveEntryBtn.disabled = false;
    els.saveEntryBtn.textContent = "Save today";
  }, 1200);

  showSuggestions(m, a, did);
  renderHistory();
  drawGraph();
}

/* =============== Suggestions =============== */
function showSuggestions(m, a, did){
  const tips = [];

  if(a < 4) tips.push("Make it tiny and remove friction (prep tools, pre-open app, 30-sec version).");
  if(m < 4 && a >= 6) tips.push("Boost motivation: pair with music, small reward, or a vivid ‘why’. ");
  if(did === "no" && m >= 6 && a >= 6) tips.push("Refine the prompt: attach to a strong anchor, place a visible cue.");
  if(m >= 6 && a >= 6 && did === "yes") tips.push("Great! Consider nudging difficulty slightly next week.");
  // streak check: 3 most recent failures on same behavior
  const recent = store.entries
    .filter(e=> e.behaviorId === uiState.selectedBehaviorId)
    .slice(-3);
  if(recent.length === 3 && recent.every(e=> e.did === "no")){
    tips.push("Reset tiny scope (halve it) and isolate one barrier to fix.");
  }

  els.suggestionBox.textContent = tips.length ? tips.join(" ") : "Keep going — consistency compounds.";
  els.suggestionBox.classList.remove("hidden");
}

/* =============== Graph (SVG) =============== */
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
    .slice(-200); // cap for performance

  points.forEach(e=>{
    const cx = toX(e.ability), cy = toY(e.motivation);
    const successZone = aboveActionLine(e.motivation, e.ability);
    const color = e.did === "yes" ? (successZone ? "#16a34a" : "#f59e0b") : "#475569";
    const c = circle(cx, cy, 5, color);
    c.setAttribute("opacity", ".9");
    c.setAttribute("tabindex", "0");
    c.setAttribute("role", "img");
    c.setAttribute("aria-label", `${e.dateISO} M:${e.motivation} A:${e.ability} ${e.did}`);
    c.title = `${e.dateISO} • M:${e.motivation} A:${e.ability} • ${e.did.toUpperCase()}`;
    svg.appendChild(c);
  });

  // helpers
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

/* =============== History =============== */
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

  const limited = rows.slice(0, 50); // show last 50 for readability

  limited.forEach(e=>{
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

/* =============== Export / Import / Reset =============== */
function exportData(){
  const blob = new Blob([JSON.stringify(store,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "fbm-data.json";
  a.click();
}

function importData(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (evt)=>{
    try{
      const data = JSON.parse(evt.target.result);
      if(!data || !Array.isArray(data.behaviors) || !Array.isArray(data.entries)){
        alert("Invalid file structure."); return;
      }
      store.behaviors = data.behaviors;
      store.entries = data.entries;
      saveStore();
      // reset selection if necessary
      uiState.selectedBehaviorId = store.behaviors[0]?.id || null;
      renderBehaviors();
      refreshCenterAndRight();
      alert("Imported successfully.");
    }catch{
      alert("Could not parse file.");
    }
  };
  reader.readAsText(file);
  // clear value so same file can be re-imported later
  e.target.value = "";
}

function doReset(){
  store.behaviors = [];
  store.entries = [];
  saveStore();
  uiState.selectedBehaviorId = null;
  els.confirmModal.close();
  renderBehaviors();
  refreshCenterAndRight();
}

/* =============== Utilities =============== */
function refreshCenterAndRight(){
  // center panel header
  if(uiState.selectedBehaviorId){
    const b = store.behaviors.find(x=> x.id === uiState.selectedBehaviorId);
    els.selectedBehaviorName.textContent = b ? b.title : "Unknown behavior";
  }else{
    els.selectedBehaviorName.textContent = "No behavior selected";
  }
  // clear inputs (soft reset)
  els.note.value = "";
  els.suggestionBox.classList.add("hidden");
  // redraw
  renderHistory();
  drawGraph();
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
