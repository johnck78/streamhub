(() => {
  const button = $('startPhonePairing');
  const dialog = $('phonePairDialog');
  const status = $('phonePairStatus');
  const pairing = window.streamHubPairing;
  let controller = null;

  function drawQr(url) {
    const qr = qrcodegen.QrCode.encodeText(url.href, qrcodegen.QrCode.Ecc.MEDIUM);
    const canvas = $('phonePairQr');
    const scale = 6;
    canvas.width = canvas.height = (qr.size + 8) * scale;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#000';
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        if (qr.getModule(x, y)) context.fillRect((x + 4) * scale, (y + 4) * scale, scale, scale);
      }
    }
  }

  async function applySettings(settings) {
    if (typeof settings.tmdb !== 'string' || !/^[a-f0-9]{32}$/i.test(settings.tmdb) ||
        typeof settings.email !== 'string' || !settings.email.includes('@') ||
        typeof settings.password !== 'string' || !settings.password) {
      throw Error('Invalid settings received. Scan a new QR code.');
    }
    apiKey = settings.tmdb;
    $('apiKey').value = apiKey;
    $('sbUrl').value = pairing.projectUrl;
    $('sbKey').value = pairing.publishableKey;
    $('sbEmail').value = settings.email;
    await Promise.all([loadLive(), connectCloud(pairing.projectUrl, pairing.publishableKey)]);
    await signInStreamHub(settings.email, settings.password);
    return !$('connectMessage').classList.contains('error') &&
      cloudUser?.email?.toLowerCase() === settings.email.toLowerCase() &&
      !$('cloudMessage').classList.contains('error');
  }

  $('cancelPhonePairing').onclick = () => dialog.close();
  dialog.addEventListener('close', () => controller?.abort());
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      dialog.close();
    }
    event.stopPropagation();
  });

  button.onclick = async () => {
    button.disabled = true;
    controller = new AbortController();
    const signal = controller.signal;
    let session;
    try {
      status.textContent = 'Starting phone setup…';
      session = await pairing.start(signal);
      drawQr(session.url);
      dialog.showModal();
      $('cancelPhonePairing').focus();
      const expiry = Date.now() + 5 * 60 * 1000;
      while (!signal.aborted && Date.now() < expiry) {
        const settings = await pairing.take(session, signal);
        if (signal.aborted) break;
        if (settings) {
          session = null;
          dialog.close();
          status.textContent = 'Connecting the live catalog and Cloud Sync…';
          status.textContent = await applySettings(settings) ? 'Live catalog and Cloud Sync are connected.' :
            'Settings received. See the live catalog and Cloud Sync sections for connection status.';
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
      status.textContent = signal.aborted ? 'Phone setup canceled.' : 'QR code expired. Start phone setup again.';
    } catch (error) {
      status.textContent = signal.aborted ? 'Phone setup canceled.' : error.message;
    } finally {
      if (dialog.open) dialog.close();
      if (session) pairing.cancel(session).catch(() => {});
      controller = null;
      button.disabled = false;
      if (document.activeElement === document.body) button.focus();
    }
  };
})();
