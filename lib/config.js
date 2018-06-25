/*
  Create and export configuration variables
 */

// Container for all the environments
var environments = {};

// Staging (default) env
environments.staging = {
  'httpPort' : 3000,
  'httpsPort' : 3001,
  'envName' : 'staging',
  'hashingSecret' : 'thisisasecret'
};

// Production env
environments.production = {
  'httpPort' : 5000,
  'httpsPort' : 5001,
  'envName' : 'production',
  'hashingSecret' : 'thisisanothersecret'
};

// Determine which env to export based on environment variable
var currentEnvironment = typeof(process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current env is accepted, otherwise default to staging
var environmentToExport = typeof(environments[currentEnvironment]) === 'object' ? environments[currentEnvironment] : environments.staging;

// Export the env configuration
module.exports = environmentToExport;
