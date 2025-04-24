const { spawn } = require('child_process');
const { platform } = require('os');
const { join, resolve } = require('path');
const { readFileSync, existsSync, writeFileSync } = require('fs');
const { exit } = require('process');
const { validateSettings, DEFAULT_SETTINGS } = require('./settings');

// Change to the reactweb directory where package.json is located
const projectRoot = resolve(__dirname, '..');
process.chdir(projectRoot);
console.log('Working directory:', process.cwd());

// Read and validate settings
const settingsPath = join(__dirname, 'settings.json');
let currentSettings = DEFAULT_SETTINGS;

try {
  if (!existsSync(settingsPath)) {
    console.log('Creating default settings file...');
    writeFileSync(settingsPath, JSON.stringify(DEFAULT_SETTINGS, null, 2));
  } else {
    const settingsContent = readFileSync(settingsPath, 'utf8');
    const parsedSettings = JSON.parse(settingsContent);
    
    if (validateSettings(parsedSettings)) {
      currentSettings = parsedSettings;
      console.log('Settings loaded successfully');
    }
  }
} catch (error) {
  console.error('Settings error:', error.message);
  console.error('Expected format:', JSON.stringify(DEFAULT_SETTINGS, null, 2));
  exit(1);
}

// Set up environment variables
const env = { ...process.env };

// Convert settings to environment variables
Object.entries(currentSettings).forEach(([key, value]) => {
  if (key === 'features' && typeof value === 'object') {
    Object.entries(value).forEach(([subKey, subValue]) => {
      const envName = `REACT_APP_${key.toUpperCase()}_${subKey.toUpperCase()}`;
      env[envName] = subValue.toString();
      console.log(`${envName}=${subValue}`);
    });
  } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const envName = `REACT_APP_${key.toUpperCase()}`;
    env[envName] = value.toString();
    console.log(`${envName}=${value}`);
  }
});

// Start React app
const isWindows = platform() === 'win32';
const reactScriptsPath = resolve(
  __dirname,
  '..',
  'node_modules',
  '.bin',
  isWindows ? 'react-scripts.cmd' : 'react-scripts'
);

console.log(`\nStarting React app with react-scripts`);

const reactProcess = spawn(reactScriptsPath, ['start'], {
  env,
  stdio: 'inherit',
  shell: true
});

reactProcess.on('error', (err) => {
  console.error('Failed to start React app:', err);
  exit(1);
});

reactProcess.on('exit', (code) => {
  if (code !== 0) {
    console.log(`Process exited with code ${code}`);
    exit(code || 1);
  }
}); 