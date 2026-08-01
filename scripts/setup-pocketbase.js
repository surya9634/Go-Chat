import fs from 'fs';
import path from 'path';
import https from 'https';
import { exec, spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const POCKETBASE_VERSION = '0.22.27';
const PB_EXE_NAME = process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase';
const pbPath = path.join(projectRoot, PB_EXE_NAME);

async function downloadPocketBase() {
  if (fs.existsSync(pbPath)) {
    console.log(`PocketBase binary already exists at ${pbPath}`);
    return;
  }

  console.log(`Downloading PocketBase v${POCKETBASE_VERSION}...`);
  let url = '';
  if (process.platform === 'win32') {
    url = `https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_windows_amd64.zip`;
  } else if (process.platform === 'darwin') {
    url = `https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_darwin_arm64.zip`;
  } else {
    url = `https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip`;
  }

  const zipPath = path.join(projectRoot, 'pocketbase.zip');
  const file = fs.createWriteStream(zipPath);

  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location, (res) => {
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log('Download complete. Extracting...');
            extractZip(zipPath).then(resolve).catch(reject);
          });
        });
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('Download complete. Extracting...');
          extractZip(zipPath).then(resolve).catch(reject);
        });
      }
    }).on('error', (err) => {
      fs.unlink(zipPath, () => {});
      reject(err);
    });
  });
}

function extractZip(zipPath) {
  return new Promise((resolve, reject) => {
    let cmd = '';
    if (process.platform === 'win32') {
      cmd = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${projectRoot}' -Force"`;
    } else {
      cmd = `unzip -o "${zipPath}" -d "${projectRoot}"`;
    }

    exec(cmd, (err) => {
      if (err) {
        console.error('Failed to extract PocketBase zip:', err);
        return reject(err);
      }
      fs.unlinkSync(zipPath);
      console.log('PocketBase binary extracted successfully.');
      resolve();
    });
  });
}

async function startPocketBase() {
  await downloadPocketBase();
  console.log('Starting PocketBase server at http://127.0.0.1:8090...');
  
  const child = spawn(pbPath, ['serve', '--http=127.0.0.1:8090'], {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  child.on('error', (err) => {
    console.error('Failed to start PocketBase process:', err);
  });
}

startPocketBase().catch(console.error);
