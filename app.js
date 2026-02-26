function formDataWithFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  return fd;
}

function setStatus(msg, isError = false) {
  const el = document.getElementById('status');
  if (!el) return;
  el.textContent = msg;
  el.className = 'status ' + (isError ? 'error' : '');
}

function setResults(html) {
  const el = document.getElementById('results');
  if (el) el.innerHTML = html;
}

class PeopoleOCR {
  constructor() {
    this.initDragDrop();
    this.registerSW();
  }

  async registerSW() {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js').catch(() => {});
      } catch (_) {}
    }
  }

  async tesseractOCR(file, lang = 'ben+eng') {
    if (typeof window.ocr !== 'undefined' && window.ocr.tesseractOCR) {
      return window.ocr.tesseractOCR(file, lang);
    }
    return new Promise((resolve, reject) => {
      Tesseract.recognize(file, lang, {
        logger: m => setStatus(`OCR: ${m.status} ${Math.round((m.progress || 0) * 100)}%`),
      })
        .then(({ data: { text } }) => resolve(text))
        .catch(reject);
    });
  }

  async hybridOCR(file) {
    setStatus('টেক্সট চেনা হচ্ছে…');
    setResults('');
    let tesseractText = '';
    let paddleText = '';
    let conf = 0.8;

    try {
      tesseractText = await this.tesseractOCR(file, document.getElementById('lang-select')?.value || 'ben+eng');
    } catch (e) {
      setStatus('Tesseract ত্রুটি: ' + (e.message || 'Unknown'), true);
      setResults('<pre class="error-msg">' + escapeHtml(String(e.message || e)) + '</pre>');
      return null;
    }

    try {
      const r = await fetch('/api/ocr', { method: 'POST', body: formDataWithFile(file) });
      const data = await r.json().catch(() => ({}));
      paddleText = data.text || '';
      if (data.error) setStatus('সার্ভার OCR: ' + data.error, true);
      if (data.confidence != null) conf = data.confidence;
    } catch (e) {
      setStatus('সার্ভার OCR ব্যবহার করা যাচ্ছে না (স্থানীয় টেক্সট দেখুন)', true);
    }

    const rawText = (tesseractText + '\n' + paddleText).trim() || tesseractText;
    if (!rawText) {
      setStatus('কোনো টেক্সট পাওয়া যায়নি', true);
      setResults('<p class="error-msg">কোনো টেক্সট চেনা যায়নি। অন্য ছবি/পিডিএফ চেষ্টা করুন।</p>');
      return null;
    }

    setStatus('স্ট্রাকচার করা হচ্ছে…');
    let structured = { raw_preview: rawText.slice(0, 500), fields: {} };
    try {
      const docType = document.getElementById('doc-type')?.value || 'nid';
      const r = await fetch('/api/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: rawText, doc_type: docType }),
      });
      structured = await r.json().catch(() => structured);
    } catch (_) {}

    setStatus('সম্পন্ন');
    const fieldsHtml = Object.keys(structured.fields || {}).length
      ? '<div class="fields"><strong>খুঁজে পাওয়া ফিল্ড:</strong><pre>' + escapeHtml(JSON.stringify(structured.fields, null, 2)) + '</pre></div>'
      : '';
    setResults(
      fieldsHtml +
      '<div class="raw"><strong>কাঁচা টেক্সট:</strong><pre>' + escapeHtml(rawText.slice(0, 3000)) + (rawText.length > 3000 ? '\n…' : '') + '</pre></div>'
    );
    return structured;
  }

  initDragDrop() {
    const zone = document.getElementById('upload-zone');
    const input = document.getElementById('file-input');
    if (!zone || !input) return;

    const handleFile = (file) => {
      if (!file) return;
      const ok = file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.pdf');
      if (!ok) {
        setStatus('শুধু ছবি বা পিডিএফ ফাইল নেওয়া হয়', true);
        return;
      }
      this.hybridOCR(file);
    };

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    input.addEventListener('change', (e) => { handleFile(e.target.files && e.target.files[0]); e.target.value = ''; });

    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      handleFile(e.dataTransfer.files && e.dataTransfer.files[0]);
    });
  }
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

window.peopoleOCR = new PeopoleOCR();
