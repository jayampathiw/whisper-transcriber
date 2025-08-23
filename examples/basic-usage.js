import { WhisperTranscriber } from '../src/index.js';

async function basicExample() {
  console.log('Basic Whisper Transcription Example\n');
  
  const transcriber = new WhisperTranscriber({
    modelSize: 'base',
    language: 'en',
    verbose: true
  });

  try {
    await transcriber.checkDependencies();
    
    const audioFile = './test-audio/sample.mp3';
    
    console.log(`\nTranscribing: ${audioFile}`);
    
    const result = await transcriber.transcribe(audioFile, {
      outputFormat: 'json',
      outputDir: './output'
    });
    
    console.log('\nTranscription Result:');
    console.log('Text:', result.text);
    console.log('Language:', result.language);
    
    if (result.segments) {
      console.log(`\nNumber of segments: ${result.segments.length}`);
      console.log('\nFirst 3 segments:');
      result.segments.slice(0, 3).forEach((seg, i) => {
        console.log(`${i + 1}. [${seg.start}s - ${seg.end}s]: ${seg.text}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

basicExample();