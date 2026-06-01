#!/usr/bin/env node
/**
 * Extract inline style="..." in one #section of public/vira-lata-ds.html into scoped classes.
 * Usage: node scripts/ds-extract-section-styles.mjs <sectionId> [--keep-single-background]
 */
import fs from 'fs';
import crypto from 'crypto';

const file = 'public/vira-lata-ds.html';
const sectionId = process.argv[2];
const keepSingleBg = process.argv.includes('--keep-single-background');

if (!sectionId) {
  console.error('Usage: node scripts/ds-extract-section-styles.mjs <sectionId>');
  process.exit(1);
}

let html = fs.readFileSync(file, 'utf8');
const sectionRe = new RegExp(
  `<section class="section" id="${sectionId}">([\\s\\S]*?)</section>`,
  'm'
);
const m = html.match(sectionRe);
if (!m) {
  console.error(`Section #${sectionId} not found`);
  process.exit(1);
}

const sectionHtml = m[0];

function shouldExtract(decl) {
  const d = decl.trim();
  if (!d) return false;
  const props = d.split(';').filter(Boolean);
  if (keepSingleBg && props.length === 1 && /^background:/i.test(props[0].trim())) {
    return false;
  }
  return true;
}

function classFor(decl) {
  const h = crypto.createHash('sha1').update(decl.trim()).digest('hex').slice(0, 8);
  return `ds-x-${h}`;
}

const declsToExtract = new Set();
const styleRe = /style="([^"]*)"/g;
let match;
while ((match = styleRe.exec(sectionHtml)) !== null) {
  if (shouldExtract(match[1])) declsToExtract.add(match[1].trim());
}

const newRules = [...declsToExtract].map((decl) => {
  const cls = classFor(decl);
  return `  .${cls}{${decl}}`;
});

let newSection = sectionHtml.replace(
  /(<[a-zA-Z][^>]*?)\s+style="([^"]*)"/g,
  (full, tagPrefix, decl) => {
    const d = decl.trim();
    if (!shouldExtract(d)) return full;
    const cls = classFor(d);
    const withoutStyle = tagPrefix;
    let tag = withoutStyle;
    if (/class="/.test(tag)) {
      tag = tag.replace(/class="([^"]*)"/, (_, c) => {
        const parts = c.split(/\s+/).filter(Boolean);
        if (!parts.includes(cls)) parts.push(cls);
        return `class="${parts.join(' ')}"`;
      });
    } else {
      tag = `${tag} class="${cls}"`;
    }
    return tag;
  }
);

if (newSection === sectionHtml && newRules.length === 0) {
  console.log(`No extractable styles in #${sectionId}`);
  process.exit(0);
}

const marker = `/* DS extract: ${sectionId} */`;
const rulesBlock = `\n${marker}\n${newRules.join('\n')}\n`;

const styleClose = html.indexOf('</style>');
if (styleClose === -1) throw new Error('no </style>');
html = html.slice(0, styleClose) + rulesBlock + html.slice(styleClose);
html = html.replace(sectionRe, newSection);

fs.writeFileSync(file, html);
const remaining = (newSection.match(/style="/g) || []).length;
console.log(
  `#${sectionId}: ${declsToExtract.size} classes, ${newRules.length} rules, ${remaining} inline style attrs left`
);
