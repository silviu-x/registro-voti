const repository = 'silviu-x/registro-voti-android';
const dismissalKey = 'registro-voti.android-offer.dismissed';

async function showAndroidOffer() {
  if (!/Android/i.test(navigator.userAgent) || !/Mobile/i.test(navigator.userAgent)) return;
  try {
    if (localStorage.getItem(dismissalKey)) return;
  } catch { /* Il browser può disabilitare la memoria locale. */ }

  const offer = document.getElementById('androidOffer');
  const link = document.getElementById('androidDownload');
  document.getElementById('dismissAndroid').addEventListener('click', () => {
    offer.hidden = true;
    try { localStorage.setItem(dismissalKey, '1'); } catch { /* Chiuso per questa visita. */ }
  });
  offer.hidden = false;

  try {
    const response = await fetch('https://api.github.com/repos/' + repository + '/releases/latest');
    if (!response.ok) return;
    const release = await response.json();
    const assets = release.assets.filter(asset =>
      asset.state === 'uploaded' && /\.apk$/i.test(asset.name) &&
      asset.browser_download_url.startsWith('https://github.com/' + repository + '/releases/download/')
    );
    const apk = assets.length === 1 ? assets[0] : assets.find(asset => /universal/i.test(asset.name));
    if (apk) {
      link.href = apk.browser_download_url;
      link.textContent = 'Scarica l’APK';
    }
  } catch { /* Il link alla pagina della release resta disponibile. */ }
}

showAndroidOffer();
