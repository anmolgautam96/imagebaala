let ndImg=null;

const ndDrop = document.getElementById('ndDrop');
const ndInput = document.getElementById('ndInput');
ndDrop.addEventListener('click', ()=>ndInput.click());
ndDrop.addEventListener('dragover', e=>{e.preventDefault();ndDrop.classList.add('drag');});
ndDrop.addEventListener('dragleave', ()=>ndDrop.classList.remove('drag'));
ndDrop.addEventListener('drop', e=>{ e.preventDefault();ndDrop.classList.remove('drag'); if(e.dataTransfer.files[0]) handleNdFile(e.dataTransfer.files[0]); });
ndInput.addEventListener('change', e=>{ if(e.target.files[0]) handleNdFile(e.target.files[0]); });

async function handleNdFile(file){
  const err = validateFile(file);
  const area = document.getElementById('ndWorkArea');
  if(err){ area.innerHTML = `<div class="note error-note">⚠️ ${err}</div>`; return; }
  const {img} = await loadImage(file);
  ndImg = img;
  buildNdWorkspace();
}

function buildNdWorkspace(){
  setStep(1);
  const area = document.getElementById('ndWorkArea');
  area.innerHTML = `
    <div class="grid-2">
      <div>
        <div class="preview-stage" id="ndPreview" style="min-height:260px;"></div>
      </div>
      <div>
        <div class="panel">
          <label class="field-label">Name</label>
          <input type="text" class="text-input" id="ndName" placeholder="e.g. Rahul Kumar" style="margin-bottom:12px;">
          <label class="field-label">Date</label>
          <input type="text" class="text-input" id="ndDate" placeholder="DD/MM/YYYY">
        </div>
        <div class="panel">
          <label class="field-label">Position</label>
          <div class="chip-row" id="ndPosition">
            <button class="chip" data-v="top-left">Top Left</button>
            <button class="chip" data-v="top-right">Top Right</button>
            <button class="chip" data-v="bottom-left">Bottom Left</button>
            <button class="chip active" data-v="bottom-right">Bottom Right</button>
            <button class="chip" data-v="bottom-bar">Bottom Bar</button>
          </div>
        </div>
        <div class="panel">
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            <select class="text-input" id="ndFont" style="flex:1;min-width:110px;">
              <option value="Segoe UI, sans-serif">Default</option>
              <option value="Georgia, serif">Serif</option>
              <option value="'Courier New', monospace">Mono</option>
            </select>
            <input type="number" class="text-input" id="ndFontSize" value="22" min="10" max="60" style="width:70px;">
            <input type="color" id="ndFontColor" value="#ffffff" style="width:44px;border:none;border-radius:8px;">
          </div>
          <label style="display:flex;align-items:center;gap:8px;margin-top:14px;font-size:13.5px;">
            <input type="checkbox" id="ndBgToggle" checked> Text background strip
          </label>
        </div>
      </div>
    </div>
    <div class="download-bar">
      <button class="btn-primary" id="ndDownloadBtn">Download Photo</button>
    </div>
    <div class="note" id="ndNote" style="display:none;"></div>
  `;

  document.getElementById('ndPosition').addEventListener('click', e=>{
    if(!e.target.classList.contains('chip')) return;
    [...e.currentTarget.children].forEach(c=>c.classList.remove('active'));
    e.target.classList.add('active');
    updateNdPreview();
  });
  ['ndName','ndDate','ndFont','ndFontSize','ndFontColor','ndBgToggle'].forEach(id=>{
    document.getElementById(id).addEventListener('input', updateNdPreview);
  });
  document.getElementById('ndDownloadBtn').addEventListener('click', downloadNd);
  updateNdPreview();
}

function buildNdCanvas(){
  const maxDim = 1400;
  let w = ndImg.naturalWidth, h = ndImg.naturalHeight;
  if(w > maxDim){ h = h * (maxDim/w); w = maxDim; }
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(ndImg, 0, 0, w, h);

  const name = document.getElementById('ndName').value.trim();
  const date = document.getElementById('ndDate').value.trim();
  const pos = document.querySelector('#ndPosition .active')?.dataset.v || 'bottom-right';
  const font = document.getElementById('ndFont').value;
  const size = parseInt(document.getElementById('ndFontSize').value,10) || 22;
  const color = document.getElementById('ndFontColor').value;
  const showBg = document.getElementById('ndBgToggle').checked;
  if(!name && !date) return canvas;

  const line1 = name, line2 = date;
  ctx.font = `600 ${size}px ${font}`;
  const pad = Math.round(size*0.6);

  if(pos === 'bottom-bar'){
    const barH = size*2 + pad*2;
    if(showBg){ ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0, h-barH, w, barH); }
    ctx.fillStyle = color; ctx.textAlign='center';
    ctx.font = `600 ${size}px ${font}`;
    ctx.fillText(line1, w/2, h - barH + size + pad*0.3);
    ctx.font = `${Math.max(10,size-6)}px ${font}`;
    ctx.fillText(line2, w/2, h - pad*0.6);
  } else {
    ctx.font = `600 ${size}px ${font}`;
    const textW = Math.max(ctx.measureText(line1).width, ctx.measureText(line2).width);
    const boxW = textW + pad*2, boxH = size*2 + pad*1.6;
    let bx,by;
    if(pos==='top-left'){ bx=pad; by=pad; }
    if(pos==='top-right'){ bx=w-boxW-pad; by=pad; }
    if(pos==='bottom-left'){ bx=pad; by=h-boxH-pad; }
    if(pos==='bottom-right'){ bx=w-boxW-pad; by=h-boxH-pad; }
    if(showBg){ ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(bx,by,boxW,boxH); }
    ctx.fillStyle = color; ctx.textAlign='left';
    ctx.font = `600 ${size}px ${font}`;
    ctx.fillText(line1, bx+pad*0.5, by+size+pad*0.4);
    ctx.font = `${Math.max(10,size-6)}px ${font}`;
    ctx.fillText(line2, bx+pad*0.5, by+size*1.9);
  }
  return canvas;
}

function updateNdPreview(){
  const canvas = buildNdCanvas();
  const prev = document.getElementById('ndPreview');
  prev.innerHTML=''; canvas.style.maxHeight='360px'; canvas.style.borderRadius='8px';
  prev.appendChild(canvas);
}

function downloadNd(){
  const canvas = buildNdCanvas();
  canvas.toBlob(blob=>{
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'photo-with-name-date.jpg';
    a.click();
    const note = document.getElementById('ndNote');
    note.style.display='block';
    note.textContent = '✅ Downloaded.';
    setStep(3);
  }, 'image/jpeg', 0.95);
}