const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  globalIgnores(['node_modules/', 'design/', '.expo/', 'dist/', 'coverage/']),
]);
