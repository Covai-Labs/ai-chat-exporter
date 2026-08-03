const fs = require('fs');
const path = require('path');

const target = process.argv[2] || 'chrome';
console.log(`Building manifest for target: ${target}`);

try {
  const sourceManifest = fs.readFileSync('manifest.json', 'utf8');
  const manifest = JSON.parse(sourceManifest);

  if (target === 'firefox') {
    // Firefox adjustments
    manifest.background = { scripts: ['background/background.js'] };

    // Ensure browser_specific_settings exists
    manifest.browser_specific_settings = manifest.browser_specific_settings || {};
    manifest.browser_specific_settings.gecko = manifest.browser_specific_settings.gecko || {};

    const gecko = manifest.browser_specific_settings.gecko;
    gecko.id = 'ai-chat-exporter@covai.org';
    gecko.strict_min_version = '140.0';
    gecko.data_collection_permissions = {
      required: true,
      optional: false,
    };
  } else {
    // Chrome defaults (ensure service_worker)
    // If the source manifest uses scripts (unlikely if source is chrome), fix it.
    // But we obey source of truth (manifest.json) which is configured for Chrome.
    // We can just strip browser_specific_settings if we want to be clean.
    delete manifest.browser_specific_settings;
  }

  // Ensure dist exists
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  fs.writeFileSync(path.join('dist', 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('Successfully wrote dist/manifest.json');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
