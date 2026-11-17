import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { updateLumo } from '../scripts/update-lumo.mjs';

const oldHash = `sha256-${Buffer.alloc(32).toString('base64')}`;
const newHash = `sha256-${createHash('sha256').update('test archive').digest('base64')}`;
const source = `{
  pname = "lumo";
  version = "0.5.9";
  src = fetchurl {
    url = "https://proton.me/download/lumo/linux/\${finalAttrs.version}/Lumo_\${finalAttrs.version}_amd64.deb";
    hash = "${oldHash}";
  };
}
`;
const manifest = version => ({
  version,
  platforms: {
    'linux-x86_64-deb': {
      url: `https://lumo.protondownload.com/linux/${version}/Lumo_${version}_amd64.deb`,
    },
  },
});
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'lumo-update-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const packagePath = join(directory, 'package.nix');
  const outputPath = join(directory, 'github-output');
  await writeFile(packagePath, source);
  return { packagePath, outputPath, log() {} };
}

test('updates only the version and hash using the canonical Proton URL', async t => {
  const options = await fixture(t);
  const result = await updateLumo({
    ...options,
    fetchManifest: async () => manifest('0.5.10'),
    prefetch: async url => {
      assert.equal(url, 'https://proton.me/download/lumo/linux/0.5.10/Lumo_0.5.10_amd64.deb');
      return newHash;
    },
  });
  assert.deepEqual(result, { changed: true, version: '0.5.10' });
  assert.equal(await readFile(options.packagePath, 'utf8'),
    source.replace('version = "0.5.9"', 'version = "0.5.10"').replace(oldHash, newHash));
  assert.equal(await readFile(options.outputPath, 'utf8'), 'changed=true\nversion=0.5.10\n');
});

for (const version of ['0.5.9', '0.5.8', '0.4.100']) {
  test(`leaves a current or newer package unchanged when feed reports ${version}`, async t => {
    const options = await fixture(t);
    const result = await updateLumo({
      ...options,
      fetchManifest: async () => manifest(version),
      prefetch: async () => { assert.fail('Must not download unchanged or older releases'); },
    });
    assert.deepEqual(result, { changed: false, version: '0.5.9' });
    assert.equal(await readFile(options.packagePath, 'utf8'), source);
    assert.equal(await readFile(options.outputPath, 'utf8'), 'changed=false\nversion=0.5.9\n');
  });
}

for (const release of [
  {},
  manifest('0.6'),
  manifest('0.6.0-beta.1'),
  manifest('00.6.0'),
  manifest('0.6.0\nmalicious-output=true'),
  { version: '0.6.0', platforms: {} },
  { version: '0.6.0', platforms: { 'linux-x86_64-deb': { url: 'https://example.com/payload.deb' } } },
  { version: '0.6.0', platforms: manifest('0.7.0').platforms },
]) {
  test(`rejects invalid release metadata: ${JSON.stringify(release)}`, async t => {
    const options = await fixture(t);
    await assert.rejects(updateLumo({
      ...options,
      fetchManifest: async () => release,
      prefetch: async () => { assert.fail('Invalid metadata must not reach prefetch'); },
    }), /Invalid release/);
    assert.equal(await readFile(options.packagePath, 'utf8'), source);
  });
}

for (const hash of [undefined, '', 'sha256-not-a-hash', `${newHash}\nchanged=false`]) {
  test(`rejects malformed download hash: ${JSON.stringify(hash)}`, async t => {
    const options = await fixture(t);
    await assert.rejects(updateLumo({
      ...options,
      fetchManifest: async () => manifest('0.6.0'),
      prefetch: async () => hash,
    }), /Invalid SHA-256/);
    assert.equal(await readFile(options.packagePath, 'utf8'), source);
  });
}

for (const brokenSource of [
  source.replace('  version = "0.5.9";\n', ''),
  source.replace('  version = "0.5.9";', '  version = "0.5.9";\n  version = "0.5.9";'),
  source.replace(`    hash = "${oldHash}";\n`, ''),
  source.replace(`    hash = "${oldHash}";`, `    hash = "${oldHash}";\n    hash = "${oldHash}";`),
]) {
  test('fails closed when the package declaration layout changes', async t => {
    const options = await fixture(t);
    await writeFile(options.packagePath, brokenSource);
    await assert.rejects(updateLumo({
      ...options,
      fetchManifest: async () => manifest('0.6.0'),
      prefetch: async () => newHash,
    }), /Unexpected package.nix layout/);
    assert.equal(await readFile(options.packagePath, 'utf8'), brokenSource);
  });
}

for (const stage of ['feed', 'download']) {
  test(`${stage} failure does not modify the package`, async t => {
    const options = await fixture(t);
    await assert.rejects(updateLumo({
      ...options,
      fetchManifest: async () => {
        if (stage === 'feed') throw new Error('network failed');
        return manifest('0.6.0');
      },
      prefetch: async () => { throw new Error('network failed'); },
    }), /network failed/);
    assert.equal(await readFile(options.packagePath, 'utf8'), source);
  });
}
