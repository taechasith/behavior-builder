// utils used everywhere (Python1-level: functions, simple objects)

function rid(n = 16){
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a).map(b => b.toString(16).padStart(2,"0")).join("");
}

async function sha256Hex(text){
  const buf = new TextEncoder().encode(text);
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2,"0")).join("");
}

function esc(s){
  const map = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
  return String(s).replace(/[&<>"']/g, ch => map[ch]);
}

function aboveActionLine(m, a){ return m >= (12 - a); }

function todayISO(){ return new Date().toISOString().slice(0,10); }
