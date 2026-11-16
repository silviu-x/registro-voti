# Registro Voti

Applicazione web per registrare i voti scolastici, visualizzare le medie e sincronizzare i dati con Firebase. Il progetto usa HTML, CSS e JavaScript ES Modules senza framework o procedura di compilazione: è pubblicabile direttamente con GitHub Pages.

## Struttura del progetto

```text
registro-voti/
├── index.html
├── README.md
├── firestore.rules
├── css/
│   ├── themes.css          # Palette light/dark
│   ├── style.css           # Componenti e stile generale
│   └── responsive.css      # Layout per PC, tablet e smartphone
└── js/
    ├── app.js              # Avvio, eventi, form e coordinamento
    ├── firebase-config.js  # Configurazione pubblica del progetto Firebase
    ├── firebase.js         # Login, sincronizzazione e cancellazione account
    ├── calculations.js     # Calcoli puri di voti e medie
    ├── data.js             # Modello, dati demo e normalizzazione
    ├── store.js            # Stato condiviso tra le schermate
    ├── utils.js            # Funzioni comuni
    ├── theme.js            # Preferenza light/dark
    ├── charts.js           # Grafici
    └── pages.js            # Schermate, inclusa Pagella
```

## Configurazione Firebase

Il progetto è già configurato con i valori Firebase presenti nell'originale `index.html`. Se devi collegare un altro progetto, modifica `js/firebase-config.js`.

1. In Firebase Console attiva **Authentication → Google**.
2. Crea o verifica Firestore Database in modalità produzione.
3. In **Firestore Database → Regole**, pubblica il contenuto di `firestore.rules`.
4. In **Authentication → Impostazioni → Domini autorizzati**, aggiungi il dominio GitHub Pages, per esempio `nome-utente.github.io`.
5. Non pubblicare mai credenziali amministrative o chiavi private. La `apiKey` web mostrata in `firebase-config.js` identifica il progetto e non è una password: la protezione dei dati dipende dalle regole Firestore e dall'autenticazione.

Le regole consentono a ogni utente di leggere, creare, aggiornare o cancellare esclusivamente il proprio documento `/users/<uid>`. Impongono anche un limite alla quantità di materie e voti e verificano la struttura esterna del documento. Firestore applica inoltre il proprio limite massimo alla dimensione del documento.

## Eliminazione dell'account

Da **Impostazioni → Account e privacy** si può richiedere l'eliminazione. L'app:

1. chiede una nuova autenticazione con Google;
2. interrompe il listener di sincronizzazione;
3. elimina il documento `/users/<uid>` da Firestore;
4. elimina l'utente da Firebase Authentication;
5. rimuove la copia locale dell'account e tenta di pulire la cache persistente Firestore del browser.

L'eliminazione del documento e dell'utente è definitiva. In questa versione ogni account utilizza un solo documento Firestore; qualora in futuro vengano aggiunte altre raccolte o sottocollezioni, la procedura di eliminazione dovrà essere aggiornata.

## Dati locali e privacy

Le copie locali sono separate per ospite e per UID Firebase. In questo modo, quando si passa da un account Google a un altro, la cache del primo account non viene mostrata né sincronizzata con il secondo. La nuova versione non importa automaticamente la vecchia chiave locale condivisa: se avevi dati non sincronizzati con Firebase nella versione precedente, esportali dal vecchio sito prima di sostituirlo e poi importali nella nuova versione.

Il logout non elimina i dati cloud dell'utente: li rende semplicemente non disponibili nella sessione non autenticata. Per cancellare l'account e il relativo documento usare la funzione dedicata.

## Pagella e calcoli

- Il primo quadrimestre comprende i voti fino alla data configurata in Impostazioni, inclusa.
- Il secondo quadrimestre comprende i voti successivi.
- La colonna annuale usa tutti i voti dell'anno.
- Per ogni materia viene mostrata la media aritmetica del periodo e una proposta di voto arrotondata all'intero più vicino (`Math.round`).
- Il riepilogo generale rispetta il criterio impostato in **Impostazioni → Media generale**: media delle medie di materia oppure media di tutti i voti.
- Nel grafico della materia la linea tratteggiata indica la sufficienza (6); il riquadro del grafico mostra il voto minimo necessario alla prossima verifica per arrivare a una media di almeno 6.

La Pagella è una stima matematica. Non tiene conto di pesi diversi per tipologia di prova, partecipazione, progressi o valutazione del docente; il voto effettivo può quindi essere diverso.

## Pubblicazione su GitHub Pages

Carica **tutta la cartella** del progetto nel repository GitHub, mantenendo la struttura di cartelle. Non caricare soltanto `index.html`: CSS e moduli JavaScript sono file separati e devono rimanere ai percorsi indicati.

In GitHub apri **Settings → Pages**, scegli **Deploy from a branch**, seleziona `main` e la cartella `/ (root)`, quindi salva. Il sito sarà disponibile all'indirizzo GitHub Pages del repository.

## Controlli consigliati prima dell'uso

- Verifica in Firebase che le regole pubblicate siano quelle di `firestore.rules`.
- Prova due account Google distinti: ciascuno deve vedere soltanto il proprio documento.
- Prova l'eliminazione con un account di test prima di usarla sull'account con dati importanti.
- Mantieni una copia JSON dei voti prima di aggiornamenti importanti.

L'app usa Firebase Authentication e Firestore dal browser; non contiene un backend amministrativo. La nuova versione usa la cache Firestore in memoria, mentre la copia offline esplicita dell'app è salvata in `localStorage` con una chiave per UID. Dopo la cancellazione vengono rimossi i dati locali dell'UID sul dispositivo corrente e viene tentata la pulizia della vecchia cache IndexedDB eventualmente creata dalla versione precedente. Non è possibile cancellare da un singolo browser il `localStorage` di altri dispositivi: su quelli potrebbero restare copie locali non mostrate dall'app (perché la chiave è associata al vecchio UID) finché non vengono cancellati i dati del sito su quel dispositivo. La pulizia IndexedDB è best-effort e non garantisce una sovrascrittura sicura dei dati già memorizzati dal browser. Per aumentare la protezione contro richieste provenienti da client non autorizzati, puoi configurare Firebase App Check nella console e attivare l'applicazione dei controlli dopo aver verificato che il sito funzioni correttamente.
