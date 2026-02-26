const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_, file, cb) => cb(null, `ocr-${Date.now()}-${(file.originalname || 'file').slice(-20)}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

// Load checklists for structure API
let checklists = {};
try {
  checklists = require('./checklists.json');
} catch (e) {
  console.warn('checklists.json not found, /api/structure will return raw only');
}

function extractFields(rawText, docType = 'nid') {
  const template = checklists[docType] || checklists.nid || {};
  const fields = template.fields || [];
  const regexList = template.regex || [];
  const out = { type: docType, fields: {}, raw_preview: rawText.slice(0, 500) };
  const lines = rawText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  for (const field of fields) {
    for (const line of lines) {
      if (line.includes(field) || line.toLowerCase().includes(field.toLowerCase())) {
        const rest = line.replace(field, '').replace(/^[\s:\-]+/, '').trim();
        if (rest) out.fields[field] = rest;
      }
    }
  }
  for (const re of regexList) {
    try {
      const match = rawText.match(new RegExp(re, 'g'));
      if (match) out.fields[`match_${re.slice(0, 20)}`] = match[0];
    } catch (_) {}
  }
  return out;
}

app.post('/api/ocr', upload.single('file'), (req, res) => {
  if (!req.file || !req.file.path) {
    return res.status(400).json({ text: '', error: 'No file uploaded' });
  }
  const filePath = req.file.path;
  const cleanup = () => {
    try { fs.unlinkSync(filePath); } catch (_) {}
  };
  const py = process.platform === 'win32' ? 'python' : 'python3';
  const proc = spawn(py, [path.join(__dirname, 'paddle-worker.py'), filePath], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  proc.stdout.on('data', (d) => { stdout += d.toString(); });
  proc.stderr.on('data', (d) => { stderr += d.toString(); });
  proc.on('error', (err) => {
    cleanup();
    return res.json({ text: '', error: 'Paddle OCR not available (Python/paddle-worker not runnable)', details: err.message });
  });
  proc.on('close', (code) => {
    cleanup();
    if (code !== 0) {
      return res.json({ text: '', error: 'OCR failed', details: stderr || stdout });
    }
    res.json({ text: stdout.trim(), confidence: 0.9 });
  });
});

app.post('/api/structure', (req, res) => {
  const raw = req.body && req.body.raw_text;
  if (typeof raw !== 'string') {
    return res.status(400).json({ error: 'Missing raw_text' });
  }
  const docType = (req.body && req.body.doc_type) || 'nid';
  const structured = extractFields(raw, docType);
  res.json(structured);
});

app.listen(PORT, () => {
  console.log(`Peopole Bangla OCR server on port ${PORT}`);
});
