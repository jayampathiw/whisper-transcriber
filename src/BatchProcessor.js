import { WhisperTranscriber } from './WhisperTranscriber.js';
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';

export class BatchProcessor {
  constructor(options = {}) {
    this.transcriber = new WhisperTranscriber(options);
    this.concurrency = options.concurrency || 1;
    this.outputDir = options.outputDir || './output';
    this.continueOnError = options.continueOnError !== false;
  }

  async processDirectory(directory, pattern = '*.{mp3,wav,m4a,mp4,mpeg,mpga,webm}') {
    const searchPattern = path.join(directory, '**', pattern);
    const files = await glob(searchPattern);
    
    if (files.length === 0) {
      console.log(chalk.yellow(`No audio files found in ${directory}`));
      return { results: [], errors: [] };
    }

    console.log(chalk.blue(`Found ${files.length} audio files to process`));
    return this.processFiles(files);
  }

  async processFiles(files) {
    const results = [];
    const errors = [];
    const startTime = Date.now();

    await fs.mkdir(this.outputDir, { recursive: true });

    const batches = this.createBatches(files, this.concurrency);
    
    for (const [batchIndex, batch] of batches.entries()) {
      console.log(chalk.cyan(`\nProcessing batch ${batchIndex + 1}/${batches.length}`));
      
      const batchPromises = batch.map(async (file) => {
        try {
          const result = await this.processFile(file);
          results.push(result);
          return result;
        } catch (error) {
          const errorInfo = {
            file,
            error: error.message,
            timestamp: new Date().toISOString()
          };
          errors.push(errorInfo);
          
          if (!this.continueOnError) {
            throw error;
          }
          
          console.error(chalk.red(`Failed: ${path.basename(file)} - ${error.message}`));
          return null;
        }
      });

      await Promise.all(batchPromises);
    }

    const duration = (Date.now() - startTime) / 1000;
    
    await this.saveReport({
      results,
      errors,
      duration,
      totalFiles: files.length,
      successful: results.length,
      failed: errors.length
    });

    return { results, errors, duration };
  }

  async processFile(filePath) {
    const fileName = path.basename(filePath);
    const outputName = path.basename(filePath, path.extname(filePath));
    
    console.log(chalk.gray(`Processing: ${fileName}`));
    
    const audioInfo = await this.transcriber.getAudioInfo(filePath);
    const startTime = Date.now();
    
    const transcript = await this.transcriber.transcribe(filePath, {
      outputFormat: 'json',
      outputDir: this.outputDir
    });
    
    const processingTime = (Date.now() - startTime) / 1000;
    
    const result = {
      file: filePath,
      fileName,
      outputFile: path.join(this.outputDir, `${outputName}.json`),
      duration: audioInfo?.durationSeconds,
      processingTime,
      speedRatio: audioInfo ? (audioInfo.durationSeconds / processingTime).toFixed(2) : null,
      text: transcript.text,
      language: transcript.language,
      timestamp: new Date().toISOString()
    };

    console.log(chalk.green(`✓ Completed: ${fileName} (${processingTime.toFixed(1)}s)`));
    
    return result;
  }

  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  async saveReport(report) {
    const reportPath = path.join(this.outputDir, 'transcription_report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    const summaryPath = path.join(this.outputDir, 'summary.txt');
    const summary = this.generateSummary(report);
    await fs.writeFile(summaryPath, summary);
    
    console.log(chalk.blue(`\nReport saved to: ${reportPath}`));
    console.log(chalk.blue(`Summary saved to: ${summaryPath}`));
  }

  generateSummary(report) {
    const lines = [
      '='.repeat(60),
      'TRANSCRIPTION BATCH PROCESSING SUMMARY',
      '='.repeat(60),
      '',
      `Total Files Processed: ${report.totalFiles}`,
      `Successful: ${report.successful}`,
      `Failed: ${report.failed}`,
      `Total Duration: ${report.duration.toFixed(2)} seconds`,
      '',
      '='.repeat(60),
      'SUCCESSFULLY PROCESSED FILES:',
      '='.repeat(60),
      ''
    ];

    report.results.forEach((result, index) => {
      lines.push(`${index + 1}. ${result.fileName}`);
      lines.push(`   Duration: ${result.duration ? result.duration.toFixed(1) + 's' : 'N/A'}`);
      lines.push(`   Processing Time: ${result.processingTime.toFixed(1)}s`);
      lines.push(`   Speed Ratio: ${result.speedRatio ? result.speedRatio + 'x' : 'N/A'}`);
      lines.push(`   Text Preview: ${result.text ? result.text.substring(0, 100) + '...' : 'No text'}`);
      lines.push('');
    });

    if (report.errors.length > 0) {
      lines.push('='.repeat(60));
      lines.push('FAILED FILES:');
      lines.push('='.repeat(60));
      lines.push('');
      
      report.errors.forEach((error, index) => {
        lines.push(`${index + 1}. ${error.file}`);
        lines.push(`   Error: ${error.error}`);
        lines.push('');
      });
    }

    return lines.join('\n');
  }

  async mergeTranscripts(outputFile = 'merged_transcript.txt') {
    const jsonFiles = await glob(path.join(this.outputDir, '*.json'));
    const transcripts = [];

    for (const file of jsonFiles) {
      if (path.basename(file) === 'transcription_report.json') continue;
      
      const content = await fs.readFile(file, 'utf-8');
      const data = JSON.parse(content);
      
      if (data.text) {
        transcripts.push({
          file: path.basename(file),
          text: data.text
        });
      }
    }

    const mergedContent = transcripts
      .map(t => `[${t.file}]\n${t.text}\n`)
      .join('\n' + '='.repeat(60) + '\n');

    const outputPath = path.join(this.outputDir, outputFile);
    await fs.writeFile(outputPath, mergedContent);
    
    console.log(chalk.green(`Merged ${transcripts.length} transcripts to: ${outputPath}`));
    return outputPath;
  }
}

export default BatchProcessor;