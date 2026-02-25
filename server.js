// Hybrid Bangla OCR Client Module
class OCRHybrid {
  async tesseractOCR(file) {
    return new Promise((resolve) => {
      Tesseract.recognize(file, 'ben+eng', {
        logger: m => document.getElementById('status').textContent = `OCR: ${m.status} ${Math.round(m.progress*100)}%`
      }).then(({ data: { text } }) => resolve(text));
    });
  }
  
  async paddleOCR(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('http://localhost:5000/ocr', { method: 'POST', body: formData });
    return res.json();
  }
}
window.ocr = new OCRHybrid();
