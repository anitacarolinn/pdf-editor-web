import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

// ── Dictionaries ──────────────────────────────────────────────────────────────

export type Lang = 'en' | 'zh'

const en = {
  // Landing
  headline: 'Edit, sign & lock PDFs.',
  tagline: 'The complete PDF toolkit, right in your browser — nothing uploads, nothing leaves your device.',
  privacyNote: '100% on-device. Your files never leave your browser.',
  metaTag: 'RUNS IN YOUR BROWSER',
  dropHeadline: 'Drag & drop a PDF or image here',
  chooseFile: 'Choose file',
  openHint: 'PDF · PNG · JPG',
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

  // Toolbar
  tbNewPage: 'New',
  tbNewPageTitle: 'Insert a blank page after the selected page',
  tbOpenPdf: 'Open',
  tbOpenPdfTitle: 'Open a PDF',
  tbAddMerge: 'Merge',
  tbAddMergeTitle: 'Add / merge another PDF into this document',
  tbDeletePage: 'Delete',
  tbDeletePageTitle: 'Delete selected pages',
  tbDuplicate: 'Duplicate',
  tbDuplicateTitle: 'Duplicate selected pages',
  tbExtractPage: 'Extract',
  tbExtractPageTitle: 'Extract selected pages to a new PDF',
  tbReplacePage: 'Replace',
  tbReplacePageTitle: 'Replace the selected page with another PDF',
  tbSplit: 'Split',
  tbSplitTitle: 'Split selected pages into separate PDFs',
  tbPageNum: 'Numbers',
  tbPageNumTitle: 'Add page numbers',
  tbWatermark: 'Watermark',
  tbWatermarkTitle: 'Add a watermark',
  tbShrink: 'Shrink',
  tbShrinkTitle: 'Shrink file size by re-encoding pages as JPEG images',
  tbInfo: 'Info',
  tbInfoTitle: 'View document metadata',
  tbLock: 'Lock',
  tbLockTitle: 'Password-protect (encrypt) this document and download it',
  tbUnlock: 'Unlock',
  tbUnlockTitle: 'Open a password-protected PDF and decrypt it',
  tbUndo: 'Undo',
  tbUndoTitle: 'Undo last action',
  tbRedo: 'Redo',
  tbRedoTitle: 'Redo last undone action',
  tbExport: 'Export',
  tbSelected: (n: number) => `${n} selected`,

  // PageEditModal toolbar
  emUndo: 'Undo',
  emRedo: 'Redo',
  emNewPage: 'New page',
  emDeletePage: 'Delete page',
  emDuplicate: 'Duplicate',
  emRotateLeft: 'Rotate left',
  emRotateRight: 'Rotate right',
  emMoveBefore: 'Move before',
  emMoveAfter: 'Move after',
  emZoomOut: 'Zoom out',
  emZoomIn: 'Zoom in',
  emFit: 'Fit',
  emOriginal: 'Original',
  emFitWidthLabel: 'Fit width',
  emZoomLevel: 'Zoom level',
  emAddText: 'Add text',
  emAddPicture: 'Add picture',
  emSign: 'Sign',
  // Footer
  emPage: 'Page',
  emRestore: 'Restore',
  emCancel: 'Cancel',
  emSaveClose: 'Save & Close',
  // Navigation
  emPrevPage: 'Previous page',
  emNextPage: 'Next page',
  emCurrentPage: 'Current page',

  // ShrinkModal
  smTitle: 'Compress PDF',
  smSubtitle: 'Choose a compression level. You can review the result before applying.',
  smLevelLessLabel: 'Less compression',
  smLevelLessDesc: 'High quality, small size reduction — best for print-ready documents.',
  smLevelRecommendedLabel: 'Recommended',
  smLevelRecommendedDesc: 'Good quality and good reduction — best for most use cases.',
  smLevelExtremeLabel: 'Extreme compression',
  smLevelExtremeDesc: 'Smallest file, lower image quality — best for email and uploads.',
  smCancel: 'Cancel',
  smCompress: 'Compress',
  smCompressing: 'Compressing…',
  smResultTitle: 'Compression result',
  smOriginal: 'Original',
  smNewSize: 'New size',
  smReducedBy: 'Reduced by',
  smResult: 'Result',
  smAlreadyOptimized: 'Already optimized — no reduction',
  smBack: 'Back',
  smApply: 'Apply',
  smClose: 'Close',

  // LockModal
  lmTitle: 'Lock PDF',
  lmSubtitle: 'Set a password to encrypt this document (256-bit AES). The encrypted copy is downloaded — your working document is unchanged.',
  lmPasswordLabel: 'Password',
  lmConfirmLabel: 'Confirm password',
  lmShowPassword: 'Show password',
  lmCancel: 'Cancel',
  lmLocking: 'Locking…',
  lmLockDownload: 'Lock & Download',
  lmErrEnterPassword: 'Enter a password.',
  lmErrNoMatch: 'Passwords do not match.',
  lmErrFailed: 'Could not lock the PDF.',

  // UnlockModal
  umTitle: 'Unlock PDF',
  umSubtitle: 'Choose a password-protected PDF and enter its password. The decrypted document opens in the editor.',
  umPdfFileLabel: 'PDF file',
  umChooseFile: 'Choose file…',
  umPasswordLabel: 'Password',
  umCancel: 'Cancel',
  umUnlocking: 'Unlocking…',
  umUnlockOpen: 'Unlock & Open',
  umErrChooseFile: 'Choose a PDF file.',
  umErrWrongPassword: 'Wrong password.',

  // WatermarkModal
  wmTitle: 'Add Watermark',
  wmText: 'Text',
  wmImage: 'Image',
  wmWatermarkText: 'Watermark text',
  wmOpacity: 'Opacity',
  wmImageLabel: 'Image (PNG or JPG)',
  wmCancel: 'Cancel',
  wmApply: 'Apply',

  pnTitle: 'Page numbers',
  pnFormat: 'Format',
  pnPosition: 'Position',
  pnPosLeft: 'Left',
  pnPosCenter: 'Center',
  pnPosRight: 'Right',
  pnSkipFirst: 'Skip first page',
  pnSkipFirstHint: 'Leave the cover page unnumbered',
  pnStartAt: 'Start at',
  pnCancel: 'Cancel',
  pnApply: 'Add numbers',

  pageLabel: (n: number) => `page ${n}`,
  gridEmpty: 'Open a PDF to get started',

  // InfoModal
  infoTitle: 'Document Info',
  infoClose: 'Close',
  infoPages: 'Pages',
  infoFileSize: 'File size',
  infoCompressed: 'Compressed',
  infoPageTitle: 'Title',
  infoAuthor: 'Author',
  infoSubject: 'Subject',
  infoCreator: 'Creator',
  infoProducer: 'Producer',
  infoPageSize: 'Page size',

  // SignatureModal
  sigTitle: 'Draw your signature',
  sigSubtitle: 'Draw in the box below. The signature will be placed as a movable overlay on the page.',
  sigHintEmpty: 'Draw your signature above',
  sigHintReady: 'Looking good — click "Add signature" when ready',
  sigClear: 'Clear',
  sigCancel: 'Cancel',
  sigAdd: 'Add signature',

  // App status line
  statusPage: 'page',
  statusPages: 'pages',
  officeToast: "Word/Excel/PowerPoint conversion isn't available in the browser version yet.",

  // Save signature dialog
  saveSigTitle: 'Save signature?',
  saveSigBody: 'Save this signature as a PNG file for reuse?',
  saveSigNo: 'No thanks',
  saveSigSave: 'Save PNG',

  // Export (rename) dialog
  exTitle: 'Export PDF',
  exSubtitle: 'Name your file, then download it.',
  exNameLabel: 'File name',
  exCancel: 'Cancel',
  exDownload: 'Download',
} as const

