// exporting, importing, history, and small helpers

function buildEntriesCSV(userId, store, opts){
  const header = ["user_id","behavior_id","behavior_title","date","time","datetime","motivation","ability","did","did_numeric","note","anchor","tiny"];
  const lines=[header.join(",")];
  const bMap = new Map(store.behaviors.map(b=>[b.id,b]));
  store.entries.forEach(e=>{
    const b=bMap.get(e.behaviorId);
    const didNum = e.did==="yes"?1:0;
    const row = [
      userId, e.behaviorId, csvEsc(b?.title||""), e.dateISO, e.time, e.datetimeISO, e.motivation, e.ability,
      e.did, didNum, csvEsc(opts.includeNotes? e.note||"" : ""), csvEsc(opts.meta? (b?.anchor||""):""), csvEsc(opts.meta? (b?.tiny||""):"")
    ];
    lines.push(row.join(","));
  });
  return lines.join("\n");
}
function csvEsc(s){ return /[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g,'""')}"` : String(s); }

function saveText(text, name, mime){ const blob=new Blob([text],{type:mime}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; a.click(); }

function renderHistory(tbody, store, behaviorId){
  tbody.innerHTML="";
  const rows = store.entries
    .filter(e=> !behaviorId || e.behaviorId===behaviorId)
    .sort((a,b)=> b.datetimeISO.localeCompare(a.datetimeISO))
    .slice(0,200);

  rows.forEach(e=>{
    const tr=document.createElement("tr");
    tr.innerHTML = `<td>${e.dateISO}</td><td>${e.time}</td><td>${e.motivation}</td><td>${e.ability}</td><td>${e.did}</td><td>${esc(e.note||"")}</td>`;
    tbody.appendChild(tr);
  });
}
