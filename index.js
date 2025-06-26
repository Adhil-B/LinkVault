// Modern Locker Homepage JS
// Handles all main features: Encrypt, Decrypt, Hidden Bookmarks, Brute Force

// Helper: Show message
function showMsg(id, msg, type = 'success') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = type;
  el.innerHTML = msg;
  el.style.display = '';
}
function hideMsg(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// Change this if you move your site!
const BASE_URL = "https://adhil-b.github.io/LinkVault";

// ENCRYPT LINK
async function handleEncrypt(e) {
  e.preventDefault();
  hideMsg('enc-result'); hideMsg('enc-error');
  // Validate
  const url = document.getElementById('enc-url').value.trim();
  const password = document.getElementById('enc-password').value;
  const confirm = document.getElementById('enc-confirm').value;
  const hint = document.getElementById('enc-hint').value.trim();
  if (!url || !password || !confirm) {
    showMsg('enc-error', 'All fields except hint are required.', 'error');
    return;
  }
  if (password !== confirm) {
    showMsg('enc-error', 'Passwords do not match.', 'error');
    return;
  }
  let urlObj;
  try {
    urlObj = new URL(url);
  } catch {
    showMsg('enc-error', 'Invalid URL. Include http:// or https://', 'error');
    return;
  }
  if (!(urlObj.protocol === 'http:' || urlObj.protocol === 'https:' || urlObj.protocol === 'magnet:')) {
    showMsg('enc-error', `Protocol ${urlObj.protocol} not allowed.`, 'error');
    return;
  }
  // Encrypt
  try {
    const api = apiVersions[LATEST_API_VERSION];
    const salt = await api.randomSalt();
    const iv = await api.randomIv();
    const encrypted = await api.encrypt(url, password, salt, iv);
    const output = {
      v: LATEST_API_VERSION,
      e: b64.binaryToBase64(new Uint8Array(encrypted))
    };
    if (hint) output['h'] = hint;
    output['s'] = b64.binaryToBase64(salt);
    output['i'] = b64.binaryToBase64(iv);
    const fragment = b64.encode(JSON.stringify(output));
    const link = `${BASE_URL}/#${fragment}`;
    showMsg('enc-result', `<b>Encrypted Link:</b><br><div style='display:flex;align-items:center;gap:8px;'><input type='text' value='${link}' readonly style='width:100%;background:#23262f;color:#fff;border:none;padding:8px 6px;border-radius:6px;' onclick='this.select()'><button type='button' id='enc-copy-btn'>Copy</button></div>`, 'success');
  } catch (err) {
    showMsg('enc-error', 'Encryption failed.', 'error');
  }
}

// DECRYPT LINK
async function handleDecrypt(e) {
  e.preventDefault();
  hideMsg('dec-result'); hideMsg('dec-error');
  const url = document.getElementById('dec-url').value.trim();
  const password = document.getElementById('dec-password').value;
  if (!url || !password) {
    showMsg('dec-error', 'Both fields are required.', 'error');
    return;
  }
  let params;
  try {
    const u = new URL(url);
    params = JSON.parse(b64.decode(u.hash.slice(1)));
  } catch {
    showMsg('dec-error', 'Invalid or corrupted encrypted link.', 'error');
    return;
  }
  if (!(params['v'] in apiVersions)) {
    showMsg('dec-error', 'Unsupported API version.', 'error');
    return;
  }
  const api = apiVersions[params['v']];
  const encrypted = b64.base64ToBinary(params['e']);
  const salt = 's' in params ? b64.base64ToBinary(params['s']) : null;
  const iv = 'i' in params ? b64.base64ToBinary(params['i']) : null;
  try {
    const decrypted = await api.decrypt(encrypted, password, salt, iv);
    showMsg('dec-result', `<b>Decrypted Link:</b><br><div style='display:flex;align-items:center;gap:8px;'><input type='text' value='${decrypted}' readonly style='width:100%;background:#23262f;color:#fff;border:none;padding:8px 6px;border-radius:6px;' onclick='this.select()'><a href='${decrypted}' target='_blank' class='button' style='margin-left:8px;'>Open</a></div>`, 'success');
  } catch {
    showMsg('dec-error', 'Incorrect password or corrupted link.', 'error');
  }
}

// HIDDEN BOOKMARKS
let hiddenModalJustEncrypted = false;

async function handleHidden(e) {
  e.preventDefault();
  hideMsg('hidden-result'); hideMsg('hidden-error');
  const hiddenUrl = document.getElementById('hidden-url').value.trim();
  const title = document.getElementById('hidden-title').value.trim();
  const disguise = document.getElementById('hidden-disguise').value.trim();
  if (!hiddenUrl || !title || !disguise) {
    showMsg('hidden-error', 'All fields are required.', 'error');
    return;
  }
  let hidden, disguiseUrl;
  try {
    hidden = new URL(hiddenUrl);
    disguiseUrl = new URL(disguise);
  } catch {
    showMsg('hidden-error', 'Invalid URL(s).', 'error');
    return;
  }
  // Validate hidden link is a valid encrypted link
  let hash = hidden.hash.slice(1);
  try {
    JSON.parse(b64.decode(hash));
  } catch {
    showMsg('hidden-error', 'Hidden URL is not a valid encrypted link.', 'error');
    return;
  }
  // Instead of using disguiseUrl.hash = hidden.hash, always use your site as the base
  const lockerUrl = `${BASE_URL}/${hidden.hash}`;
  // Output disguised bookmark with no favicon (using a blank data URI as favicon, if possible)
  const blankFavicon = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  showMsg('hidden-result', `<b>Disguised Bookmark:</b><br><a class='bookmark' href='${lockerUrl}' draggable='true' rel='noopener noreferrer' style='display:inline-block;padding:10px 18px;background:var(--accent);color:var(--bg);border-radius:8px;font-weight:600;text-decoration:none;'>${title}</a><br><span style='font-size:0.95em;color:var(--text-muted);'>Drag to your bookmarks bar. You can rename it to "${title}". <br>To remove the icon, right-click the bookmark and edit it, then remove or change the icon if your browser allows.</span>`, 'success');
}

// HIDDEN: Use random Wikipedia link as disguise
async function handleHiddenRandom(e) {
  e.preventDefault();
  const resp = await fetch('https://en.wikipedia.org/w/api.php?format=json&action=query&generator=random&grnnamespace=0&prop=info&inprop=url&origin=*');
  const data = await resp.json();
  const page = data.query.pages[Object.keys(data.query.pages)[0]];
  document.getElementById('hidden-disguise').value = page.canonicalurl;
  document.getElementById('hidden-title').value = page.title;
}

// BRUTE FORCE
function handleBrute(e) {
  e.preventDefault();
  hideMsg('brute-result'); hideMsg('brute-error');
  const url = document.getElementById('brute-url').value.trim();
  const charset = document.getElementById('brute-charset').value;
  if (!url || !charset) {
    showMsg('brute-error', 'Both fields are required.', 'error');
    return;
  }
  let params;
  try {
    const u = new URL(url);
    params = JSON.parse(b64.decode(u.hash.slice(1)));
  } catch {
    showMsg('brute-error', 'Invalid or corrupted encrypted link.', 'error');
    return;
  }
  if (!(params['v'] in apiVersions)) {
    showMsg('brute-error', 'Unsupported API version.', 'error');
    return;
  }
  const api = apiVersions[params['v']];
  const encrypted = b64.base64ToBinary(params['e']);
  const salt = 's' in params ? b64.base64ToBinary(params['s']) : null;
  const iv = 'i' in params ? b64.base64ToBinary(params['i']) : null;
  let found = false;
  let tried = 0;
  let total = 0;
  let len = 0;
  let overallTotal = 0;
  let done = false;
  let startTime = performance.now();
  const cset = charset.split("");
  function progressUpdate() {
    if (done) return;
    let delta = performance.now() - startTime;
    showMsg('brute-result', `Trying ${total} passwords of length ${len} – ${Math.round(100000 * tried / total)/1000}% complete. <br>Testing ${Math.round(1000000 * (overallTotal + tried) / delta)/1000} passwords/sec.`, 'success');
  }
  async function tryAllLen(prefix, len_, curLen) {
    if (done) return;
    if (len_ == curLen) {
      tried++;
      try {
        await api.decrypt(encrypted, prefix, salt, iv);
        showMsg('brute-result', `<b>Password found:</b> <input type='text' value='${prefix}' readonly style='width:60%;background:#23262f;color:#fff;border:none;padding:8px 6px;border-radius:6px;' onclick='this.select()'>`, 'success');
        done = true;
      } catch {}
      return;
    }
    for (let i=0; i < cset.length; i++) {
      let c = cset[i];
      await tryAllLen(prefix + c, len_, curLen + 1);
    }
  }
  (async () => {
    for (len=0; !done && len<6; len++) { // Limit brute force to 6 chars for demo
      overallTotal += tried;
      tried = 0;
      total = Math.pow(cset.length, len);
      progressUpdate();
      await tryAllLen("", len, 0);
    }
    if (!done) showMsg('brute-result', 'Password not found (limit reached or too slow).', 'error');
  })();
  setInterval(progressUpdate, 4000);
}

// Attach event listeners
window.addEventListener('DOMContentLoaded', () => {
  // Encrypt
  const encForm = document.getElementById('encrypt-form');
  if (encForm) encForm.onsubmit = handleEncrypt;
  // Decrypt
  const decForm = document.getElementById('decrypt-form');
  if (decForm) decForm.onsubmit = handleDecrypt;
  // Hidden
  const hiddenForm = document.getElementById('hidden-form');
  if (hiddenForm) {
    hiddenForm.onsubmit = async function(e) {
      e.preventDefault();
      const hiddenUrlInput = document.getElementById('hidden-url');
      let url = hiddenUrlInput.value.trim();
      let isEncrypted = false;
      try {
        let u = new URL(url);
        let hash = u.hash.slice(1);
        JSON.parse(b64.decode(hash));
        isEncrypted = true;
      } catch { isEncrypted = false; }
      if (!isEncrypted) {
        showHiddenEncryptModal(url);
        return false;
      }
      await handleHidden(e);
    };
  }
  const hidRand = document.getElementById('hidden-random');
  if (hidRand) hidRand.onclick = handleHiddenRandom;
  // Brute Force
  const bruteForm = document.getElementById('brute-form');
  if (bruteForm) bruteForm.onsubmit = handleBrute;
});

// In the modal encryption logic, set the flag before programmatic submit
function showHiddenEncryptModal(url) {
  const modal = document.getElementById('hidden-encrypt-modal');
  const form = document.getElementById('hidden-encrypt-form');
  const pass = document.getElementById('hidden-modal-password');
  const conf = document.getElementById('hidden-modal-confirm');
  const hint = document.getElementById('hidden-modal-hint');
  const errorDiv = document.getElementById('hidden-modal-error');
  errorDiv.style.display = 'none';
  pass.value = '';
  conf.value = '';
  hint.value = '';
  modal.style.display = 'flex';
  pass.focus();
  form.onsubmit = async function(ev) {
    ev.preventDefault();
    errorDiv.style.display = 'none';
    if (pass.value !== conf.value) {
      errorDiv.innerText = 'Passwords do not match.';
      errorDiv.style.display = '';
      return;
    }
    if (!pass.value) {
      errorDiv.innerText = 'Password required.';
      errorDiv.style.display = '';
      return;
    }
    try {
      const api = apiVersions[LATEST_API_VERSION];
      const salt = await api.randomSalt();
      const iv = await api.randomIv();
      const encrypted = await api.encrypt(url, pass.value, salt, iv);
      const output = {
        v: LATEST_API_VERSION,
        e: b64.binaryToBase64(new Uint8Array(encrypted))
      };
      if (hint.value) output['h'] = hint.value;
      output['s'] = b64.binaryToBase64(salt);
      output['i'] = b64.binaryToBase64(iv);
      const fragment = b64.encode(JSON.stringify(output));
      const link = `${BASE_URL}/#${fragment}`;
      document.getElementById('hidden-url').value = link;
      modal.style.display = 'none';
      // Directly call handleHidden to create the bookmark without reloading
      setTimeout(() => handleHidden(new Event('submit')), 0);
    } catch {
      errorDiv.innerText = 'Encryption failed.';
      errorDiv.style.display = '';
    }
  };
}

// Update copy logic to work with new structure
function setupEncryptCopy() {
  document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'enc-copy-btn') {
      const encResult = document.getElementById('enc-result');
      const input = encResult.querySelector('input[type="text"]');
      const copyMsg = document.getElementById('enc-copy-msg');
      if (input) {
        input.select();
        navigator.clipboard.writeText(input.value).then(() => {
          copyMsg.innerText = 'Copied!';
          copyMsg.style.display = '';
          setTimeout(() => { copyMsg.style.display = 'none'; }, 1800);
        }, () => {
          copyMsg.innerText = 'Copy failed.';
          copyMsg.style.display = '';
        });
      }
    }
  });
}
window.addEventListener('DOMContentLoaded', setupEncryptCopy);