const zh = {
  headline: '編輯、簽署、加密 PDF。',
  tagline: '完整的 PDF 工具箱，就在您的瀏覽器中 — 不上傳，檔案絕不離開您的裝置。',
  privacyNote: '100% 在本機執行，您的檔案絕不離開瀏覽器。',
  metaTag: '在您的瀏覽器中執行',
  dropHeadline: '將 PDF 或圖片拖曳至此',
  chooseFile: '選擇檔案',
  openHint: 'PDF · PNG · JPG',
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

  // Toolbar
  tbNewPage: '新增頁面',
  tbNewPageTitle: '在選取頁面後插入空白頁',
  tbOpenPdf: '開啟 PDF',
  tbOpenPdfTitle: '開啟 PDF 檔案',
  tbAddMerge: '合併',
  tbAddMergeTitle: '將另一個 PDF 加入或合併至此文件',
  tbDeletePage: '刪除頁面',
  tbDeletePageTitle: '刪除選取的頁面',
  tbDuplicate: '複製',
  tbDuplicateTitle: '複製選取的頁面',
  tbExtractPage: '提取頁面',
  tbExtractPageTitle: '將選取頁面提取為新 PDF',
  tbReplacePage: '替換頁面',
  tbReplacePageTitle: '以其他 PDF 替換選取的頁面',
  tbSplit: '分割',
  tbSplitTitle: '將選取頁面分割為個別 PDF',
  tbPageNum: '頁碼',
  tbPageNumTitle: '加入頁碼',
  tbWatermark: '浮水印',
  tbWatermarkTitle: '加入浮水印',
  tbShrink: '縮小檔案',
  tbShrinkTitle: '將頁面重新編碼為 JPEG 圖片以縮小檔案大小',
  tbInfo: '資訊',
  tbInfoTitle: '查看文件中繼資料',
  tbLock: '加密',
  tbLockTitle: '為此文件設定密碼保護（加密）並下載',
  tbUnlock: '解密',
  tbUnlockTitle: '開啟受密碼保護的 PDF 並解密',
  tbUndo: '復原',
  tbUndoTitle: '復原上一個動作',
  tbRedo: '重做',
  tbRedoTitle: '重做上一個已復原的動作',
  tbExport: '匯出',
  tbSelected: (n: number) => `已選取：${n}`,

  // PageEditModal toolbar
  emUndo: '復原',
  emRedo: '重做',
  emNewPage: '新增頁面',
  emDeletePage: '刪除頁面',
  emDuplicate: '複製',
  emRotateLeft: '向左旋轉',
  emRotateRight: '向右旋轉',
  emMoveBefore: '向前移動',
  emMoveAfter: '向後移動',
  emZoomOut: '縮小',
  emZoomIn: '放大',
  emFit: '符合寬度',
  emOriginal: '原始大小',
  emFitWidthLabel: '符合寬度',
  emZoomLevel: '縮放比例',
  emAddText: '加入文字',
  emAddPicture: '加入圖片',
  emSign: '簽名',
  // Footer
  emPage: '頁面',
  emRestore: '還原',
  emCancel: '取消',
  emSaveClose: '儲存並關閉',
  // Navigation
  emPrevPage: '上一頁',
  emNextPage: '下一頁',
  emCurrentPage: '目前頁面',

  // ShrinkModal
  smTitle: '壓縮 PDF',
  smSubtitle: '選擇壓縮等級。您可以在套用前預覽結果。',
  smLevelLessLabel: '輕度壓縮',
  smLevelLessDesc: '高品質，小幅縮減檔案大小，適合列印文件。',
  smLevelRecommendedLabel: '建議',
  smLevelRecommendedDesc: '品質與縮減均衡，適合大多數用途。',
  smLevelExtremeLabel: '極度壓縮',
  smLevelExtremeDesc: '檔案最小，圖片品質較低，適合電子郵件與上傳。',
  smCancel: '取消',
  smCompress: '壓縮',
  smCompressing: '壓縮中…',
  smResultTitle: '壓縮結果',
  smOriginal: '原始大小',
  smNewSize: '新大小',
  smReducedBy: '縮減了',
  smResult: '結果',
  smAlreadyOptimized: '已最佳化，無法進一步縮減',
  smBack: '返回',
  smApply: '套用',
  smClose: '關閉',

  // LockModal
  lmTitle: '加密 PDF',
  lmSubtitle: '設定密碼以加密此文件（256 位元 AES）。加密副本將被下載，您的工作文件不受影響。',
  lmPasswordLabel: '密碼',
  lmConfirmLabel: '確認密碼',
  lmShowPassword: '顯示密碼',
  lmCancel: '取消',
  lmLocking: '加密中…',
  lmLockDownload: '加密並下載',
  lmErrEnterPassword: '請輸入密碼。',
  lmErrNoMatch: '密碼不相符。',
  lmErrFailed: '無法加密 PDF。',

  // UnlockModal
  umTitle: '解密 PDF',
  umSubtitle: '選擇受密碼保護的 PDF 並輸入密碼。解密後的文件將在編輯器中開啟。',
  umPdfFileLabel: 'PDF 檔案',
  umChooseFile: '選擇檔案…',
  umPasswordLabel: '密碼',
  umCancel: '取消',
  umUnlocking: '解密中…',
  umUnlockOpen: '解密並開啟',
  umErrChooseFile: '請選擇 PDF 檔案。',
  umErrWrongPassword: '密碼錯誤。',

  // WatermarkModal
  wmTitle: '加入浮水印',
  wmText: '文字',
  wmImage: '圖片',
  wmWatermarkText: '浮水印文字',
  wmOpacity: '透明度',
  wmImageLabel: '圖片（PNG 或 JPG）',
  wmCancel: '取消',
  wmApply: '套用',

  pnTitle: '頁碼',
  pnFormat: '格式',
  pnPosition: '位置',
  pnPosLeft: '靠左',
  pnPosCenter: '置中',
  pnPosRight: '靠右',
  pnSkipFirst: '跳過第一頁',
  pnSkipFirstHint: '封面頁不加頁碼',
  pnStartAt: '起始頁碼',
  pnCancel: '取消',
  pnApply: '加入頁碼',

  pageLabel: (n: number) => `第 ${n} 頁`,
  gridEmpty: '開啟 PDF 以開始',

  // InfoModal
  infoTitle: '文件資訊',
  infoClose: '關閉',
  infoPages: '頁數',
  infoFileSize: '檔案大小',
  infoCompressed: '已壓縮',
  infoPageTitle: '標題',
  infoAuthor: '作者',
  infoSubject: '主旨',
  infoCreator: '建立者',
  infoProducer: '產生程式',
  infoPageSize: '頁面大小',

  // SignatureModal
  sigTitle: '繪製您的簽名',
  sigSubtitle: '在下方框內繪製。簽名將作為可移動的覆蓋層放置於頁面上。',
  sigHintEmpty: '請在上方繪製您的簽名',
  sigHintReady: '看起來不錯 — 準備好後請點選「加入簽名」',
  sigClear: '清除',
  sigCancel: '取消',
  sigAdd: '加入簽名',

  // App status line
  statusPage: '頁',
  statusPages: '頁',
  officeToast: 'Word/Excel/PowerPoint 轉換功能尚未在瀏覽器版本中提供。',

  // Save signature dialog
  saveSigTitle: '儲存簽名？',
  saveSigBody: '將此簽名儲存為 PNG 檔案以便重複使用？',
  saveSigNo: '不，謝謝',
  saveSigSave: '儲存 PNG',

  // Export (rename) dialog
  exTitle: '匯出 PDF',
  exSubtitle: '為檔案命名，然後下載。',
  exNameLabel: '檔案名稱',
  exCancel: '取消',
  exDownload: '下載',
} as const

