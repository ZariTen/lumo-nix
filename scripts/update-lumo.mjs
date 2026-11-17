import { execFile } from 'node:child_process';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const exec = promisify(execFile);
const manifestURL = 'https://lumo.protondownload.com/desktop/linux/latest.json';

async function fetchRelease() {
  const response = await fetch(manifestURL, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Release feed returned HTTP ${response.status}`);
  return response.json();
}

async function prefetchArchive(url) {
  const { stdout } = await exec('nix', ['store', 'prefetch-file', '--json', url], {
    timeout: 180_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  return JSON.parse(stdout).hash;
}

export async function updateLumo({
  packagePath = fileURLToPath(new URL('../package.nix', import.meta.url)),
  outputPath = process.env.GITHUB_OUTPUT,
  fetchManifest = fetchRelease,
  prefetch = prefetchArchive,
  log = console.log,
} = {}) {
  const source = await readFile(packagePath, 'utf8');
  const versions = [...source.matchAll(/^  version = "([^"]+)";$/gm)];
  const hashes = [...source.matchAll(/^    hash = "([^"]+)";$/gm)];
  if (versions.length !== 1 || hashes.length !== 1) {
    throw new Error('Unexpected package.nix layout: require exactly one version and source hash');
  }
  const current = versions[0][1];
  const release = await fetchManifest();
  const version = release?.version;
  if (typeof version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version) || version.includes('\n')) {
    throw new Error('Invalid release version: expected a stable major.minor.patch');
  }
  const url = `https://proton.me/download/lumo/linux/${version}/Lumo_${version}_amd64.deb`;
  const downloadURL = release?.platforms?.['linux-x86_64-deb']?.url;
  if (downloadURL !== url && downloadURL !== `https://lumo.protondownload.com/linux/${version}/Lumo_${version}_amd64.deb`) {
    throw new Error('Invalid release: missing or unexpected official AMD64 Debian download');
  }
  const latestParts = version.split('.').map(BigInt);
  const currentParts = current.split('.').map(BigInt);
  const difference = latestParts.map((part, index) => part - currentParts[index]).find(part => part !== 0n);
  if (difference === undefined || difference < 0n) {
    if (outputPath) await appendFile(outputPath, `changed=false\nversion=${current}\n`);
    log(`Lumo ${current} is already current; feed reports ${version}`);
    return { changed: false, version: current };
  }
  const hash = await prefetch(url);
  const digest = typeof hash === 'string' ? Buffer.from(hash.slice(7), 'base64') : Buffer.alloc(0);
  if (digest.length !== 32 || hash !== `sha256-${digest.toString('base64')}`) {
    throw new Error('Invalid SHA-256 returned by nix prefetch');
  }
  const updated = source
    .replace(/^  version = "[^"]+";$/m, `  version = "${version}";`)
    .replace(/^    hash = "[^"]+";$/m, `    hash = "${hash}";`);
  await writeFile(packagePath, updated);
  const result = { changed: true, version };
  if (outputPath) await appendFile(outputPath, `changed=true\nversion=${version}\n`);
  log(`Updated Lumo to ${version}`);
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  updateLumo().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
