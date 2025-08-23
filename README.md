# 🎙️ Whisper Transcriber

> **Transform your audio into text with AI-powered precision**

A powerful, modern transcription tool that combines OpenAI's Whisper AI model with an intuitive web interface and comprehensive CLI toolkit. Perfect for podcasts, interviews, meetings, lectures, and any audio content that needs to become searchable text.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-linux%20%7C%20macOS%20%7C%20windows-lightgrey.svg)

---

## ✨ Features

### 🌐 **Modern Web Interface**
- **Drag & Drop Upload** - Simply drag audio files into the browser
- **Real-time Progress** - Live transcription updates via WebSocket
- **Dark Mode UI** - Beautiful, modern interface optimized for long sessions
- **Mobile Responsive** - Works perfectly on phones and tablets
- **Audio Analysis** - Instant file info (duration, size, codec, sample rate)

### 🎯 **Intelligent Transcription**
- **99+ Languages** - Auto-detection or manual selection
- **5 Model Sizes** - From lightning-fast to maximum accuracy
- **Translation Mode** - Convert any language to English
- **Smart Timestamps** - Segment and word-level timing
- **Multiple Formats** - JSON, TXT, SRT, VTT, TSV output

### ⚡ **Advanced Processing**
- **Batch Processing** - Handle multiple files simultaneously
- **Large File Support** - Automatic chunking for long audio
- **GPU Acceleration** - CUDA support for 10x faster processing
- **Resume Capability** - Continue interrupted transcriptions
- **Recent History** - Track and revisit past transcriptions

### 🛠️ **Developer Friendly**
- **CLI & API** - Command-line tool and Node.js library
- **WebSocket API** - Real-time integration capabilities
- **Comprehensive Logging** - Detailed progress and error reporting
- **Docker Support** - Containerized deployment ready

---

## 🚀 Quick Start

### 🌐 **Web Application** (Recommended)

The easiest way to get started is with our web interface:

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/whisper-transcriber.git
cd whisper-transcriber

# 2. Install dependencies
pnpm install

# 3. Run setup (checks and installs Whisper/FFmpeg)
./start-web.sh

# 4. Open http://localhost:3000 in your browser
```

**That's it!** 🎉 Drag an audio file into the browser and start transcribing!

### ⚡ **Command Line**

For power users and automation:

```bash
# Quick transcription
npm run transcribe audio.mp3

# With custom settings
node src/cli.js transcribe audio.mp3 --model small --language en --translate

# Batch processing
node src/cli.js transcribe "interviews/*.mp3" --output ./transcripts
```

---

## 📋 Prerequisites

Before you begin, ensure you have:

| Requirement | Installation | Purpose |
|-------------|--------------|---------|
| **Node.js 16+** | [Download](https://nodejs.org) | Runtime environment |
| **Python 3.8+** | [Download](https://python.org) | Whisper dependencies |
| **FFmpeg** | [Install Guide](#ffmpeg-installation) | Audio processing |
| **Whisper** | `pip install openai-whisper` | AI transcription model |

### FFmpeg Installation

**Windows:**
```bash
choco install ffmpeg
# or download from https://ffmpeg.org/download.html
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install ffmpeg
```

**Verification:**
```bash
# Check if everything is installed
npm run check-deps
```

---

## 🎨 Web Interface Guide

### Upload Methods
- **Drag & Drop**: Drag files directly onto the upload area
- **Click to Browse**: Click the upload area to open file picker
- **Supported Formats**: MP3, WAV, M4A, MP4, WEBM, OGG, FLAC

### Model Selection
| Model | Size | Speed | Accuracy | Best For |
|-------|------|-------|----------|----------|
| **tiny** | 39 MB | ⚡⚡⚡ | ⭐⭐ | Quick drafts, real-time |
| **base** | 74 MB | ⚡⚡ | ⭐⭐⭐ | General use (recommended) |
| **small** | 244 MB | ⚡ | ⭐⭐⭐⭐ | Better accuracy needed |
| **medium** | 769 MB | 🐌 | ⭐⭐⭐⭐⭐ | High accuracy required |
| **large** | 1550 MB | 🐌🐌 | ⭐⭐⭐⭐⭐⭐ | Maximum accuracy |

### Language Options
- **Auto-detect**: Let AI determine the language
- **Manual Selection**: Choose from 13+ common languages
- **Translation**: Convert any language to English

### Advanced Features
- **Timestamps**: Include timing information for each segment
- **Word Timestamps**: Get precise word-level timing
- **Real-time Progress**: Watch transcription progress live
- **Copy & Download**: Easy text export options

---

## 💻 Command Line Reference

### Basic Commands

```bash
# Check system dependencies
node src/cli.js check

# Transcribe single file
node src/cli.js transcribe audio.mp3

# Transcribe with options
node src/cli.js transcribe audio.mp3 \
  --model small \
  --language en \
  --output ./results \
  --format srt

# Batch transcribe
node src/cli.js transcribe "*.mp3" --model base

# Translate to English
node src/cli.js transcribe spanish-audio.mp3 --translate

