let ppEngine=null, ppSrcImg=null, ppBg='#ffffff';

const ppDrop = document.getElementById('ppDrop');
const ppInput = document.getElementById('ppInput');

ppDrop.addEventListener('click', ()=>ppInput.click());
ppDrop.addEventListener('dragover', e=>{e.preventDefault();ppDrop.classList.add('drag');});
ppDrop.addEventListener('dragleave', ()=>ppDrop.classList.remove('drag'));
ppDrop.addEventListener('drop', e=>{ e.preventDefault();ppDrop.classList.remove('drag'); if(e.dataTransfer.files[0]) handlePpFile(e.dataTransfer.files[0]); });
ppInput.addEventListener('change', e=>{ if(e.target.files[0]) handlePpFile(e.target.files[0]); });

async function handlePpFile(file){
  const err = validateFile(file);
  const area = document.getElementById('ppWorkArea');
  if(err){ area.innerHTML = `<div class="note error-note">⚠️ ${err}</div>`; return; }
  const {img} = await loadImage(file);
  ppSrcImg = img;
  buildPpWorkspace();
}

function buildPpWorkspace(){
  setStep(1);
  const area = document.getElementById('ppWorkArea');
  area.innerHTML = `
    <div class="grid-2">
      <div>
        <div id="ppStageContainer"></div>
        <div class="chip-row" style="margin-top:12px;">
          <button class="icon-round" id="ppRotate" title="Rotate">↻</button>
          <button class="icon-round" id="ppFlipH" title="Flip">⇋</button>
        </div>
        <label class="field-label" style="margin-top:14px;">Zoom</label>
        <input type="range" id="ppZoom" min="100" max="220" value="100">
      </div>
      <div>
        <div class="panel">
          <label class="field-label">Backdrop Color</label>
          <div class="chip-row">
            <div class="color-swatch active" style="background:#ffffff;border:1px solid var(--line);" data-c="#ffffff"></div>
            <div class="color-swatch" style="background:#2f6fed;" data-c="#2f6fed"></div>
            <div class="color-swatch" style="background:#d9dbe0;" data-c="#d9dbe0"></div>
          </div>
        </div>
        <div class="panel">
          <label class="field-label">Brightness — <span class="mono-tag" id="ppBriLabel">100%</span></label>
          <input type="range" id="ppBrightness" min="60" max="140" value="100">
          <label class="field-label" style="margin-top:12px;">Contrast — <span class="mono-tag" id="ppConLabel">100%</span></label>
          <input type="range" id="ppContrast" min="60" max="140" value="100">
        </div>
        <div class="panel">
          <label class="field-label">Full Name</label>
          <input type="text" class="text-input" id="ppName" placeholder="e.g. Rahul Kumar" style="margin-bottom:12px;">
          <label class="field-label">Date of Birth</label>
          <input type="text" class="text-input" id="ppDob" placeholder="DD/MM/YYYY">
          <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
            <select class="text-input" id="ppFont" style="flex:1;">
              <option value="Segoe UI, sans-serif">Default</option>
              <option value="Georgia, serif">Serif</option>
              <option value="'Courier New', monospace">Mono</option>
            </select>
            <input type="number" class="text-input" id="ppFontSize" value="16" style="width:70px;" min="10" max="28">
            <input type="color" id="ppFontColor" value="#1c2130" style="width:44px;border:none;border-radius:8px;">
          </div>
        </div>
      </div>
    </div>
    <div class="preview-stage" id="ppFinalPreview" style="margin-top:16px;min-height:220px;"></div>
    <div class="download-bar">
      <button class="btn-primary" id="ppDownloadJpg">Download as JPG</button>
      <button class="btn-secondary" id="ppDownloadPng">Download as PNG</button>
    </div>
    <div class="note" id="ppNote" style="display:none;"></div>
  `;

  ppEngine = createCropEngine('ppStageContainer', { aspect:1.2857, onUpdate: updatePpPreview });
  ppEngine.setImage(ppSrcImg);
  ppEngine.setAspect(1.2857);

  document.querySelectorAll('#ppWorkArea .color-swatch').forEach(sw=>{
    sw.addEventListener('click', ()=>{
      document.querySelectorAll('#ppWorkArea .color-swatch').forEach(s=>s.classList.remove('active'));
      sw.classList.add('active'); ppBg = sw.dataset.c; updatePpPreview();
    });
  });
  document.getElementById('ppRotate').addEventListener('click', ()=>ppEngine.rotate());
  document.getElementById('ppFlipH').addEventListener('click', ()=>ppEngine.flip('h'));
  document.getElementById('ppZoom').addEventListener('input', e=>ppEngine.setZoom(e.target.value/100));
  document.getElementById('ppBrightness').addEventListener('input', e=>{ document.getElementById('ppBriLabel').textContent=e.target.value+'%'; updatePpPreview(); });
  document.getElementById('ppContrast').addEventListener('input', e=>{ document.getElementById('ppConLabel').textContent=e.target.value+'%'; updatePpPreview(); });
  ['ppName','ppDob','ppFont','ppFontSize','ppFontColor'].forEach(id=>{
    document.getElementById(id).addEventListener('input', updatePpPreview);
  });
  document.getElementById('ppDownloadJpg').addEventListener('click', ()=>downloadPassport('jpg'));
  document.getElementById('ppDownloadPng').addEventListener('click', ()=>downloadPassport('png'));
  updatePpPreview();
}

