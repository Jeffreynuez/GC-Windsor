#!/usr/bin/env node
/* GC Windsor - push the working folder straight to GitHub, no git client needed.
   Uses the GitHub Git Data API (blobs -> tree -> commit -> ref) so the whole
   push lands as ONE clean commit, rather than one commit per file.

   This is the same mechanism the CMS uses to write to managed repos, which is
   why your local clone goes "behind" - GitHub moves ahead of your machine.
   Nothing here depends on the repo being public; it only needs a token with
   Contents Read/Write.

   TOKEN (never commit it):
     - env GH_DEPLOY_TOKEN, or
     - a file scripts/gh-token.txt  (already covered by .gitignore)

   USAGE:
     node scripts/push.js "commit message"
     npm run push -- "commit message"
*/
'use strict';
const fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const REPO = process.env.GITHUB_REPO || 'Jeffreynuez/GC-Windsor';
const BRANCH = process.env.GITHUB_BRANCH || 'main';

/* Look OUTSIDE the repo first. A token kept inside the repo can be wiped by
   "discard all changes" in a git client, which is exactly what happened once.
   Preferred home: <working folder>/gh-token.txt, two levels above the repo. */
function token() {
  if (process.env.GH_DEPLOY_TOKEN) return process.env.GH_DEPLOY_TOKEN.trim();
  const candidates = [
    path.join(ROOT, '..', '..', 'gh-token.txt'),   // GC Windsor/gh-token.txt  <- preferred
    path.join(ROOT, '..', 'gh-token.txt'),         // GC Windsor/Site/gh-token.txt
    path.join(__dirname, 'gh-token.txt'),          // inside the repo (fragile)
    path.join(__dirname, 'gh2.txt'),
    path.join(__dirname, '.deploy-token')
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) { const t = fs.readFileSync(p, 'utf8').trim(); if (t) return t; }
    } catch (e) { /* keep looking */ }
  }
  console.error('No token found. Looked in:\n  ' + candidates.join('\n  ') +
    '\n\nPut a fine-grained PAT (Contents R/W on ' + REPO + ') in the first path,\nor set GH_DEPLOY_TOKEN.');
  process.exit(1);
}
const TOK = token();

/* what to send. Everything else in the repo is left untouched on GitHub. */
const INCLUDE_DIRS = ['assets', 'data', 'api', 'scripts', 'product'];
const INCLUDE_FILES = ['index.html', 'shop.html', 'gallery.html', 'about.html', 'contact.html',
  'package.json', 'vercel.json', 'README.md', '.gitignore'];
const SKIP = new Set(['gh-token.txt', 'gh2.txt', '.deploy-token', 'Keys.txt', '.env', '.DS_Store']);

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name) || name === '.git' || name === 'node_modules' || name === '.vercel') continue;
    const abs = path.join(dir, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else out.push(path.relative(ROOT, abs).split(path.sep).join('/'));
  }
  return out;
}

function collect() {
  const files = [];
  for (const f of INCLUDE_FILES) if (fs.existsSync(path.join(ROOT, f))) files.push(f);
  for (const d of INCLUDE_DIRS) {
    const abs = path.join(ROOT, d);
    if (fs.existsSync(abs)) walk(abs, files);
  }
  return files;
}

async function gh(method, p, body) {
  const r = await fetch('https://api.github.com' + p, {
    method,
    headers: {
      Authorization: 'Bearer ' + TOK,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'gcwindsor-push'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await r.json().catch(() => ({}));
  if (r.status >= 300) throw new Error(method + ' ' + p + ' -> ' + r.status + ' ' + (json.message || ''));
  return json;
}

(async () => {
  const msg = (process.argv[2] || 'update') +
    '\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>';

  const files = collect();
  if (!files.length) { console.error('nothing to push'); process.exit(1); }

  /* sanity: never push an empty or unparseable JSON file */
  for (const rel of files) {
    const bytes = fs.readFileSync(path.join(ROOT, rel));
    if (!bytes.length) throw new Error('refusing to push EMPTY file: ' + rel);
    if (/\.json$/.test(rel)) {
      try { JSON.parse(bytes.toString('utf8')); }
      catch (e) { throw new Error('refusing to push INVALID JSON: ' + rel + ' (' + e.message + ')'); }
    }
  }

  console.log('repo   ', REPO + '@' + BRANCH);
  console.log('files  ', files.length);

  const ref = await gh('GET', `/repos/${REPO}/git/ref/heads/${BRANCH}`);
  const headSha = ref.object.sha;
  const headCommit = await gh('GET', `/repos/${REPO}/git/commits/${headSha}`);

  /* upload each file as a blob */
  const tree = [];
  for (const rel of files) {
    const content = fs.readFileSync(path.join(ROOT, rel)).toString('base64');
    const blob = await gh('POST', `/repos/${REPO}/git/blobs`, { content, encoding: 'base64' });
    tree.push({ path: rel, mode: '100644', type: 'blob', sha: blob.sha });
    process.stdout.write('.');
  }
  process.stdout.write('\n');

  const newTree = await gh('POST', `/repos/${REPO}/git/trees`, {
    base_tree: headCommit.tree.sha,
    tree
  });

  if (newTree.sha === headCommit.tree.sha) {
    console.log('nothing changed - no commit created');
    return;
  }

  const commit = await gh('POST', `/repos/${REPO}/git/commits`, {
    message: msg, tree: newTree.sha, parents: [headSha]
  });
  await gh('PATCH', `/repos/${REPO}/git/refs/heads/${BRANCH}`, { sha: commit.sha });

  console.log('\ncommitted ' + commit.sha.slice(0, 7) + ' to ' + REPO + '@' + BRANCH);
  console.log('Vercel will rebuild automatically.');
  console.log('\nYour local clone is now BEHIND. In GitHub Desktop:');
  console.log('  discard local changes, then Pull.');
})().catch(e => { console.error('\nFAILED:', e.message); process.exit(1); });
