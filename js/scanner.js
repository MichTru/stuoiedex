// Lettore QR con la fotocamera: BarcodeDetector dove c'è, altrimenti jsQR.
export async function startScanner(video, onCode) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  video.srcObject = stream;
  video.setAttribute('playsinline', '');
  await video.play();

  let detect;
  if ('BarcodeDetector' in window) {
    const bd = new window.BarcodeDetector({ formats: ['qr_code'] });
    detect = async () => (await bd.detect(video))[0]?.rawValue;
  } else {
    const jsQR = (await import('https://esm.sh/jsqr@1.4.0')).default;
    const canvas = document.createElement('canvas');
    const c2d = canvas.getContext('2d', { willReadFrequently: true });
    detect = async () => {
      const w = video.videoWidth, h = video.videoHeight;
      if (!w) return null;
      const s = Math.min(1, 640 / w);
      canvas.width = w * s; canvas.height = h * s;
      c2d.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = c2d.getImageData(0, 0, canvas.width, canvas.height);
      return jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })?.data;
    };
  }

  let alive = true, last = '', lastAt = 0;
  const loop = async () => {
    if (!alive) return;
    try {
      const code = await detect();
      if (code && (code !== last || Date.now() - lastAt > 4000)) { last = code; lastAt = Date.now(); onCode(code); }
    } catch { /* frame non leggibile */ }
    setTimeout(loop, 180);
  };
  loop();
  return () => { alive = false; stream.getTracks().forEach((t) => t.stop()); };
}