function buildPassportCanvas(){
  const photoCanvas = ppEngine.getCroppedCanvas(350, 450);
  const bri = document.getElementById('ppBrightness').value;
  const con = document.getElementById('ppContrast').value;
  const name = document.getElementById('ppName').value.trim();
  const dob = document.getElementById('ppDob').value.trim();
  const font = document.getElementById('ppFont').value;
  const fontSize = parseInt(document.getElementById('ppFontSize').value,10) || 16;
  const fontColor = document.getElementById('ppFontColor').value;

  const captionH = (name || dob) ? 64 : 0;
  const border = 14;
  const out = document.createElement('canvas');
  out.width = photoCanvas.width + border*2;
  out.height = photoCanvas.height + border*2 + captionH;
  const ctx = out.getContext('2d');
  ctx.fillStyle = ppBg;
  ctx.fillRect(0,0,out.width,out.height);
  ctx.filter = `brightness(${bri}%) contrast(${con}%)`;
  ctx.drawImage(photoCanvas, border, border);
  ctx.filter='none';
  ctx.strokeStyle = 'rgba(0,0,0,.15)';
  ctx.strokeRect(border, border, photoCanvas.width, photoCanvas.height);
  if(captionH){
    ctx.fillStyle = fontColor;
    ctx.textAlign='center';
    ctx.font = `bold ${fontSize}px ${font}`;
    ctx.fillText(name, out.width/2, out.height - captionH + 26);
    ctx.font = `${Math.max(10,fontSize-3)}px ${font}`;
    ctx.fillText(dob, out.width/2, out.height - captionH + 48);
  }
  return out;
}

function updatePpPreview(){
  if(!ppEngine) return;
  const canvas = buildPassportCanvas();
  const prev = document.getElementById('ppFinalPreview');
  prev.innerHTML=''; canvas.style.maxHeight='320px'; canvas.style.borderRadius='6px'; canvas.style.boxShadow='0 8px 24px -8px rgba(0,0,0,.3)';
  prev.appendChild(canvas);
}

function downloadPassport(fmt){
  const canvas = buildPassportCanvas();
  const mime = fmt==='png' ? 'image/png' : 'image/jpeg';
  canvas.toBlob(blob=>{
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `passport-photo.${fmt==='png'?'png':'jpg'}`;
    a.click();
    const note = document.getElementById('ppNote');
    note.style.display='block';
    note.textContent = '✅ Downloaded. Nothing was uploaded to any server.';
    setStep(3);
  }, mime, 0.95);
}