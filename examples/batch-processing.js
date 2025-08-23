import { BatchProcessor } from '../src/BatchProcessor.js';
import chalk from 'chalk';

async function batchExample() {
  console.log(chalk.blue('Batch Processing Example\n'));
  
  const processor = new BatchProcessor({
    modelSize: 'small',
    language: 'en',
    outputDir: './output/batch',
    concurrency: 2,
    continueOnError: true
  });

  try {
    console.log('Processing all audio files in ./test-audio directory...\n');
    
    const { results, errors, duration } = await processor.processDirectory('./test-audio');
    
    console.log(chalk.green('\n=== Processing Complete ===\n'));
    console.log(`Total files: ${results.length + errors.length}`);
    console.log(`Successful: ${results.length}`);
    console.log(`Failed: ${errors.length}`);
    console.log(`Total time: ${duration.toFixed(2)} seconds`);
    
    if (results.length > 0) {
      const avgSpeed = results
        .filter(r => r.speedRatio)
        .reduce((sum, r) => sum + parseFloat(r.speedRatio), 0) / results.length;
      
      console.log(`Average speed ratio: ${avgSpeed.toFixed(2)}x`);
    }
    
    console.log('\nMerging all transcripts...');
    const mergedFile = await processor.mergeTranscripts();
    console.log(`Merged transcript saved to: ${mergedFile}`);
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
  }
}

batchExample();