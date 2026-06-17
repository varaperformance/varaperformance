#!/usr/bin/env node
/**
 * UPDATE LegalDocument (Privacy Policy v1.0.0) content + hash from seed-legal-documents.ts.
 *
 * Usage:
 *   node hack/compliance/update-privacy-legal.mjs --local
 *   node hack/compliance/update-privacy-legal.mjs --k8s [--namespace production]
 *
 * Local uses DATABASE_URL (loads apps/backend/.env when present).
 * K8s runs: kubectl exec -i … psql (same credentials as seed-k8s defaults).
 */

import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../..');
const BACKEND_ROOT = join(REPO_ROOT, 'apps/backend');
const SEED_TS = join(BACKEND_ROOT, 'prisma/seeds/seed-legal-documents.ts');

function loadDotenv() {
  const envPath = join(BACKEND_ROOT, '.env');
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

function extractPrivacyBody() {
  const s = readFileSync(SEED_TS, 'utf8');
  const start = s.indexOf('type: ConsentType.PRIVACY_POLICY');
  if (start < 0) throw new Error('PRIVACY_POLICY block not found in seed-legal-documents.ts');
  const cOpen = s.indexOf('content: `', start) + 'content: `'.length;
  const cEnd = s.indexOf('`,\n  },', cOpen);
  if (cEnd < 0) throw new Error('Could not find end of privacy content template');
  return s.slice(cOpen, cEnd);
}

function parseArgs(argv) {
  const out = { local: false, k8s: false, namespace: 'production' };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--local') out.local = true;
    else if (argv[i] === '--k8s') out.k8s = true;
    else if (argv[i] === '--namespace' && argv[i + 1]) {
      out.namespace = argv[++i];
    }
  }
  if (!out.local && !out.k8s) {
    out.local = true;
    out.k8s = true;
  }
  return out;
}

async function updateViaPg(connectionString, label) {
  const req = createRequire(join(BACKEND_ROOT, 'package.json'));
  const { Client } = req('pg');
  const content = extractPrivacyBody();
  const hashValue = createHash('sha256').update(content, 'utf8').digest('hex');

  const client = new Client({ connectionString });
  await client.connect();
  try {
    const r = await client.query(
      `UPDATE "LegalDocument"
       SET content = $1, "hashValue" = $2, "updatedAt" = NOW()
       WHERE type = 'PRIVACY_POLICY' AND version = $3`,
      [content, hashValue, 'v1.0.0'],
    );
    console.error(`[${label}] UPDATE rows: ${r.rowCount} (hash ${hashValue.slice(0, 12)}…)`);
    if (r.rowCount === 0) {
      throw new Error(`No row matched type=PRIVACY_POLICY version=v1.0.0 (${label})`);
    }
  } finally {
    await client.end();
  }
}

function updateViaKubectl(namespace) {
  const content = extractPrivacyBody();
  const hashValue = createHash('sha256').update(content, 'utf8').digest('hex');

  const tag = 'vapr_privacy_body_2026';
  const sql = `UPDATE "LegalDocument"
SET content = $${tag}$${content}$${tag}$,
    "hashValue" = '${hashValue.replace(/'/g, "''")}',
    "updatedAt" = NOW()
WHERE type = 'PRIVACY_POLICY' AND version = 'v1.0.0';
`;

  const pod = 'varaperformance-postgres-0';
  const args = [
    'exec',
    '-i',
    '-n',
    namespace,
    pod,
    '--',
    'env',
    'PGPASSWORD=postgres',
    'psql',
    '-U',
    'postgres',
    '-d',
    'mydatabase',
    '-v',
    'ON_ERROR_STOP=1',
  ];

  const res = spawnSync('kubectl', args, {
    input: sql,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`kubectl psql failed (${res.status}):\n${res.stderr || res.stdout}`);
  }
  console.error(`[k8s:${namespace}] ${(res.stderr + res.stdout).trim() || 'OK'}`);
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.local) {
    loadDotenv();
    const url = process.env.DATABASE_URL;
    if (!url) {
      console.error('[local] Skip: DATABASE_URL not set (add apps/backend/.env or export DATABASE_URL)');
    } else {
      await updateViaPg(url, 'local');
    }
  }

  if (args.k8s) {
    const chk = spawnSync('kubectl', ['get', 'pod', '-n', args.namespace, 'varaperformance-postgres-0'], {
      encoding: 'utf8',
    });
    if (chk.status !== 0) {
      console.error(`[k8s] Skip: cannot reach pod (${chk.stderr?.trim() || chk.stdout})`);
      return;
    }
    updateViaKubectl(args.namespace);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
