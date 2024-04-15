const fs = require('fs');
const readline = require('readline');

const findLinesStartingWith = async (filePath, startWord) => {
  const fileStream = fs.createReadStream(filePath);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const lines = [];

  for await (const line of rl) {
    if (line.startsWith(startWord) && !lines.includes(line)) {
      lines.push(line);
    }
  }

  return lines;
};

var lines = findLinesStartingWith('france.txt', 'AY').then(lines => console.log(lines));
console.log(lines);