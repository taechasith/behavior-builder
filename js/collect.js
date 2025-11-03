// Focus-first logging page (reduces bias). After save, show gentle tip.

(function(){
  const raw = sessionStorage.getItem("fbmCurrent"); if(!raw){ location.href="login.html"; return; }
  const acc = JSON.parse(raw);
  const store = readStore(acc.userId, acc.privateSession);

  document.getElementById("today").textContent = new Date().toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});

  const sel = document.getElementById("behaviorSelect");
  const m = document.getElementById("m"), a = document.getElementById("a");
  const mVal = document.getElementById("mVal"), aVal = document.getElementById("aVal");
  const did = document.getElementById("did");
  const note = document.getElementById("note");
  const tip = document.getElementById("tip");

  // populate behaviors
  if(!store.behaviors.length){ sel.innerHTML = `<option value="">(No behaviors yet — go create one)</option>`; }
  else{
    sel.innerHTML = store.behaviors.map(b=> `<option value="${b.id}">${esc(b.title)}</option>`).join("");
  }

  m.oninput = ()=> mVal.textContent = m.value;
  a.oninput = ()=> aVal.textContent = a.value;
  did.onclick = ()=> did.classList.toggle("off");
  did.onkeydown = (e)=>{ if(e.key===" "||e.key==="Enter"){ e.preventDefault(); did.classList.toggle("off"); }};

  document.getElementById("saveBtn").onclick = ()=>{
    const behaviorId = sel.value;
    if(!behaviorId){ alert("Choose a behavior first."); return; }
    const mi = parseInt(m.value,10), ai = parseInt(a.value,10);
    const d = did.classList.contains("off") ? "no" : "yes";
    const id = rid(); const dt = new Date().toISOString();

    store.entries.push(new Entry(id, behaviorId, dt, mi, ai, d, note.value.trim()));
    writeStore(acc.userId, acc.privateSession, store);

    // neutral, autonomy-supportive tip AFTER save
    const s=[];
    if(ai<4) s.push("Shrink the step and remove friction (prep tools, 30-sec version).");
    if(mi<4 && ai>=6) s.push("Lightly boost motivation: pair with music or a small reward.");
    if(d==="no" && mi>=6 && ai>=6) s.push("Refine your anchor and make the cue obvious.");
    if(mi>=6 && ai>=6 && d==="yes") s.push("Nice! Consider a tiny progression next week.");
    tip.style.display="block"; tip.textContent = s.length? s.join(" ") : "Keep going — consistency compounds.";

    // clear inputs a bit
    note.value=""; document.getElementById("saveBtn").textContent="Saved ✓";
    setTimeout(()=> document.getElementById("saveBtn").textContent="Save today", 1100);
  };
})();
