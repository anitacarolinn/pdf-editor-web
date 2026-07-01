# PDF Editor — Web-first Design Spec

**Date:** 2026-07-01
**Status:** Approved for planning
**Author context:** Evolution of the existing "PDF Page Editor v1.6.5" desktop tool (Tauri + Rust + pdf-lib).

## 1. Goal

Turn the existing Tauri desktop PDF page editor into a **professional, web-first PDF tool** that serves two audiences from **one codebase**:

1. A reliable personal tool for the author's own PDF work.
2. A polished public web product / portfolio piece.

Privacy-by-design (client-side processing) is kept as a core quality — it protects any documents the author or public users load — but there is no organization/intranet deployment requirement in this version.

**v1 priority: the website.** The same frontend build is later wrapped in Tauri for a desktop `.exe` with guaranteed feature parity.

## 2. Scope (v1)

Feature set, in priority order:

1. **Page editing** (port from existing tool): reorder, rotate, delete, insert blank, split, merge multiple PDFs, extract pages.
2. **E-signature (visual):** draw / type / upload-image signature, place & resize on any page, stamped into the PDF. *(Cryptographic certificate-based signing is explicitly out of scope — deferred to v2.)*
3. **Lock / unlock:** password-encrypt a PDF, or remove a known password.
4. **Annotate & fill:** text boxes, highlight, freehand, shapes, images; fill existing form fields.
5. **Document → PDF conversion:**
   - **Client-side (private):** images (JPG/PNG/etc.), plain text, Markdown, HTML.
   - **Server-side (Office only):** Word `.docx`, Excel `.xlsx`, PowerPoint `.pptx` via a self-hosted native LibreOffice conversion service (no Docker).

### Out of scope (v2+)
- Cryptographic / certificate-based (PAdES) digital signatures.
- User accounts, cloud storage, audit logs.
- OCR, PDF/A archival conversion, redaction.
- Native offline Office conversion bundled in the desktop app.

## 3. Architecture

Client-side-first. The browser is the primary runtime. Exactly one network dependency exists — the Office conversion service — and it handles Office files only.

```
┌─────────────────────────────────────────────────┐
│  UI shell (React + Vite + Tailwind)               │
│  toolbar · page thumbnails · viewer · side panels │
└───────────────┬───────────────────────────────────┘
                │ calls (UI never touches pdf libs directly)
   ┌────────────┴───────────────────────────────┐
   │  Core services (plain TS modules, no UI)     │
   ├──────────────────────────────────────────────┤
   │ document-store    working PDF bytes + ordered │
   │                   edit state (source of truth) │
   │ render-service    pdf.js → page canvases/thumbs│
   │ page-ops          reorder/rotate/delete/insert/│
   │                   split/merge/extract (pdf-lib)│
   │ annotate-service  text/shape/highlight/image + │
   │                   form fill (pdf-lib)          │
   │ signature-service draw/type/upload → stamp     │
   │ crypto-service    encrypt/decrypt (qpdf-wasm)  │
   │ convert-service   image/text/MD/HTML→PDF local;│
   │                   Office→PDF via LibreOffice svc│
   │ export-service    assemble & download final PDF│
   └────────────────────────┬─────────────────────┘
                             │ Office files only
                  ┌──────────┴────────────────┐
                  │ Conversion service         │
                  │ (thin HTTP wrapper around  │
                  │  native LibreOffice        │
                  │  --headless; stateless,    │
                  │  no store, no Docker)      │
                  └────────────────────────────┘
```

### Design rules
- **UI never imports pdf-lib / pdf.js / qpdf-wasm directly.** It only calls core services. This guarantees the Tauri desktop build reuses identical feature code (feature parity by construction).
- **`document-store` is the single source of truth**: original bytes + an ordered list of edits. Every service reads/writes through it.
- **Each service has one job and a small interface** (e.g. `pageOps.rotate(pageIndex, 90)`), independently unit-testable.
- **Non-destructive:** every operation works on a copy; original bytes are preserved until export.

