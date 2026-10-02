import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('docs/vendor', { recursive: true });
copyFileSync('node_modules/markdown-it/dist/markdown-it.min.js', 'docs/vendor/markdown-it.min.js');
copyFileSync('node_modules/dompurify/dist/purify.min.js', 'docs/vendor/purify.min.js');
