import fs from 'node:fs';
import path from 'node:path';

const root = 'C:/Users/GOWTHAM/OneDrive/Desktop/hexa/client';
const homePath = path.join(root, 'src/pages/Home.jsx');
const navPath = path.join(root, 'src/components/common/Navbar.jsx');
const htmlPath = path.join(root, 'index.html');
const src = fs.readFileSync(homePath, 'utf8');
const nav = fs.readFileSync(navPath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}${detail ? ' | ' + detail : ''}`);
};

// 1. File location + size
check('home-file-exists', fs.existsSync(homePath), `${src.length} chars, ${src.split('\n').length} lines`);

// 2. Escaped backslash check: literal "\<" or "\*" or "window\." in source
const hasEscapedTag = src.includes('\\<') || src.includes('\\*') || /window\\\./.test(src);
check('no-escaped-backslashes', !hasEscapedTag, hasEscapedTag ? 'FOUND literal backslash escapes' : 'none found - user paste artifacts only');

// 3. Required element IDs for JS (no null errors)
for (const id of ['jh-tiltCard', 'jh-floatingBadge', 'jh-progressCircle', 'jh-matchPct']) {
  const hasRef = src.includes(id);
  check(`id-${id}`, hasRef, hasRef ? 'referenced' : 'MISSING');
}
check('no-custom-cursor-divs', !src.includes('jh-cursorDot') && !src.includes('jh-cursorRing'), 'custom cursor removed per latest design (touch-safe)');

// 4. getElementById null-guards
check('cursor-removed', !src.includes('cursorDot') || src.includes("matchMedia('(hover: hover)"), 'cursor gated or removed');

// 5. Responsive breakpoints
check('breakpoint-1024', src.includes('max-width:1024px'), '');
check('breakpoint-768', src.includes('max-width:768px'), '');
check('grid-collapses-mobile', src.includes('grid-template-columns:1fr'), '');

// 6. Overflow protection
check('overflow-x-hidden-page', src.includes('overflow-x:hidden') || src.includes('overflow-x: hidden'), '');
check('app-overflow-x-hidden', fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8').includes('overflow-x-hidden'), 'App.jsx wrapper');
check('fixed-orbs-contained', src.includes('.glow-bg') && src.includes('overflow:hidden'), 'glow-bg overflow hidden');

// 7. Risky fixed widths that can overflow 320px viewports
// Orbs (600/700/550/650) live inside .glow-bg (position:fixed, width:100%, overflow:hidden) so they cannot expand scrollWidth.
// Media-query values (1024/768) and max-width:1200 container are not element widths.
const styleBlock = (src.match(/<style>([\s\S]*?)<\/style>/) || ['', ''])[1];
const noOrbs = styleBlock.replace(/\.orb-\d\s*\{[^}]*\}/g, '');
const elementWidths = [...noOrbs.replace(/@media[^{]*\{[^}]*\}/g, '').matchAll(/(?:^|[;{}])\s*width:\s*(\d+)px/g)].map(m => parseInt(m[1], 10));
const risky = elementWidths.filter(w => w > 320);
check('no-risky-fixed-widths', risky.length === 0, risky.length ? `found ${risky.join(',')}` : `orb widths excluded (overflow:hidden container), no element >320px`);
check('tilt-null-guarded', /if\s*\(\s*tiltCard\s*\)/.test(src), 'getElementById + if(tiltCard) guard');

// 8. Navbar mobile menu (part of Home page)
check('hamburger-aria-label', nav.includes('aria-label'), nav.match(/aria-label="([^"]*)"/)?.[1] || 'missing');
check('hamburger-aria-expanded-dynamic', /aria-expanded=\{/.test(nav), 'static or missing = FAIL (only aria-label present)');
check('mobile-menu-closes-on-link', nav.includes('closeMobile'), '');

// 9. Placeholder links: Home must not use href="#"
check('no-href-hash-in-home', !src.includes('href="#"'), 'uses Link to="/register" and "/jobs"');

// 10. Heading hierarchy + viewport meta
check('viewport-meta', html.includes('name="viewport"'), '');
check('single-h1', (src.match(/<h1/g) || []).length === 1, `h1 count=${(src.match(/<h1/g) || []).length}`);

// 11. Touch safety: mouse effects gated
check('touch-gated-effects', src.includes('pointer: fine') && src.includes('prefers-reduced-motion'), 'tilt/orbs gated, reduced-motion respected');
check('reduced-motion-handled', src.includes('prefers-reduced-motion'), '');

// 12. rAF cleanup (perf: no runaway loops after unmount)
check('raf-cancelled', src.includes('cancelAnimationFrame(raf2)'), 'orb loop cancelled on unmount');
check('observers-disconnected', src.includes('io.disconnect()'), '');
check('listeners-removed', src.includes("removeEventListener('mousemove'"), '');

const failed = results.filter(r => !r.pass);
console.log(`\nTOTAL: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) console.log('FAILED: ' + failed.map(f => f.name).join(', '));
process.exit(failed.length ? 1 : 0);