## 4. Technology

| Concern | Choice | Notes |
|---|---|---|
| App framework | React + Vite | Vite already used by existing tool |
| Styling | Tailwind CSS | Fast path to a professional, Acrobat-familiar UI |
| PDF view | pdf.js | Render pages/thumbnails to canvas |
| PDF edit | pdf-lib | Structure ops, stamping, form fill |
| Encryption | qpdf-wasm | Client-side password encrypt/decrypt |
| Signature capture | signature_pad | Draw signature on canvas |
| Office conversion | Native LibreOffice + thin HTTP wrapper | `soffice --headless --convert-to pdf`; stateless; no Docker |
| Desktop wrapper | Tauri (existing) | Wraps the same web build for `.exe` |
| i18n | Traditional Chinese + English UI labels | |

## 5. Data flow

Open file → bytes into `document-store` → `render-service` displays pages → user edits (each action appends to the store's edit list) → `export-service` bakes edits with pdf-lib (+ qpdf-wasm when locking) → **Download**. No PDF is ever uploaded.

**Office conversion exception:** when a user imports an Office file, `convert-service` POSTs it to the configured conversion endpoint, receives a PDF, and loads that into `document-store`. This is the only case where a file leaves the device.

## 6. Conversion service (native LibreOffice, no Docker)

- **What it is:** a small HTTP service (thin wrapper) that shells out to a **natively installed LibreOffice** in headless mode — `soffice --headless --convert-to pdf --outdir <tmp> <input>` — and returns the resulting PDF.
- **No Docker:** LibreOffice is installed directly on the host machine. Whoever hosts the converter manages the LibreOffice install and fonts themselves; end users, the website, and the `.exe` need nothing.
- **Privacy handling:** stateless — input written to a temp path, converted, PDF returned, both files deleted immediately; no persistent storage, no content logging.
- **Self-hostable:** the author runs one instance (a personal machine or a small host) that also serves public users. Can be locked down or kept private as desired.
- **Configurable endpoint:** both website and Tauri build read the conversion URL from config, so internal and public deployments share the codebase.
- **Desktop note:** the Tauri `.exe` may later call a locally-installed LibreOffice directly via the Rust backend for fully offline conversion (v2); v1 uses the shared HTTP endpoint for parity.

## 7. UX

- Single-window layout: **top toolbar**, **left page-thumbnail rail** (drag to reorder), **center viewer**, **right context panel** (switches between Sign / Annotate / Security / Convert).
- Professional, Acrobat-familiar visual language.
- Bilingual UI: Traditional Chinese + English labels.

## 8. Error handling

- **Wrong password** on unlock → clear, retryable message; no crash.
- **Corrupt / oversized file** → graceful warning; app stays usable.
- **Conversion service unreachable** → explicit error telling the user Office conversion needs the converter running / configured; all local features remain fully available.
- **Non-destructive guarantee:** original bytes retained until the user exports.

## 9. Testing

Each core service is unit-tested against sample PDFs before UI wiring:
- `page-ops`: rotate produces a rotated page; merge yields correct page count; delete/extract correct.
- `crypto-service`: encrypt then decrypt round-trips; wrong password rejected.
- `signature-service`: stamped signature bytes present at expected page/coords.
- `annotate-service`: annotations and filled form values persist through export.
- `convert-service`: image/text/MD/HTML→PDF produce valid PDFs locally; Office path mocked against a conversion-service test double.

Then integration tests for full open→edit→export flows.

## 10. Deployment

- **Website:** static build hosted on any static host (free/cheap). No backend needed for local features.
- **Conversion service:** a host with LibreOffice installed running the thin HTTP wrapper, serving the author and public users. No Docker.
- **Desktop:** wrap the same build in the existing Tauri project → `.exe`, pointing at a configured conversion endpoint.
