# Registro Voti

**Quanto cambierebbe la mia media se prendessi 7 nella prossima verifica?** Registro Voti è un registro scolastico personale che puoi usare dal browser, su computer o smartphone. Raccoglie i voti per materia e ti aiuta a capire come sta andando il quadrimestre e quale risultato ti serve per recuperare.

## Cosa puoi fare

- **Tenere traccia dei voti.** Registra le valutazioni e consulta il grafico di ogni materia. La linea del 6 ti aiuta a vedere quando hai raggiunto la sufficienza.
- **Provare «E se prendo…».** Simula il prossimo voto per vedere come cambierebbe la media prima di aggiungere una valutazione reale.
- **Stimare la pagella.** Confronta primo quadrimestre, secondo quadrimestre e intero anno. Puoi scegliere la data di fine del primo periodo e calcolare la media generale dando lo stesso peso a ogni materia oppure a ogni singolo voto.
- **Ritrovare il registro su più dispositivi.** Usa la modalità ospite per salvare nel browser oppure accedi con lo stesso account Google o email e password per sincronizzare i dati. Puoi anche esportare e importare una copia in formato JSON.

La pagella arrotonda la media di ciascuna materia all’intero più vicino. Il voto assegnato dal docente può tenere conto anche dei progressi e della partecipazione.

## Avvio in locale

Il progetto usa HTML, CSS e moduli JavaScript. Per avviarlo basta un server statico. Con Python installato, apri il terminale nella cartella che contiene `index.html` ed esegui

```bash
python -m http.server 8000
```

Apri [localhost:8000](http://localhost:8000) nel browser. Se il comando Python sul tuo sistema è `python3`, usa `python3 -m http.server 8000`.

## Pubblicare una propria copia

1. Metti `index.html`, `css/` e `js/` nella radice del repository, mantenendo la struttura delle cartelle.
2. Per usare un tuo progetto Firebase, inserisci la configurazione web in `js/firebase-config.js`. Attiva i provider Google ed Email/Password in Firebase Authentication, crea il database Firestore e pubblica le regole incluse in `firestore.rules`.
3. Aggiungi il dominio del sito ai domini autorizzati di Firebase Authentication. Per GitHub Pages il dominio è normalmente `nome-utente.github.io`. Per provare l’accesso in locale, verifica che anche `localhost` sia autorizzato.
4. Completa `js/privacy-config.js` con i dati di contatto di chi gestisce il sito.
5. In GitHub apri **Settings → Pages**, scegli **Deploy from a branch**, seleziona il ramo che contiene il progetto e la cartella **/ (root)**. Dopo la pubblicazione trovi l’indirizzo del sito nella stessa schermata.
