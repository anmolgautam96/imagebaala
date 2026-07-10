let psPhotoImg=null, psSigImg=null;

function setupDrop(dropId, inputId, onFile){
  const drop = document.getElementById(dropId);
  const input = document.getElementById(inputId);
  drop.addEventListener('click', ()=>input.click());
  drop.addEventListener('dragover', e=>{e.preventDefault();drop.classList.add('drag');});
  drop.addEventListener('dragleave', ()=>drop.classList.remove('drag'));
  drop.addEventListener('drop', e=>{ e.preventDefault();drop.classList.remove('drag'); if(e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); });
  input.addEventListener('change', e=>{ if(e.target.files[0]) onFile(e.target.files[0]); });
}

setupDrop('psPhotoDrop','psPhotoInput', async file=>{
  const err = validateFile(file);
  if(err){ alert(err); return; }
  const {img} = await loadImage(file);
  psPhotoImg = img;
  document.getElementById('psPhotoDrop').querySelector('h4').textContent = '✅ Photo added';
  tryBuildJoiner();
});
setupDrop('psSigDrop','psSigInput', async file=>{
  const err = validateFile(file);
  if(err){ alert(err); return; }
  const {img} = await loadImage(file);
  psSigImg = img;
  document.getElementById('psSigDrop').querySelector('h4').textContent = '✅ Signature added';
  tryBuildJoiner();
});

function tryBuildJoiner(){
  if(psPhotoImg && psSigImg) buildJoinerWorkspace();
}

function buildJoinerWorkspace(){
  setStep(1);
  const area = document.getElementById('psWorkArea');
  area.innerHTML = `
    <div class="grid-2" style="margin-top:20px;">
      <div>
        <div class="preview-stage" id="psPreview" style="min-height:200px;"></div>
      </div>
      <div>
        <div class="panel">
          <label class="field-label">Layout</label>
          <div class="chip-row" id="psLayout">
            <button class="chip active" data-v="side">Side by Side</button>
            <button class="chip" data-v="stack">Stacked</button>
          </div>
        </div>
        <div class="panel">
          <label class="field-label">Combined Size (px)</label>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="number" class="text-input" id="psWidth" value="400" style="width:100px;">
            <span>×</span>
            <input type="number" class="text-input" id="psHeight" value="200" style="width:100px;">
          </div>
        </div>
        <div class="panel">
          <label class="field-label">Gap — <span class="mono-tag" id="psGapLabel">10px</span></label>
          <input type="range" id="psGap" min="0" max="40" value="10">
        </div>
      </div>
    </div>
    <div class="download-bar">
      <button class="btn-primary" id="psDownloadBtn">Download Combined Image</button>
    </div>
    <div class="note" id="psNote" style="display:none;"></div>
  `;

  document.getElementById('psLayout').addEventListener('click', e=>{
    if(!e.target.classList.contains('chip')) return;
    [...e.currentTarget.children].forEach(c=>c.classList.remove('active'));
    e.target.classList.add('active');
    updatePsPreview();
  });
  ['psWidth','psHeight'].forEach(id=>document.getElementById(id).addEventListener('input', updatePsPreview));
  document.getElementById('psGap').addEventListener('input', e=>{
    document.getElementById('psGapLabel').textContent = e.target.value+'px';
    updatePsPreview();
  });
  document.getElementById('psDownloadBtn').addEventListener('click', downloadJoined);
  updatePsPreview();
}

function drawContain(ctx, img, x, y, w, h){
  const ratio = Math.min(w/img.naturalWidth, h/img.naturalHeight);
  const dw = img.naturalWidth*ratio, dh = img.naturalHeight*ratio;
  const dx = x + (w-dw)/2, dy = y + (h-dh)/2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function buildJoinedCanvas(){
  const W = parseInt(document.getElementById('psWidth').value,10) || 400;
  const H = parseInt(document.getElementById('psHeight').value,10) || 200;
  const gap = parseInt(document.getElementById('psGap').value,10) || 0;
  const layout = document.querySelector('#psLayout .active').dataset.v;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,W,H);

  if(layout==='side'){
    const photoW = (W-gap)*0.65, sigW = (W-gap)*0.35;
    drawContain(ctx, psPhotoImg, 0, 0, photoW, H);
    drawContain(ctx, psSigImg, photoW+gap, 0, sigW, H);
  } else {
    const photoH = (H-gap)*0.7, sigH = (H-gap)*0.3;
    drawContain(ctx, psPhotoImg, 0, 0, W, photoH);
    drawContain(ctx, psSigImg, 0, photoH+gap, W, sigH);
  }
  return canvas;
}

function updatePsPreview(){
  const canvas = buildJoinedCanvas();
  const prev = document.getElementById('psPreview');
  prev.innerHTML=''; canvas.style.maxHeight='260px'; canvas.style.borderRadius='6px'; canvas.style.border='1px solid var(--line)';
  prev.appendChild(canvas);
}

function downloadJoined(){
  const canvas = buildJoinedCanvas();
  canvas.toBlob(blob=>{
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'photo-signature-joined.jpg';
    a.click();
    const note = document.getElementById('psNote');
    note.style.display='block';
    note.textContent = '✅ Downloaded.';
    setStep(3);
  }, 'image/jpeg', 0.95);
}