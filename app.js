class PeopoleOCR {
  constructor() {
    this.initDragDrop();
    this.registerSW();
  }
  
  async hybridOCR(file) {
    // 1. Tesseract Client (Fast)
    const tesseractResult = await this.tesseractOCR(file, 'ben+eng');
    
    // 2. Server PaddleOCR (High Accuracy)
    const paddleResult = await fetch('/api/ocr', {
      method: 'POST',
      body: formDataWithFile(file)
    }).then(r => r.json());
    
    // 3. AI Structuring
    const structured = await fetch('/api/structure', {
      method: 'POST',
      body: JSON.stringify({
        raw_text: tesseractResult + paddleResult.text,
        confidence: Math.max(tesseractResult.conf, paddleResult.conf)
      })
    }).then(r => r.json());
    
    return structured;
  }
}
