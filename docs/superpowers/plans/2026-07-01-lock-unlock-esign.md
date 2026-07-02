# Lock/Unlock + E-Signature

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps.

**Goal:** Add (A) **E-signature** — draw/type/upload a signature and place it as a movable/resizable object flattened into the PDF (reuses the overlay editor); (B) **Lock/Unlock** — password-encrypt a PDF and remove a known password, client-side via a WASM engine.

**Architecture:** E-sign reuses the existing `overlay-store` (image objects) + `flatten` — a signature is just an image object. Lock/unlock needs real encryption (pdf-lib cannot) → a WASM engine (qpdf-wasm or equivalent) behind a `crypto-service`. All client-side; the UI never imports the engines directly (services only).

## Global Constraints
- Node 20+; npm; Conventional Commits. UI never imports pdf-lib/pdfjs/crypto-wasm at runtime (services only; type-only OK).
- Every task: `npm test` AND `npm run build` clean before commit. Keep existing button names/testids.

---

### Task 1 (E-sign): signature capture component

**Files:** install `react-signature-canvas` (https://github.com/agilgur5/react-signature-canvas — user's choice; React wrapper around signature_pad); create `src/components/SignaturePad.tsx`, `src/components/signaturePad.test.tsx`.

**Interfaces:**
- `SignaturePad` props `{ onInsert(pngBytes: Uint8Array): void; onCancel(): void }` — a modal with: a **Draw** tab (canvas drawing via `react-signature-canvas`'s `<SignatureCanvas>`; use its `toDataURL('image/png')` / `isEmpty()` / `clear()` API), a **Type** tab (text input rendered to an image in a cursive/handwriting-ish font), Clear, Cancel, and **Insert** (produces a transparent PNG of the signature as `Uint8Array` and calls `onInsert`). Draw is the primary path.
- Pure helper `typedSignatureToPng(text, opts): Promise<Uint8Array>` (renders text to an offscreen canvas → PNG) — unit-testable for the filename/format bits; canvas raster is browser-verified.

- [ ] Failing test: render `<SignaturePad onInsert onCancel/>`; assert Draw/Type tabs + Insert/Cancel present; Cancel fires onCancel. (Canvas drawing is browser-verified; test the structure + that Insert calls onInsert when there's content — may stub the canvas toBlob.)
- [ ] Implement with `signature_pad` (npm). Run focused test, FULL `npm test`, `npm run build` clean.
- [ ] Commit: `feat: add signature capture pad (draw/type)`

---

### Task 2 (E-sign): wire "Sign" → place signature as an editable object

**Files:** modify `src/App.tsx`, `src/components/Toolbar.tsx` (or the edit modal); test extend.

**Interfaces:**
- A **Sign** action (toolbar button "Sign" AND/OR in the edit modal) opens `SignaturePad`; on `onInsert(pngBytes)` → `useOverlayStore.getState().addImage(targetPage, pngBytes, 'png', wPct, hPct)` on the current page, then open/refresh the edit modal so the user can move/resize it; Apply/flatten bakes it (existing path). Upload-a-signature already works via the editor's Add picture.

- [ ] Failing test: clicking "Sign" opens the pad; simulating Insert adds an image overlay object to the store for the current page (assert `useOverlayStore.getState().objects` gains an image object). render-service mocked.
- [ ] Implement; keep names/testids; no pdf-lib/pdfjs in UI. FULL `npm test` + `npm run build` clean.
- [ ] Commit: `feat: wire Sign action to place a signature object`

---

### Task 3 (Lock/Unlock): crypto-service via WASM — VALIDATE THE ENGINE FIRST

**Files:** create `src/services/crypto-service.ts`, `src/services/crypto-service.test.ts`; install a WASM PDF-encryption engine.

**Step 0 — engine spike (do FIRST):** Evaluate a client-side PDF encryption engine and confirm it installs + loads under Vite + runs in Vitest/jsdom or at least builds:
  - Candidates: `@jspawn/qpdf-wasm` (qpdf compiled to wasm; run `qpdf --encrypt ... --` over a virtual FS), or another maintained qpdf-wasm package, or a pdf-lib fork with encryption.
  - If NONE integrate cleanly (wasm asset loading, Node vs browser, size), STOP and report BLOCKED with what you tried — do NOT hack a fragile integration. The controller will reconsider (e.g., defer, or server-side).

**Interfaces (if an engine works):**
- `encryptPdf(bytes: Uint8Array, password: string): Promise<Uint8Array>` — returns a password-protected PDF.
- `decryptPdf(bytes: Uint8Array, password: string): Promise<Uint8Array>` — removes encryption given the correct password; throws a clear error on wrong password.

- [ ] Step 1: engine spike + decision (proceed or BLOCKED).
- [ ] Step 2: failing test — encrypt then decrypt round-trips to the original page count; wrong password rejected. (If the engine only runs in-browser, test what's feasible in jsdom/Node and browser-verify the rest; state clearly.)
- [ ] Step 3: implement crypto-service.
- [ ] Step 4: FULL `npm test` + `npm run build` clean.
- [ ] Commit: `feat: add crypto-service (pdf encrypt/decrypt via wasm)`

---

### Task 4 (Lock/Unlock): UI

**Files:** modify `src/App.tsx`, `src/components/Toolbar.tsx`; test extend.

**Interfaces:**
- **Lock** button → prompt for a password (a small modal, not window.prompt if avoidable) → `run(apply(b => encryptPdf(b, pw)))`. **Unlock** button → prompt password → `run(apply(b => decryptPdf(b, pw)))` with a clear error on wrong password (surface it, don't crash). Buttons gated `!hasDoc || busy`.
- Password-protected file on OPEN is handled as a dedicated flow — see **Task 5**.

- [ ] Failing test: Lock button present + gated; clicking with a password triggers apply with encryptPdf (mock crypto-service). Unlock symmetric; wrong-password path surfaces an error, no crash.
- [ ] Implement; keep names/testids; no engine import in UI. FULL `npm test` + `npm run build` clean.
- [ ] Commit: `feat: wire Lock/Unlock (password) UI`

---

### Task 5 (Lock/Unlock): password prompt when opening a locked PDF

**Goal:** When the user drags in / opens a password-protected PDF, don't fail silently — show a modal that names the file and asks for the password, then load it once unlocked. Handles the common real-world case of receiving an already-encrypted document.

**Files:** modify the open/drop path (`src/App.tsx` and/or the file-open hook) + `src/services/render-service` usage; extend the crypto/render service; test extend.

**Detection & unlock (client-side, no upload):**
- pdfjs-dist natively detects encryption: `getDocument({ data })` rejects with a `PasswordException` (or fires the `onPassword` callback with `PasswordResponses.NEED_PASSWORD` / `INCORRECT_PASSWORD`). Use this to detect a locked file at open time.
- To *render* the locked file, pass the password to pdfjs `getDocument({ data, password })`. To also *edit* it with pdf-lib (which can't open encrypted PDFs), decrypt the bytes first via `decryptPdf(bytes, password)` from `crypto-service` (Task 3), then proceed with the normal pipeline.

**Interfaces / flow:**
- On open, if a file is detected as encrypted → open a `PasswordPrompt` modal: `{ fileName: string; onSubmit(password): void; onCancel(): void }`. The modal **shows the file name** so the user knows which file needs the password (important when several files are dragged at once — queue them and prompt per-locked-file).
- On submit: attempt unlock. **Wrong password → keep the modal open and show an inline error** ("Incorrect password"), let them retry. **Cancel → skip that file** (don't add it to the document), no crash.

- [x] Failing test: opening a fixture encrypted PDF surfaces the `PasswordPrompt` with the correct `fileName`; submitting the correct password loads it (page count > 0); wrong password shows an inline error and keeps the modal open; Cancel skips the file. (Mock crypto/render service; a small real encrypted fixture is fine.)
- [x] Implement; multi-file drop queues locked files and prompts one at a time; keep names/testids; no engine import in UI (services only). FULL `npm test` + `npm run build` clean.
- [x] Commit: `feat: prompt for password when opening a locked PDF`

---

## After this plan
Website has the full v1.6.5 parity + extras + e-sign + lock/unlock. Remaining optional: Office→PDF convert (native LibreOffice service), cryptographic/certificate signing (server, v2), wrap in Tauri for the desktop .exe, and impeccable/taste polish.
