// Dashboard wiring: behaviors, graph, history, export/import

(function(){
  // get session/current
  const raw = sessionStorage.getItem("fbmCurrent"); if(!raw){ location.href="login.html"; return; }
  const acc = JSON.parse(raw);
  const prefs = readPrefs(acc.userId) || {graphDays:14, showPath:true, showSeq:false};
  let store = readStore(acc.userId, acc.privateSession);

  const behaviorList = document.getElementById("behaviorList");
  const addBtn = document.getElementById("addBehaviorBtn");
  const svg = document.getElementById("fbmGraph");
  const details = document.getElementById("pointDetails");
  const historyBody = document.getElementById("historyBody");
  const rangeDays = document.getElementById("rangeDays");
  const daysVal = document.getElementById("daysVal");
  const showPathChk = document.getElementById("showPathChk");
  const showSeqChk = document.getElementById("showSeqChk");

  // init sliders
  rangeDays.value = prefs.graphDays; daysVal.textContent = prefs.graphDays;
  showPathChk.checked = !!prefs.showPath; showSeqChk.checked = !!prefs.showSeq;

  function renderBehaviors(){
    behaviorList.innerHTML="";
    if(!store.behaviors.length){
      const li=document.createElement("li"); li.className="item"; li.innerHTML="<div>No behaviors yet</div>";
      behaviorList.appendChild(li); return;
    }
    store.behaviors.sort((a,b)=> new Date(a.createdAt)-new Date(b.createdAt));
    store.behaviors.forEach(b=>{
      const li=document.createElement("li"); li.className="item";
      li.innerHTML = `<div><strong>${esc(b.title)}</strong><div class="muted">${esc(b.anchor||"No anchor")}</div></div>
      <div style="display:flex;gap:6px">
        <button class="icon-btn">Select</button><button class="icon-btn">✏</button><button class="icon-btn">🗑</button>
      </div>`;
      const [selectBtn, editBtn, delBtn] = li.querySelectorAll("button");
      selectBtn.onclick = ()=>{ state.selectedBehaviorId=b.id; refresh(); };
      editBtn.onclick = ()=>{
        const title = prompt("Title", b.title); if(!title) return;
        const anchor=prompt("Anchor", b.anchor||"")||""; const tiny=prompt("Tiny (≤2m)", b.tiny||"")||"";
        b.title=title; b.anchor=anchor; b.tiny=tiny; writeStore(acc.userId, acc.privateSession, store); refresh();
      };
      delBtn.onclick = ()=>{
        if(!confirm(`Delete "${b.title}" and its entries?`)) return;
        store.entries = store.entries.filter(e=> e.behaviorId!==b.id);
        store.behaviors = store.behaviors.filter(x=> x.id!==b.id);
        writeStore(acc.userId, acc.privateSession, store); if(state.selectedBehaviorId===b.id) state.selectedBehaviorId=null; refresh();
      };
      behaviorList.appendChild(li);
    });
  }

  const state = { selectedBehaviorId: store.behaviors[0]?.id || null };

  function refresh(){
    // history
    renderHistory(historyBody, store, state.selectedBehaviorId);

    // graph data filter by days + behavior
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - (parseInt(rangeDays.value,10)-1));
    const list = store.entries
      .filter(e=> (!state.selectedBehaviorId || e.behaviorId===state.selectedBehaviorId) && new Date(e.dateISO) >= cutoff)
      .sort((a,b)=> a.datetimeISO.localeCompare(b.datetimeISO));

    drawGraph(svg, list, {showPath:showPathChk.checked, showSeq:showSeqChk.checked}, details);
  }

  // add behavior
  addBtn.onclick = ()=>{
    const title = prompt("New behavior title (e.g., Read 1 page)"); if(!title) return;
    const anchor = prompt("Anchor (After I ..., I will ...)") || "";
    const tiny = prompt("Tiny version (≤2 minutes)") || "";
    const id = rid(); store.behaviors.push(new Behavior(id,title,anchor,tiny)); state.selectedBehaviorId=id;
    writeStore(acc.userId, acc.privateSession, store); renderBehaviors(); refresh();
  };

  // export
  document.getElementById("exportBtn").onclick = ()=>{
    const csv = buildEntriesCSV(acc.userId, store, {includeNotes:true, meta:true});
    const name = `fbm_entries_${acc.name.replace(/\s+/g,"_")}_${new Date().toISOString().replace(/[:.]/g,"-")}.csv`;
    saveText(csv, name, "text/csv");
  };

  // import
  const importBtn = document.getElementById("importBtn");
  const importFile = document.getElementById("importFile");
  importBtn.onclick = ()=> importFile.click();
  importFile.onchange = (ev)=>{
    const f=ev.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload = ()=>{
      try{
        const txt=r.result;
        let data=null; try{ data=JSON.parse(txt); }catch(_){}
        if(data && data.behaviors && data.entries){
          store.behaviors=data.behaviors; store.entries=data.entries;
        }else{
          // CSV append (assumes our header)
          const rows = txt.split(/\r?\n/).filter(Boolean); const header=rows.shift().split(",");
          const idx = Object.fromEntries(header.map((h,i)=>[h,i]));
          rows.forEach(line=>{
            const cols = parseCSV(line);
            store.entries.push(new Entry(
              rid(),
              cols[idx["behavior_id"]],
              cols[idx["datetime"]] || new Date(`${cols[idx["date"]]}T${(cols[idx["time"]]||"00:00")}:00`).toISOString(),
              parseInt(cols[idx["motivation"]],10),
              parseInt(cols[idx["ability"]],10),
              (cols[idx["did"]]||"no").toLowerCase()==="yes"?"yes":"no",
              cols[idx["note"]]||""
            ));
          });
        }
        writeStore(acc.userId, acc.privateSession, store); renderBehaviors(); refresh(); alert("Import complete.");
      }catch{ alert("Import failed."); }
      importFile.value="";
    };
    r.readAsText(f);
  };
  function parseCSV(line){
    const out=[]; let cur="",q=false;
    for(let i=0;i<line.length;i++){ const ch=line[i];
      if(q){ if(ch=='"' && line[i+1]=='"'){ cur+='"'; i++; } else if(ch=='"'){ q=false; } else cur+=ch; }
      else { if(ch=='"'){ q=true; } else if(ch==','){ out.push(cur); cur=""; } else cur+=ch; }
    } out.push(cur); return out;
  }

  // controls
  rangeDays.oninput = ()=>{ daysVal.textContent=rangeDays.value; prefs.graphDays=parseInt(rangeDays.value,10); writePrefs(acc.userId,prefs); refresh(); };
  showPathChk.onchange = ()=>{ prefs.showPath=showPathChk.checked; writePrefs(acc.userId,prefs); refresh(); };
  showSeqChk.onchange = ()=>{ prefs.showSeq=showSeqChk.checked; writePrefs(acc.userId,prefs); refresh(); };

  // first paint
  renderBehaviors(); refresh();
})();
