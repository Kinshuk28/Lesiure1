import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Loads .env into process.env.
 *
 * Node does not read .env on its own, so without this every value in the file
 * is invisible and the app reports "no API key found" even when the key is
 * sitting right there.
 *
 * This module must be imported *before* anything that reads process.env at
 * module scope — ES module imports are evaluated in declaration order, so
 * `import './env.js'` has to come first in index.js.
 *
 * A missing .env is not an error: on hosts like Render the variables are
 * injected into the environment directly and no file exists.
 */
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');

// process.loadEnvFile landed in Node 20.12; guard so older 20.x still boots
// (it just won't pick up the file, and the startup check will say so).
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envPath);
  } catch {
    // No .env on disk — expected in production.
  }
}
