(() => {
  const pairing = window.streamHubPairing;
  const link = pairing.scanLink();
  if (!link) return;
  const form = document.getElementById('pairForm');
  const status = document.getElementById('pairStatus');
  const button = form.querySelector('button');
  form.hidden = false;
  status.textContent = 'Enter your settings and keep StreamHub open on the TV.';
  form.addEventListener('submit', async event => {
    event.preventDefault();
    button.disabled = true;
    try {
      const sent = await pairing.send(link, {
        tmdb: document.getElementById('tmdb').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
      });
      if (!sent) {
        form.hidden = true;
        form.reset();
        status.textContent = 'That QR code expired or was already used. Start again on your TV.';
        return;
      }
      form.reset();
      form.hidden = true;
      status.textContent = 'Settings sent. Check the TV for the connection status.';
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
})();
