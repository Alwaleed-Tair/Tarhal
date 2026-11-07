// Builds the React frontend (tarhal-admin-vscode) into public/_site so Next.js
// serves it from the same origin as the API. Run: npm run build:frontend
import { execSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';

const app = 'tarhal-admin-vscode';
const out = 'public/_site';
const run = (cmd, env = {}) => execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });

if (!existsSync(`${app}/node_modules`)) run(`npm --prefix ${app} ci --no-audit --no-fund`);
rmSync(out, { recursive: true, force: true });
// Relative API path: the browser calls /api on the same origin.
run(`npm --prefix ${app} run build -- --outDir ../${out} --emptyOutDir --base /_site/`, { VITE_API_BASE_URL: '/api' });
console.log(`Frontend built into ${out}`);
