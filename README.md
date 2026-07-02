<div align="center">

# 📄 PDF Editor

**A free, open-source, privacy-first PDF editor that runs entirely in your browser.**

No uploads. No accounts. No servers. Your files never leave your device.

![License: MIT](https://img.shields.io/badge/License-MIT-d97706.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6.svg?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff.svg?logo=vite&logoColor=white)
![Tests](https://img.shields.io/badge/tests-123%20passing-3fb950.svg)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-3fb950.svg)

</div>

---

## ✨ Why this exists

Most online PDF tools **upload your documents to their servers** to process them — which is why many companies block them for confidential files. This editor takes the opposite approach: **every operation happens locally in your browser** using WebAssembly and JavaScript. Nothing is ever transmitted anywhere.

That makes it a great fit for **sensitive, internal, or personal documents** — and it works offline, for free, forever.

---

## 🎯 Features

| Category | What you can do |
|---|---|
| **Open & combine** | Open one or many PDFs, merge them, drop in images (PNG/JPG) as pages |
| **Organize pages** | Rotate ↺↻, delete, duplicate, insert blank, extract, split, replace, drag-to-reorder, multi-select |
| **Preview** | Thumbnail grid, full-page preview with zoom / fit / page-jump / ◀ ▶ navigation |
| **Annotate** | Add text & images as movable, resizable overlay objects; draw or type an e-signature |
| **Enhance** | Add watermarks, page numbers, edit metadata, shrink file size |
| **Export** | Download as PDF, or export pages as PNG / JPG images |
| **🔒 Security** | Lock (password-encrypt) & unlock PDFs; open password-protected files with a prompt — all decrypted **locally** via qpdf-wasm |
| **Quality of life** | Full undo / redo, English + 繁體中文 interface |

> 🛡️ **Everything above runs client-side.** A password-protected file and its password never leave your browser.

---

## 🚀 Getting started

**Requirements:** [Node.js](https://nodejs.org) 20 or newer.

```bash
# 1. Clone
git clone https://github.com/anitacarolinn/pdf-editor-web.git
cd pdf-editor-web

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Then open the URL it prints (usually **http://localhost:5173**).

<details>
<summary><b>📜 All available scripts</b></summary>

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server with hot-reload |
| `npm run build` | Type-check and build a production bundle into `dist/` |
| `npm run preview` | Serve the built `dist/` locally to preview the production build |
| `npm test` | Run the full test suite once (Vitest) |
| `npm run test:watch` | Run tests in watch mode while developing |
| `npm run lint` | Lint the codebase with oxlint |

</details>

---

## 🌍 Deploying

Because the app is **100% static** (no backend), the production build can be hosted anywhere that serves files:

```bash
npm run build      # outputs a static site to ./dist
```

Drop `dist/` on **Cloudflare Pages**, **Netlify**, **Vercel**, **GitHub Pages**, or any web server. For a private/internal deployment, put a login gate (e.g. Cloudflare Access, restricted to your organization's accounts) in front of it — no app changes required.

---

## 🏗️ Architecture

The guiding rule: **the UI never touches a PDF library directly.** All PDF work lives in framework-free services under `src/services/`, so the logic is testable in isolation and portable (e.g. to a future desktop build).

```
┌───────────────────────────────────────────────┐
│  React UI  (src/components/)                    │
│  toolbar · page grid · modals · overlays        │
└───────────────────────┬─────────────────────────┘
                        │ calls (never imports pdf libs)
                        ▼
┌───────────────────────────────────────────────┐
│  Services  (src/services/)                      │
│  • page-ops        pure page operations         │  → pdf-lib
│  • render-service  page rendering & thumbnails  │  → pdfjs-dist
│  • lock-service    encrypt / decrypt            │  → qpdf-wasm
│  • document-store  working doc + undo/redo      │  → zustand
│  • overlay-store   text/image/signature objects │
│  • export / file-io   download & file reading   │
│  • i18n            English + 繁體中文            │
└───────────────────────────────────────────────┘
```

Everything runs in the browser — `pdf-lib` for structural edits, `pdf.js` for rendering, and `qpdf` compiled to **WebAssembly** for real encryption/decryption.

---

## 🧪 Testing

The project is built test-first with **Vitest** + **Testing Library**, with **Playwright** available for real-browser checks.

```bash
npm test        # 123 tests, all green
```

Tests cover the page-operation engine, the services, and component/integration flows (including the locked-PDF password flow).

---

## 🛠️ Tech stack

**Core:** React 19 · TypeScript 6 · Vite 8 · Tailwind CSS v4 · Zustand 5
**PDF:** pdf-lib · pdfjs-dist 6 · @neslinesli93/qpdf-wasm
**UI/UX:** motion (animations) · react-rnd (drag/resize) · react-signature-canvas · jszip
**Tooling:** Vitest · Testing Library · Playwright · oxlint

---

## 🤝 Contributing

Contributions are welcome! To propose a change:

1. Fork the repo and create a branch (`git checkout -b feat/my-feature`)
2. Make your change **with a test** (`npm test` should stay green)
3. Run `npm run build` to confirm the production build is clean
4. Open a pull request describing the change

Please keep the golden rule intact: **UI components call services; they don't import `pdf-lib` / `pdfjs` directly.**

---

## 📄 License

Released under the **MIT License** — free to use, modify, and distribute. See [LICENSE](LICENSE).

---

## 🙏 Acknowledgments

Built on the excellent open-source work of [pdf-lib](https://pdf-lib.js.org/), [PDF.js](https://mozilla.github.io/pdf.js/), and [qpdf](https://qpdf.sourceforge.io/).

<div align="center">
<sub>Made with care — because your documents should stay yours. 🔒</sub>
</div>
