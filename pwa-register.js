if ('serviceWorker' in navigator && window.isSecureContext && /^https?:$/.test(location.protocol)) {
  const cachePage = async () => {
    try {
      await navigator.serviceWorker.register('./sw.js', {updateViaCache:'none'});
      navigator.serviceWorker.addEventListener('controllerchange', () => navigator.serviceWorker.controller?.postMessage('warm-audio'));
      const ready = await navigator.serviceWorker.ready;
      ready.active?.postMessage('warm-audio');
    } catch {}
  };
  if ('requestIdleCallback' in window) requestIdleCallback(cachePage, {timeout:1200});
  else setTimeout(cachePage, 250);
}
