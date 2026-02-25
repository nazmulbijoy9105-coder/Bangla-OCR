const express = require('express');
const { spawn } = require('child_process');
const Redis = require('redis');
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.static('frontend'));

// OCR Pipeline
app.post('/api/ocr', async (req, res) => {
  const paddle = spawn('python3', ['paddle-worker.py', req.file.buffer]);
  paddle.stdout.on('data', (data) => res.json({ text: data }));
});

// AI Document Structuring (Rule + LLM)
app.post('/api/structure', async (req, res) => {
  const text = req.body.raw_text;
  const structured = await this.extractFields(text); // NID, Passport, Bank
  res.json(structured);
});

app.listen(3000);
