/**
 * Integrazione Firebase: autenticazione Google, listener Firestore,
 * salvataggio e cancellazione definitiva dell'account.
 * Le regole Firestore restano la barriera di sicurezza principale.
 */
let auth = null;
let db = null;
let currentUser = null;
let userDocument = null;
let unsubscribeSnapshot = null;
let firestoreSdk = null;
let authSdk = null;
let firebaseReady = false;
let deletingAccount = false;
let documentDeletedOnLastAttempt = false;

export function isFirebaseConfigured(config) {
  return !!config && Object.keys(config).every(key => {
    const value = config[key];
    return value && String(value).indexOf('INCOLLA') < 0;
  });
}

export function isFirebaseReady() {
  return firebaseReady;
}

export async function initializeFirebase(config, version, callbacks) {
  if (!isFirebaseConfigured(config)) {
    callbacks.onStatus('nofb');
    return;
  }

  try {
    const base = 'https://www.gstatic.com/firebasejs/' + version + '/';
    const modules = await Promise.all([
      import(base + 'firebase-app.js'),
      import(base + 'firebase-auth.js'),
      import(base + 'firebase-firestore.js')
    ]);

    const app = modules[0].initializeApp(config);
    authSdk = modules[1];
    firestoreSdk = modules[2];
    auth = authSdk.getAuth(app);

    // Cache Firestore solo in memoria: i dati locali offline sono gestiti
    // dall'app nella chiave separata per UID, non in una cache IndexedDB condivisa.
    db = firestoreSdk.getFirestore(app);

    firebaseReady = true;
    authSdk.onAuthStateChanged(auth, function (user) {
      currentUser = user;
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      userDocument = null;

      callbacks.onUser(user);
      if (!user) {
        callbacks.onStatus('signedout');
        return;
      }

      userDocument = firestoreSdk.doc(db, 'users', user.uid);
      callbacks.onStatus('connecting');
      unsubscribeSnapshot = firestoreSdk.onSnapshot(
        userDocument,
        {includeMetadataChanges: true},
        callbacks.onSnapshot,
        function () { callbacks.onStatus('err'); }
      );
    });
  } catch (error) {
    firebaseReady = false;
    callbacks.onStatus('local');
    throw error;
  }
}

export function signInWithGoogle() {
  if (!firebaseReady || !auth) return Promise.reject(new Error('Firebase non è disponibile.'));
  return authSdk.signInWithPopup(auth, new authSdk.GoogleAuthProvider());
}

export function signOutCurrentUser() {
  if (!firebaseReady || !auth) return Promise.reject(new Error('Firebase non è disponibile.'));
  return authSdk.signOut(auth);
}

export function saveUserData(data) {
  if (!firebaseReady || !userDocument || !currentUser) return Promise.resolve();
  return firestoreSdk.setDoc(userDocument, data);
}

/**
 * Elimina prima il documento privato e poi l'utente Firebase Authentication.
 * La riautenticazione Google è richiesta da Firebase per le operazioni sensibili.
 */
export async function deleteCurrentAccount() {
  if (!firebaseReady || !auth || !currentUser || !userDocument) {
    throw new Error('Devi aver effettuato l’accesso per eliminare l’account.');
  }
  const user = currentUser;
  deletingAccount = true;
  documentDeletedOnLastAttempt = false;

  try {
    await authSdk.reauthenticateWithPopup(user, new authSdk.GoogleAuthProvider());

    // Interrompe il listener prima di cancellare il documento: non deve tentare di risalvarlo.
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
      unsubscribeSnapshot = null;
    }

    await firestoreSdk.deleteDoc(userDocument);
    documentDeletedOnLastAttempt = true;
    await authSdk.deleteUser(user);

    userDocument = null;
    currentUser = null;

    // Elimina, quando possibile, anche la cache persistente Firestore di questo browser.
    // Se un'altra scheda usa ancora il database, Firebase può rifiutare la pulizia:
    // in quel caso il documento cloud e l'account risultano comunque eliminati.
    try {
      await firestoreSdk.terminate(db);
      await firestoreSdk.clearIndexedDbPersistence(db);
    } catch (cacheError) {
      // Pulizia della cache best-effort; non annulla la cancellazione cloud già completata.
    }
  } catch (error) {
    if (documentDeletedOnLastAttempt) {
      try {
        await firestoreSdk.terminate(db);
        await firestoreSdk.clearIndexedDbPersistence(db);
      } catch (cacheError) {
        // La cancellazione cloud del documento è già avvenuta; la pulizia locale resta best-effort.
      }
    }
    throw error;
  } finally {
    deletingAccount = false;
  }
}

export function isDeletingAccount() {
  return deletingAccount;
}

export function wasDocumentDeletedOnLastAttempt() {
  return documentDeletedOnLastAttempt;
}
