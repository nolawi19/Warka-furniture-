/**
 * Stamps the saved theme on <html> before the first paint. Without this the
 * page paints light, then flips — which on a dark-mode phone at night is a
 * flash in the face.
 */
function script(fallback: 'light' | 'dark' | 'system'): string {
  // A saved choice always wins. Without one, the shop's own default applies,
  // and only 'system' defers to the device.
  const otherwise =
    fallback === 'system'
      ? `t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';`
      : `t='${fallback}';`;
  return `(function(){try{var t=localStorage.getItem('warka.theme');if(t!=='dark'&&t!=='light'){${otherwise}}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
}

export function ThemeScript({ fallback = 'light' }: { fallback?: 'light' | 'dark' | 'system' }) {
  return <script dangerouslySetInnerHTML={{ __html: script(fallback) }} />;
}