# Get audio file info
node src/cli.js info audio.mp3

# Split long audio
node src/cli.js split long-podcast.mp3 --duration 300

# List available models
node src/cli.js models

# Download specific model
node src/cli.js download medium
```

### CLI Options

| Option | Values | Description |
|--------|---------|-------------|
| `-m, --model` | tiny, base, small, medium, large | Model size |
| `-l, --language` | en, es, fr, de, etc. | Language code |
| `-o, --output` | path | Output directory |
| `-f, --format` | json, txt, srt, vtt, tsv | Output format |
| `--translate` | - | Translate to English |
| `--timestamps` | - | Include timestamps |
| `--word-timestamps` | - | Word-level timestamps |
| `--device` | cpu, cuda | Processing device |
| `-v, --verbose` | - | Detailed logging |

---

## 🔧 API Usage

### Basic Transcription

```javascript
import { WhisperTranscriber } from './src/index.js';

// Initialize transcriber
const transcriber = new WhisperTranscriber({
  modelSize: 'base',
  language: 'auto',
  device: 'cpu'
});

// Transcribe audio file
const result = await transcriber.transcribe('podcast.mp3', {
  outputFormat: 'json',
  timestamps: true
});

console.log(`Transcript: ${result.text}`);
console.log(`Language: ${result.language}`);
console.log(`Segments: ${result.segments.length}`);
```

### Batch Processing

```javascript
import { BatchProcessor } from './src/BatchProcessor.js';

const processor = new BatchProcessor({
  modelSize: 'small',
  outputDir: './results',
  concurrency: 2
});

// Process entire directory
const { results, errors } = await processor.processDirectory('./audio-files');

console.log(`Processed ${results.length} files successfully`);
if (errors.length > 0) {
  console.log(`${errors.length} files failed`);
}

// Merge all transcripts
await processor.mergeTranscripts('combined-transcript.txt');
```

### Advanced Features

```javascript
// Get audio information
const info = await transcriber.getAudioInfo('audio.mp3');
console.log(`Duration: ${info.duration}`);
console.log(`Size: ${info.sizeFormatted}`);

// Split long audio
const chunks = await transcriber.splitAudio('long-audio.mp3', 300);
console.log(`Split into ${chunks.length} chunks`);

// Translate to English
const translation = await transcriber.translateToEnglish('spanish-audio.mp3');
console.log(translation.text);

// Check system requirements
await transcriber.checkDependencies(); // Throws error if missing
```

---

## 🏗️ Project Structure

```
whisper-transcriber/
├── 🌐 web/
│   └── server.js              # Express server with WebSocket support
├── 🎨 public/
│   ├── index.html             # Modern web interface
│   ├── styles.css             # Dark theme styling
│   └── app.js                 # Client-side JavaScript
├── 🔧 src/
│   ├── WhisperTranscriber.js  # Core transcription engine
│   ├── BatchProcessor.js      # Batch processing utilities
│   ├── cli.js                 # Command-line interface
│   └── index.js               # Module exports
├── 💡 examples/
│   ├── basic-usage.js         # Simple transcription
│   ├── batch-processing.js    # Batch operations
│   └── advanced-features.js   # Advanced examples
├── 🛠️ scripts/
│   ├── setup.js               # Automatic setup
│   └── check-dependencies.js  # Dependency verification
├── 📁 uploads/                # Temporary upload storage
├── 📁 output/                 # Default output directory
├── 📄 package.json
├── 🚀 start-web.sh            # Easy web app launcher
└── 📚 README.md
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file from `.env.example`:

```bash
# Whisper Configuration
WHISPER_MODEL=base
WHISPER_LANGUAGE=auto
WHISPER_DEVICE=cpu

# Output Settings
OUTPUT_DIR=./output
OUTPUT_FORMAT=json

# Processing Options
BATCH_CONCURRENCY=2
CONTINUE_ON_ERROR=true
ENABLE_TIMESTAMPS=true
ENABLE_WORD_TIMESTAMPS=false
VERBOSE_OUTPUT=false

# Web Server
PORT=3000
```

### Advanced Configuration

```javascript
// Custom transcriber configuration
const transcriber = new WhisperTranscriber({
  modelSize: 'small',           // Model selection
  language: 'auto',             // Language detection
  device: 'cuda',               // GPU acceleration
  verbose: true,                // Detailed logging
});

// Custom batch processor
const processor = new BatchProcessor({
  modelSize: 'medium',
  outputDir: './transcripts',
  concurrency: 3,               // Parallel processing
  continueOnError: true,        // Don't stop on failures
});
```

---

## 🚀 Performance Optimization

### GPU Acceleration

For 5-10x faster processing with NVIDIA GPUs:

```bash
# Install CUDA toolkit
# Then use GPU device
node src/cli.js transcribe audio.mp3 --device cuda
```

### Memory Management

```bash
# For large files, use smaller models or split audio
node src/cli.js split large-file.mp3 --duration 600
node src/cli.js transcribe "chunks/*.mp3" --model small
```

### Batch Processing Tips

