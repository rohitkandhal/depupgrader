/* eslint-disable */
// @ts-nocheck 

import { saveDataToFile, spawnWrapper } from './utils';
import { clearGoogleSheet, uploadToGoogleSheetsIfCredentialsPresent } from './googleSheets';

export const googleSheetNameForPackagesData = 'packageinfo-meta';

const packageNameWithVersion = (packageName: string) => {
  return packageName.replace(/::.*/, '');
}

const removeExtraDots = (packageName: string) => {
  return packageName.replace(/\s\s+/, ' ');
}

const realPackageName = (packageName: string) => {
  return packageName.match(/(\S+)@\S+/)[1];
}

const yarnWhy = async (packageName: string = 'react') => {
  const commandResult = await spawnWrapper(`yarn why ${packageName}`);
  let output: string[] = [];

  commandResult.forEach((line) => {
    if (line.length > 0) {
      output.push(packageNameWithVersion(line))
    }
  });
  return output;
};


const explainPeerRequirement = async (dependencyHash: string) => {
  const dependencyMismatchRegex = new RegExp(/(\S+) \S+\s* → (.* [✓|✘])/);
  let output: Array<{ unhappyPackage: string, whatItNeeds: string, whyUnhappyPackage: string }> = [];

  const commandResult = await spawnWrapper(`yarn explain peer-requirements ${dependencyHash}`);

  for (const line of commandResult) {
    if (line.length > 0 && dependencyMismatchRegex.test(line)) {
      let [, askingPackage, whatItNeeds] = line.match(dependencyMismatchRegex)

      // Find why we have this package. 
      // output.push(`\t\tWhy we have ${realPackageName(askingPackage)}`);

      await yarnWhy(realPackageName(askingPackage)).then(result => {
        // result.map(r => output.push(`\t\t\t${r}`))

        output.push({
          unhappyPackage: packageNameWithVersion(askingPackage),
          whatItNeeds: removeExtraDots(whatItNeeds),
          whyUnhappyPackage: JSON.stringify(result, null, 2)
        });
      });
    }
  }

  // output.push(`\t\tPeer dependency hash ${dependencyHash}\n`);
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

const isIssueWithDependency = (installLogStatement: string) => {
  return providesIncorrectDependency.test(installLogStatement);
}

async function getPackageInfo() {
  let outputData = [], outputRow = [];

  if (isValidYarn(true)) {

    const yarnInstall = await spawnWrapper(`yarn install`);
    let filteredResult = yarnInstall.filter(isIssueWithDependency);

    for (const result of filteredResult) {
      let [, sourcePackage, packageTalkingAbout, dependencyHash, providedVersion, whichPackageIsUnhappy] = result.match(providesIncorrectDependency);
      const misMatch = `${packageNameWithVersion(sourcePackage)} provides ${packageTalkingAbout} version: ${providedVersion} which is not satisfied for`

      await explainPeerRequirement(dependencyHash).then((peerDependencyResult) => {
        // console.log(misMatch);
        peerDependencyResult.forEach((result) => {
          outputRow = {
            sourcePackage: packageNameWithVersion(sourcePackage),
            problematicPackage: packageTalkingAbout,
            providedVersion: providedVersion,
            peerDependencyHash: dependencyHash,
            ...result
          };
          outputData.push(outputRow);
        })
      })
    }
  }
  return outputData;
}

async function getAndSavePackageInfo() {
  let result = await getPackageInfo(); 

  // await saveDataToFile(result);

  await saveDataToGoogleSheet(await result);
}

export async function saveDataToGoogleSheet(data: any) {
  const timestamp = (new Date()).toJSON();
  data = data.map((row: any) => ({ timestamp, ...row }));

  // Google sheet columns name
  const keys = ['timestamp', 'sourcePackage', 'problematicPackage', 'providedVersion', 'peerDependencyHash', 'unhappyPackage', 'whatItNeeds', 'whyUnhappyPackage'];
  const sheetData = data.map((row: any) => keys.map(key => row[key] ?? null));

  // await clearGoogleSheet(googleSheetNameForPackagesData);
  // // Add header row
  // await uploadToGoogleSheetsIfCredentialsPresent([keys], googleSheetNameForPackagesData);

  // upload data to google sheet data source
  await uploadToGoogleSheetsIfCredentialsPresent(sheetData, googleSheetNameForPackagesData);
}


getAndSavePackageInfo();
// yarnWhy().then(r => console.log(r))

// To run this file
// Open VS Code
// Cmd + P, Search ">debug: JavaScript"
// Run this command 
// node -r ts-node/register ~/github/depupgrader/src/packageInfo.ts