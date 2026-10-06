# Ecosystem Scouting, sito e form di candidatura

Sito statico per il programma di scouting della practice Advanced Data Architecture: landing page + form dinamico che i software vendor compilano, con domande che cambiano in base all'area di prodotto, uscita anticipata per chi è fuori scope e pre-classificazione automatica (scope, fit score, maturità, readiness, azione suggerita) allegata a ogni candidatura.

Tutto gira nel browser: nessun server, quindi si pubblica su GitHub Pages così com'è.

```
ecosystem-scouting/
├── index.html                 landing page
├── legal.html                 privacy notice, termini, data processing (BOZZA da far validare)
├── 404.html                   pagina non trovata
├── form/
│   └── index.html             il form (shell: la logica è in assets/js)
├── tools/
│   ├── triage.html            strumento interno per leggere le candidature esportate
│   └── sample-submissions.json  4 candidature finte per provare il triage
├── assets/
│   ├── css/site.css           stile condiviso
│   ├── css/form.css           stile del form
│   ├── js/config.js           <<< L'UNICO FILE DA MODIFICARE PER ANDARE LIVE
│   ├── js/form-schema.js      domande, opzioni, branching, uscite anticipate
│   ├── js/classifier.js       regole di pre-classificazione e punteggio
│   ├── js/form-engine.js      motore del form (rendering, validazione, autosave, invio)
│   ├── js/site.js             piccole utilità condivise
│   └── img/                   hero (ottimizzata, 134 KB), versione mobile, og-image, favicon
├── robots.txt, sitemap.xml    SEO (sostituire l'URL)
├── .nojekyll                  dice a GitHub Pages di non processare i file con Jekyll
└── README.md
```

## 1. Pubblicare su GitHub Pages (5 minuti)

