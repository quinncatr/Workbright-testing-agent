#!/usr/bin/env node
/**
 * Mechanical matrix verification for qa-manifest.yml — no LLM involved.
 *
 * For every manifest entry with a spec, runs the spec on desktop chromium first; only
 * if desktop passes does it run the mobile projects (a spec that is red on desktop
 * because the fix is not deployed would just burn the same timeouts again on mobile).
 * Updates status fields in place, preserving the file's comments. Note: the yaml
 * writer re-wraps long strings to its own line width on the first save (values are
 * unchanged); subsequent diffs show only real value changes.
 *
 * Division of labor: the agent (container sweep or /qa-gen) writes specs and validates
 * them on chromium only. This script owns the desktop+mobile matrix, including
 * re-verification after deploys (flipping red-until-deployed to green).
 *
 * Usage:
 *   npm run qa:verify                       # every spec in the manifest
 *   npm run qa:verify -- --gid 123[,456]    # only these Asana task GIDs
 *   npm run qa:verify -- --desktop-only     # skip the mobile projects
 *
 * Status rules:
 *   desktop pass                          -> status: green, verified_on: today
 *   desktop fail, was red-until-deployed  -> unchanged (fix still not on QA)
 *   desktop fail otherwise                -> status: red (regression if it was green)
 *   mobile pass (desktop green)           -> mobile_status: green, mobile_verified_on
 *   mobile fail (desktop green)           -> mobile_status: red (real finding)
 *   desktop not green                     -> mobile untouched, run skipped
 *
 * Exit code 1 if any spec regressed, failed on mobile, or is missing; 0 otherwise
 * (red-until-deployed staying red is expected and does not fail the run).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'qa-manifest.yml');

const argv = process.argv.slice(2);
let gidFilter = null;
let desktopOnly = false;
const addGids = (value) => {
  gidFilter ??= new Set();
  for (const gid of (value ?? '').split(',').filter(Boolean)) gidFilter.add(gid);
};
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--gid') {
    addGids(argv[++i]);
  } else if (argv[i] === '--desktop-only') {
    desktopOnly = true;
  } else if (/^\d[\d,]*$/.test(argv[i])) {
    // Bare GID(s): PowerShell 5.1 strips the `--` separator before npm sees it, which
    // makes npm swallow --flags; a plain numeric argument survives that path.
    addGids(argv[i]);
  } else {
    console.error(`Unknown argument: ${argv[i]}`);
    console.error('Usage: npm run qa:verify -- [--gid <gid>[,<gid>...]] [--desktop-only]');
    console.error('       (PowerShell: npm eats --flags; use `node scripts/verify-manifest.mjs` directly or pass bare GIDs)');
    process.exit(2);
  }
}

function runPlaywright(spec, projects, outputSuffix) {
  const args = [
    'playwright', 'test', spec,
    ...projects.flatMap((p) => ['--project', p]),
    '--workers', '1',
    '--trace', 'retain-on-failure',
    // Unique output dir per run so a later invocation does not wipe earlier traces.
    '--output', path.join('test-results', `verify-${outputSuffix}`),
  ];
  const res = spawnSync('npx', args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return res.status === 0;
}

const originalText = fs.readFileSync(MANIFEST, 'utf8');
const doc = YAML.parseDocument(originalText);
const tasks = doc.toJS()?.tasks ?? {};

const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

const results = [];
let failures = 0;

for (const [gid, entry] of Object.entries(tasks)) {
  if (gidFilter && !gidFilter.has(gid)) continue;
  if (!entry.spec) {
    if (gidFilter) console.log(`${gid}: no spec (gate: ${entry.gate ?? 'unknown'}), nothing to run`);
    continue;
  }
  if (!fs.existsSync(path.join(ROOT, entry.spec))) {
    console.error(`${gid}: manifest points at missing spec ${entry.spec}`);
    results.push({ gid, name: entry.name, desktop: 'SPEC MISSING', mobile: 'skipped' });
    failures++;
    continue;
  }

  console.log(`\n=== ${gid} — ${entry.name ?? entry.spec}`);
  console.log(`--- desktop (chromium): ${entry.spec}`);
  const desktopPass = runPlaywright(entry.spec, ['chromium'], `${gid}-desktop`);

  let desktopNote;
  if (desktopPass) {
    doc.setIn(['tasks', gid, 'status'], 'green');
    doc.setIn(['tasks', gid, 'verified_on'], today);
    desktopNote = 'green';
  } else if (entry.status === 'red-until-deployed') {
    desktopNote = 'still red (red-until-deployed; fix not on QA yet?)';
  } else {
    doc.setIn(['tasks', gid, 'status'], 'red');
    desktopNote = entry.status === 'green' ? 'RED — REGRESSION (was green)' : 'RED';
    failures++;
  }

  let mobileNote = 'skipped (desktop not green)';
  if (desktopPass && !desktopOnly) {
    console.log(`--- mobile (mobile-chrome, mobile-safari): ${entry.spec}`);
    const mobilePass = runPlaywright(entry.spec, ['mobile-chrome', 'mobile-safari'], `${gid}-mobile`);
    if (mobilePass) {
      doc.setIn(['tasks', gid, 'mobile_status'], 'green');
      doc.setIn(['tasks', gid, 'mobile_verified_on'], today);
      mobileNote = 'green';
    } else {
      doc.setIn(['tasks', gid, 'mobile_status'], 'red');
      mobileNote = 'RED — mobile-only failure is a real finding';
      failures++;
    }
  } else if (desktopPass && desktopOnly) {
    mobileNote = 'skipped (--desktop-only)';
  }

  results.push({ gid, name: entry.name, desktop: desktopNote, mobile: mobileNote });
}

if (results.length === 0) {
  console.log(gidFilter ? 'No manifest entries matched the --gid filter.' : 'No specs in the manifest to verify.');
  process.exit(0);
}

const updatedText = doc.toString();
if (updatedText !== originalText) {
  fs.writeFileSync(MANIFEST, updatedText);
  console.log('\nqa-manifest.yml updated (review with git diff).');
}

console.log('\n=== Summary');
for (const r of results) {
  console.log(`${r.gid}  desktop: ${r.desktop}  |  mobile: ${r.mobile}  (${r.name ?? ''})`);
}
process.exit(failures ? 1 : 0);
