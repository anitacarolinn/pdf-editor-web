import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

// ── Dictionaries ──────────────────────────────────────────────────────────────

export type Lang = 'en' | 'zh'

const en = {
  // Landing
  tagline: 'Rearrange, rotate, and edit PDF pages — privately, offline, in your browser.',
  privacyNote: 'All processing happens locally. Your files never leave your device.',
  dropHeadline: 'Drag & drop a PDF here, or',
  chooseFile: 'Choose file',
  openHint: 'Open a PDF to get started',
  langEn: 'EN',
  langZh: '中文',

  // Feature loop
  features: [
    { name: 'Merge PDFs', desc: 'Combine multiple files into one document.' },
    { name: 'Split', desc: 'Divide a PDF into individual pages or ranges.' },
    { name: 'Rotate', desc: 'Fix the orientation of any page instantly.' },
    { name: 'Delete & Duplicate', desc: 'Remove unwanted pages or copy them.' },
    { name: 'Reorder', desc: 'Drag pages into exactly the right sequence.' },
    { name: 'Add Text', desc: 'Overlay editable text in any font or size.' },
    { name: 'Add Image', desc: 'Insert photos or diagrams onto a page.' },
    { name: 'Sign', desc: 'Draw a signature and place it on the PDF.' },
    { name: 'Watermark', desc: 'Stamp a custom text mark across every page.' },
    { name: 'Page Numbers', desc: 'Auto-number pages in n / total format.' },
    { name: 'Shrink File', desc: 'Reduce PDF size without losing quality.' },
    { name: 'Lock / Unlock', desc: 'Password-protect or decrypt a PDF locally.' },
    { name: 'Export', desc: 'Download your finished PDF in one click.' },
    { name: 'No Upload', desc: 'Everything runs in your browser — private by design.' },
  ] as Array<{ name: string; desc: string }>,
} as const

const zh = {
  tagline: '重新排列、旋轉並編輯 PDF 頁面 — 私密、離線，完全在瀏覽器中完成。',
  privacyNote: '所有處理皆在本地端完成，您的檔案絕不離開您的裝置。',
  dropHeadline: '將 PDF 拖曳至此，或',
  chooseFile: '選擇檔案',
  openHint: 'Open a PDF to get started',
  langEn: 'EN',
  langZh: '中文',

  features: [
    { name: '合併 PDF', desc: '將多個檔案合併為一份文件。' },
    { name: '分割', desc: '將 PDF 拆分為單頁或指定頁碼範圍。' },
    { name: '旋轉', desc: '立即修正任意頁面的方向。' },
    { name: '刪除與複製', desc: '移除不需要的頁面或進行複製。' },
    { name: '重新排序', desc: '拖曳頁面，調整至正確順序。' },
    { name: '加入文字', desc: '在頁面上覆蓋可編輯的文字。' },
    { name: '加入圖片', desc: '在頁面中插入照片或圖表。' },
    { name: '簽名', desc: '手繪簽名並放置於 PDF 上。' },
    { name: '浮水印', desc: '在每一頁加蓋自訂浮水印文字。' },
    { name: '頁碼', desc: '以 n / 總頁數格式自動編頁。' },
    { name: '縮小檔案', desc: '在不損失品質的情況下壓縮 PDF。' },
    { name: '加密 / 解密', desc: '在本地端為 PDF 設定或移除密碼保護。' },
    { name: '匯出', desc: '一鍵下載您完成的 PDF。' },
    { name: '無須上傳', desc: '一切在瀏覽器中執行，私密設計。' },
  ] as Array<{ name: string; desc: string }>,
} as const

// Use a structural type so both en and zh satisfy it without exact-literal constraint
type FeatureItem = { name: string; desc: string }
interface Dict {
  tagline: string
  privacyNote: string
  dropHeadline: string
  chooseFile: string
  openHint: string
  langEn: string
  langZh: string
  features: FeatureItem[]
}

const DICTS: Record<Lang, Dict> = { en, zh }

// ── Context ───────────────────────────────────────────────────────────────────

interface I18nCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: Dict
}


const Ctx = createContext<I18nCtx>({
  lang: 'en',
  setLang: () => {},
  t: en,
})

const LS_KEY = 'pdf-editor-lang'

function readStoredLang(): Lang {
  try {
    const v = localStorage.getItem(LS_KEY)
    if (v === 'en' || v === 'zh') return v
  } catch {
    // ignore
  }
  return 'en'
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang)

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try { localStorage.setItem(LS_KEY, l) } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return (
    <Ctx.Provider value={{ lang, setLang, t: DICTS[lang] }}>
      {children}
    </Ctx.Provider>
  )
}

export function useI18n() {
  return useContext(Ctx)
}