1. Su GitHub crea un repository nuovo, per esempio `ecosystem-scouting`. Può essere pubblico o privato: con un piano a pagamento (Pro, Team, Enterprise) Pages funziona anche da repository privati, il sito resta comunque pubblico.
2. Carica il contenuto di questa cartella nella root del repository (trascina i file nell'interfaccia web di GitHub, oppure `git init`, `git add .`, `git commit`, `git push`). Assicurati che `index.html` sia nella root, non dentro una sottocartella.
3. Vai in **Settings → Pages**. In **Build and deployment** scegli **Source: Deploy from a branch**, branch `main`, cartella `/ (root)`. Salva.
4. Dopo un minuto circa la pagina mostra l'URL pubblico, nella forma `https://<org-o-utente>.github.io/ecosystem-scouting/`.
5. Apri `assets/js/config.js` e imposta `siteUrl` con quell'URL. Sostituisci `YOUR-ORG.github.io/ecosystem-scouting` anche in `index.html` (meta canonical e Open Graph), `robots.txt` e `sitemap.xml`. Un cerca-e-sostituisci su tutta la cartella basta.

Ogni push successivo su `main` ripubblica il sito in automatico. Se usi un dominio personalizzato (es. `scouting.tuodominio.it`) vedi il paragrafo 9.

## 2. Configurare il sito: `assets/js/config.js`

| Chiave | Cosa fa |
|---|---|
| `siteUrl` | URL pubblico del sito |
| `contactEmail` | casella del team di scouting: compare nel footer, nelle schermate di uscita e riceve il fallback via e-mail |
| `responseDays` | giorni lavorativi promessi per la risposta (mostrato ai vendor) |
| `provider`, `endpoint`, `accessKey`, `submitMode` | dove finiscono le candidature, vedi paragrafo 3 |
| `emailSubject` | oggetto della notifica |
| `allowedHosts` | se valorizzato, il form invia solo se servito da quei domini (es. `["tuaorg.github.io"]`) |
| `strategicAreas` | aree che la practice considera prioritarie: bonus nel fit score e flag per il fast-track |
| `thresholds` | soglie del fit score per l'azione suggerita |
| `minSecondsBeforeSubmit` | anti-spam: rifiuta invii più rapidi di N secondi |

## 3. Dove finiscono le candidature

GitHub Pages serve solo file statici, quindi il form deve consegnare i dati a un servizio esterno. Il motore supporta quattro modalità, si cambia solo `config.js`.

| Modalità | Costo | Setup | Dove arrivano i dati | Note |
|---|---|---|---|---|
| **Web3Forms** (consigliata) | gratis fino a 250 invii/mese | 2 minuti, nessun account | e-mail a `contactEmail` con tutti i campi + dashboard opzionale | la chiave è pubblica per design, limita il dominio dalla dashboard |
| **Formspree** | gratis fino a 50 invii/mese | 5 minuti, serve account | e-mail + dashboard con export CSV | |
| **Custom** (Power Automate, Google Apps Script, API vostra) | dipende | 20-30 minuti | SharePoint list, Excel, Google Sheet, database | la via "tutto in Microsoft 365" |
| **mailto** (default iniziale) | gratis | zero | apre il client di posta del vendor con il riepilogo | dipende dal vendor che preme Invia; ok per un pilota, non per il go-live |

In tutte le modalità il vendor può scaricare una copia JSON completa della candidatura, e la mail o il record contengono sempre il campo `payload_json` con tutto, pre-classificazione inclusa. È quello che legge lo strumento di triage.

### 3a. Web3Forms (2 minuti)
1. Vai su https://web3forms.com, inserisci `contactEmail`, ricevi la access key via mail.
2. In `config.js`: `provider: "web3forms"`, `accessKey: "la-tua-chiave"`. L'endpoint è già impostato.
3. Dalla dashboard di Web3Forms (facoltativa) attiva la restrizione per dominio e, se vuoi, un webhook o l'integrazione con Google Sheets / Notion / Slack.

### 3b. Formspree
1. Crea un form su https://formspree.io e copia l'URL `https://formspree.io/f/xxxxxxxx`.
2. In `config.js`: `provider: "formspree"`, `endpoint: "https://formspree.io/f/xxxxxxxx"`.
3. Nelle impostazioni del form su Formspree aggiungi il dominio del sito tra quelli autorizzati.

### 3c. Power Automate (tutto in Microsoft 365)
1. Crea un flow con trigger **"When an HTTP request is received"** (è un connettore premium: verifica la licenza). Copia l'URL generato.
2. Il corpo arriva come testo: aggiungi un'azione **Compose** con `json(triggerBody())`, poi usa `outputs('Compose')?['fields']` per i campi piatti (uno per domanda, più `classification_*`, `summary`, `payload_json`) e `outputs('Compose')?['record']` per l'oggetto completo.
3. Aggiungi **Create item** su una SharePoint list (o **Add a row** in un Excel su OneDrive/SharePoint) mappando i campi che ti interessano, e una notifica Teams/Outlook se vuoi.
4. In `config.js`: `provider: "custom"`, `endpoint: "<URL del flow>"`, `submitMode: "no-cors"`.

Perché `no-cors`: il flow non restituisce intestazioni CORS, quindi il browser invia la richiesta ma non può leggere la risposta. Il form la considera consegnata. Per avere conferma reale aggiungi al flow un'azione **Response** con header `Access-Control-Allow-Origin: *` e metti `submitMode: "cors"`.

### 3d. Google Apps Script (Google Sheet)
1. In un Google Sheet: Estensioni → Apps Script. Incolla:
   ```js
   function doPost(e) {
     var data = JSON.parse(e.postData.contents);
     var sh = SpreadsheetApp.getActiveSheet();
     var f = data.fields;
     if (sh.getLastRow() === 0) sh.appendRow(Object.keys(f));
     sh.appendRow(Object.keys(f).map(function (k) { return f[k]; }));
     return ContentService.createTextOutput('ok');
   }
   ```
2. Deploy → New deployment → Web app, esegui come te, accesso "Anyone". Copia l'URL.
3. In `config.js`: `provider: "custom"`, `endpoint: "<URL>"`, `submitMode: "no-cors"`.

## 4. Come funziona il form

- **Sei passaggi**: Scope, Company, Product, Readiness, Contact, Review. Barra di avanzamento cliccabile per tornare indietro.
- **Uscita anticipata** al primo passaggio: chi vende servizi, hardware o "altro", e chi non rientra in nessuna area data/AI, riceve subito una schermata cortese e non compila il resto (testi in `form-schema.js → exits`).
- **Branching per area**: dopo le domande comuni sul prodotto compaiono 2-4 domande specifiche dell'area primaria (semantic layer/KG, data platform, integration, governance, security, analytics, ML platform, GenAI, AI governance, vertical AI). Tutto in `form-schema.js` tramite `showIf`.
- **Pre-classificazione** (`classifier.js`): scope (core / adjacent / out), area primaria, flag "strategica", fit score 0-100, maturità (Early / Emerging / Growth / Established), enterprise readiness (Low / Medium / High), azione suggerita (Fast-track, Review, Review with priority, Park, Decline), motivazioni e flag. Il vendor non la vede. Viaggia nel campo `payload_json` e nei campi `classification_*`.
- **Autosave** su localStorage: il vendor può chiudere e riprendere; cancellato dopo l'invio.
- **Validazione** inline: campi obbligatori, URL normalizzati (aggiunge `https://`), e-mail, anno, lunghezze massime con contatore.
- **Anti-spam**: campo honeypot invisibile (i bot lo compilano, il form finge di inviare), tempo minimo di compilazione, opzione `allowedHosts`.
- **Review finale** con modifica per sezione, poi invio. Schermata di conferma con numero di riferimento (`ES-AAAAMMGG-XXXX`), download JSON e, in modalità mailto, pulsanti per riaprire la mail e copiare il riepilogo.
- **Accessibilità**: label e gruppi corretti, errori annunciati, focus gestito, tastiera, `prefers-reduced-motion`. Mobile responsive.
- **Nessun allegato**: GitHub Pages non riceve file; c'è un campo "link a deck/demo/documentazione".

## 5. Modificare domande e regole

**Domande** (`assets/js/form-schema.js`): ogni domanda è un oggetto con `id`, `type` (`text`, `textarea`, `url`, `email`, `number`, `select`, `radio`, `checkbox`, `consent`), `label`, `help`, `required`, `options`, `showIf(answers)`. Per aggiungere un'area di prodotto: aggiungi la voce in `DOMAINS`, le sue domande con `showIf: isPrimary('nuova_area')` nello step Product, e decidi in `classifier.js` se è `CORE` o `ADJACENT`.

**Pesi** (`assets/js/classifier.js`): i punti sono tutti espliciti e commentati (area, deployment, API, certificazioni, trazione, partnership, geografia). Le soglie delle azioni sono in `config.js`. Il campo `rules_version` nel payload ti dice con quale versione delle regole è stata calcolata una candidatura; lo strumento di triage ricalcola sempre con le regole correnti.

**Testi della landing**: direttamente in `index.html`. Colori e font: variabili in testa a `assets/css/site.css`.

## 6. Strumento di triage (`tools/triage.html`)

Pagina interna (non linkata, `noindex`) per rivedere le candidature senza passare dalle mail una per una:

1. Esporta le candidature dal provider (Web3Forms/Formspree: CSV dalla dashboard; Power Automate/Sheet: esporta la lista o il foglio in CSV) oppure raccogli i JSON scaricati dai vendor.
2. Apri `tools/triage.html`, trascina i file. Tutto resta nel browser, nulla viene caricato da nessuna parte.
3. Tabella ordinabile e filtrabile per scope, azione, area, testo. Clic su una riga per il dettaglio completo con motivazioni e flag. "Export filtered CSV" per portare la shortlist nel tracker della practice.

"Load sample data" carica 4 candidature finte per vedere come funziona (serve un server web, vedi paragrafo 8).

## 7. Privacy e legale (da fare prima del go-live)

`legal.html` contiene una bozza di privacy notice, termini e descrizione del trattamento, scritta per questo caso d'uso. **Va validata da Legal / DPO.** Checklist:

- [ ] sostituire tutti i campi tra `[parentesi quadre]` (entità giuridica, indirizzo, DPO, provider usato, retention)
- [ ] verificare la base giuridica e la retention con il DPO
- [ ] se il provider del form è extra-UE (Web3Forms e Formspree sono USA) verificare le clausole di trasferimento, oppure usare Power Automate / SharePoint per restare in Microsoft 365
- [ ] verificare con Marketing/Brand l'uso del nome e del simbolo Accenture su un dominio github.io (potrebbe essere richiesto un dominio aziendale o un disclaimer)
- [ ] inserire l'e-mail di contatto reale in `config.js`

La checkbox di consenso nel form è obbligatoria e linka la privacy notice; la seconda (aggiornamenti futuri) è facoltativa e viene salvata come `updates_optin`.

## 8. Provare in locale

Il form funziona anche aprendo `form/index.html` dal disco, ma per la hero, il font e il "Load sample data" serve un server locale:

```bash
cd ecosystem-scouting
python3 -m http.server 8080
# poi apri http://localhost:8080
```

Con `provider: "mailto"` puoi testare l'intero flusso senza configurare nulla. Per provare la ricezione, imposta il provider e invia una candidatura di prova: il riferimento `ES-...` ti permette di riconoscerla.

## 9. Dominio personalizzato (facoltativo)

1. Crea nella root un file `CNAME` contenente solo il dominio, es. `scouting.example.com`.
2. Dal DNS aziendale crea un record CNAME `scouting` → `<org>.github.io`.
3. In Settings → Pages inserisci il dominio e attiva **Enforce HTTPS**.
4. Aggiorna `siteUrl`, `robots.txt`, `sitemap.xml` e i meta in `index.html`. Con un dominio personalizzato i link relativi continuano a funzionare senza modifiche.

## 10. Domande che ti faresti

**La chiave di Web3Forms/Formspree è nel codice, visibile a tutti. È un problema?** Sono chiavi pensate per stare nel frontend: servono solo a inviare, non a leggere. Il rischio è che qualcuno le usi per mandarti spam: attiva la restrizione per dominio nella dashboard del provider e, in più, `allowedHosts` in `config.js`. Il honeypot e il tempo minimo filtrano i bot generici.

**Posso tenere il repository privato?** Sì con GitHub Pro/Team/Enterprise. Il sito pubblicato è comunque pubblico (è il suo scopo). Non mettere mai nel repository segreti veri: non ce ne sono in questa cartella.

**Il form ha troppe domande?** Un vendor in scope risponde a 35-45 domande, quasi tutte a scelta, circa 5 minuti. Chi è fuori scope ne vede 2. Se vuoi accorciare: metti `required: false` o cancella le domande in `form-schema.js`; il classifier tollera i campi mancanti.

**Serve una versione in italiano?** I vendor target sono internazionali, quindi il sito è in inglese. Per l'italiano la via più semplice è duplicare `form-schema.js` con i testi tradotti e cambiare le stringhe fisse in `form-engine.js` (sono poche, cerca le virgolette).

**I vendor possono allegare il deck?** No, è un limite di un sito senza backend. C'è il campo link. Se è indispensabile, Power Automate con un form Microsoft Forms per i soli allegati o un endpoint custom con upload sono le alternative.

**Quali browser?** Tutti quelli recenti (Chrome, Edge, Safari, Firefox dal 2023 in poi). Il CSS usa `:has()` per lo stato selezionato delle opzioni.

**Come aggiorno il sito?** Modifica i file e fai push su `main`. GitHub ripubblica in 1-2 minuti. Se cambi le domande, incrementa `version` in `config.js`: le bozze salvate con la versione precedente vengono scartate invece di rompere il form.

**E se il provider dovesse essere giù?** Il vendor vede un messaggio chiaro, le risposte restano salvate sul suo dispositivo e ha un pulsante "Send it by e-mail instead" che apre il client di posta con il riepilogo.

## 11. Checklist go-live

- [ ] `config.js`: `siteUrl`, `contactEmail`, `provider` + chiave/endpoint, `allowedHosts`
- [ ] cerca-e-sostituisci `YOUR-ORG.github.io/ecosystem-scouting` in tutta la cartella
- [ ] `legal.html` validato da Legal/DPO, placeholder sostituiti
- [ ] una candidatura di prova inviata e ricevuta nella casella/lista
- [ ] triage provato con l'export reale del provider
- [ ] brand check sul nome Accenture e sul dominio
- [ ] (facoltativo) dominio personalizzato e HTTPS
