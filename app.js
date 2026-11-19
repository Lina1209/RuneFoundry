(()=>{"use strict";
const $=id=>document.getElementById(id),KEY="runefoundry-project-v3",MAX=5*1024*1024;
const alphabets={latin:[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"],cyrillic:[..."АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ"],digits:[..."0123456789"]};
const state={glyphs:{},active:"A",alphabet:"latin"},pad=$("pad"),ctx=pad.getContext("2d");let drawing=false,stroke=[],timer;
function paths(){return state.glyphs[state.active]||[]}
function bg(){ctx.fillStyle="#f2eee6";ctx.fillRect(0,0,640,640);ctx.strokeStyle="#ded8cc";ctx.lineWidth=1;ctx.setLineDash([6,9]);ctx.beginPath();ctx.moveTo(320,24);ctx.lineTo(320,616);ctx.moveTo(24,320);ctx.lineTo(616,320);ctx.stroke();ctx.setLineDash([]);ctx.strokeRect(48,48,544,544)}
function draw(){bg();[...paths(),...(stroke.length?[stroke]:[])].forEach(p=>{if(p.length<2)return;ctx.beginPath();ctx.moveTo(...p[0]);p.slice(1).forEach(q=>ctx.lineTo(...q));ctx.strokeStyle="#28222e";ctx.lineWidth=+$("strokeWidth").value||5;ctx.lineCap=ctx.lineJoin="round";ctx.stroke()});$("currentGlyph").textContent=$("propSymbol").textContent=state.active;$("propStrokes").textContent=paths().length;$("propStatus").textContent=paths().length?"Есть рисунок":"Пустой";$("widthValue").textContent=$("strokeWidth").value}
function point(e){let r=pad.getBoundingClientRect();return [Math.max(0,Math.min(640,(e.clientX-r.left)*640/r.width)),Math.max(0,Math.min(640,(e.clientY-r.top)*640/r.height))]}
pad.addEventListener("pointerdown",e=>{drawing=true;stroke=[point(e)];pad.setPointerCapture(e.pointerId);draw()});
pad.addEventListener("pointermove",e=>{if(!drawing)return;let p=point(e),q=stroke.at(-1);if(!q||Math.hypot(p[0]-q[0],p[1]-q[1])>1)stroke.push(p);draw()});
function finish(){if(!drawing)return;drawing=false;if(stroke.length===1)stroke.push([...stroke[0]]);if(stroke.length>1){(state.glyphs[state.active]||= []).push(stroke);saveSoon()}stroke=[];draw();grid()}
pad.addEventListener("pointerup",finish);pad.addEventListener("pointercancel",finish);pad.addEventListener("lostpointercapture",finish);
function select(c){if(!c||[...c].length>8)return;state.active=c;$("glyphName").value=c;draw();grid()}
function grid(){let el=$("glyphGrid");el.replaceChildren();alphabets[state.alphabet].forEach(c=>{let n=(state.glyphs[c]||[]).length,b=document.createElement("button");b.className="glyph-cell"+(n?" done":"")+(c===state.active?" selected":"");let s=document.createElement("b"),t=document.createElement("small");s.textContent=c;t.textContent=n?`${n} штрих.`:"пусто";b.append(s,t);b.onclick=()=>{select(c);nav("glyph")};el.append(b)});$("mappingCount").textContent=Object.values(state.glyphs).filter(x=>x.length).length+" символов заполнено"}
function nav(v){let target=$("view-"+v);if(!target)return;document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x===target));document.querySelectorAll("[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view===v));history.replaceState(null,"","#"+v);$("sidebar").classList.remove("open")}
document.querySelectorAll("[data-go]").forEach(x=>x.onclick=()=>nav(x.dataset.go));document.querySelectorAll("[data-view]").forEach(x=>x.onclick=e=>{e.preventDefault();nav(x.dataset.view)});$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");
$("glyphName").onchange=e=>{let c=e.target.value.trim();if(!c||[...c].length>8){alert("Введите символ длиной от 1 до 8 знаков");e.target.value=state.active;return}select(c);saveSoon()};
$("strokeWidth").oninput=draw;$("undoBtn").onclick=()=>{paths().pop();draw();grid();saveSoon()};$("clearBtn").onclick=()=>{if(confirm("Очистить рисунок?")){state.glyphs[state.active]=[];draw();grid();saveSoon()}};
$("alphabetTabs").onclick=e=>{let t=e.target.closest("[data-alphabet]");if(!t)return;state.alphabet=t.dataset.alphabet;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===t));grid()};
$("sampleText").oninput=()=>$("previewText").textContent=$("sampleText").value;$("insertAlphabet").onclick=()=>{$("sampleText").value=alphabets[state.alphabet].join("");$("previewText").textContent=$("sampleText").value};
function payload(){return {app:"RuneFoundry",version:3,savedAt:new Date().toISOString(),glyphs:state.glyphs}}
function saveSoon(){$("autosaveStatus").textContent="Сохранение…";clearTimeout(timer);timer=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(payload()));$("autosaveStatus").textContent="Автосохранено"}catch{$("autosaveStatus").textContent="Автосохранение недоступно"}},300)}
function validate(d){if(!d||typeof d!=="object"||Array.isArray(d)||!d.glyphs||typeof d.glyphs!=="object"||Array.isArray(d.glyphs))throw Error("Неверная структура проекта");let entries=Object.entries(d.glyphs);if(entries.length>512)throw Error("Слишком много глифов");let result={};for(let [k,strokes] of entries){if(!k||[...k].length>8||!Array.isArray(strokes)||strokes.length>300)throw Error("Неверная запись глифа");result[k]=strokes.map(s=>{if(!Array.isArray(s)||s.length<2||s.length>5000)throw Error("Неверный штрих");return s.map(p=>{if(!Array.isArray(p)||p.length!==2)throw Error("Неверная точка");let x=Number(p[0]),y=Number(p[1]);if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>640||y<0||y>640)throw Error("Координаты за пределами поля");return [x,y]})})}return result}
function dl(blob,name){let u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1200)}
$("saveBtn").onclick=()=>dl(new Blob([JSON.stringify(payload(),null,2)],{type:"application/json"}),"runefoundry-project.json");
$("loadFile").onchange=async e=>{let f=e.target.files[0];if(!f)return;try{if(f.size>MAX)throw Error("Файл больше 5 МБ");let g=validate(JSON.parse(await f.text()));state.glyphs=g;select(Object.keys(g)[0]||"A");grid();saveSoon();alert("Проект проверен и загружен")}catch(err){alert("Не удалось загрузить: "+err.message+". Текущая работа не изменена")}finally{e.target.value=""}};
function esc(s){return String(s).replace(/[<>&'"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"}[c]))}
function filename(s){return [...s].map(c=>/[a-z0-9_-]/i.test(c)?c:"u"+c.codePointAt(0).toString(16)).join("")}
function svg(c){let ps=state.glyphs[c]||[],all=ps.flat();if(!all.length)return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"/>`;let xs=all.map(p=>p[0]),ys=all.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);if(maxX-minX<1){minX-=.5;maxX+=.5}if(maxY-minY<1){minY-=.5;maxY+=.5}let side=Math.max(maxX-minX,maxY-minY)+36,scale=900/side,ox=500-(minX+maxX)*scale/2,oy=500-(minY+maxY)*scale/2;let body=ps.map(p=>`<path d="${p.map((q,i)=>(i?"L":"M")+(q[0]*scale+ox).toFixed(2)+" "+(q[1]*scale+oy).toFixed(2)).join(" ")}" fill="none" stroke="#17131d" stroke-width="${Math.max(2,5*scale)}" stroke-linecap="round" stroke-linejoin="round"/>`).join("");return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><title>${esc(c)}</title>${body}</svg>`}
function png(){const source=paths();if(!source.length){alert("Сначала нарисуй знак");return}const c=document.createElement("canvas");c.width=1000;c.height=1000;const x=c.getContext("2d");x.fillStyle="#f2eee6";x.fillRect(0,0,1000,1000);const all=source.flat();const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);let minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);if(maxX-minX<1){minX-=.5;maxX+=.5}if(maxY-minY<1){minY-=.5;maxY+=.5}const scale=900/Math.max(maxX-minX,maxY-minY),ox=500-(minX+maxX)*scale/2,oy=500-(minY+maxY)*scale/2;for(const p of source){if(p.length<2)continue;x.beginPath();x.moveTo(p[0][0]*scale+ox,p[0][1]*scale+oy);p.slice(1).forEach(q=>x.lineTo(q[0]*scale+ox,q[1]*scale+oy));x.strokeStyle="#28222e";x.lineWidth=Math.max(2,(+$("#strokeWidth").value||5)*scale);x.lineCap=x.lineJoin="round";x.stroke()}c.toBlob(b=>{if(!b){alert("Не удалось создать PNG");return}dl(b,"rune-"+filename(state.active)+".png")},"image/png")}
$("#savePngBtn").onclick=png;$("#saveSvgBtn").onclick=()=>dl(new Blob([svg(state.active)],{type:"image/svg+xml"}),"rune-"+filename(state.active)+".svg");
$("exportBtn").onclick=()=>dl(new Blob([svg(state.active)],{type:"image/svg+xml"}),"rune-"+filename(state.active)+".svg");

function fontSafeName(s){return (s||"RuneFoundry").normalize("NFKD").replace(/[^a-z0-9_-]+/gi,"-").replace(/^-+|-+$/g,"")||"RuneFoundry"}
function makeFontPath(strokes,scale,minX,minY,radius){
 const path=new opentype.Path();
 const map=p=>[80+(p[0]-minX)*scale,700-(p[1]-minY)*scale];
 const polygon=pts=>{if(pts.length<3)return;let q=map(pts[0]);path.moveTo(q[0],q[1]);for(let i=1;i<pts.length;i++){q=map(pts[i]);path.lineTo(q[0],q[1])}path.close()};
 const disk=p=>{const pts=[];for(let i=0;i<16;i++){const a=2*Math.PI*i/16;pts.push([p[0]+Math.cos(a)*radius,p[1]+Math.sin(a)*radius])}polygon(pts)};
 for(const line of strokes){if(!line.length)continue;if(line.length===1){disk(line[0]);continue}for(let i=0;i<line.length;i++){disk(line[i]);if(i===0)continue;const a=line[i-1],b=line[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(len<.01)continue;const nx=-dy/len*radius,ny=dx/len*radius;polygon([[a[0]-nx,a[1]-ny],[b[0]-nx,b[1]-ny],[b[0]+nx,b[1]+ny],[a[0]+nx,a[1]+ny]])}}
 return path;
}
function exportTtf(){
 const status=$("fontStatus");try{
  if(!window.opentype?.Font||!window.opentype?.Glyph||!window.opentype?.Path)throw new Error("Не загрузился модуль генерации шрифтов. Проверь подключение к интернету и обнови страницу.");
  const family=$("fontFamily").value.trim()||"RuneFoundry";if(family.length>48)throw new Error("Название шрифта должно быть не длиннее 48 символов.");
  const glyphs=[new opentype.Glyph({name:".notdef",unicode:0,advanceWidth:700,path:new opentype.Path()}),new opentype.Glyph({name:"space",unicode:32,advanceWidth:320,path:new opentype.Path()})];
  let count=0,skipped=[];
  for(const [character,strokes] of Object.entries(state.glyphs)){
   if(!strokes?.length)continue;
   const chars=[...character];if(chars.length!==1){skipped.push(character);continue}
   const points=strokes.flat();if(!points.length)continue;
   const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
   const lineWidth=Math.max(2,+$("strokeWidth").value||5),scale=760/Math.max(1,maxX-minX+lineWidth,maxY-minY+lineWidth),radius=Math.max(1,lineWidth*scale/2);
   const path=makeFontPath(strokes,scale,minX,minY,radius);
   const code=character.codePointAt(0),name="uni"+code.toString(16).toUpperCase().padStart(4,"0");
   glyphs.push(new opentype.Glyph({name,unicode:code,advanceWidth:Math.max(420,Math.ceil((maxX-minX)*scale+160)),path}));count++;
  }
  if(!count)throw new Error("Пока нет нарисованных знаков. Сначала создай хотя бы одну букву.");
  const font=new opentype.Font({familyName:family,styleName:"Regular",unitsPerEm:1000,ascender:800,descender:-200,glyphs});
  const buffer=font.toArrayBuffer(),bytes=new Uint8Array(buffer);
  if(bytes.length<100||bytes[0]!==0||bytes[1]!==1||bytes[2]!==0||bytes[3]!==0)throw new Error("Проверка структуры TTF не пройдена. Файл не сохранён.");
  dl(new Blob([buffer],{type:"font/ttf"}),fontSafeName(family)+".ttf");
  status.textContent="Готово: создан TTF-шрифт «"+family+"» — знаков: "+count+(skipped.length?"; пропущены составные обозначения: "+skipped.join(", "):"")+".";
 }catch(err){status.textContent="Не удалось создать шрифт: "+err.message;alert(status.textContent)}
}
$("fontTtfBtn").onclick=exportTtf;

// ZIP archive writer, STORE method; no network dependency.
let table=(()=>{let t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc(b){let c=0xffffffff;for(let x of b)c=table[(c^x)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function zip(files){let enc=new TextEncoder(),local=[],central=[],off=0;for(let f of files){let n=enc.encode(f.name),d=enc.encode(f.data),c=crc(d),l=new Uint8Array(30+n.length+d.length),v=new DataView(l.buffer),u16=(p,x)=>v.setUint16(p,x,true),u32=(p,x)=>v.setUint32(p,x>>>0,true);u32(0,0x04034b50);u16(4,20);u16(6,0x800);u16(8,0);u32(14,c);u32(18,d.length);u32(22,d.length);u16(26,n.length);l.set(n,30);l.set(d,30+n.length);local.push(l);let h=new Uint8Array(46+n.length),w=new DataView(h.buffer),a=(p,x)=>w.setUint16(p,x,true),b=(p,x)=>w.setUint32(p,x>>>0,true);b(0,0x02014b50);a(4,20);a(6,20);a(8,0x800);b(16,c);b(20,d.length);b(24,d.length);a(28,n.length);b(42,off);h.set(n,46);central.push(h);off+=l.length}let size=central.reduce((s,x)=>s+x.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,size,true);v.setUint32(16,off,true);return new Blob([...local,...central,end],{type:"application/zip"})}
$("zipBtn").onclick=()=>{let fs=[{name:"runefoundry-project.json",data:JSON.stringify(payload(),null,2)},{name:"README.txt",data:"RuneFoundry project bundle: JSON and normalized SVG glyphs. Not a TTF/OTF font."}],count=0;for(let [c,p] of Object.entries(state.glyphs))if(p.length){fs.push({name:"glyphs/"+filename(c)+".svg",data:svg(c)});count++}if(!count){alert("Сначала нарисуй хотя бы один знак");return}dl(zip(fs),"runefoundry-project-bundle.zip")};
try{let raw=localStorage.getItem(KEY);if(raw)state.glyphs=validate(JSON.parse(raw)),$("autosaveStatus").textContent="Последний проект восстановлен"}catch{$("autosaveStatus").textContent="Не удалось восстановить автосохранение"}
let hash=location.hash.slice(1);if(hash)nav(hash);$("previewText").textContent=$("sampleText").value;grid();draw();
if("serviceWorker"in navigator&&location.protocol.startsWith("http"))addEventListener("load",async()=>{try{let r=await navigator.serviceWorker.register("./sw.js");if(r.waiting)r.waiting.postMessage({type:"SKIP_WAITING"});r.addEventListener("updatefound",()=>{let w=r.installing;if(w)w.addEventListener("statechange",()=>{if(w.state==="installed"&&navigator.serviceWorker.controller)w.postMessage({type:"SKIP_WAITING"})})});let once=false;navigator.serviceWorker.addEventListener("controllerchange",()=>{if(!once){once=true;location.reload()}})}catch(e){console.warn(e)}});
})();