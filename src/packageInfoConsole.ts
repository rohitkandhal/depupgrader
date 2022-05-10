/* eslint-disable */
// @ts-nocheck
// This file prints output in console

import { saveDataToFile, spawnWrapper } from './utils';

const packageNameWithVersion = (packageName) => {
  return packageName.replace(/::.*/, '');
}

const removeExtraDots = (packageName) => {
  return packageName.replace(/\s\s+/, ' ');
}

const realPackageName = (packageName) => {
  return packageName.match(/(\S+)@\S+/)[1];
}

const yarnWhy = async (packageName = '@tableau/oauth-credentials-service') => {
  const commandResult = await spawnWrapper(`yarn why ${packageName}`);
  let output = [];

  commandResult.forEach((line) => {
    if (line.length > 0) {
      output.push(packageNameWithVersion(line))
    }
  });
  return output;
};

const explainPeerRequirement = async (dependencyHash: string) => {
  const dependencyMismatchRegex = new RegExp(/(\S+) \S+\s* → (.* [✓|✘])/);
  let output = [];

  const commandResult = await spawnWrapper(`yarn explain peer-requirements ${dependencyHash}`);

  for (const line of commandResult) {
    if (line.length > 0 && dependencyMismatchRegex.test(line)) {
      let [, askingPackage, whatItNeeds] = line.match(dependencyMismatchRegex)
      output.push(`\t ${removeExtraDots(whatItNeeds)} - required by ${packageNameWithVersion(askingPackage)}`);

      // Find why we have this package. 
      output.push(`\t\tWhy we have ${realPackageName(askingPackage)}`);

      await yarnWhy(realPackageName(askingPackage)).then(result => {
        result.map(r => output.push(`\t\t\t${r}`))
      });
    }
  }

  output.push(`\t\tPeer dependency hash ${dependencyHash}\n`);
  return output;
}

const isValidYarn = async (skipCheckingForDebugging = false) => {
  if (skipCheckingForDebugging) {
    return true;
  }
  const yarnVersionBuffer = await spawnWrapper(`yarn -v`);

  const yarnVersion = yarnVersionBuffer[0];
  if (yarnVersion.length === 0 || yarnVersion.startsWith('1')) {
    console.log(`Error: Please use yarn version 2+. Found: ${yarnVersion}`);
    return false;
  }
  console.log(`Found yarn version ${yarnVersion}`);
  return true;
};

const providesIncorrectDependency = new RegExp(/(\S+) provides (\S+) \((\S+)\) with version (\S+), which doesn't satisfy what (.*) request/);
const doesnotProvide = new RegExp(/│ (.*) doesn't provide (\S+) \((\S+)\), requested by (\S+)/);

const isIssueWithDependency = (installLogStatement) => {
  return providesIncorrectDependency.test(installLogStatement);
}

async function getPackageInfo() {
  let outputData = [], outputRow = [];

  if (isValidYarn(true)) {

    const yarnInstall = await spawnWrapper(`yarn install`);
    const filteredResult = yarnInstall.filter(isIssueWithDependency);

    filteredResult = filteredResult.slice(0, 3);

    for (const result of filteredResult) {
      let [, sourcePackage, packageTalkingAbout, dependencyHash, providedVersion, whichPackageIsUnhappy] = result.match(providesIncorrectDependency);
      const misMatch = `${packageNameWithVersion(sourcePackage)} provides ${packageTalkingAbout} version: ${providedVersion} which is not satisfied for`
      // console.log();

      explainPeerRequirement(dependencyHash).then((peerDependencyResult) => {
        console.log(misMatch);
        peerDependencyResult.forEach((result) => {
          outputRow = [packageNameWithVersion(sourcePackage), packageTalkingAbout, providedVersion,]
          console.log(result);
        })
      });

      outputData.push(outputRow);
    }
  }
  return outputData;
}

async function getAndSavePackageInfo() {
  let result = await getPackageInfo();

  await saveDataToFile(result);
}


getAndSavePackageInfo();
// yarnWhy().then(r => console.log(r))

// To run this file
// Open VS Code
// Cmd + P, Search ">debug: JavaScript"
// Run this command 
// node -r ts-node/register ~/github/depupgrader/src/packageInfo.ts