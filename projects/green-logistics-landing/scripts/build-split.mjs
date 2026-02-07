import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const baseDist = path.join(root, 'dist');
const consoleDist = path.join(root, 'dist-console');
const landingDist = path.join(root, 'dist-landing');

const FLAG_START = '<!-- APP_FLAGS_START -->';
const FLAG_END = '<!-- APP_FLAGS_END -->';

function assertBaseBuildExists() {
  if (!fs.existsSync(baseDist)) {
    throw new Error('dist/ not found. Run "npm run build" first.');
  }
}

function resetDir(target) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(baseDist, target, { recursive: true });
}

function buildFlagsBlock(appType, blockedRoutes) {
  const routesJson = JSON.stringify(blockedRoutes);
  return [
    FLAG_START,
    '    <script type="module">',
    `      window.__APP_TYPE__ = '${appType}';`,
    `      window.__BLOCKED_ROUTES__ = ${routesJson};`,
    '    </script>',
    FLAG_END,
  ].join('\n');
}

function patchIndexHtml(target, appType, blockedRoutes, title) {
  const indexPath = path.join(target, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  // Normalize the title first.
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);

  // Replace previously inserted app flags if present.
  const flagsBlockRegex = new RegExp(
    `${FLAG_START}[\\s\\S]*?${FLAG_END}`,
    'm',
  );
  const flagsBlock = buildFlagsBlock(appType, blockedRoutes);

  if (flagsBlockRegex.test(html)) {
    html = html.replace(flagsBlockRegex, flagsBlock);
  } else {
    // Inject flags right after <head> to keep behavior deterministic.
    html = html.replace('<head>', `<head>\n${flagsBlock}`);
  }

  fs.writeFileSync(indexPath, html, 'utf8');
}

function main() {
  assertBaseBuildExists();
  resetDir(consoleDist);
  resetDir(landingDist);

  patchIndexHtml(
    consoleDist,
    'console',
    ['/', '/shipper', '/carrier', '/owner'],
    'GreenFlow - API Console',
  );

  patchIndexHtml(
    landingDist,
    'landing',
    ['/console'],
    'GreenFlow - Green Logistics Platform',
  );

  process.stdout.write(
    [
      'Split build completed:',
      `- ${path.relative(root, consoleDist)}`,
      `- ${path.relative(root, landingDist)}`,
      '',
    ].join('\n'),
  );
}

main();
