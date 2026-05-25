/**
 * Code.gs
 * Entry point utama: doGet (Web App), doPost (API), onOpen (Sidebar menu)
 */

// ─────────────────────────────────────────────────────────────────────────────
// WEB APP ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Serve halaman Web App.
 * Deploy → Web App → Execute as Me → Anyone with Google Account
 */
function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'WebApp'

  try {
    // Tidak memanggil Session/Spreadsheet di sini agar tidak memicu OAuth
    // saat halaman pertama dimuat. Auth dilakukan lazy via google.script.run
    // oleh frontend setelah halaman selesai render.
    const template = HtmlService.createTemplateFromFile(page)

    return template.evaluate()
      .setTitle(`${CONFIG.APP_NAME} — ${CONFIG.SATKER}`)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')

  } catch (err) {
    Logger.log('[doGet] Error: ' + err.message)

    // Tampilkan halaman error yang informatif
    return HtmlService.createHtmlOutput(`
      <!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <style>
        body{font-family:Arial,sans-serif;padding:40px;background:#f8f9fa;color:#202124}
        .box{background:#fff;border:1px solid #dadce0;border-radius:8px;padding:32px;max-width:500px;margin:0 auto}
        h2{color:#d93025;margin-bottom:12px}
        code{background:#f1f3f4;padding:2px 6px;border-radius:4px;font-size:13px}
        ol{margin:16px 0;padding-left:20px;line-height:2}
        .note{background:#e8f0fe;border-left:4px solid #1a73e8;padding:10px 14px;border-radius:4px;font-size:13px;margin-top:16px}
      </style></head><body>
      <div class="box">
        <h2>⚠️ Setup Belum Selesai</h2>
        <p>Error: <code>${err.message}</code></p>
        <p style="margin-top:12px">Kemungkinan penyebab:</p>
        <ol>
          <li>File <code>WebApp.html</code> belum dibuat di Apps Script</li>
          <li>Fungsi <code>initSheets()</code> belum dijalankan</li>
          <li>Deployment belum diperbarui setelah menambah file HTML</li>
        </ol>
        <div class="note">
          <b>Cara perbaiki:</b><br>
          1. Buka Apps Script → tambah file HTML bernama <code>WebApp</code><br>
          2. Jalankan fungsi <code>initSheets()</code><br>
          3. Deploy ulang: <b>Deploy → Manage deployments → Edit → New version</b>
        </div>
      </div>
      </body></html>
    `)
  }
}

/**
 * API endpoint untuk semua aksi dari frontend.
 * Format request: { action: 'nama.aksi', payload: {...} }
 */
function doPost(e) {
  try {
    const body    = JSON.parse(e.postData.contents)
    const action  = body.action
    const payload = body.payload || {}

    Logger.log(`[doPost] action=${action}`)

    const result = routeAction(action, payload)

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON)

  } catch (err) {
    Logger.log('[doPost] Error: ' + err.message)
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON)
  }
}

