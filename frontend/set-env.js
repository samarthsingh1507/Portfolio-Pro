const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, 'src/environments/environment.ts');
const apiUrl = process.env.API_URL || process.env.BACKEND_URL;

if (apiUrl) {
  // Normalize URL - ensure no trailing slash, but ensure /api suffix if not present
  let normalizedUrl = apiUrl.trim().replace(/\/+$/, '');
  if (!normalizedUrl.endsWith('/api')) {
    normalizedUrl += '/api';
  }

  const envConfigFile = `// Auto-generated during build from environment variable
export const environment = {
  production: true,
  apiUrl: '${normalizedUrl}'
};
`;
  fs.writeFileSync(targetPath, envConfigFile, 'utf8');
  console.log(`[set-env] Injected API_URL: ${normalizedUrl}`);
} else {
  console.log(`[set-env] No API_URL / BACKEND_URL provided. Using default in environment.ts`);
}
