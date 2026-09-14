/**
 * Stamps the saved theme on <html> before the first paint. Without this the
 * page paints light, then flips — which on a dark-mode phone at night is a
 * flash in the face.
 */
const script = `(function(){try{var t=localStorage.getItem('warka.theme');if(t!=='dark'&&t!=='light'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