// Use a structural type so both en and zh satisfy it without exact-literal constraint
type FeatureItem = { name: string; desc: string }
interface Dict {
  headline: string
  tagline: string
  privacyNote: string
  metaTag: string
  dropHeadline: string
  chooseFile: string
  openHint: string
  langEn: string
  langZh: string
  features: FeatureItem[]

  tbNewPage: string
  tbNewPageTitle: string
  tbOpenPdf: string
  tbOpenPdfTitle: string
  tbAddMerge: string
  tbAddMergeTitle: string
  tbDeletePage: string
  tbDeletePageTitle: string
  tbDuplicate: string
  tbDuplicateTitle: string
  tbExtractPage: string
  tbExtractPageTitle: string
  tbReplacePage: string
  tbReplacePageTitle: string
  tbSplit: string
  tbSplitTitle: string
  tbPageNum: string
  tbPageNumTitle: string
  tbWatermark: string
  tbWatermarkTitle: string
  tbShrink: string
  tbShrinkTitle: string
  tbInfo: string
  tbInfoTitle: string
  tbLock: string
  tbLockTitle: string
  tbUnlock: string
  tbUnlockTitle: string
  tbUndo: string
  tbUndoTitle: string
  tbRedo: string
  tbRedoTitle: string
  tbExport: string
  tbSelected: (n: number) => string

