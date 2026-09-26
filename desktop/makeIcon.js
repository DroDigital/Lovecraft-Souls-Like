/** `npm run icon`: writes the icon (desktop/icon.js) to build/icon.png, 1024 square, for packaging. */

import { mkdirSync, writeFileSync } from 'node:fs';
import { iconPng } from './icon.js';

mkdirSync(new URL('../build/', import.meta.url), { recursive: true });
writeFileSync(new URL('../build/icon.png', import.meta.url), iconPng(1024));
