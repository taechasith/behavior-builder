// FBM SVG graph with time-aware color, path, optional sequence #

function drawGraph(rootSvg, entries, opts, detailsEl){
  const svg = rootSvg; svg.innerHTML="";
  const W=420,H=420,m=36, x=a=> m+(a/10)*(W-2*m), y=v=> H-m-(v/10)*(H-2*m);

  // axes
  svg.appendChild(line(m,H-m,W-m,H-m,"#94a3b8",1.2));
  svg.appendChild(line(m,H-m,m,m,"#94a3b8",1.2));
  svg.appendChild(txt(W/2,H-6,"Ability ➜","middle"));
  svg.appendChild(txt(12,H/2,"Motivation ▲","middle",-90));

  // action line
  const d=[]; for(let a=0;a<=10;a+=.25){ d.push(`${d.length?"L":"M"} ${x(a)} ${y(Math.max(0,12-a))}`); }
  const path=document.createElementNS("http://www.w3.org/2000/svg","path");
  path.setAttribute("d",d.join(" ")); path.setAttribute("stroke","#f59e0b"); path.setAttribute("stroke-width","2");
  path.setAttribute("fill","none"); path.setAttribute("stroke-dasharray","5,4"); svg.appendChild(path);

  if(!entries.length) return;

  // path
  if(opts.showPath && entries.length>1){
    const p=document.createElementNS("http://www.w3.org/2000/svg","path");
    p.setAttribute("d", entries.map((e,i)=>`${i?"L":"M"} ${x(e.ability)} ${y(e.motivation)}`).join(" "));
    p.setAttribute("stroke","#60a5fa"); p.setAttribute("stroke-width","1.6"); p.setAttribute("fill","none"); p.setAttribute("opacity",".8");
    svg.appendChild(p);
  }

  const N=entries.length;
  entries.forEach((e,i)=>{
    const success = aboveActionLine(e.motivation,e.ability);
    const t=(i+1)/N;
    const color = e.did==="yes" && success ? `hsl(${130+20*t},60%,${35+25*t}%)`
                 : success ? `hsl(${45+10*t},85%,${45+10*t}%)` : "#475569";
    const c = dot(x(e.ability), y(e.motivation), 5, color);
    c.dataset.i = String(i+1);
    c.dataset.date = e.dateISO; c.dataset.time = e.time;
    c.dataset.m = e.motivation; c.dataset.a = e.ability; c.dataset.did = e.did;
    c.addEventListener("mouseenter", ()=> detailsEl.innerHTML = detailHTML(c));
    c.addEventListener("click", ()=> detailsEl.innerHTML = detailHTML(c));
    svg.appendChild(c);

    if(opts.showSeq){
      const n = txt(x(e.ability)+8, y(e.motivation)-8, String(i+1), "start");
      n.setAttribute("font-size","10"); n.setAttribute("fill","#c7d2fe"); svg.appendChild(n);
    }
  });

  function detailHTML(c){
    return `<strong>#${c.dataset.i}</strong> • ${c.dataset.date} ${c.dataset.time} &nbsp; | &nbsp; M:${c.dataset.m} A:${c.dataset.a} &nbsp; | &nbsp; Did: ${c.dataset.did.toUpperCase()}`;
  }
  function line(x1,y1,x2,y2,st,w){const el=NS("line"); attr(el,{x1,y1,x2,y2,stroke:st,"stroke-width":w}); return el;}
  function txt(xv,yv,t,anc="start",rot=0){const el=NS("text"); attr(el,{x:xv,y:yv,"text-anchor":anc,fill:"#E5E7EB","font-size":12}); if(rot) el.setAttribute("transform",`rotate(${rot} ${xv} ${yv})`); el.textContent=t; return el;}
  function dot(cx,cy,r,f){const el=NS("circle"); attr(el,{cx,cy,r,fill:f}); el.style.transition="r .12s ease"; el.addEventListener("mouseenter",()=>el.setAttribute("r","7")); el.addEventListener("mouseleave",()=>el.setAttribute("r","5")); return el;}
  function NS(n){return document.createElementNS("http://www.w3.org/2000/svg",n)} function attr(el,o){for(const k in o){el.setAttribute(k,o[k]);}}
}