  emUndo: string
  emRedo: string
  emNewPage: string
  emDeletePage: string
  emDuplicate: string
  emRotateLeft: string
  emRotateRight: string
  emMoveBefore: string
  emMoveAfter: string
  emZoomOut: string
  emZoomIn: string
  emFit: string
  emOriginal: string
  emFitWidthLabel: string
  emZoomLevel: string
  emAddText: string
  emAddPicture: string
  emSign: string
  emPage: string
  emRestore: string
  emCancel: string
  emSaveClose: string
  emPrevPage: string
  emNextPage: string
  emCurrentPage: string

  smTitle: string
  smSubtitle: string
  smLevelLessLabel: string
  smLevelLessDesc: string
  smLevelRecommendedLabel: string
  smLevelRecommendedDesc: string
  smLevelExtremeLabel: string
  smLevelExtremeDesc: string
  smCancel: string
  smCompress: string
  smCompressing: string
  smResultTitle: string
  smOriginal: string
  smNewSize: string
  smReducedBy: string
  smResult: string
  smAlreadyOptimized: string
  smBack: string
  smApply: string
  smClose: string

  lmTitle: string
  lmSubtitle: string
  lmPasswordLabel: string
  lmConfirmLabel: string
  lmShowPassword: string
  lmCancel: string
  lmLocking: string
  lmLockDownload: string
  lmErrEnterPassword: string
  lmErrNoMatch: string
  lmErrFailed: string

