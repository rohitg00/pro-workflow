#!/usr/bin/env node
/**
 * ConfigChange Hook (Claude Code 2.1.49+)
 *
 * Fires when configuration files change during a session.
 * Detects when quality gates, hooks, or permissions are modified.
 *
 * Input (stdin): { config_file, changes }
 * Output (stdout): Same JSON (pass-through)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function getTempDir() {
  return path.join(os.tmpdir(), 'pro-workflow');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function log(msg) {
  console.error(msg);
}

async function main() {
  let data = '';

  process.stdin.on('data', chunk => {
    data += chunk;
  });

  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(data);
      const configFile = input.config_file || input.file || '';
      const fileName = path.basename(configFile);

      const sensitiveFiles = [
        'settings.json',
        'settings.local.json',
        'hooks.json',
        '.claudeignore'
      ];

      const isSensitive = sensitiveFiles.some(f => fileName === f);

      if (isSensitive) {
        log(`[ProWorkflow] Config changed: ${fileName}`);

        if (fileName === 'hooks.json') {
          log('[ProWorkflow] Hooks configuration modified — quality gates may be affected');
        }

        if (fileName === 'settings.json' || fileName === 'settings.local.json') {
          log('[ProWorkflow] Settings changed mid-session — verify permissions are as expected');
        }

        const tempDir = getTempDir();
        ensureDir(tempDir);
        const logFile = path.join(tempDir, 'config-changes.log');
        const MAX_LOG_SIZE = 100 * 1024;
        try {
          const stat = fs.statSync(logFile);
          if (stat.size > MAX_LOG_SIZE) {
            fs.writeFileSync(logFile, '');
          }
        } catch (_e) {
          // File doesn't exist yet
        }
        const entry = `${new Date().toISOString()} ${configFile}\n`;
        fs.appendFileSync(logFile, entry);
      }

      console.log(data);
    } catch (err) {
      console.error('[ProWorkflow] config-watcher error:', err.message);
      console.log(data || '{}');
    }
  });
}

main().catch(err => {
  console.error('[ProWorkflow] Error:', err.message);
  process.exit(0);
});