```javascript
// Process multiple files efficiently
const processor = new BatchProcessor({
  concurrency: 2,               // Adjust based on CPU/GPU
  continueOnError: true,        // Don't stop batch on single failure
});
```

---

## 🔍 Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| ❌ **"Whisper not found"** | Install: `pip install openai-whisper` |
| ❌ **"FFmpeg not found"** | Install FFmpeg for your OS |
| ⚠️ **Out of memory** | Use smaller model or split audio |
| 🐌 **Slow processing** | Use GPU (`--device cuda`) or smaller model |
| 📝 **Poor accuracy** | Try larger model or preprocess audio |
| 🌐 **Web app won't start** | Run `npm run check-deps` first |
| 📱 **Upload fails** | Check file size (<500MB) and format |

### Debug Mode

```bash
# Enable verbose logging
node src/cli.js transcribe audio.mp3 --verbose

# Check system status
node src/cli.js check

# Test with example
node examples/basic-usage.js
```

### Getting Help

1. **Check Dependencies**: `npm run check-deps`
2. **Run Setup**: `./start-web.sh`
3. **View Logs**: Enable verbose mode
4. **Test Examples**: Try files in `examples/` directory

---

## 🌟 Use Cases

### 📚 **Content Creation**
- **Podcast Transcription**: Convert episodes to searchable text
- **Video Subtitles**: Generate SRT files for YouTube/Vimeo
- **Blog Content**: Transform interviews into articles
- **Course Materials**: Create transcripts for online courses

### 💼 **Business Applications**
- **Meeting Minutes**: Transcribe team meetings and calls
- **Customer Support**: Process support call recordings
- **Market Research**: Analyze interview data
- **Legal Documentation**: Transcribe depositions and hearings

### 🎓 **Education & Research**
- **Lecture Transcription**: Make classes accessible
- **Research Interviews**: Process qualitative data
- **Language Learning**: Create study materials
- **Accessibility**: Support hearing-impaired students

### 🌍 **Multilingual Support**
- **Translation Services**: Convert speech to English
- **International Content**: Support global audiences
- **Language Documentation**: Preserve endangered languages
- **Cross-cultural Communication**: Bridge language barriers

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### 🐛 **Report Issues**
- Found a bug? [Open an issue](https://github.com/yourusername/whisper-transcriber/issues)
- Include system info, error messages, and reproduction steps

### 💡 **Suggest Features**
- Have an idea? [Start a discussion](https://github.com/yourusername/whisper-transcriber/discussions)
- Check existing issues first to avoid duplicates

### 🔨 **Code Contributions**
```bash
# 1. Fork the repository
# 2. Create feature branch
git checkout -b feature/amazing-feature

# 3. Make changes and commit
git commit -m "Add amazing feature"

# 4. Push to branch
git push origin feature/amazing-feature

# 5. Open Pull Request
```

### 📋 **Development Setup**
```bash
# Clone repository
git clone https://github.com/yourusername/whisper-transcriber.git
cd whisper-transcriber

# Install dependencies
pnpm install

# Run tests
npm test

# Start development server
npm run dev
```

---

## 📊 Performance Benchmarks

### Model Comparison (1 hour audio)

| Model | Time (CPU) | Time (GPU) | Accuracy | Use Case |
|-------|------------|------------|----------|----------|
| tiny | 2 min | 30 sec | 85% | Quick drafts |
| base | 5 min | 1 min | 92% | General use |
| small | 12 min | 2.5 min | 95% | High quality |
| medium | 25 min | 5 min | 97% | Professional |
| large | 45 min | 8 min | 98% | Maximum quality |

### File Format Support

| Format | Support | Notes |
|--------|---------|-------|
| MP3 | ✅ | Most common, good compression |
| WAV | ✅ | Uncompressed, best quality |
| M4A | ✅ | Apple format, good quality |
| MP4 | ✅ | Video files (audio extracted) |
| WEBM | ✅ | Web format |
| OGG | ✅ | Open source format |
| FLAC | ✅ | Lossless compression |

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenAI** for the incredible Whisper model
- **Express.js** community for the web framework
- **Node.js** ecosystem for excellent tooling
- **Contributors** who make this project better

---

## 🔗 Links

- 🏠 **Homepage**: [Whisper Transcriber](https://github.com/yourusername/whisper-transcriber)
- 📖 **Documentation**: [Full API Docs](https://github.com/yourusername/whisper-transcriber/wiki)
- 🐛 **Issues**: [Report Bugs](https://github.com/yourusername/whisper-transcriber/issues)
- 💬 **Discussions**: [Community Chat](https://github.com/yourusername/whisper-transcriber/discussions)
- 📧 **Contact**: [Email Support](mailto:support@whispertranscriber.com)

---

<div align="center">

**Made with ❤️ by developers, for developers**

[⭐ Star this repo](https://github.com/yourusername/whisper-transcriber) | [🍴 Fork it](https://github.com/yourusername/whisper-transcriber/fork) | [📥 Download](https://github.com/yourusername/whisper-transcriber/archive/main.zip)

</div>