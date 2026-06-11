/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function runExtractor() {
  const extractorPath = path.join(__dirname, 'extract-eaip-links.js');
  const raw = execFileSync(process.execPath, [extractorPath], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  const jsonStart = raw.indexOf('{');
  if (jsonStart < 0) {
    throw new Error('Extractor did not return JSON output.');
  }

  return JSON.parse(raw.slice(jsonStart));
}

function updateReadmeFile(filePath, eaipEnVigueurUrl, enr56Url) {
  const original = fs.readFileSync(filePath, 'utf8');
  const pattern = /\[AIP France\]\([^)]*\): \[(ENR 5\.6[^\]]*)\]\([^)]*\)/;

  if (!pattern.test(original)) {
    throw new Error(`Could not find AIP France / ENR 5.6 link in ${filePath}`);
  }

  const updated = original.replace(pattern, `[AIP France](${eaipEnVigueurUrl}): [$1](${enr56Url})`);

  if (updated !== original) {
    fs.writeFileSync(filePath, updated, 'utf8');
    return true;
  }

  return false;
}

function main() {
  const { eaipEnVigueurUrl, enr56Url } = runExtractor();
  const rootDir = path.join(__dirname, '..');
  const readmes = ['README.md', 'README.en.md'];
  const changed = [];

  for (const readme of readmes) {
    const filePath = path.join(rootDir, readme);
    if (updateReadmeFile(filePath, eaipEnVigueurUrl, enr56Url)) {
      changed.push(readme);
    }
  }

  if (changed.length === 0) {
    console.log('No README URL updates required.');
  } else {
    console.log(`Updated files: ${changed.join(', ')}`);
  }
}

main();
