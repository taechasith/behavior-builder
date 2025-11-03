// local/session stores + simple models

const ACCOUNTS_KEY = "fbmAccounts_v3";

function storageOf(privateSession){ return privateSession ? sessionStorage : localStorage; }

function getAccounts(){
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || []; } catch { return []; }
}
function saveAccounts(list){ localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list)); }

function storeKey(uid, priv){ return `${priv?"S":"L"}_fbmStore_v5_${uid}`; }
function prefsKey(uid){ return `fbmPrefs_${uid}`; }

function readPrefs(uid){
  try { return JSON.parse(localStorage.getItem(prefsKey(uid))) || null; } catch { return null; }
}
function writePrefs(uid, obj){
  localStorage.setItem(prefsKey(uid), JSON.stringify(obj));
}

function readStore(uid, priv){
  const s = storageOf(priv);
  try { return JSON.parse(s.getItem(storeKey(uid, priv))) || {behaviors:[], entries:[]}; } catch { return {behaviors:[], entries:[]}; }
}
function writeStore(uid, priv, data){
  storageOf(priv).setItem(storeKey(uid, priv), JSON.stringify(data));
}

class Behavior{
  constructor(id, title, anchor, tiny){
    this.id=id; this.title=title; this.anchor=anchor||""; this.tiny=tiny||""; this.createdAt=new Date().toISOString();
  }
}
class Entry{
  constructor(id, behaviorId, dtISO, m, a, did, note){
    this.id=id; this.behaviorId=behaviorId; this.datetimeISO=dtISO;
    this.dateISO=dtISO.slice(0,10); this.time=new Date(dtISO).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
    this.motivation=m; this.ability=a; this.did=did; this.note=note||"";
  }
}
