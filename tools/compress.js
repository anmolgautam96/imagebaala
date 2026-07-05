let cmpFile=null, cmpImg=null, cmpUrl=null;

const cmpDrop = document.getElementById('cmpDrop');
const cmpInput = document.getElementById('cmpInput');

cmpDrop.addEventListener('click', ()=>cmpInput.click());
cmpDrop.addEventListener('dragover', e=>{e.preventDefault();cmpDrop.classList.add('drag');});
cmpDrop.addEventListener('dragleave', ()=>cmpDrop.classList.remove('drag'));
cmpDrop.addEventListener('drop', e=>{
  e.preventDefault();cmpDrop.classList.remove('drag');
  if(e.dataTransfer.files[0]) handleCmpFile(e.dataTransfer.files[0]);
});
cmpInput.addEventListener('change', e=>{ if(e.target.files[0]) handleCmpFile(e.target.files[0]); });
document.addEventListener('paste', e=>{
  const items = e.clipboardData.items;
  for(const it of items){
    if(it.type.startsWith('image/')){ handleCmpFile(it.getAsFile()); break; }
  }
});

async function handleCmpFile(file){
  const err = validateFile(file);
  const area = document.getElementById('cmpWorkArea');
  if(err){ area.innerHTML = `<div class="note error-note">⚠️ ${err}</div>`; return; }
  cmpFile = file;
  const {img,url} = await loadImage(file);
  cmpImg = img; cmpUrl = url;
  buildCmpWorkspace();
}

function buildCmpWorkspace(){
  setStep(1);
  const area = document.getElementById('cmpWorkArea');
  area.innerHTML = `
    <div class="grid-2">
      <div>
        <div class="preview-stage"><img id="cmpPreviewImg" src="${cmpUrl}"></div>
        <div class="download-bar">
          <button class="btn-secondary" onclick="location.reload()">Replace Image</button>
          <button class="btn-primary" id="cmpDownloadBtn">Download Compressed Image</button>
        </div>
        <div class="note" id="cmpNote" style="display:none;"></div>
      </div>
      <div>
        <div class="panel">
          <label class="field-label">Compression Quality — <span class="mono-tag" id="cmpQualLabel">80%</span></label>
          <input type="range" id="cmpQuality" min="10" max="100" value="80">
        </div>
        <div class="panel">
          <div class="stat-row"><span>Original size</span><span class="v" id="cmpOrigSize">—</span></div>
          <div class="stat-row"><span>Compressed size</span><span class="v" id="cmpNewSize">—</span></div>
          <div class="stat-row"><span>Saved</span><span class="v good" id="cmpSaved">—</span></div>
          <div class="stat-row"><span>Resolution</span><span class="v" id="cmpRes">—</span></div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('cmpOrigSize').textContent = fmtBytes(cmpFile.size);
  document.getElementById('cmpRes').textContent = `${cmpImg.naturalWidth} × ${cmpImg.naturalHeight}px`;

  const qualitySlider = document.getElementById('cmpQuality');
  const qualLabel = document.getElementById('cmpQualLabel');
  let currentBlob = null;

  function runCompress(){
    const q = qualitySlider.value/100;
    qualLabel.textContent = qualitySlider.value + '%';
    const canvas = document.createElement('canvas');
    canvas.width = cmpImg.naturalWidth; canvas.height = cmpImg.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(cmpImg,0,0);
    canvas.toBlob(blob=>{
      currentBlob = blob;
      document.getElementById('cmpPreviewImg').src = URL.createObjectURL(blob);
      document.getElementById('cmpNewSize').textContent = fmtBytes(blob.size);
      const savedPct = Math.max(0, Math.round((1 - blob.size/cmpFile.size)*100));
      document.getElementById('cmpSaved').textContent = savedPct + '%';
    }, 'image/jpeg', q);
  }
  qualitySlider.addEventListener('input', runCompress);
  runCompress();

  document.getElementById('cmpDownloadBtn').addEventListener('click', ()=>{
    if(!currentBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(currentBlob);
    a.download = 'compressed-' + cmpFile.name.replace(/\.[^.]+$/, '') + '.jpg';
    a.click();
    const note = document.getElementById('cmpNote');
    note.style.display='block';
    note.textContent = '✅ Downloaded. Your file stays only in your browser.';
    setStep(3);
  });
}