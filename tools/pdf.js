let pdfFiles = [];

const pdfDrop = document.getElementById('pdfDrop');
const pdfInput = document.getElementById('pdfInput');

pdfDrop.addEventListener('click', ()=>pdfInput.click());
pdfDrop.addEventListener('dragover', e=>{e.preventDefault();pdfDrop.classList.add('drag');});
pdfDrop.addEventListener('dragleave', ()=>pdfDrop.classList.remove('drag'));
pdfDrop.addEventListener('drop', e=>{ e.preventDefault();pdfDrop.classList.remove('drag'); handlePdfFiles(e.dataTransfer.files); });
pdfInput.addEventListener('change', e=> handlePdfFiles(e.target.files));

async function handlePdfFiles(fileList){
  const area = document.getElementById('pdfWorkArea');
  for(const file of fileList){
    const err = validateFile(file);
    if(err){ area.insertAdjacentHTML('afterbegin', `<div class="note error-note">⚠️ ${err} (${file.name})</div>`); continue; }
    const {img,url} = await loadImage(file);
    pdfFiles.push({file,url,img,rotation:0,id:Math.random().toString(36).slice(2)});
  }
  buildPdfWorkspace();
}

function buildPdfWorkspace(){
  setStep(1);
  const area = document.getElementById('pdfWorkArea');
  area.innerHTML = `
    <div class="grid-2">
      <div>
        <div id="pdfFileList"></div>
        <button class="btn-secondary" onclick="document.getElementById('pdfInput').click()">+ Add more images</button>
      </div>
      <div>
        <div class="panel">
          <label class="field-label">Page Size</label>
          <div class="chip-row" id="pdfPageSize">
            <button class="chip active" data-v="a4">A4</button>
            <button class="chip" data-v="letter">Letter</button>
            <button class="chip" data-v="legal">Legal</button>
          </div>
        </div>
        <div class="panel">
          <label class="field-label">Orientation</label>
          <div class="chip-row" id="pdfOrientation">
            <button class="chip active" data-v="portrait">Portrait</button>
            <button class="chip" data-v="landscape">Landscape</button>
          </div>
        </div>
        <div class="panel">
          <label class="field-label">Margin — <span class="mono-tag" id="pdfMarginLabel">20pt</span></label>
          <input type="range" id="pdfMargin" min="0" max="60" value="20">
          <label style="display:flex;align-items:center;gap:8px;margin-top:14px;font-size:13.5px;">
            <input type="checkbox" id="pdfFit" checked> Fit image to page
          </label>
        </div>
      </div>
    </div>
    <div class="download-bar">
      <button class="btn-primary" id="pdfGenerateBtn">Generate &amp; Preview PDF</button>
    </div>
    <div id="pdfPreviewArea"></div>
  `;
  renderPdfFileList();
  document.getElementById('pdfPageSize').addEventListener('click', chipToggle);
  document.getElementById('pdfOrientation').addEventListener('click', chipToggle);
  document.getElementById('pdfMargin').addEventListener('input', e=>{
    document.getElementById('pdfMarginLabel').textContent = e.target.value + 'pt';
  });
  document.getElementById('pdfGenerateBtn').addEventListener('click', generatePdf);
}

function chipToggle(e){
  if(!e.target.classList.contains('chip')) return;
  [...e.currentTarget.children].forEach(c=>c.classList.remove('active'));
  e.target.classList.add('active');
}

function renderPdfFileList(){
  const list = document.getElementById('pdfFileList');
  list.innerHTML = pdfFiles.map((f,i)=>`
    <div class="file-item" draggable="true" data-id="${f.id}">
      <img class="file-thumb" src="${f.url}" style="transform:rotate(${f.rotation}deg);">
      <div style="flex:1;overflow:hidden;">
        <div class="file-name">${i+1}. ${f.file.name}</div>
        <div class="file-meta">${fmtBytes(f.file.size)} · ${f.img.naturalWidth}×${f.img.naturalHeight}</div>
      </div>
      <button class="icon-round" onclick="rotatePdfImg('${f.id}')" title="Rotate">↻</button>
      <button class="icon-round" onclick="deletePdfImg('${f.id}')" title="Delete">🗑</button>
    </div>
  `).join('') || '<p style="color:var(--ink-soft);font-size:13.5px;">No images yet.</p>';

  let dragged=null;
  list.querySelectorAll('.file-item').forEach(item=>{
    item.addEventListener('dragstart', ()=>{ dragged=item; item.classList.add('dragging'); });
    item.addEventListener('dragend', ()=>{ item.classList.remove('dragging'); reorderPdfFromDOM(); });
    item.addEventListener('dragover', e=>{
      e.preventDefault();
      const after = [...list.children].filter(c=>c!==dragged).find(c=>{
        const box = c.getBoundingClientRect();
        return e.clientY < box.top + box.height/2;
      });
      if(after) list.insertBefore(dragged, after); else list.appendChild(dragged);
    });
  });
}

function reorderPdfFromDOM(){
  const ids = [...document.querySelectorAll('#pdfFileList .file-item')].map(el=>el.dataset.id);
  pdfFiles = ids.map(id=>pdfFiles.find(f=>f.id===id));
  renderPdfFileList();
}
function rotatePdfImg(id){
  const f = pdfFiles.find(f=>f.id===id);
  f.rotation = (f.rotation + 90) % 360;
  renderPdfFileList();
}
function deletePdfImg(id){
  pdfFiles = pdfFiles.filter(f=>f.id!==id);
  renderPdfFileList();
}

function generatePdf(){
  if(pdfFiles.length===0) return;
  const pageSize = document.querySelector('#pdfPageSize .active').dataset.v;
  const orientation = document.querySelector('#pdfOrientation .active').dataset.v;
  const margin = parseInt(document.getElementById('pdfMargin').value,10);
  const fit = document.getElementById('pdfFit').checked;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: orientation==='landscape'?'l':'p', unit:'pt', format:pageSize });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  pdfFiles.forEach((f,idx)=>{
    if(idx>0) doc.addPage(pageSize, orientation==='landscape'?'l':'p');
    const canvas = document.createElement('canvas');
    const rad = f.rotation * Math.PI/180;
    const swapped = f.rotation % 180 !== 0;
    canvas.width = swapped ? f.img.naturalHeight : f.img.naturalWidth;
    canvas.height = swapped ? f.img.naturalWidth : f.img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.rotate(rad);
    ctx.drawImage(f.img, -f.img.naturalWidth/2, -f.img.naturalHeight/2);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    const availW = pageW - margin*2;
    const availH = pageH - margin*2;
    const ratio = canvas.width/canvas.height;
    let w,h;
    if(fit){
      if(availW/availH > ratio){ h=availH; w=h*ratio; } else { w=availW; h=w/ratio; }
    } else {
      w = Math.min(canvas.width, availW); h = w/ratio;
      if(h>availH){ h=availH; w=h*ratio; }
    }
    const x = (pageW - w)/2, y = (pageH - h)/2;
    doc.addImage(dataUrl,'JPEG',x,y,w,h);
  });

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  setStep(2);
  document.getElementById('pdfPreviewArea').innerHTML = `
    <div class="panel">
      <label class="field-label">Preview</label>
      <embed src="${url}" type="application/pdf" width="100%" height="380px" style="border-radius:10px;border:1px solid var(--line);">
    </div>
    <div class="download-bar">
      <a class="btn-primary" href="${url}" download="lovely-img-tools.pdf">Download PDF</a>
    </div>
    <div class="note">✅ Ready. ${pdfFiles.length} page(s) · ${pageSize.toUpperCase()} · ${orientation}</div>
  `;
}