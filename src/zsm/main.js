#!/usr/bin/env node
/**
 * ZSM OpenAir Generator - Main Entry Point
 * Processes ZSM (Zone Sensibilité Maximum) data from a WFS JSON endpoint or local file
 * and generates OpenAir format output
 * 
 * Usage:
 *   node main.js <url> <output_filename>
 *   node main.js --file <input_filename> <output_filename>
 */

const { processJSON } = require('./adapters/json-adapter');

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);

  if (args.length === 3 && args[0] === '--file') {
    return {
      source: args[1],
      outputFilename: args[2],
      fromFile: true
    };
  }

  if (args.length === 2 && !args[0].startsWith('--')) {
    return {
      source: args[0],
      outputFilename: args[1],
      fromFile: false
    };
  }

  printUsage();
  process.exit(1);
}

function printUsage() {
  console.error('Usage:');
  console.error('  node main.js <url> <output_filename>');
  console.error('  node main.js --file <input_filename> <output_filename>');
  console.error('');
  console.error('Example:');
  console.error('  node main.js https://geo-prod-sofia-vac.sia-france.fr/geoserver/... output.txt');
  console.error('  node main.js --file src/zsm/zsm.json output.txt');
}

async function main() {
  try {
    const config = parseArguments();
    console.log(`Processing JSON from ${config.fromFile ? 'file' : 'URL'}: ${config.source}`);
    console.log(`Output: ${config.outputFilename}`);
    
    await processJSON(config.source, config.outputFilename, { fromFile: config.fromFile });
    console.log('✓ Processing completed successfully');
  } catch (error) {
    console.error('✗ Processing failed:');
    console.error(error.message);
    process.exit(1);
  }
}

main();
