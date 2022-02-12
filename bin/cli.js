#!/usr/bin/env node

const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const path = require('path');
const objectAssignDeep = require('object-assign-deep');
const argv = require('minimist')(process.argv.slice(2));

const JSON_INDENTATION = 2;

let mainConfigFilePath = path.resolve(argv._[0]);
let updateConfigFilePath = path.resolve(argv._[1]);

let arraysToExtend;
if (argv.e) {
  arraysToExtend = Array.isArray(argv.e) ? argv.e : [argv.e];
} else {
  arraysToExtend = [];
}

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
  let mainConfig;
  let updateConfig;
  try {
    let configList = await Promise.all([
      readJSONFile(mainConfigFilePath),
      readJSONFile(updateConfigFilePath)
    ]);
    mainConfig = configList[0];
    updateConfig = configList[1];
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  for (let keyPath of arraysToExtend) {
    let keyList = keyPath.split('.');
    let mainTarget = mainConfig;
    let updateTarget = updateConfig;
    for (let key of keyList) {
      mainTarget = mainTarget[key];
      if (!mainTarget) {
        console.error(`Failed to find item in config file at key path ${keyPath}.`);
        process.exit(1);
      }
      updateTarget = updateTarget[key];
      if (!updateTarget) {
        console.error(`Failed to find item in update file at key path ${keyPath}.`);
        process.exit(1);
      }
    }

    if (!Array.isArray(mainTarget)) {
      console.error(`Item in config file at key path ${keyPath} was not an array.`);
      process.exit(1);
    }
    if (!Array.isArray(updateTarget)) {
      console.error(`Item in update file at key path ${keyPath} was not an array.`);
      process.exit(1);
    }
    let uniqueArrayItemSet = new Set();
    for (let existingArrayItem of mainTarget) {
      uniqueArrayItemSet.add(JSON.stringify(existingArrayItem));
    }
    let updateTargetClone = [...updateTarget];
    updateTarget.splice(0, updateTarget.length, ...mainTarget);
    for (let updateArrayItem of updateTargetClone) {
      let itemString = JSON.stringify(updateArrayItem);
      if (!uniqueArrayItemSet.has(itemString)) {
        uniqueArrayItemSet.add(itemString);
        updateTarget.push(updateArrayItem);
      }
    }
  }

  let newConfig = objectAssignDeep({}, mainConfig, updateConfig);
  await writeJSONFile(mainConfigFilePath, newConfig);
})();
