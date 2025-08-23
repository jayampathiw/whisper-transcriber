import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setup() {
  console.log(chalk.blue('\n🚀 Whisper Transcriber Setup\n'));
  
  const steps = [
    {
      name: 'Check Python',
      check: async () => {
        const { stdout } = await execAsync('python --version').catch(() => ({ stdout: '' }));
        return stdout.includes('Python');
      },
      install: 'Please install Python 3.8+ from https://python.org'
    },
    {
      name: 'Check pip',
      check: async () => {
        const { stdout } = await execAsync('pip --version').catch(() => ({ stdout: '' }));
        return stdout.includes('pip');
      },
      install: 'Please ensure pip is installed with Python'
    },
    {
      name: 'Check FFmpeg',
      check: async () => {
        const { stdout } = await execAsync('ffmpeg -version').catch(() => ({ stdout: '' }));
        return stdout.includes('ffmpeg');
      },
      install: 'Please install FFmpeg:\n  Windows: choco install ffmpeg\n  Mac: brew install ffmpeg\n  Linux: sudo apt install ffmpeg'
    },
    {
      name: 'Check Whisper',
      check: async () => {
        const { stdout } = await execAsync('whisper --help').catch(() => ({ stdout: '' }));
        return stdout.includes('whisper');
      },
      install: 'Installing Whisper...',
      autoInstall: async () => {
        const spinner = ora('Installing OpenAI Whisper...').start();
        try {
          await execAsync('pip install openai-whisper');
          spinner.succeed('Whisper installed successfully');
          return true;
        } catch (error) {
          spinner.fail('Failed to install Whisper');
          console.log(chalk.yellow('Please run manually: pip install openai-whisper'));
          return false;
        }
      }
    }
  ];

  let allGood = true;

  for (const step of steps) {
    const spinner = ora(`Checking ${step.name}...`).start();
    
    const isInstalled = await step.check();
    
    if (isInstalled) {
      spinner.succeed(`${step.name} is installed`);
    } else {
      spinner.fail(`${step.name} is not installed`);
      
      if (step.autoInstall) {
        const installed = await step.autoInstall();
        if (!installed) {
          allGood = false;
        }
      } else {
        console.log(chalk.yellow(step.install));
        allGood = false;
      }
    }
  }

  console.log('\n' + chalk.cyan('Creating directories...'));
  
  const dirs = ['output', 'test-audio', 'output/batch', 'output/translations', 'output/subtitles'];
  for (const dir of dirs) {
    const dirPath = path.join(path.dirname(__dirname), dir);
    await fs.mkdir(dirPath, { recursive: true });
    console.log(chalk.gray(`  ✓ ${dir}/`));
  }

  console.log('\n' + chalk.cyan('Checking for .env file...'));
  const envPath = path.join(path.dirname(__dirname), '.env');
  const envExamplePath = path.join(path.dirname(__dirname), '.env.example');
  
  try {
    await fs.access(envPath);
    console.log(chalk.gray('  ✓ .env file exists'));
  } catch {
    await fs.copyFile(envExamplePath, envPath);
    console.log(chalk.gray('  ✓ Created .env from .env.example'));
  }

  if (allGood) {
    console.log(chalk.green('\n✅ Setup complete! All dependencies are installed.\n'));
    console.log(chalk.cyan('Quick Start:'));
    console.log(chalk.gray('  1. Place audio files in ./test-audio/'));
    console.log(chalk.gray('  2. Run: node src/cli.js transcribe <audio-file>'));
    console.log(chalk.gray('  3. Check ./output/ for results\n'));
  } else {
    console.log(chalk.yellow('\n⚠️  Some dependencies need manual installation.'));
    console.log(chalk.yellow('Please install missing dependencies and run setup again.\n'));
  }
}

setup().catch(error => {
  console.error(chalk.red('Setup failed:'), error.message);
  process.exit(1);
});