// Hybrid Bangla OCR Client Module
class OCRHybrid {
  async tesseractOCR(file, lang = 'ben+eng') {
    return new Promise((resolve, reject) => {
      const statusEl = document.getElementById('status');
      Tesseract.recognize(file, lang, {
        logger: m => { if (statusEl) statusEl.textContent = `OCR: ${m.status} ${Math.round((m.progress || 0) * 100)}%`; },
      })
        .then(({ data: { text } }) => resolve(text))
        .catch(reject);
    });
  }

  async paddleOCR(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/ocr', { method: 'POST', body: formData });
    return res.json();
  }
}
window.ocr = new OCRHybrid();
