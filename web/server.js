import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { WhisperTranscriber } from '../src/WhisperTranscriber.js';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp3|wav|m4a|mp4|mpeg|mpga|webm|ogg|flac/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// Initialize Whisper transcriber
const transcriber = new WhisperTranscriber({
  modelSize: 'base',
  language: 'auto', // Will auto-detect language
  verbose: true
});

// Store active WebSocket connections
const wsClients = new Map();

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/api/models', async (req, res) => {
  try {
    const models = await transcriber.getAvailableModels();
    res.json({ success: true, models });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/check-dependencies', async (req, res) => {
  try {
    await transcriber.checkDependencies();
    res.json({ success: true, message: 'All dependencies are installed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No audio file provided' });
  }

  const sessionId = crypto.randomBytes(16).toString('hex');
  const ws = wsClients.get(req.headers['x-session-id']);

  try {
    const audioPath = req.file.path;
    const options = {
      modelSize: req.body.model || 'base',
      language: req.body.language || 'auto',
      task: req.body.task || 'transcribe',
      outputFormat: req.body.format || 'json',
      timestamps: req.body.timestamps !== 'false',
      wordTimestamps: req.body.wordTimestamps === 'true'
    };

    // Send progress updates via WebSocket
    if (ws) {
      ws.send(JSON.stringify({
        type: 'status',
        message: 'Checking audio file...'
      }));
    }

    // Get audio info
    const audioInfo = await transcriber.getAudioInfo(audioPath);
    
    if (ws && audioInfo) {
      ws.send(JSON.stringify({
        type: 'audioInfo',
        data: audioInfo
      }));
    }

    // Update transcriber settings
    transcriber.modelSize = options.modelSize;
    transcriber.language = options.language;

    if (ws) {
      ws.send(JSON.stringify({
        type: 'status',
        message: `Starting transcription with ${options.modelSize} model...`
      }));
    }

    // Perform transcription
    const result = await transcriber.transcribe(audioPath, {
      outputFormat: 'json',
      outputDir: path.join(__dirname, '../output'),
      task: options.task,
      timestamps: options.timestamps,
      wordTimestamps: options.wordTimestamps
    });

    // Clean up uploaded file
    await fs.unlink(audioPath).catch(console.error);

    // Send success response
    res.json({
      success: true,
      transcript: result.text,
      language: result.language,
      segments: result.segments,
      duration: audioInfo?.duration,
      audioInfo
    });

    if (ws) {
      ws.send(JSON.stringify({
        type: 'complete',
        message: 'Transcription completed successfully'
      }));
    }

  } catch (error) {
    console.error('Transcription error:', error);
    
    // Clean up uploaded file on error
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(console.error);
    }

    res.status(500).json({
      success: false,
      error: error.message
    });

    if (ws) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  }
});

app.post('/api/download-model/:model', async (req, res) => {
  try {
    const { model } = req.params;
    await transcriber.downloadModel(model);
    res.json({ success: true, message: `Model ${model} downloaded successfully` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/transcripts', async (req, res) => {
  try {
    const outputDir = path.join(__dirname, '../output');
    const files = await fs.readdir(outputDir).catch(() => []);
    
    const transcripts = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(outputDir, file), 'utf-8');
        const data = JSON.parse(content);
        transcripts.push({
          filename: file,
          text: data.text?.substring(0, 200) + '...',
          language: data.language,
          timestamp: (await fs.stat(path.join(outputDir, file))).mtime
        });
      }
    }
    
    transcripts.sort((a, b) => b.timestamp - a.timestamp);
    res.json({ success: true, transcripts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Whisper Transcriber Web App`);
  console.log(`📡 Server running at http://localhost:${PORT}`);
  console.log(`\nOpen your browser and navigate to http://localhost:${PORT}\n`);
});

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const sessionId = crypto.randomBytes(16).toString('hex');
  wsClients.set(sessionId, ws);
  
  ws.send(JSON.stringify({
    type: 'connected',
    sessionId
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'register' && data.sessionId) {
        wsClients.delete(sessionId);
        wsClients.set(data.sessionId, ws);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    wsClients.delete(sessionId);
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  server.close();
  process.exit(0);
});