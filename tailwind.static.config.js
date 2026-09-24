// Static Tailwind build for public/index.html (v1352) — replaces the cdn.tailwindcss.com
// Play CDN, which compiled CSS in the browser on every page open and re-scanned the
// document on every DOM mutation (4-5s of main thread per open on a desktop CPU).
//
// Build:  npm run build:tw   → public/tw-static.css
// `npm test` fails if public/tw-static.css is stale — rebuild after adding classes.
//
// Deliberately STOCK: default theme, no plugins (the CDN ran with no config, so
// @tailwindcss/forms would CHANGE form styling). The safelist covers classes that
// only exist at runtime: template literals like `bg-${color}-50` / `text-${c}-600`.
const colors = ['slate','gray','zinc','neutral','stone','red','orange','amber','yellow','lime',
  'green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose'];
const shades = '50|100|200|300|400|500|600|700|800|900|950';

module.exports = {
  content: [
    './public/index.html',
    './public/*.js',
    './public/js/**/*.js',
    './public/compacted/**/*.js',
    './public/chat/**/*.js',
    './public/*.html',
  ],
  safelist: [
    { pattern: new RegExp(`^(bg|text|border|from|to|via|ring)-(${colors.join('|')})-(${shades})$`) },
    { pattern: new RegExp(`^(bg|border|text)-(${colors.join('|')})-(${shades})$`), variants: ['hover'] },
    { pattern: new RegExp(`^text-(${colors.join('|')})-(${shades})$`), variants: ['group-hover'] },
    { pattern: new RegExp(`^bg-(${colors.join('|')})-(800|900|950)/(20|30|40|50|60)$`) },
  ],
  theme: { extend: {} },
  plugins: [],
};