/**
 * Helper include untuk template HTML (css, js, komponen).
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent()
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER — Semua action dari frontend diarahkan ke sini
// ─────────────────────────────────────────────────────────────────────────────

function routeAction(action, payload) {
  switch (action) {

    // ── Kalkulator ──
    case 'kalkulator.hitung':  return hitungPajakServer(payload)
    case 'kalkulator.list':    return getJenisKegiatanList()

    // ── Setup & SSP ──
    case 'setup.ssp':          return generateSSP(payload)

    // ── Riwayat Transaksi ──
    case 'riwayat.simpan':    return simpanTransaksi(payload)
    case 'riwayat.list':      return getRiwayat(payload)
    case 'riwayat.get':       return getRiwayatById(payload.id)
    case 'riwayat.hapus':     return hapusRiwayat(payload.id)
    case 'riwayat.export':    return exportRiwayat(payload)

    // ── Master Penyedia ──
    case 'penyedia.list':     return getPenyediaList(payload)
    case 'penyedia.get':      return getPenyediaById(payload.id)
    case 'penyedia.cari':     return cariPenyedia(payload.q)
    case 'penyedia.simpan':   return simpanPenyedia(payload)
    case 'penyedia.update':   return updatePenyedia(payload)
    case 'penyedia.hapus':    return hapusPenyedia(payload.id)

    // ── Dashboard & Rekap ──
    case 'dashboard.rekap':   return getRekapDashboard(payload)
    case 'dashboard.bulanan': return getRekapBulanan(payload.tahun)
    case 'dashboard.tahunan': return getRekapTahunan()

    // ── Kuitansi ──
    case 'kuitansi.simpan':    return simpanKuitansi(payload)
    case 'kuitansi.update':    return updateKuitansi(payload)
    case 'kuitansi.list':      return getKuitansiList(payload)
    case 'kuitansi.get':       return getKuitansiById(payload.id)
    case 'kuitansi.hapus':     return hapusKuitansi(payload.id)
    case 'kuitansi.cetak':     return generateKuitansiHTML(payload)
    case 'kuitansi.nomor':     return { nomor: getNextNomorKuitansi(payload.tglKuitansi, payload.tahunAnggaran) }
    case 'kuitansi.dariRiwayat': return buatDraftKuitansiDariRiwayat(payload.riwayatId)

    // ── Config Satker ──
    case 'config.get':        return getSatkerConfig()
    case 'config.simpan':     return simpanSatkerConfig(payload)

    // ── Master Pegawai ──
    case 'pegawai.list':      return getPegawaiList(payload)
    case 'pegawai.get':       return getPegawaiById(payload.id)
    case 'pegawai.cari':      return cariPegawai(payload.q)
    case 'pegawai.simpan':    return simpanPegawai(payload)
    case 'pegawai.update':    return updatePegawai(payload)
    case 'pegawai.hapus':     return hapusPegawai(payload.id)

    // ── Honor Nominatif ──
    case 'honor.golongan':    return getGolonganList()
    case 'honor.simpan':      return simpanNominatif(payload)
    case 'honor.update':      return updateNominatif(payload)
    case 'honor.list':        return getNominatifList(payload)
    case 'honor.get':         return getNominatifById(payload.id)
    case 'honor.hapus':       return hapusNominatif(payload.id)
    case 'honor.cetak':       return generateNominatifHTML(payload)
    case 'honor.draftKuitansi': return buatKuitansiDariNominatif(payload.id)
    case 'honor.catatPph':    return catatPph21KeRiwayat(payload.id)

    // ── Setup ──
    case 'setup.init':        return initSheets()

    default:
      throw new Error(`Action tidak dikenal: ${action}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR (dipanggil dari menu GSheet)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tambah menu custom ke Google Sheets.
 * Otomatis dipanggil saat GSheet dibuka.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🧮 Pajak Bendahara')
    .addItem('Buka Kalkulator (Sidebar)', 'bukaKalkulatorSidebar')
    .addItem('Buka Web App (Browser)', 'bukaWebApp')
    .addSeparator()
    .addItem('Setup / Inisialisasi Sheet', 'jalankanSetup')
    .addItem('Refresh Rekap', 'refreshRekap')
    .addSeparator()
    .addItem('Tentang Aplikasi', 'tentangAplikasi')
    .addToUi()
}

function bukaKalkulatorSidebar() {
  const template = HtmlService.createTemplateFromFile('Sidebar')
  template.appName      = CONFIG.APP_NAME
  template.userEmail    = Session.getActiveUser().getEmail()
  template.configSatker = getSatkerConfig()

  const html = template.evaluate()
    .setTitle('Kalkulator Pajak')
    .setWidth(380)

  SpreadsheetApp.getUi().showSidebar(html)
}

function bukaWebApp() {
  const url = ScriptApp.getService().getUrl()
  const html = HtmlService.createHtmlOutput(
    `<script>window.open('${url}', '_blank'); google.script.host.close();</script>`
  )
  SpreadsheetApp.getUi().showModalDialog(html, 'Membuka Web App...')
}

function jalankanSetup() {
  const ui = SpreadsheetApp.getUi()
  const resp = ui.alert(
    'Setup Aplikasi',
    'Ini akan membuat sheet RIWAYAT, MASTER_PENYEDIA, dan CONFIG jika belum ada.\n\nLanjutkan?',
    ui.ButtonSet.YES_NO
  )
  if (resp === ui.Button.YES) {
    initSheets()
    ui.alert('✅ Setup selesai! Sheet sudah disiapkan.')
  }
}

function refreshRekap() {
  updateRekapSheet()
  SpreadsheetApp.getUi().alert('✅ Rekap berhasil diperbarui!')
}

/**
 * Diagnostic ringan — tidak baca file, hanya cek fungsi & sheet.
 * Jalankan ini lebih dulu untuk pastikan Apps Script project sehat.
 */
