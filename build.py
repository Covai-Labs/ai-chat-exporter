import json
import sys
import os

target = sys.argv[1] if len(sys.argv) > 1 else 'chromium'
print(f"Building manifest for target: {target}")

try:
    with open('manifest.json', 'r') as f:
        manifest = json.load(f)

    if target == 'firefox':
        # Firefox adjustments
        manifest['background'] = {'scripts': ['background/background.js']}

        # Ensure browser_specific_settings exists
        if 'browser_specific_settings' not in manifest:
            manifest['browser_specific_settings'] = {}
        if 'gecko' not in manifest['browser_specific_settings']:
            manifest['browser_specific_settings']['gecko'] = {}

        gecko = manifest['browser_specific_settings']['gecko']
        gecko['id'] = 'ai-chat-exporter@local.dev'
        gecko['strict_min_version'] = '143.0'
        # Firefox does not support chrome.sidePanel API
        if 'permissions' in manifest and 'sidePanel' in manifest['permissions']:
            manifest['permissions'].remove('sidePanel')
        if 'side_panel' in manifest:
            del manifest['side_panel']

    else:
        # Chromium defaults (Chrome, Edge, Brave, etc.)
        if 'browser_specific_settings' in manifest:
            del manifest['browser_specific_settings']

    # Use loader.js for content scripts ALL browsers (Chrome, Edge, Firefox).
    # This avoids "type": "module" manifest validation warnings in Edge/Firefox
    # and ensures consistent bootstrapping via dynamic import.
    # BUT: Preserve the turndown.min.js script - only replace main.js!
    for cs in manifest.get('content_scripts', []):
        if 'js' in cs:
            # Only replace if this entry contains main.js (not turndown.min.js)
            if any('main.js' in script for script in cs['js']):
                cs['js'] = ['content/loader.js']
                if 'type' in cs:
                    del cs['type']

    # Ensure dist exists
    os.makedirs('dist', exist_ok=True)

    with open('dist/manifest.json', 'w') as f:
        json.dump(manifest, f, indent=2)
    print('Successfully wrote dist/manifest.json')

    # For chrome target, strip remote KaTeX scripts to comply with Chrome Web Store policy
    if target == 'chrome':
        html_formatter_path = 'dist/content/formatters/html.js'
        if os.path.exists(html_formatter_path):
            print("Stripping KaTeX remote scripts for chrome target...")
            with open(html_formatter_path, 'r') as hf:
                content = hf.read()
            
            # Locate the katexHeaders block and empty it
            import re
            pattern = r'const katexHeaders = `[\s\S]*?`;'
            modified_content = re.sub(pattern, "const katexHeaders = '';", content)
            
            with open(html_formatter_path, 'w') as hf:
                hf.write(modified_content)
            print("Successfully stripped KaTeX scripts.")

except Exception as error:
    print(f'Build failed: {error}')
    sys.exit(1)