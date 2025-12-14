// Disease Detection Functionality
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const preview = document.getElementById('preview');
const previewImg = document.getElementById('previewImg');
const removeBtn = document.getElementById('removeBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const status = document.getElementById('status');
const statusText = document.getElementById('statusText');
const result = document.getElementById('result');
const dropText = document.getElementById('dropText');

function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }

// Initialize: ensure everything starts in correct state
if(dropzone && fileInput && browseBtn && preview && previewImg && removeBtn && analyzeBtn && status && statusText && result){
  hide(status);
  hide(result);
  hide(preview);
  analyzeBtn.disabled = true;

  browseBtn.addEventListener('click', ()=> fileInput.click());
  dropzone.addEventListener('click', ()=> fileInput.click());

  fileInput.addEventListener('change', (e)=> {
    const f = e.target.files[0];
    if(!f) return;
    if(!f.type.startsWith('image/')){
      alert('Please select an image file');
      fileInput.value = '';
      return;
    }
    showPreview(f);
  });

  dropzone.addEventListener('dragover', (e)=> { e.preventDefault(); dropzone.classList.add('drag'); });
  dropzone.addEventListener('dragleave', ()=> dropzone.classList.remove('drag'));
  dropzone.addEventListener('drop', (e)=> {
    e.preventDefault();
    dropzone.classList.remove('drag');
    const f = e.dataTransfer.files[0];
    if(!f) return;
    if(!f.type.startsWith('image/')){
      alert('Please drop an image file');
      return;
    }
    fileInput.files = e.dataTransfer.files;
    showPreview(f);
  });

  function showPreview(file){
    if(!file || !file.type || !file.type.startsWith('image/')){
      alert('Please select an image file');
      hide(status);
      hide(preview);
      show(dropzone);
      analyzeBtn.disabled = true;
      return;
    }
    
    // Clean up previous object URL to prevent memory leaks
    if(previewImg.src && previewImg.src.startsWith('blob:')){
      URL.revokeObjectURL(previewImg.src);
    }
    
    const url = URL.createObjectURL(file);
    previewImg.src = url;
    
    // Show preview and enable button after image loads
    previewImg.onload = () => {
      show(preview);
      hide(dropzone);
      hide(result);
      hide(status);
      analyzeBtn.disabled = false;
    };
    
    previewImg.onerror = () => {
      alert('Failed to load image. Please try another file.');
      hide(status);
      hide(preview);
      show(dropzone);
      analyzeBtn.disabled = true;
      fileInput.value = '';
    };
  }

  removeBtn.addEventListener('click', ()=> {
    fileInput.value = '';
    if(previewImg.src && previewImg.src.startsWith('blob:')){
      URL.revokeObjectURL(previewImg.src);
    }
    previewImg.src = '';
    hide(preview);
    show(dropzone);
    hide(status);
    hide(result);
    analyzeBtn.disabled = true;
  });

  async function analyze(){
    const f = fileInput.files[0];
    if(!f || !f.type || !f.type.startsWith('image/')){
      hide(status);
      return;
    }
    
    analyzeBtn.disabled = true;
    show(status);
    hide(result);
    statusText.innerText = 'Analyzing your image...';

    const fd = new FormData();
    fd.append('file', f);

    try {
      const res = await fetch('/api/predict', { method: 'POST', body: fd });
      const j = await res.json();
      if(res.ok && j.result){
        hide(status);
        renderResult(j.result);
        analyzeBtn.disabled = false;
      } else {
        let msg = j.message || j.error || 'Prediction failed';
        hide(status);
        result.innerHTML = `<div class="error">Error: ${escapeHtml(msg)}</div>`;
        show(result);
        analyzeBtn.disabled = false;
      }
    } catch (err){
      hide(status);
      result.innerHTML = `<div class="error">Network or server error. Please check your connection and try again.</div>`;
      show(result);
      analyzeBtn.disabled = false;
    }
  }

  function renderResult(r){
    const className = r.class || 'Unknown';
    const confidence = typeof r.confidence === 'number' ? r.confidence.toFixed(2) : r.confidence || '0.00';
    const description = r.description || 'No description available.';
    const treatment = r.treatment || 'No treatment information available.';
    
    const formattedName = className.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    const confNum = parseFloat(confidence);
    let confColor = '#dc2626';
    let confLabel = 'Low';
    if(confNum >= 80) {
      confColor = '#16a34a';
      confLabel = 'High';
    } else if(confNum >= 60) {
      confColor = '#f59e0b';
      confLabel = 'Medium';
    }
    
    hide(status);
    
    const html = `
      <div class="result-card">
        <div class="result-header">
          <div class="result-icon">🔍</div>
          <h2 class="result-title">Analysis Results</h2>
        </div>
        <div class="row">
          <div class="col image">
            <div class="image-wrapper">
              <img src="${previewImg.src}" alt="uploaded leaf" />
            </div>
          </div>
          <div class="col info">
            <div class="disease-name">
              <span class="disease-label">Disease Detected:</span>
              <h3>${escapeHtml(formattedName)}</h3>
            </div>
            <div class="confidence-badge" style="--conf-color: ${confColor}">
              <span class="conf-label">Confidence</span>
              <span class="conf-value">${confidence}%</span>
              <span class="conf-level">${confLabel}</span>
            </div>
            <div class="info-section">
              <div class="section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <h4>Description</h4>
              </div>
              <p>${escapeHtml(description)}</p>
            </div>
            <div class="info-section">
              <div class="section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <h4>Treatment</h4>
              </div>
              ${formatTreatmentAsList(treatment)}
            </div>
          </div>
        </div>
        <div class="actions">
          <button id="analyzeMore" class="primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            Analyze Another Image
          </button>
        </div>
      </div>`;
    result.innerHTML = html;
    show(result);

    const analyzeMoreBtn = document.getElementById('analyzeMore');
    if(analyzeMoreBtn){
      const newBtn = analyzeMoreBtn.cloneNode(true);
      analyzeMoreBtn.parentNode.replaceChild(newBtn, analyzeMoreBtn);
      
      newBtn.addEventListener('click', ()=>{
        fileInput.value = '';
        if(previewImg.src && previewImg.src.startsWith('blob:')){
          URL.revokeObjectURL(previewImg.src);
        }
        previewImg.src = '';
        hide(result);
        hide(preview);
        hide(status);
        show(dropzone);
        analyzeBtn.disabled = true;
      });
    }
  }

  function escapeHtml(s){
    if(!s) return '';
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatTreatmentAsList(treatmentText){
    if(!treatmentText) return '<p>No treatment information available.</p>';
    
    const numberedPattern = /\d+\.\s+/;
    const hasNumberedList = numberedPattern.test(treatmentText);
    const bulletPattern = /^[-*•]\s/m;
    const hasBulletList = bulletPattern.test(treatmentText);
    
    let items = [];
    
    if(hasNumberedList){
      items = treatmentText.split(/(?=\d+\.\s+)/).filter(item => {
        item = item.trim();
        return item && numberedPattern.test(item);
      });
    } else if(hasBulletList){
      items = treatmentText.split(/(?=^[-*•]\s)/m).filter(item => item.trim());
    } else {
      const lines = treatmentText.split(/\n/).filter(line => line.trim());
      if(lines.length > 1){
        const looksLikeList = lines.some(line => {
          const trimmed = line.trim();
          return /^\d+\.|^[-*•]|^\*\s/.test(trimmed);
        });
        
        if(looksLikeList){
          items = lines.filter(line => {
            const trimmed = line.trim();
            return trimmed && (/^\d+\.|^[-*•]|^\*\s/.test(trimmed));
          });
        }
      }
    }
    
    if(items.length > 0){
      let listHtml = '<ul class="treatment-list">';
      
      items.forEach(item => {
        item = item.trim();
        if(!item) return;
        
        item = item.replace(/^\d+\.\s*/, '').replace(/^[-*•]\s*/, '').replace(/^\*\s*/, '');
        item = item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        let escaped = escapeHtml(item);
        escaped = escaped.replace(/&lt;strong&gt;/g, '<strong>').replace(/&lt;\/strong&gt;/g, '</strong>');
        
        listHtml += `<li>${escaped}</li>`;
      });
      
      listHtml += '</ul>';
      return listHtml;
    }
    
    let formatted = treatmentText;
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = escapeHtml(formatted);
    formatted = formatted.replace(/&lt;strong&gt;/g, '<strong>').replace(/&lt;\/strong&gt;/g, '</strong>');
    formatted = formatted.replace(/\n/g, '<br>');
    return `<p>${formatted}</p>`;
  }

  analyzeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const f = fileInput.files[0];
    if(!f || !f.type || !f.type.startsWith('image/') || analyzeBtn.disabled){
      return;
    }
    
    analyze();
  });
}

