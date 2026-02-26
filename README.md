# Peopole Bangla OCR - Commercial Ready

## Quick Start (local)
```bash
npm install
node server.js
```
Then open http://localhost:3000

Optional (for server-side Paddle OCR): `pip install paddleocr pymupdf pillow`  
Optional (full stack): `docker-compose up -d`

## Deploy on Render (Node Web Service)
1. In Render dashboard, open your **Bangla OCR** service.
2. Change **Type** from **Static Site** to **Web Service**.
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `node server.js`
5. **Publish Directory**: leave empty (app serves from root).
6. Save and redeploy.

The repo includes a `render.yaml` blueprint; you can also add the service from the Blueprint and use the same settings.
