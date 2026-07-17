# Kitchen Sale website

Sito React/Vite pronto per il repository **miscigiacomo-sketch/KITCHEN**.

## Cosa è stato corretto

- Gli URL delle immagini puntano a `photos/photos/thumbs` e `photos/photos/full`.
- Non usa Tailwind: tutto lo stile è incluso in `src/styles.css`.
- Non usa `window.storage`, che non è disponibile in un normale sito web.
- Il catalogo pubblico è salvato in `public/catalog.json`.
- La modalità proprietario consente di modificare il catalogo, importarlo ed esportarlo.
- È incluso il workflow GitHub Actions per pubblicare automaticamente su GitHub Pages.
- Il sito è responsive e include ricerca, filtri, ordinamento, galleria e link condivisibili.

## Installazione nel repository

1. Conserva nel repository la cartella esistente:

   ```text
   photos/photos/full
   photos/photos/thumbs
   ```

2. Copia nella radice del repository tutti i file e le cartelle di questo progetto.
3. Apri un terminale nella cartella del repository.
4. Esegui:

   ```bash
   npm install
   npm run dev
   ```

5. Apri l'indirizzo mostrato da Vite nel terminale.

## Pubblicazione su GitHub Pages

1. Carica i file sul branch `main`.
2. Su GitHub apri **Settings → Pages**.
3. In **Build and deployment**, imposta **Source: GitHub Actions**.
4. Apri la scheda **Actions** e attendi che `Deploy website to GitHub Pages` sia completato.
5. Il sito sarà disponibile normalmente a:

   ```text
   https://miscigiacomo-sketch.github.io/KITCHEN/
   ```

## Aggiungere il contatto del venditore

Crea nella radice un file `.env.production`:

```env
VITE_CONTACT_URL=https://wa.me/31NUMERO
VITE_CONTACT_LABEL=Message on WhatsApp
VITE_ADMIN_PASSWORD=cucina2026
```

Per WhatsApp usa il numero internazionale senza `+`, spazi o trattini.

**Importante:** la password Vite è visibile nel codice del browser. Serve soltanto a nascondere l'interfaccia di modifica, non è una protezione sicura.

## Aggiornare prezzi e disponibilità

1. Apri il sito sul tuo computer.
2. Entra in **Owner mode**.
3. Modifica prezzi, stato, nomi e note.
4. Premi **Export catalogue**: verrà scaricato `catalog.json`.
5. Nel repository sostituisci `public/catalog.json` con il file appena scaricato.
6. Fai commit e push. GitHub Pages pubblicherà automaticamente il nuovo catalogo.

Le modifiche fatte in Owner mode rimangono una bozza locale finché il file esportato non viene caricato su GitHub.

## Cambiare titolo e testo introduttivo

Modifica `src/config.js`.

## Aggiungere fotografie

Per ogni foto principale inserisci lo stesso nome del file presente in:

```text
photos/photos/thumbs/NOME_FILE.webp
photos/photos/full/NOME_FILE.webp
```

Le due versioni devono avere lo stesso nome. Le immagini aggiuntive vanno indicate una per riga nel modulo di modifica.
