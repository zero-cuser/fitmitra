import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const domainDir = path.resolve(__dirname, '../src/domain');

function getAllTsFiles(dir: string): string[] {
  let files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('Phase 7 — Architecture Boundary Guard', () => {
  const tsFiles = getAllTsFiles(domainDir);

  it('scans all domain files in src/domain', () => {
    assert.ok(tsFiles.length >= 8, `Expected at least 8 domain files, found ${tsFiles.length}`);
  });

  const FORBIDDEN_IMPORT_PATTERNS = [
    { pattern: /from\s+['"]react['"]/i, name: 'react' },
    { pattern: /from\s+['"]react-dom['"]/i, name: 'react-dom' },
    { pattern: /from\s+['"]next\//i, name: 'next/*' },
    { pattern: /from\s+['"]canvas-confetti['"]/i, name: 'canvas-confetti' },
    { pattern: /from\s+['"]@mediapipe\//i, name: '@mediapipe/*' }
  ];

  for (const filePath of tsFiles) {
    const relativePath = path.relative(path.resolve(__dirname, '..'), filePath);

    it(`enforces that ${relativePath} does not import forbidden web/UI libraries`, () => {
      const content = fs.readFileSync(filePath, 'utf-8');

      for (const { pattern, name } of FORBIDDEN_IMPORT_PATTERNS) {
        const matches = content.match(pattern);
        assert.equal(
          matches,
          null,
          `Domain file "${relativePath}" must not import "${name}" to preserve Android portability.`
        );
      }
    });

    // Note: repositories/local*.ts can adapt to storageSafety, but domain models, exercises, workouts, and pose MUST NOT reference window/document/navigator
    const isLocalRepository = relativePath.includes('repositories');
    if (!isLocalRepository) {
      it(`enforces that pure domain file ${relativePath} has zero window/document/navigator references`, () => {
        const content = fs.readFileSync(filePath, 'utf-8');

        assert.equal(
          /window\./.test(content),
          false,
          `Pure domain file "${relativePath}" must not reference global "window".`
        );
        assert.equal(
          /document\./.test(content),
          false,
          `Pure domain file "${relativePath}" must not reference global "document".`
        );
        assert.equal(
          /navigator\./.test(content),
          false,
          `Pure domain file "${relativePath}" must not reference global "navigator".`
        );
      });
    }
  }
});
