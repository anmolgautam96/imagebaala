let cropEngine=null, cropSrcFile=null, cropSrcImg=null, cropTargetPx=null;

const cropDrop = document.getElementById('cropDrop');
const cropInput = document.getElementById('cropInput');

cropDrop.addEventListener('click', ()=>cropInput.click());
cropDrop.addEventListener('dragover', e=>{e.preventDefault();cropDrop.classList.add('drag');});
cropDrop.addEventListener('dragleave', ()=>cropDrop.classList.remove('drag'));
cropDrop.addEventListener('drop', e=>{ e.preventDefault();cropDrop.classList.remove('drag'); if(e.dataTransfer.files[0]) handleCropFile(e.dataTransfer.files[0]); });
cropInput.addEventListener('change', e=>{ if(e.target.files[0]) handleCropFile(e.target.files[0]); });

async function handleCropFile(file){
  const err = validateFile(file);
  const area = document.getElementById('cropWorkArea');
  if(err){ area.innerHTML = `<div class="note error-note">⚠️ ${err}</div>`; return; }
  cropSrcFile = file;
  const {img} = await loadImage(file);
  cropSrcImg = img;
  buildCropWorkspace();
}

function buildCropWorkspace(){
  setStep(1);
  const area = document.getElementById('cropWorkArea');
  area.innerHTML = `
    <div class="grid-2">
      <div>
        <div id="cropStageContainer"></div>
        <div class="chip-row" style="margin-top:12px;">
          <button class="icon-round" id="cropRotate" title="Rotate">↻</button>
          <button class="icon-round" id="cropFlipH" title="Flip horizontal">⇋</button>
          <button class="icon-round" id="cropFlipV" title="Flip vertical">⇵</button>
        </div>
        <label class="field-label" style="margin-top:14px;">Zoom</label>
        <input type="range" id="cropZoom" min="100" max="220" value="100">
      </div>
      <div>
        <div class="panel">
          <label class="field-label">Aspect Ratio</label>
          <div class="chip-row" id="cropAspect">
            <button class="chip active" data-v="free">Free</button>
            <button class="chip" data-v="1">1:1</button>
            <button class="chip" data-v="0.75">4:3</button>
            <button class="chip" data-v="0.5625">16:9</button>
            <button class="chip" data-v="1.2857">Passport</button>
          </div>
        </div>
        <div class="panel">
          <label class="field-label">Exact Size</label>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <input type="number" class="text-input" id="cropW" placeholder="Width" style="width:90px;">
            <span>×</span>
            <input type="number" class="text-input" id="cropH" placeholder="Height" style="width:90px;">
            <select class="text-input" id="cropUnit" style="width:90px;">
              <option value="px">px</option>
              <option value="cm">cm</option>
              <option value="mm">mm</option>
              <option value="in">in</option>
            </select>
          </div>
          <button class="chip" id="cropApplySize" style="margin-top:10px;">Apply exact size</button>
        </div>
        <div class="panel">
          <div class="stat-row"><span>Crop output</span><span class="v" id="cropOutRes">—</span></div>
        </div>
      </div>
    </div>
    <div class="preview-stage" id="cropFinalPreview" style="margin-top:16px;min-height:160px;"></div>
    <div class="download-bar">
      <button class="btn-primary" id="cropDownloadBtn">Download Cropped Image</button>
    </div>
    <div class="note" id="cropNote" style="display:none;"></div>
  `;

  cropEngine = createCropEngine('cropStageContainer', { aspect:null, onUpdate: updateCropPreview });
  cropEngine.setImage(cropSrcImg);

  document.getElementById('cropAspect').addEventListener('click', e=>{
    if(!e.target.classList.contains('chip')) return;
    [...e.currentTarget.children].forEach(c=>c.classList.remove('active'));
    e.target.classList.add('active');
    const v = e.target.dataset.v;
    cropEngine.setAspect(v==='free'?null:parseFloat(v));
  });
  document.getElementById('cropRotate').addEventListener('click', ()=>cropEngine.rotate());
  document.getElementById('cropFlipH').addEventListener('click', ()=>cropEngine.flip('h'));
  document.getElementById('cropFlipV').addEventListener('click', ()=>cropEngine.flip('v'));
  document.getElementById('cropZoom').addEventListener('input', e=>cropEngine.setZoom(e.target.value/100));
  document.getElementById('cropApplySize').addEventListener('click', applyCropExactSize);
  document.getElementById('cropDownloadBtn').addEventListener('click', downloadCropped);
  updateCropPreview();
}

function applyCropExactSize(){
  const w = parseFloat(document.getElementById('cropW').value);
  const h = parseFloat(document.getElementById('cropH').value);
  const unit = document.getElementById('cropUnit').value;
  if(!w || !h) return;
  cropTargetPx = {w:Math.round(unitToPx(w,unit)), h:Math.round(unitToPx(h,unit))};
  updateCropPreview();
}

function updateCropPreview(){
  if(!cropEngine) return;
  const canvas = cropTargetPx ? cropEngine.getCroppedCanvas(cropTargetPx.w, cropTargetPx.h) : cropEngine.getCroppedCanvas();
  document.getElementById('cropOutRes').textContent = `${canvas.width} × ${canvas.height}px`;
  const finalPrev = document.getElementById('cropFinalPreview');
  finalPrev.innerHTML=''; canvas.style.maxHeight='300px'; canvas.style.borderRadius='8px';
  finalPrev.appendChild(canvas);
}

function downloadCropped(){
  const canvas = cropTargetPx ? cropEngine.getCroppedCanvas(cropTargetPx.w, cropTargetPx.h) : cropEngine.getCroppedCanvas();
  canvas.toBlob(blob=>{
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cropped-image.jpg';
    a.click();
    const note = document.getElementById('cropNote');
    note.style.display='block';
    note.textContent = '✅ Downloaded. Your original file was never uploaded anywhere.';
    setStep(3);
  }, 'image/jpeg', 0.95);
}