#!/usr/bin/env node
/**
 * ZSM OpenAir Generator - Main Entry Point
 * Processes ZSM (Zone Sensibilité Maximum) data from WFS JSON endpoint
 * and generates OpenAir format output
 * 
 * Usage:
 *   node main.js <url> <output_filename>
 */

const { processJSON } = require('./adapters/json-adapter');

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);

  if (args.length === 2) {
    return {
      url: args[0],
      outputFilename: args[1]
    };
  }

  printUsage();
  process.exit(1);
}

function printUsage() {
  console.error('Usage:');
  console.error('  node main.js <url> <output_filename>');
  console.error('');
  console.error('Example:');
  console.error('  node main.js https://geo-prod-sofia-vac.sia-france.fr/geoserver/... output.txt');
}

async function main() {
  try {
    const config = parseArguments();
    console.log(`Processing JSON from: ${config.url}`);
    console.log(`Output: ${config.outputFilename}`);
    
    await processJSON(config.url, config.outputFilename);
    console.log('✓ Processing completed successfully');
  } catch (error) {
    console.error('✗ Processing failed:');
    console.error(error.message);
    process.exit(1);
  }
}

main();
