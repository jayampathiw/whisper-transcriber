import { WhisperTranscriber } from '../src/index.js';
import chalk from 'chalk';
import path from 'path';

async function advancedExample() {
  console.log(chalk.blue('Advanced Whisper Features Example\n'));
  
  const transcriber = new WhisperTranscriber({
    modelSize: 'small',
    language: 'auto',
    device: 'cpu'
  });

  const audioFile = './test-audio/sample.mp3';

  try {
    console.log(chalk.cyan('1. Getting audio information...'));
    const info = await transcriber.getAudioInfo(audioFile);
    if (info) {
      console.log(`   Duration: ${info.duration}`);
      console.log(`   Size: ${info.sizeFormatted}`);
      console.log(`   Codec: ${info.codec}`);
    }

    console.log(chalk.cyan('\n2. Transcribing with word timestamps...'));
    const wordResult = await transcriber.transcribe(audioFile, {
      outputFormat: 'json',
      outputDir: './output',
      wordTimestamps: true,
      timestamps: true
    });
    console.log('   Transcription with timestamps completed');

    console.log(chalk.cyan('\n3. Translating to English...'));
    const translation = await transcriber.translateToEnglish(audioFile, {
      outputFormat: 'json',
      outputDir: './output/translations'
    });
    console.log('   Translation completed');
    if (translation.text) {
      console.log(`   Preview: ${translation.text.substring(0, 100)}...`);
    }

    console.log(chalk.cyan('\n4. Generating subtitles (SRT format)...'));
    await transcriber.transcribe(audioFile, {
      outputFormat: 'srt',
      outputDir: './output/subtitles'
    });
    console.log('   SRT subtitles generated');

    console.log(chalk.cyan('\n5. Processing long audio with chunking...'));
    const longAudio = './test-audio/long-audio.mp3';
    const longInfo = await transcriber.getAudioInfo(longAudio);
    
    if (longInfo && longInfo.durationSeconds > 600) {
      console.log('   Audio is longer than 10 minutes, splitting into chunks...');
      const chunks = await transcriber.splitAudio(longAudio, 300);
      console.log(`   Split into ${chunks.length} chunks`);
      
      for (const [index, chunk] of chunks.entries()) {
        console.log(`   Processing chunk ${index + 1}/${chunks.length}...`);
        await transcriber.transcribe(chunk, {
          outputFormat: 'json',
          outputDir: './output/chunks'
        });
      }
    }

    console.log(chalk.cyan('\n6. Multiple output formats...'));
    const formats = ['txt', 'vtt', 'tsv'];
    for (const format of formats) {
      await transcriber.transcribe(audioFile, {
        outputFormat: format,
        outputDir: `./output/${format}`
      });
      console.log(`   Generated ${format.toUpperCase()} format`);
    }

    console.log(chalk.green('\n✅ All advanced features demonstrated successfully!'));

  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
  }
}

advancedExample();