  umTitle: string
  umSubtitle: string
  umPdfFileLabel: string
  umChooseFile: string
  umPasswordLabel: string
  umCancel: string
  umUnlocking: string
  umUnlockOpen: string
  umErrChooseFile: string
  umErrWrongPassword: string

  wmTitle: string
  wmText: string
  wmImage: string
  wmWatermarkText: string
  wmOpacity: string
  wmImageLabel: string
  wmCancel: string
  wmApply: string

  pnTitle: string
  pnFormat: string
  pnPosition: string
  pnPosLeft: string
  pnPosCenter: string
  pnPosRight: string
  pnSkipFirst: string
  pnSkipFirstHint: string
  pnStartAt: string
  pnCancel: string
  pnApply: string

  pageLabel: (n: number) => string
  gridEmpty: string

  infoTitle: string
  infoClose: string
  infoPages: string
  infoFileSize: string
  infoCompressed: string
  infoPageTitle: string
  infoAuthor: string
  infoSubject: string
  infoCreator: string
  infoProducer: string
  infoPageSize: string

  sigTitle: string
  sigSubtitle: string
  sigHintEmpty: string
  sigHintReady: string
  sigClear: string
  sigCancel: string
  sigAdd: string

  statusPage: string
  statusPages: string
  officeToast: string

  saveSigTitle: string
  saveSigBody: string
  saveSigNo: string
  saveSigSave: string
  exTitle: string
  exSubtitle: string
  exNameLabel: string
  exCancel: string
  exDownload: string
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

function detectBrowserLang(): Lang {
  try {
    const nav = navigator.language || (navigator.languages && navigator.languages[0]) || ''
    if (/^zh/i.test(nav)) return 'zh'
  } catch {
    // ignore
  }
  return 'en'
}

function readStoredLang(): Lang {
  try {
    const v = localStorage.getItem(LS_KEY)
    if (v === 'en' || v === 'zh') return v
  } catch {
    // ignore
  }
  // No saved choice → follow the browser language (Chinese browsers open in 中文).
  return detectBrowserLang()
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
