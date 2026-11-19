(() => {
  const projectUrl = 'https://lnatyepemetqliuzwuwd.supabase.co';
  const publishableKey = 'sb_publishable_GAbQojwcxGXtOyiZpf6bGQ_eg3Dyxir';
  const encoder = new TextEncoder();

  function encode(bytes) {
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(value) {
    return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
  }
  async function derive(secret, purpose) {
    return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(purpose + ':' + secret)));
  }
  async function rpc(action, args, signal) {
    const response = await fetch(projectUrl + '/rest/v1/rpc/streamhub_pair_' + action, {
      method: 'POST',
      headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      cache: 'no-store',
      signal
    });
    if (!response.ok) throw Error('The StreamHub pairing service is unavailable. Try again.');
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  async function cipherKey(secret) {
    return crypto.subtle.importKey('raw', await derive(secret, 'streamhub-encryption-v1'), 'AES-GCM', false, ['encrypt', 'decrypt']);
  }
  async function encrypt(id, secret, settings) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = new Uint8Array(await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: encoder.encode(id) },
      await cipherKey(secret), encoder.encode(JSON.stringify(settings))
    ));
    const packet = new Uint8Array(iv.length + encrypted.length);
    packet.set(iv);
    packet.set(encrypted, iv.length);
    return encode(packet);
  }
  async function decrypt(id, secret, packet) {
    const bytes = decode(packet);
    const result = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: encoder.encode(id) },
      await cipherKey(secret), bytes.slice(12)
    );
    return JSON.parse(new TextDecoder().decode(result));
  }
  async function submitProof(secret) {
    return encode(await derive(secret, 'streamhub-submit-v1'));
  }

  async function start(signal) {
    const id = crypto.randomUUID();
    const secret = encode(crypto.getRandomValues(new Uint8Array(32)));
    const read = encode(crypto.getRandomValues(new Uint8Array(32)));
    await rpc('start', {p_id:id, p_submit:await submitProof(secret), p_read:read}, signal);
    const url = new URL('pair.html', document.baseURI);
    url.hash = id + '.' + secret;
    return {id, secret, read, url};
  }
  function scanLink() {
    const match = /^#([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})\.([A-Za-z0-9_-]{43})$/.exec(location.hash);
    if (!match) return null;
    history.replaceState(null, '', location.pathname + location.search);
    return {id:match[1], secret:match[2]};
  }
  async function send({id, secret}, settings) {
    return rpc('send', {p_id:id, p_submit:await submitProof(secret), p_payload:await encrypt(id, secret, settings)});
  }
  async function take({id, secret, read}, signal) {
    const packet = await rpc('take', {p_id:id, p_read:read}, signal);
    return packet === null ? null : decrypt(id, secret, packet);
  }
  function cancel({id, read}) {
    return rpc('cancel', {p_id:id, p_read:read});
  }

  window.streamHubPairing = {start, scanLink, send, take, cancel, projectUrl, publishableKey};
})();