function quickCheck() {
  const logs = []
  logs.push('===== QUICK CHECK =====')

  // 1. Cek fungsi-fungsi kunci ada di global scope
  const expected = [
    'doGet', 'doPost', 'routeAction',
    'hitungPajakServer', 'getJenisKegiatanList',
    'simpanKuitansi', 'getKuitansiList',
    'simpanNominatif', 'getNominatifList', 'hitungPph21',
    'simpanPegawai', 'cariPegawai',
    'getSatkerConfig', 'simpanSatkerConfig',
    'getCurrentUserEmail',
  ]
  let missing = 0
  expected.forEach(function(fn) {
    const ok = typeof globalThis[fn] === 'function' || typeof eval(fn) === 'function'
    if (!ok) { logs.push('[MISSING] ' + fn); missing++ }
  })
  if (missing === 0) logs.push('[OK] Semua ' + expected.length + ' fungsi inti ada')

  // 2. Cek user email
  try {
    const email = Session.getActiveUser().getEmail()
    logs.push('[OK] User: ' + (email || '(empty - belum auth)'))
  } catch (e) {
    logs.push('[ERR] User email: ' + e.message)
  }

  // 3. Cek spreadsheet (tanpa baca isi)
  try {
    const ss = getSpreadsheet()
    logs.push('[OK] Spreadsheet: ' + ss.getName())
    logs.push('[OK] Sheets: ' + ss.getSheets().map(function(s){return s.getName()}).join(', '))
  } catch (e) {
    logs.push('[ERR] Spreadsheet: ' + e.message)
  }

  // 4. Cek Web App URL
  try {
    const url = ScriptApp.getService().getUrl()
    logs.push('[OK] Web App URL: ' + (url || '(belum di-deploy)'))
  } catch (e) {
    logs.push('[ERR] Web App URL: ' + e.message)
  }

  logs.push('=========================')
  logs.forEach(function(l) { Logger.log(l) })
  return logs.join('\n')
}

/**
 * Verifikasi integritas file WebApp.html — jalankan manual untuk
 * memastikan file ter-update lengkap setelah copy-paste dari repo.
 *
 * Cara pakai:
 *   1. Apps Script editor → file Code.gs
 *   2. Pilih function "verifyWebApp" di dropdown atas → klik ▶ Run
 *   3. Lihat output di "Execution log"
 */
function verifyWebApp() {
  const checks = []
  try {
    const content = HtmlService.createHtmlOutputFromFile('WebApp').getContent()
    const len = content.length
    checks.push('Total karakter: ' + len + ' (target: kurang lebih 178000)')

    const mustHave = [
      ['function showPage',             'function showPage('],
      ['function api',                  'function api('],
      ['tab Honor',                     "showPage('honor'"],
      ['tab Kuitansi',                  "showPage('kuitansi'"],
      ['closing /html',                 '</html>'],
      ['function kwUpdatePejabatDisplay','function kwUpdatePejabatDisplay'],
      ['function normalizeLogoUrl',     'function normalizeLogoUrl'],
    ]
    mustHave.forEach(function(c) {
      const found = content.indexOf(c[1]) !== -1
      checks.push((found ? '[OK] ' : '[MISSING] ') + c[0])
    })

    // Cek karakter mencurigakan
    const nbsp  = (content.match(/ /g) || []).length
    const zwsp  = (content.match(/[​‌‍﻿]/g) || []).length
    const smart = (content.match(/[‘’“”]/g) || []).length
    checks.push((nbsp  === 0 ? '[OK] ' : '[WARN] ') + 'Non-breaking spaces: ' + nbsp)
    checks.push((zwsp  === 0 ? '[OK] ' : '[WARN] ') + 'Zero-width chars: '   + zwsp)
    checks.push((smart === 0 ? '[OK] ' : '[WARN] ') + 'Smart quotes: '       + smart)

    const openDiv  = (content.match(/<div\b/g) || []).length
    const closeDiv = (content.match(/<\/div>/g) || []).length
    checks.push((openDiv === closeDiv ? '[OK] ' : '[WARN] ') +
                '<div>: ' + openDiv + ' buka / ' + closeDiv + ' tutup')

    Logger.log('===== VERIFIKASI WEBAPP.HTML =====')
    checks.forEach(function(c) { Logger.log(c) })
    Logger.log('==================================')

    return { ok: true, checks: checks }
  } catch (err) {
    Logger.log('ERROR membaca WebApp.html: ' + err.message)
    return { ok: false, error: err.message }
  }
}

