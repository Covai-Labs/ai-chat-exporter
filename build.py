import json
import sys
import os
import re
import base64

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

    # For chrome target: replace remote CDN KaTeX/Prism headers with locally bundled,
    # fully inlined versions to comply with Chrome Web Store MV3 CSP policy.
    # KaTeX fonts are embedded as base64 data: URIs so exported HTML is truly standalone.
    # Firefox and Chromium builds keep the CDN links in html.js unchanged.
    if target == 'chrome':
        html_formatter_path = 'dist/content/formatters/html.js'
        if not os.path.exists(html_formatter_path):
            print(f"  [SKIP] {html_formatter_path} not found in dist — skipping inline step.")
        else:
            print("Inlining KaTeX + Prism bundles for chrome target...")

            # ----------------------------------------------------------------
            # 1. KaTeX — read CSS, rewrite all font url() to base64 data: URIs
            # ----------------------------------------------------------------
            katex_dir   = 'content/lib/katex'
            fonts_dir   = os.path.join(katex_dir, 'fonts')
            katex_css_path  = os.path.join(katex_dir, 'katex.min.css')
            katex_js_path   = os.path.join(katex_dir, 'katex.min.js')
            autorender_path = os.path.join(katex_dir, 'auto-render.min.js')

            for required in [katex_css_path, katex_js_path, autorender_path]:
                if not os.path.exists(required):
                    raise FileNotFoundError(
                        f"Required KaTeX bundle file not found: {required}\n"
                        "Run the setup step to download KaTeX into content/lib/katex/ "
                        "(see DEVELOPMENT.md)."
                    )

            with open(katex_css_path, 'r', encoding='utf-8') as f:
                katex_css = f.read()

            def encode_font(match):
                """Replace url(fonts/Foo.woff2) → url(data:font/woff2;base64,...)

                KaTeX CSS declares @font-face with format-hinted fallbacks:
                  src: url(fonts/X.woff2) format('woff2'),
                       url(fonts/X.woff)  format('woff'),   ← legacy fallback
                       url(fonts/X.ttf)   format('truetype'); ← oldest fallback

                Modern browsers (Chrome 36+, Firefox 39+) always pick woff2
                and never request the .woff/.ttf entries. We only bundle woff2
                files, so non-woff2 entries are silently left as-is (they will
                produce a 404 if somehow requested, but that never happens).
                """
                raw = match.group(1).strip().strip('"\'')
                font_filename = os.path.basename(raw)
                font_path = os.path.join(fonts_dir, font_filename)
                if os.path.exists(font_path):
                    with open(font_path, 'rb') as fnt:
                        enc = base64.b64encode(fnt.read()).decode('ascii')
                    ext = font_filename.rsplit('.', 1)[-1].lower()
                    mime_map = {
                        'woff2': 'font/woff2',
                        'woff':  'font/woff',
                        'ttf':   'font/truetype',
                        'eot':   'application/vnd.ms-fontobject',
                    }
                    mime = mime_map.get(ext, 'font/woff2')
                    return f'url(data:{mime};base64,{enc})'
                else:
                    # Silently skip: .woff/.ttf are legacy @font-face fallbacks
                    # that modern browsers never request when woff2 is present.
                    return match.group(0)

            # KaTeX CSS uses:  url(fonts/KaTeX_Main-Regular.woff2)
            # and sometimes:   url("../fonts/KaTeX_Main-Regular.woff2")
            katex_css_inlined = re.sub(
                r'url\((["\']?(?:\.\.\/)?fonts\/[^)"\']+["\']?)\)',
                encode_font,
                katex_css
            )

            font_count = katex_css_inlined.count('data:font/')
            print(f"  KaTeX: inlined {font_count} font files as base64 data: URIs")

            with open(katex_js_path, 'r', encoding='utf-8') as f:
                katex_js = f.read()
            with open(autorender_path, 'r', encoding='utf-8') as f:
                autorender_js = f.read()

            # ----------------------------------------------------------------
            # 2. Prism — base bundle (core + 25+ languages, no autoloader CDN)
            # ----------------------------------------------------------------
            prism_bundle_path = 'content/lib/prismjs/prism-bundle.js'
            prism_css_path    = 'content/lib/prismjs/prism-tomorrow.min.css'

            for required in [prism_bundle_path, prism_css_path]:
                if not os.path.exists(required):
                    raise FileNotFoundError(
                        f"Required Prism bundle file not found: {required}\n"
                        "Run the setup step to build the Prism bundle into content/lib/prismjs/ "
                        "(see DEVELOPMENT.md)."
                    )

            with open(prism_bundle_path, 'r', encoding='utf-8') as f:
                prism_js = f.read()
            with open(prism_css_path, 'r', encoding='utf-8') as f:
                prism_css = f.read()

            # ----------------------------------------------------------------
            # 3. Build the inline headers block (no external URLs whatsoever)
            # ----------------------------------------------------------------
            # Auto-render is called on DOMContentLoaded so it fires after the
            # deferred KaTeX script has run (both are now synchronous inline scripts,
            # so DOMContentLoaded order is guaranteed).
            autorender_call = (
                'function renderMath(){if(window.renderMathInElement){'
                'renderMathInElement(document.body,{delimiters:['
                '{left:"$$",right:"$$",display:true},'
                '{left:"$",right:"$",display:false},'
                '{left:"\\\\[",right:"\\\\]",display:true},'
                '{left:"\\\\(",right:"\\\\)",display:false}'
                ']});}}'
                'if(document.readyState==="loading"){{document.addEventListener("DOMContentLoaded",renderMath);}}'
                'else{{renderMath();}}'
            )

            inline_block = (
                f'<style>{katex_css_inlined}</style>'
                f'<script>{katex_js}</script>'
                f'<script>{autorender_js}</script>'
                f'<script>{autorender_call}</script>'
                f'<style>{prism_css}</style>'
                f'<script>{prism_js}</script>'
            )

            # ----------------------------------------------------------------
            # 4. Substitute into the dist html.js formatter
            # ----------------------------------------------------------------
            with open(html_formatter_path, 'r', encoding='utf-8') as hf:
                formatter_content = hf.read()

            # Use json.dumps() to produce a valid JS double-quoted string literal.
            # This is critical for two reasons:
            #   1. Minified Prism.js/KaTeX contains octal escape sequences (e.g. \07, \1
            #      in regex patterns) that are LEGAL inside <script> HTML but ILLEGAL
            #      inside a JS template literal (ES2015+ strict mode).
            #   2. re.sub() interprets backslash sequences in the *replacement string*
            #      (e.g. \u, \1) as backreferences/escapes, causing 'bad escape' errors.
            #      Using a lambda bypasses re.sub's replacement-string interpolation.
            import json
            json_block = json.dumps(inline_block)

            pattern = r'const katexHeaders = `[\s\S]*?`;'
            modified_content = re.sub(
                pattern,
                lambda _: f'const katexHeaders = {json_block};',
                formatter_content,
            )

            if modified_content == formatter_content:
                print("  [WARN] katexHeaders pattern not matched in html.js — substitution skipped.")
            else:
                orig_kb = len(formatter_content.encode('utf-8')) / 1024
                new_kb  = len(modified_content.encode('utf-8')) / 1024
                print(f"  html.js: {orig_kb:.0f} KB → {new_kb:.0f} KB ({new_kb - orig_kb:+.0f} KB)")
                print("  KaTeX + Prism fully inlined. Exported HTML has zero CDN dependencies.")

            with open(html_formatter_path, 'w', encoding='utf-8') as hf:
                hf.write(modified_content)

except Exception as error:
    print(f'Build failed: {error}')
    sys.exit(1)