/*
  Create and export configuration variables
 */

// Container for all the environments
var environments = {};

// Staging (default) env
environments.staging = {
  'port' : 3000,
  'envName' : 'staging'
};

// Production env
environments.production = {
  'port' : 5000,
  'envName' : 'production'
};

// Determine which env to export based on environment variable
var currentEnvironment = typeof(process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current env is accepted, otherwise default to staging
var environmentToExport = typeof(environments[currentEnvironment]) === 'object' ? environments[currentEnvironment] : environments.staging;

// Export the env configuration
module.exports = environmentToExport;