function tentangAplikasi() {
  SpreadsheetApp.getUi().alert(
    'Tentang Aplikasi',
    `${CONFIG.APP_NAME} v${CONFIG.APP_VERSION}\n` +
    `${CONFIG.SATKER}\n\n` +
    `Fitur:\n` +
    `• Kalkulator PPh 22 / 23 / Final 4(2) / PPN\n` +
    `• Riwayat transaksi pajak\n` +
    `• Master data penyedia\n` +
    `• Dashboard rekap bulanan/tahunan\n` +
    `• Cetak SSP PPh & PPN\n` +
    `• Kuitansi Bukti Pembayaran (cetak & arsip)\n` +
    `• Daftar Nominatif Honor + PPh 21 final (PP 80/2010)\n` +
    `• Master pegawai (autocomplete penerima honor)\n\n` +
    `Dibuat: 2025 | Stack: Google Apps Script`,
    SpreadsheetApp.getUi().ButtonSet.OK
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNGSI YANG BISA DIPANGGIL LANGSUNG DARI SIDEBAR (google.script.run)
// ─────────────────────────────────────────────────────────────────────────────
// Sidebar tidak bisa pakai doPost, jadi expose fungsi langsung:

function ss_simpanTransaksi(payload)     { return simpanTransaksi(payload) }
function ss_getRiwayat(payload)          { return getRiwayat(payload) }
function ss_getRiwayatById(id)           { return getRiwayatById(id) }
function ss_hapusRiwayat(id)             { return hapusRiwayat(id) }
function ss_getPenyediaList(payload)     { return getPenyediaList(payload) }
function ss_getPenyediaById(id)          { return getPenyediaById(id) }
function ss_cariPenyedia(q)              { return cariPenyedia(q) }
function ss_simpanPenyedia(payload)      { return simpanPenyedia(payload) }
function ss_updatePenyedia(payload)      { return updatePenyedia(payload) }
function ss_hapusPenyedia(id)            { return hapusPenyedia(id) }
function ss_getRekapDashboard(payload)   { return getRekapDashboard(payload) }
function ss_getRekapBulanan(tahun)       { return getRekapBulanan(tahun) }
function ss_getSatkerConfig()            { return getSatkerConfig() }
function ss_simpanSatkerConfig(payload)  { return simpanSatkerConfig(payload) }
function ss_simpanKuitansi(payload)      { return simpanKuitansi(payload) }
function ss_updateKuitansi(payload)      { return updateKuitansi(payload) }
function ss_getKuitansiList(payload)     { return getKuitansiList(payload) }
function ss_getKuitansiById(id)          { return getKuitansiById(id) }
function ss_hapusKuitansi(id)            { return hapusKuitansi(id) }
function ss_generateKuitansiHTML(payload){ return generateKuitansiHTML(payload) }
function ss_buatDraftKuitansi(riwayatId) { return buatDraftKuitansiDariRiwayat(riwayatId) }
function ss_getPegawaiList(payload)      { return getPegawaiList(payload) }
function ss_cariPegawai(q)               { return cariPegawai(q) }
function ss_simpanPegawai(payload)       { return simpanPegawai(payload) }
function ss_updatePegawai(payload)       { return updatePegawai(payload) }
function ss_hapusPegawai(id)             { return hapusPegawai(id) }
function ss_getGolonganList()            { return getGolonganList() }
function ss_simpanNominatif(payload)     { return simpanNominatif(payload) }
function ss_updateNominatif(payload)     { return updateNominatif(payload) }
function ss_getNominatifList(payload)    { return getNominatifList(payload) }
function ss_getNominatifById(id)         { return getNominatifById(id) }
function ss_hapusNominatif(id)           { return hapusNominatif(id) }
function ss_generateNominatifHTML(payload){ return generateNominatifHTML(payload) }
function ss_draftKuitansiDariNominatif(id){ return buatKuitansiDariNominatif(id) }
function ss_catatPph21KeRiwayat(id)      { return catatPph21KeRiwayat(id) }

/**
 * Kembalikan URL Web App — dipakai Sidebar untuk buka browser.
 */
function getWebAppUrl() {
  return ScriptApp.getService().getUrl()
}

/**
 * Kembalikan email user aktif — dipakai frontend untuk display di nav.
 * Aman dipanggil meski user belum auth (return '').
 */
function getCurrentUserEmail() {
  try {
    return Session.getActiveUser().getEmail() || ''
  } catch (_) {
    return ''
  }
}

