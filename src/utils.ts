/* eslint-disable no-console */
import { spawn } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';

export async function spawnWrapper(cmd: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let scriptOutput = '';
    const grep = spawn('sh', ['-c', cmd], { stdio: [] });

    grep.stdout.on('data', (data) => {
      scriptOutput += data;
    });

    grep.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`);
      // reject(data);
    });

    grep.on('close', (code, signal) => {
      // console.log(`child process exited with code ${code}, signal ${signal}, scriptOutput ${scriptOutput}`);
      if (code === 0) {
        resolve(scriptOutput.split('\n'));
      } else {
        reject(code);
      }
    });
  });
}

/**
 * Saves the command result in $CurrentWorkingDir/out/packageInfo.json file
 */
export async function saveDataToFile(data: any) {
  const dirPath = path.resolve('out');
  await fs.promises.mkdir(dirPath, { recursive: true });

  const fileName = path.resolve(dirPath, 'packageInfo.json');

  await fs.promises.writeFile(
    fileName,
    JSON.stringify(data, null, 2)).then(() => {
      console.log(`Data successfully saved at ${fileName}`)
    });
}

