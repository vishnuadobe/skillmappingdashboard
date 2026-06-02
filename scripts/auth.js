import { setUser, clearUser } from './db.js';

const IS_PROD = window.location.hostname.endsWith('.aem.live');

function loadScript(src) {
  const script = document.createElement('script');
  script.src = src;
  document.head.append(script);
}

let imsLoaded;

async function loadIms(onReady) {
  if (!imsLoaded) {
    imsLoaded = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('IMS timeout')), 5000);
      window.adobeid = {
        client_id: 'adobe_skill_mapping',
        environment: IS_PROD ? 'prod' : 'stg1',
        scope: 'additional_info,AdobeID,openid,person',
        debug: false,
        onReady: async () => {
          clearTimeout(timeout);
          if (window.adobeIMS?.isSignedInUser()) {
            try {
              const profile = await window.adobeIMS.getProfile();
              await setUser({
                name: profile.displayName || '',
                email: profile.email || '',
                ldap: profile.userId || '',
                isManager: false,
              });
            } catch { /* continue if profile fetch fails */ }
            onReady();
          } else {
            window.adobeIMS?.signIn();
          }
          resolve();
        },
        onError: reject,
      };
      loadScript('https://auth.services.adobe.com/imslib/imslib.min.js');
    });
  }
  return imsLoaded;
}

export async function initAuth(onReady) {
  await loadIms(onReady);
}

export default async function logout() {
  await clearUser();
  if (window.adobeIMS) {
    window.adobeIMS.signOut();
  } else {
    window.location.replace('/');
  }
}
