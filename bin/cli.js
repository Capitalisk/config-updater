#!/usr/bin/env node

const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const path = require('path');
const objectAssignDeep = require('object-assign-deep');
const argv = process.argv.slice(2);

const JSON_INDENTATION = 2;

let mainConfigFilePath = path.resolve(argv[0]);
let updateConfigFilePath = path.resolve(argv[1]);

async function readJSONFile(filePath) {
  let content = await readFile(filePath, { encoding: 'utf8' });
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to parse the JSON content of file at path ${filePath} because of error: ${error.message}`
    );
  }
}

async function writeJSONFile(filePath, object) {
  let jsonString = JSON.stringify(object, null, JSON_INDENTATION);
  return writeFile(filePath, jsonString, { encoding: 'utf8' });
}

(async () => {
  let [ mainConfig, updateConfig ] = await Promise.all([
    readJSONFile(mainConfigFilePath),
    readJSONFile(updateConfigFilePath)
  ]);

  let newConfig = objectAssignDeep({}, mainConfig, updateConfig);
  await writeJSONFile(mainConfigFilePath, newConfig);
})();
