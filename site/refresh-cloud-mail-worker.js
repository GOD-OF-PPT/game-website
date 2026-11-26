if ('serviceWorker' in navigator) {
  const scope = new URL('/', location.origin).href;
  const legacyScript = new URL('sw.js', scope).href;
  navigator.serviceWorker.getRegistration(scope).then(registration => {
    if (registration?.scope === scope && registration.active?.scriptURL === legacyScript) {
      return registration.update();
    }
  }).catch(() => {
    // The browser will retry during its service worker update checks.
  });
}
