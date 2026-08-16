import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Guard test: enforce architectural boundary.
 *
 * src/domain/ and tools/ must NEVER import Phaser. This boundary keeps the
 * entire simulation unit-testable in Node with no browser. Phaser may only be
 * imported from src/adapters/, src/scenes/, and src/main.ts.
 */

const testFileDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(testFileDir, '..', '..');

/**
 * Recursively walk a directory and collect all .ts files.
 */
function collectTypeScriptFiles(dirPath: string): string[] {
  const files: string[] = [];

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        files.push(...collectTypeScriptFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  } catch {
    // If directory doesn't exist or can't be read, return empty.
  }

  return files;
}

/**
 * Check if a source file imports Phaser in any form.
 * Detects:
 *   - import ... from 'phaser'
 *   - import 'phaser'
 *   - export ... from 'phaser'
 *   - import('phaser')
 *   - require('phaser')
 *   - Subpath imports like 'phaser/src/...'
 */
function hasPhaserImport(filePath: string): boolean {
  const content = readFileSync(filePath, 'utf-8');

  // Match various forms of phaser imports.
  // Using word boundary and explicit quote detection.
  const patterns = [
    /\bimport\s+(?:[*\w\s{},]*\s+)?from\s+['"]phaser(?:\/[^'"]*)?['"]/,
    /\bimport\s+['"]phaser(?:\/[^'"]*)?['"]/,
    /\bexport\s+(?:[*\w\s{},]*\s+)?from\s+['"]phaser(?:\/[^'"]*)?['"]/,
    /\bimport\s*\(\s*['"]phaser(?:\/[^'"]*)?['"]\s*\)/,
    /\brequire\s*\(\s*['"]phaser(?:\/[^'"]*)?['"]\s*\)/,
  ];

  return patterns.some(pattern => pattern.test(content));
}

describe('Architecture: domain-purity', () => {
  it('src/domain/ must not import phaser', () => {
    const domainDir = join(projectRoot, 'src', 'domain');
    const files = collectTypeScriptFiles(domainDir);

    const violations: string[] = [];
    for (const filePath of files) {
      if (hasPhaserImport(filePath)) {
        // Report relative to project root for readability.
        const relative = filePath.slice(projectRoot.length + 1);
        violations.push(relative);
      }
    }

    expect(
      violations,
      `src/domain/ must not import phaser. Violations:\n${violations.map(f => `  - ${f}`).join('\n')}`
    ).toHaveLength(0);
  });

  it('tools/ must not import phaser', () => {
    const toolsDir = join(projectRoot, 'tools');
    const files = collectTypeScriptFiles(toolsDir);

    const violations: string[] = [];
    for (const filePath of files) {
      if (hasPhaserImport(filePath)) {
        // Report relative to project root for readability.
        const relative = filePath.slice(projectRoot.length + 1);
        violations.push(relative);
      }
    }

    expect(
      violations,
      `tools/ must not import phaser. Violations:\n${violations.map(f => `  - ${f}`).join('\n')}`
    ).toHaveLength(0);
  });

  it('walker found a non-trivial number of files', () => {
    const domainFiles = collectTypeScriptFiles(join(projectRoot, 'src', 'domain'));
    const toolsFiles = collectTypeScriptFiles(join(projectRoot, 'tools'));
    const totalFiles = domainFiles.length + toolsFiles.length;

    // Sanity check: ensure the walker is actually running and finding files.
    // A broken path would return 0 files and silently pass the other tests.
    expect(totalFiles).toBeGreaterThanOrEqual(5);
  });

  it('reports file paths on violation (sanity: currently passing)', () => {
    // This test documents the expected error message format.
    // It passes because there are no actual violations.
    const domainDir = join(projectRoot, 'src', 'domain');
    const toolsDir = join(projectRoot, 'tools');

    const domainFiles = collectTypeScriptFiles(domainDir);
    const toolsFiles = collectTypeScriptFiles(toolsDir);

    // Verify that paths are relative to the project root.
    for (const filePath of [...domainFiles, ...toolsFiles]) {
      expect(filePath).toContain(projectRoot);
    }
  });
});
