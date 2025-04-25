/**
 * Default settings for the application
 */
const DEFAULT_SETTINGS = {
  cdn_url: 'https://cdn.example.com',
  api_url: 'https://api.example.com',
  company_name: 'TrueMetry',
  tagline: 'Entertainment, Evolved !',
  features: {
    debug_console: false,
    wave_controller: false
  }
};

/**
 * Basic validation of settings object
 */
function validateSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    throw new Error('Settings must be an object');
  }

  if (!settings.features || typeof settings.features !== 'object') {
    throw new Error('Settings must have a features object');
  }

  return true;
}

// Export the module
module.exports = {
  validateSettings,
  DEFAULT_SETTINGS
};