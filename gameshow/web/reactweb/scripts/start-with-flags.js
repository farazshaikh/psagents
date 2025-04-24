const { spawn } = require('child_process');
const { platform } = require('os');
const path = require('path');

// Get the flags from command line arguments (after the -- if using npm run)
const args = process.argv.slice(2);
console.log('Received arguments:', args);

// Split by comma and trim whitespace
const flags = args[0]?.split(',').map(flag => flag.trim()).filter(Boolean) || [];
console.log('Parsed flags:', flags);

// Map of flag names to their environment variable names
const flagToEnvVar = {
  'debugconsole': 'REACT_APP_DEBUG_CONSOLE',
  'wavecontrol': 'REACT_APP_WAVE_CONTROLLER'
};

// Set up environment variables based on flags
const env = { ...process.env };
for (const flag of flags) {
  const envVar = flagToEnvVar[flag.toLowerCase()];
  if (envVar) {
    env[envVar] = 'true';
    console.log(`Setting ${envVar}=true`);
  } else {
    console.log(`Unknown flag: ${flag}`);
  }
}

// Log all REACT_APP environment variables
console.log('\nActive environment variables:');
Object.entries(env)
  .filter(([key]) => key.startsWith('REACT_APP_'))
  .forEach(([key, value]) => console.log(`${key}=${value}`));

// Determine the command based on platform
const isWindows = platform() === 'win32';
const reactScriptsPath = path.resolve(
  __dirname,
  '..',
  'node_modules',
  '.bin',
  isWindows ? 'react-scripts.cmd' : 'react-scripts'
);

console.log(`Using react-scripts at: ${reactScriptsPath}`);

// Start the React app with the environment variables
const reactProcess = spawn(reactScriptsPath, ['start'], {
  env,
  stdio: 'inherit',
  shell: true
});

reactProcess.on('error', (err) => {
  console.error('Failed to start React app:', err);
  process.exit(1);
});

reactProcess.on('exit', (code) => {
  if (code !== 0) {
    console.log(`Process exited with code ${code}`);
    process.exit(code);
  }
}); 