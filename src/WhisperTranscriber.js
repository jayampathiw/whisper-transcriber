import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ora from 'ora';
import chalk from 'chalk';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class WhisperTranscriber {
  constructor(options = {}) {
    this.modelSize = options.modelSize || 'base';
    this.language = options.language || 'en';
    this.device = options.device || 'cpu';
    this.verbose = options.verbose || false;
  }

  async checkDependencies() {
    const spinner = ora('Checking dependencies...').start();
    
    try {
      await execAsync('whisper --help');
      spinner.succeed('Whisper is installed');
    } catch (error) {
      spinner.fail('Whisper is not installed');
      throw new Error('Please install Whisper: pip install openai-whisper');
    }

    try {
      await execAsync('ffmpeg -version');
      spinner.succeed('FFmpeg is installed');
    } catch (error) {
      spinner.fail('FFmpeg is not installed');
      throw new Error('Please install FFmpeg for audio processing');
    }

    return true;
  }

  async transcribe(audioPath, options = {}) {
    const {
      outputFormat = 'json',
      outputDir = path.dirname(audioPath),
      task = 'transcribe',
      timestamps = true,
      wordTimestamps = false
    } = options;

    if (!await this.fileExists(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    const spinner = ora(`Transcribing ${path.basename(audioPath)}...`).start();

    const commandArgs = [
      'whisper',
      `"${audioPath}"`,
      `--model ${this.modelSize}`,
      `--language ${this.language}`,
      `--output_format ${outputFormat}`,
      `--output_dir "${outputDir}"`,
      `--task ${task}`,
      `--device ${this.device}`
    ];

    if (!timestamps) commandArgs.push('--no_timestamps');
    if (wordTimestamps) commandArgs.push('--word_timestamps True');
    if (this.verbose) commandArgs.push('--verbose True');

    const command = commandArgs.join(' ');

    try {
      if (this.verbose) {
        console.log(chalk.gray(`\nExecuting: ${command}\n`));
      }

      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 1024 * 1024 * 10
      });

      spinner.succeed(`Transcription complete for ${path.basename(audioPath)}`);

      if (outputFormat === 'json') {
        const baseName = path.basename(audioPath, path.extname(audioPath));
        const jsonPath = path.join(outputDir, `${baseName}.json`);
        const content = await fs.readFile(jsonPath, 'utf-8');
        return JSON.parse(content);
      }

      return { success: true, message: 'Transcription saved' };
    } catch (error) {
      spinner.fail('Transcription failed');
      throw new Error(`Transcription error: ${error.message}`);
    }
  }

  async transcribeBatch(audioPaths, options = {}) {
    const results = [];
    const errors = [];

    console.log(chalk.blue(`\nProcessing ${audioPaths.length} files...\n`));

    for (const [index, audioPath] of audioPaths.entries()) {
      console.log(chalk.gray(`[${index + 1}/${audioPaths.length}] ${audioPath}`));
      
      try {
        const result = await this.transcribe(audioPath, options);
        results.push({
          file: audioPath,
          success: true,
          transcript: result.text || result
        });
      } catch (error) {
        errors.push({
          file: audioPath,
          error: error.message
        });
        console.error(chalk.red(`  Error: ${error.message}`));
      }
    }

    return { results, errors };
  }

  async translateToEnglish(audioPath, options = {}) {
    return this.transcribe(audioPath, { ...options, task: 'translate' });
  }

  async getAvailableModels() {
    const models = [
      { name: 'tiny', size: '39 MB', speed: 'Fastest', accuracy: 'Lowest' },
      { name: 'base', size: '74 MB', speed: 'Fast', accuracy: 'Good' },
      { name: 'small', size: '244 MB', speed: 'Medium', accuracy: 'Better' },
      { name: 'medium', size: '769 MB', speed: 'Slow', accuracy: 'Great' },
      { name: 'large', size: '1550 MB', speed: 'Slowest', accuracy: 'Best' }
    ];

    return models;
  }

  async downloadModel(modelName) {
    const spinner = ora(`Downloading model: ${modelName}...`).start();
    
    try {
      const command = `python -c "import whisper; whisper.load_model('${modelName}')"`;
      await execAsync(command);
      spinner.succeed(`Model ${modelName} downloaded successfully`);
    } catch (error) {
      spinner.fail(`Failed to download model ${modelName}`);
      throw error;
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getAudioInfo(audioPath) {
    try {
      const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${audioPath}"`;
      const { stdout } = await execAsync(command);
      const info = JSON.parse(stdout);
      
      const audioStream = info.streams.find(s => s.codec_type === 'audio');
      const duration = parseFloat(info.format.duration);
      
      return {
        duration: this.formatDuration(duration),
        durationSeconds: duration,
        codec: audioStream?.codec_name,
        sampleRate: audioStream?.sample_rate,
        channels: audioStream?.channels,
        bitrate: info.format.bit_rate,
        size: parseInt(info.format.size),
        sizeFormatted: this.formatFileSize(parseInt(info.format.size))
      };
    } catch (error) {
      return null;
    }
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let size = bytes;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  async splitAudio(audioPath, chunkDuration = 300) {
    const outputDir = path.join(path.dirname(audioPath), 'chunks');
    await fs.mkdir(outputDir, { recursive: true });
    
    const baseName = path.basename(audioPath, path.extname(audioPath));
    const ext = path.extname(audioPath);
    
    const command = `ffmpeg -i "${audioPath}" -f segment -segment_time ${chunkDuration} -c copy "${outputDir}/${baseName}_%03d${ext}"`;
    
    const spinner = ora('Splitting audio into chunks...').start();
    
    try {
      await execAsync(command);
      spinner.succeed('Audio split successfully');
      
      const files = await fs.readdir(outputDir);
      const chunks = files
        .filter(f => f.startsWith(baseName))
        .map(f => path.join(outputDir, f));
      
      return chunks;
    } catch (error) {
      spinner.fail('Failed to split audio');
      throw error;
    }
  }
}

export default WhisperTranscriber;