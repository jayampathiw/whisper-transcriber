import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const execAsync = promisify(exec);

async function checkDependencies() {
  console.log(chalk.blue('\n🔍 Checking Dependencies\n'));
  
  const checks = [
    {
      name: 'Node.js',
      command: 'node --version',
      required: true,
      parseVersion: (output) => output.trim().replace('v', '')
    },
    {
      name: 'Python',
      command: 'python --version',
      required: true,
      parseVersion: (output) => output.match(/Python (\d+\.\d+\.\d+)/)?.[1]
    },
    {
      name: 'pip',
      command: 'pip --version',
      required: true,
      parseVersion: (output) => output.match(/pip (\d+\.\d+)/)?.[1]
    },
    {
      name: 'FFmpeg',
      command: 'ffmpeg -version',
      required: true,
      parseVersion: (output) => output.match(/ffmpeg version (\S+)/)?.[1]
    },
    {
      name: 'Whisper',
      command: 'whisper --help',
      required: true,
      parseVersion: () => 'Installed'
    },
    {
      name: 'CUDA (for GPU)',
      command: 'nvidia-smi',
      required: false,
      parseVersion: (output) => {
        const match = output.match(/CUDA Version: (\d+\.\d+)/);
        return match ? `CUDA ${match[1]}` : 'Not available';
      }
    }
  ];

  const results = [];
  
  for (const check of checks) {
    try {
      const { stdout } = await execAsync(check.command);
      const version = check.parseVersion(stdout);
      results.push({
        name: check.name,
        installed: true,
        version,
        required: check.required
      });
      console.log(chalk.green(`✓ ${check.name.padEnd(15)} ${version}`));
    } catch (error) {
      results.push({
        name: check.name,
        installed: false,
        required: check.required
      });
      
      if (check.required) {
        console.log(chalk.red(`✗ ${check.name.padEnd(15)} Not installed`));
      } else {
        console.log(chalk.yellow(`○ ${check.name.padEnd(15)} Not available (optional)`));
      }
    }
  }

  const missingRequired = results.filter(r => r.required && !r.installed);
  
  if (missingRequired.length === 0) {
    console.log(chalk.green('\n✅ All required dependencies are installed!\n'));
    
    const gpuAvailable = results.find(r => r.name === 'CUDA (for GPU)')?.installed;
    if (!gpuAvailable) {
      console.log(chalk.yellow('💡 Tip: Install CUDA for faster processing with GPU acceleration.'));
    }
  } else {
    console.log(chalk.red('\n❌ Missing required dependencies:\n'));
    
    for (const dep of missingRequired) {
      console.log(chalk.red(`  - ${dep.name}`));
    }
    
    console.log(chalk.yellow('\nInstallation instructions:'));
    
    if (missingRequired.find(d => d.name === 'Python')) {
      console.log(chalk.gray('\nPython:'));
      console.log(chalk.gray('  Download from https://python.org (version 3.8+)'));
    }
    
    if (missingRequired.find(d => d.name === 'FFmpeg')) {
      console.log(chalk.gray('\nFFmpeg:'));
      console.log(chalk.gray('  Windows: choco install ffmpeg'));
      console.log(chalk.gray('  Mac: brew install ffmpeg'));
      console.log(chalk.gray('  Linux: sudo apt install ffmpeg'));
    }
    
    if (missingRequired.find(d => d.name === 'Whisper')) {
      console.log(chalk.gray('\nWhisper:'));
      console.log(chalk.gray('  pip install openai-whisper'));
    }
    
    process.exit(1);
  }
}

checkDependencies().catch(error => {
  console.error(chalk.red('Check failed:'), error.message);
  process.exit(1);
});