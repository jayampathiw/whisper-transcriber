#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs/promises';
import { glob } from 'glob';
import { WhisperTranscriber } from './WhisperTranscriber.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'package.json'), 'utf-8'));

const program = new Command();

program
  .name('whisper-transcribe')
  .description('Transcribe audio files using OpenAI Whisper')
  .version(packageJson.version);

program
  .command('transcribe <audio>')
  .description('Transcribe an audio file or pattern')
  .option('-m, --model <size>', 'Model size (tiny, base, small, medium, large)', 'base')
  .option('-l, --language <code>', 'Language code (en, es, fr, etc.)', 'en')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-f, --format <type>', 'Output format (json, txt, srt, vtt, tsv)', 'json')
  .option('--translate', 'Translate to English instead of transcribing')
  .option('--timestamps', 'Include timestamps', true)
  .option('--word-timestamps', 'Include word-level timestamps')
  .option('--device <type>', 'Device to use (cpu, cuda)', 'cpu')
  .option('-v, --verbose', 'Verbose output')
  .action(async (audio, options) => {
    try {
      const transcriber = new WhisperTranscriber({
        modelSize: options.model,
        language: options.language,
        device: options.device,
        verbose: options.verbose
      });

      await transcriber.checkDependencies();

      let files = [];
      
      if (audio.includes('*')) {
        files = await glob(audio);
        if (files.length === 0) {
          console.error(chalk.red(`No files matching pattern: ${audio}`));
          process.exit(1);
        }
      } else {
        const stats = await fs.stat(audio).catch(() => null);
        if (!stats) {
          console.error(chalk.red(`File not found: ${audio}`));
          process.exit(1);
        }
        files = [audio];
      }

      await fs.mkdir(options.output, { recursive: true });

      console.log(chalk.blue('\n🎙️  Whisper Transcriber\n'));
      console.log(chalk.gray(`Model: ${options.model}`));
      console.log(chalk.gray(`Language: ${options.language}`));
      console.log(chalk.gray(`Output: ${options.output}`));
      console.log(chalk.gray(`Format: ${options.format}\n`));

      if (files.length === 1) {
        const audioInfo = await transcriber.getAudioInfo(files[0]);
        if (audioInfo) {
          console.log(chalk.cyan('Audio Information:'));
          console.log(chalk.gray(`  Duration: ${audioInfo.duration}`));
          console.log(chalk.gray(`  Size: ${audioInfo.sizeFormatted}`));
          console.log(chalk.gray(`  Codec: ${audioInfo.codec}`));
          console.log(chalk.gray(`  Sample Rate: ${audioInfo.sampleRate} Hz\n`));
        }

        const result = await transcriber.transcribe(files[0], {
          outputFormat: options.format,
          outputDir: options.output,
          task: options.translate ? 'translate' : 'transcribe',
          timestamps: options.timestamps,
          wordTimestamps: options.wordTimestamps
        });

        if (options.format === 'json' && result.text) {
          console.log(chalk.green('\n✅ Transcription Complete!\n'));
          console.log(chalk.white('Text:'));
          console.log(result.text);
          
          const outputPath = path.join(options.output, `${path.basename(files[0], path.extname(files[0]))}.json`);
          console.log(chalk.gray(`\nFull output saved to: ${outputPath}`));
        } else {
          console.log(chalk.green('\n✅ Transcription saved successfully!'));
        }
      } else {
        const { results, errors } = await transcriber.transcribeBatch(files, {
          outputFormat: options.format,
          outputDir: options.output,
          task: options.translate ? 'translate' : 'transcribe',
          timestamps: options.timestamps,
          wordTimestamps: options.wordTimestamps
        });

        console.log(chalk.green(`\n✅ Batch transcription complete!`));
        console.log(chalk.gray(`  Successful: ${results.length}`));
        if (errors.length > 0) {
          console.log(chalk.red(`  Failed: ${errors.length}`));
          errors.forEach(e => {
            console.log(chalk.red(`    - ${e.file}: ${e.error}`));
          });
        }
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('models')
  .description('List available Whisper models')
  .action(async () => {
    const transcriber = new WhisperTranscriber();
    const models = await transcriber.getAvailableModels();
    
    console.log(chalk.blue('\n📦 Available Whisper Models:\n'));
    
    models.forEach(model => {
      console.log(chalk.cyan(`  ${model.name.padEnd(8)} - ${model.size.padEnd(10)} (${model.speed}, ${model.accuracy})`));
    });
    
    console.log(chalk.gray('\nTip: Larger models provide better accuracy but are slower.'));
  });

program
  .command('download <model>')
  .description('Download a specific Whisper model')
  .action(async (model) => {
    try {
      const transcriber = new WhisperTranscriber();
      await transcriber.downloadModel(model);
      console.log(chalk.green(`\n✅ Model ${model} is ready to use!`));
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('info <audio>')
  .description('Get information about an audio file')
  .action(async (audio) => {
    try {
      const transcriber = new WhisperTranscriber();
      const info = await transcriber.getAudioInfo(audio);
      
      if (info) {
        console.log(chalk.blue('\n🎵 Audio File Information:\n'));
        console.log(chalk.cyan(`File: ${path.basename(audio)}`));
        console.log(chalk.gray(`Duration: ${info.duration}`));
        console.log(chalk.gray(`Size: ${info.sizeFormatted}`));
        console.log(chalk.gray(`Codec: ${info.codec}`));
        console.log(chalk.gray(`Sample Rate: ${info.sampleRate} Hz`));
        console.log(chalk.gray(`Channels: ${info.channels}`));
        console.log(chalk.gray(`Bitrate: ${(info.bitrate / 1000).toFixed(0)} kbps`));
      } else {
        console.error(chalk.red('Could not read audio file information'));
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('split <audio>')
  .description('Split audio into smaller chunks for processing')
  .option('-d, --duration <seconds>', 'Chunk duration in seconds', '300')
  .action(async (audio, options) => {
    try {
      const transcriber = new WhisperTranscriber();
      const chunks = await transcriber.splitAudio(audio, parseInt(options.duration));
      
      console.log(chalk.green(`\n✅ Audio split into ${chunks.length} chunks:`));
      chunks.forEach(chunk => {
        console.log(chalk.gray(`  - ${path.basename(chunk)}`));
      });
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('check')
  .description('Check if all dependencies are installed')
  .action(async () => {
    try {
      const transcriber = new WhisperTranscriber();
      await transcriber.checkDependencies();
      console.log(chalk.green('\n✅ All dependencies are installed and ready!'));
    } catch (error) {
      console.error(chalk.red(`\n❌ ${error.message}`));
      console.log(chalk.yellow('\nInstallation instructions:'));
      console.log(chalk.gray('1. Install Python 3.8+: https://python.org'));
      console.log(chalk.gray('2. Install Whisper: pip install openai-whisper'));
      console.log(chalk.gray('3. Install FFmpeg: https://ffmpeg.org/download.html'));
      process.exit(1);
    }
  });

program.parse();