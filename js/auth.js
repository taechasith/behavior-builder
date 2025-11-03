// minimal auth: device-local accounts + optional PIN (hashed)

let current = null; // {userId,name,email,pinHash,privateSession}

(function boot(){
  const onLogin = location.pathname.endsWith("/login.html") || location.pathname.endsWith("login.html");
  if(onLogin){ renderLogin(); return; }

  // guard: redirect to login if no session info in sessionStorage
  const raw = sessionStorage.getItem("fbmCurrent");
  if(!raw){ location.href = "login.html"; return; }
  current = JSON.parse(raw);

  // header badges (if exist)
  const badge = document.getElementById("userBadge");
  if(badge){ badge.textContent = `User: ${current.name}`; }

  // buttons
  const signOutBtn = document.getElementById("signOutBtn");
  if(signOutBtn){
    signOutBtn.onclick = () => { sessionStorage.removeItem("fbmCurrent"); location.href = "login.html"; };
  }
})();

async function renderLogin(){
  const list = document.getElementById("accounts");
  const toggle = document.getElementById("privateToggle");
  toggle.onclick = ()=> toggle.classList.toggle("off");
  toggle.onkeydown = (e)=>{ if(e.key===" "||e.key==="Enter"){ e.preventDefault(); toggle.classList.toggle("off"); } };

  const accounts = getAccounts();
  list.innerHTML = accounts.length? "" : `<div class="item"><div>No users yet. Create one below.</div></div>`;
  accounts.forEach(acc=>{
    const li = document.createElement("div"); li.className="item";
    li.innerHTML = `<div><strong>${esc(acc.name)}</strong><div class="muted">${esc(acc.email||"")}</div></div>
    <div style="display:flex;gap:6px">
      <button class="icon-btn" title="Use">Use</button>
      <button class="icon-btn" title="Delete">🗑</button>
    </div>`;
    const [useBtn, delBtn] = li.querySelectorAll("button");
    useBtn.onclick = async ()=>{
      if(acc.pinHash){
        const pin = prompt("Enter PIN:")||"";
        const h = await sha256Hex(pin);
        if(h!==acc.pinHash){ alert("Wrong PIN"); return; }
      }
      sessionStorage.setItem("fbmCurrent", JSON.stringify(acc));
      location.href = "dashboard.html";
    };
    delBtn.onclick = ()=>{
      if(!confirm(`Delete user "${acc.name}" and all local data?`)) return;
      localStorage.removeItem(storeKey(acc.userId,false));
      sessionStorage.removeItem(storeKey(acc.userId,true));
      localStorage.removeItem(prefsKey(acc.userId));
      saveAccounts(accounts.filter(a=>a.userId!==acc.userId));
      renderLogin();
    };
    list.appendChild(li);
  });

  document.getElementById("createBtn").onclick = async ()=>{
    const name = document.getElementById("name").value.trim();
    if(!name){ alert("Enter a name"); return; }
    const email = document.getElementById("email").value.trim();
    const pinRaw = document.getElementById("pin").value.trim();
    const pinHash = pinRaw? await sha256Hex(pinRaw) : null;
    const privateSession = !toggle.classList.contains("off");
    const acc = { userId: rid(), name, email, pinHash, privateSession, createdAt:new Date().toISOString() };
    const all = getAccounts(); all.push(acc); saveAccounts(all);

    // init store & prefs
    writeStore(acc.userId, privateSession, {behaviors:[], entries:[]});
    writePrefs(acc.userId, {graphDays:14, showPath:true, showSeq:false});

    sessionStorage.setItem("fbmCurrent", JSON.stringify(acc));
    location.href = "dashboard.html";
  };

  document.getElementById("guestBtn").onclick = ()=>{
    const acc = { userId:`guest_${rid(8)}`, name:"Guest", email:"", pinHash:null, privateSession:true, createdAt:new Date().toISOString() };
    writeStore(acc.userId, true, {behaviors:[], entries:[]});
    writePrefs(acc.userId, {graphDays:14, showPath:true, showSeq:false});
    sessionStorage.setItem("fbmCurrent", JSON.stringify(acc));
    location.href = "dashboard.html";
  };
}
