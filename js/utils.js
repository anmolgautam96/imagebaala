function fmtBytes(b){
  if(b < 1024) return b + ' B';
  if(b < 1024*1024) return (b/1024).toFixed(1) + ' KB';
  return (b/1024/1024).toFixed(2) + ' MB';
}
const ALLOWED_TYPES = ['image/jpeg','image/jpg','image/png','image/webp'];
const MAX_FILE_MB = 20;
function validateFile(file){
  if(!ALLOWED_TYPES.includes(file.type)) return 'Unsupported format. Use JPG, PNG, or WEBP.';
  if(file.size > MAX_FILE_MB*1024*1024) return `File too large. Max ${MAX_FILE_MB} MB.`;
  return null;
}
function loadImage(file){
  return new Promise((resolve,reject)=>{
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>resolve({img,url});
    img.onerror = reject;
    img.src = url;
  });
}
function setStep(n){
  document.querySelectorAll('.step-pill').forEach((el,i)=>{
    el.classList.toggle('active', i<=n);
  });
}
function unitToPx(v, unit){
  const DPI=96;
  if(unit==='px') return v;
  if(unit==='in') return v*DPI;
  if(unit==='cm') return v*DPI/2.54;
  if(unit==='mm') return v*DPI/25.4;
  return v;
}

/* Shared crop engine — used by crop.js and passport.js */
function createCropEngine(containerId, opts){
  let img=null, rotation=0, flipH=1, flipV=1, zoom=1;
  let box = {x:15,y:15,w:70,h:70};
  const wrap = document.getElementById(containerId);

  function setImage(image){ img=image; rotation=0; flipH=1; flipV=1; zoom=1; box={x:15,y:15,w:70,h:70}; render(); }
  function workingCanvas(){
    const swapped = rotation % 180 !== 0;
    const c = document.createElement('canvas');
    c.width = swapped ? img.naturalHeight : img.naturalWidth;
    c.height = swapped ? img.naturalWidth : img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.translate(c.width/2, c.height/2);
    ctx.rotate(rotation*Math.PI/180);
    ctx.scale(flipH, flipV);
    ctx.drawImage(img, -img.naturalWidth/2, -img.naturalHeight/2);
    return c;
  }
  function render(){
    const wc = workingCanvas();
    wrap.innerHTML = `<div class="crop-stage-wrap" id="${containerId}_stage" style="width:${100*zoom}%;">
      <img src="${wc.toDataURL('image/jpeg',0.9)}" draggable="false">
      <div class="crop-box" id="${containerId}_box">
        <div class="crop-handle nw"></div><div class="crop-handle ne"></div>
        <div class="crop-handle sw"></div><div class="crop-handle se"></div>
      </div>
    </div>`;
    positionBox();
    attachDrag();
    if(opts.onUpdate) opts.onUpdate();
  }
  function positionBox(){
    const boxEl = document.getElementById(containerId+'_box');
    if(!boxEl) return;
    boxEl.style.left = box.x+'%'; boxEl.style.top = box.y+'%';
    boxEl.style.width = box.w+'%'; boxEl.style.height = box.h+'%';
  }
  function clampBox(){
    box.x = Math.max(0, Math.min(box.x, 100-box.w));
    box.y = Math.max(0, Math.min(box.y, 100-box.h));
    box.w = Math.max(5, Math.min(box.w, 100));
    box.h = Math.max(5, Math.min(box.h, 100));
  }
  function attachDrag(){
    const stage = document.getElementById(containerId+'_stage');
    const boxEl = document.getElementById(containerId+'_box');
    let mode=null, start=null;
    boxEl.addEventListener('pointerdown', e=>{
      mode = e.target.classList.contains('crop-handle') ? [...e.target.classList].find(c=>c!=='crop-handle') : 'move';
      start = {mx:e.clientX, my:e.clientY, box:{...box}};
      e.preventDefault();
    });
    window.addEventListener('pointermove', e=>{
      if(!mode) return;
      const rect = stage.getBoundingClientRect();
      const dx = (e.clientX-start.mx)/rect.width*100;
      const dy = (e.clientY-start.my)/rect.height*100;
      let b = {...start.box};
      if(mode==='move'){ b.x+=dx; b.y+=dy; }
      else {
        if(mode.includes('w')){ b.x=start.box.x+dx; b.w=start.box.w-dx; }
        if(mode.includes('e')){ b.w=start.box.w+dx; }
        if(mode.includes('n')){ b.y=start.box.y+dy; b.h=start.box.h-dy; }
        if(mode.includes('s')){ b.h=start.box.h+dy; }
        if(opts.aspect){ b.h = b.w / opts.aspect * (stage.offsetWidth/stage.offsetHeight); }
      }
      box = b; clampBox(); positionBox();
    });
    window.addEventListener('pointerup', ()=>{ if(mode){ mode=null; if(opts.onUpdate) opts.onUpdate(); } });
  }
  function setAspect(a){
    opts.aspect=a;
    if(a){
      const stage=document.getElementById(containerId+'_stage');
      const ratio = stage.offsetHeight/stage.offsetWidth;
      box.h = box.w*a*ratio; clampBox(); positionBox();
    }
    if(opts.onUpdate) opts.onUpdate();
  }
  function rotate(){ rotation=(rotation+90)%360; box={x:15,y:15,w:70,h:70}; render(); }
  function flip(axis){ if(axis==='h') flipH*=-1; else flipV*=-1; render(); }
  function setZoom(z){ zoom=z; render(); }
  function getCroppedCanvas(targetW, targetH){
    const wc = workingCanvas();
    const sx = box.x/100*wc.width, sy = box.y/100*wc.height;
    const sw = box.w/100*wc.width, sh = box.h/100*wc.height;
    const out = document.createElement('canvas');
    out.width = targetW || sw; out.height = targetH || sh;
    const ctx = out.getContext('2d');
    ctx.drawImage(wc, sx, sy, sw, sh, 0, 0, out.width, out.height);
    return out;
  }
  return { setImage, setAspect, rotate, flip, setZoom, getCroppedCanvas };
}