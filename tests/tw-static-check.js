// v1352: public/tw-static.css is the prebuilt Tailwind for index.html (the Play CDN is gone).
// If a class is added to the app without rebuilding, it silently renders unstyled — the exact
// failure that got five earlier static-CSS attempts reverted. This rebuilds into a temp file and
// fails the deploy gate when the committed stylesheet is stale.
// Fix a failure with:  npm run build:tw   (then commit public/tw-static.css)
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const committed = path.join(root, 'public', 'tw-static.css');
const tmp = path.join(os.tmpdir(), `tw-static-check-${process.pid}.css`);
try {
    execFileSync(process.execPath, [
        path.join(root, 'node_modules', 'tailwindcss', 'lib', 'cli.js'),
        '-c', path.join(root, 'tailwind.static.config.js'),
        '-i', path.join(root, 'src', 'styles', 'tailwind.css'),
        '-o', tmp, '--minify',
    ], { cwd: root, stdio: 'pipe' });
    const fresh = fs.readFileSync(tmp, 'utf8');
    const current = fs.existsSync(committed) ? fs.readFileSync(committed, 'utf8') : '';
    if (fresh !== current) {
        console.error('✗ public/tw-static.css is STALE — Tailwind classes changed without a rebuild.\n  Run: npm run build:tw   and commit public/tw-static.css');
        process.exit(1);
    }
    console.log('✓ tw-static.css is up to date');
} finally {
    try { fs.unlinkSync(tmp); } catch (e) {}
}
