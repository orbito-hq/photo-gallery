import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileScanner } from './scanner.js';
import { thumbnailGenerator } from './thumbnail.js';
import { fileStore } from './store.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const SCAN_DIR = process.env.SCAN_DIR || process.cwd();

const CURSOR_SIZE = 100;

app.get('/api/files', async (req, res) => {
  const cursor = parseInt(req.query.cursor || '0');
  const files = fileStore.getFiles(cursor, CURSOR_SIZE);
  const nextCursor = cursor + files.length;
  
  res.json({
    files,
    nextCursor: files.length === CURSOR_SIZE ? nextCursor : null
  });
});

app.get('/api/thumb/:id', async (req, res) => {
  const { id } = req.params;
  const file = fileStore.getFile(id);
  
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  try {
    const thumbnail = await thumbnailGenerator.generate(file.absolutePath, file.type);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(thumbnail);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', (req, res) => {
  res.json({
    totalFiles: fileStore.getTotalCount(),
    lastScan: fileStore.getLastScanTime()
  });
});

const broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
};

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'connected', totalFiles: fileStore.getTotalCount() }));
});

fileScanner.on('file-added', (file) => {
  fileStore.addFile(file);
  broadcast({ type: 'file-added', file });
});

fileScanner.on('file-removed', (id) => {
  fileStore.removeFile(id);
  broadcast({ type: 'file-removed', id });
});

fileScanner.on('scan-complete', (timestamp) => {
  fileStore.setLastScanTime(timestamp);
  broadcast({ type: 'scan-complete', totalFiles: fileStore.getTotalCount() });
});

fileScanner.start(SCAN_DIR);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Scanning directory: ${SCAN_DIR}`);
});
