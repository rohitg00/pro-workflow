#!/usr/bin/env node
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
      const configFile = input.file_path || '';
      const source = input.source || '';
      const fileName = configFile ? path.basename(configFile) : '';

      const sensitiveFiles = [
        'settings.json',
        'settings.local.json',
        'hooks.json',
        '.claudeignore'
      ];

      const isSensitive = sensitiveFiles.some(f => fileName === f) || (!fileName && /settings$/.test(source));

      if (isSensitive) {
        log(`[ProWorkflow] Config changed: ${fileName || source}`);

        if (fileName === 'hooks.json') {
          log('[ProWorkflow] Hooks configuration modified — quality gates may be affected');
        }

        if (fileName === 'settings.json' || fileName === 'settings.local.json' || (!fileName && /settings$/.test(source))) {
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
        }
        const entry = `${new Date().toISOString()} ${configFile || source}\n`;
        fs.appendFileSync(logFile, entry);
      }

    } catch (err) {
      console.error('[ProWorkflow] config-watcher error:', err.message);
    }
  });
}

main().catch(err => {
  console.error('[ProWorkflow] Error:', err.message);
  process.exit(0);
});
