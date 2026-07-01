# PDF Editor (Web)

A privacy-first, in-browser PDF editor. All page editing happens locally — no file is uploaded.

## Features (foundation)
- Open a PDF and preview pages
- Rotate, delete, insert blank pages
- Merge another PDF, undo/redo
- Download the edited PDF

## Develop
```bash
npm install
npm run dev      # start the app
npm test         # run the test suite
npm run build    # production build (static, host anywhere)
```

## Architecture
UI (React) calls framework-free services in `src/services/`:
- `page-ops` — pure PDF page operations (pdf-lib)
- `render-service` — page rendering (pdf.js)
- `document-store` — working document + undo/redo (zustand)
- `export-service` / `file-io` — download & file reading

The UI never imports pdf-lib/pdf.js directly, so the same services power the future desktop (Tauri) build.
