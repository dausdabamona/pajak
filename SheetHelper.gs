/**
 * SheetHelper.gs
 * Abstraksi CRUD untuk Google Sheets — dipakai oleh semua modul.
 */

// ─────────────────────────────────────────────────────────────────────────────
// AKSES SPREADSHEET
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ambil instance Spreadsheet.
 * Jika dipanggil dari dalam GSheet (Sidebar), pakai getActive().
 * Jika dari Web App (doGet/doPost), pakai openById().
 */
function getSpreadsheet() {
  try {
    // Coba pakai getActive dulu (lebih cepat, untuk Sidebar)
    const ss = SpreadsheetApp.getActive()
    if (ss) return ss
  } catch (_) {}
  // Fallback ke openById (untuk Web App)
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
}

/**
 * Ambil sheet berdasarkan nama. Throw jika tidak ditemukan.
 */
function getSheet(sheetName) {
  const ss    = getSpreadsheet()
  const sheet = ss.getSheetByName(sheetName)
  if (!sheet) throw new Error(`Sheet "${sheetName}" tidak ditemukan. Jalankan Setup terlebih dahulu.`)
  return sheet
}

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ambil semua data dari sheet sebagai array of objects.
 * Baris pertama dianggap header.
 * @returns {Array<Object>} — setiap object punya _rowIndex (1-indexed, termasuk header)
 */
function sheetGetAll(sheetName) {
  const sheet = getSheet(sheetName)
  const data  = sheet.getDataRange().getValues()
  if (data.length < 2) return []

  const headers = data[0].map(h => String(h).trim())
  return data.slice(1)
    .map((row, i) => {
      const obj = { _rowIndex: i + 2 }  // +2: 1-indexed + skip header
      headers.forEach((h, j) => { obj[h] = row[j] })
      return obj
    })
    .filter(obj => {
      // Filter baris kosong (ID kosong)
      const idCol = headers[0]
      return obj[idCol] !== '' && obj[idCol] !== null && obj[idCol] !== undefined
    })
}

/**
 * Cari satu baris berdasarkan nilai kolom tertentu.
 */
function sheetFindOne(sheetName, columnName, value) {
  return sheetGetAll(sheetName).find(row => String(row[columnName]) === String(value)) || null
}

/**
 * Filter baris berdasarkan kondisi (object key-value).
 */
function sheetFilter(sheetName, conditions) {
  return sheetGetAll(sheetName).filter(row => {
    return Object.entries(conditions).every(([key, val]) => {
      if (val === null || val === undefined || val === '') return true
      return String(row[key]).toLowerCase().includes(String(val).toLowerCase())
    })
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tambah baris baru. Otomatis generate ID dan Timestamp.
 * @param {string}  sheetName
 * @param {Object}  data        — key = nama kolom (harus sesuai header)
 * @param {string}  idPrefix    — prefix untuk ID, misal 'TRX', 'PYD'
 * @returns {Object}            — data yang disimpan + ID
 */
function sheetAppend(sheetName, data, idPrefix = 'ID') {
  const sheet   = getSheet(sheetName)
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
                       .map(h => String(h).trim())

  // Generate ID unik
  const now      = new Date()
  const tsStr    = Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyyMMddHHmmss')
  const randomPart = Math.floor(Math.random() * 900 + 100)
  data['ID']     = `${idPrefix}-${tsStr}-${randomPart}`
  data['Timestamp'] = Utilities.formatDate(now, CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm:ss')

  const row = headers.map(h => (data.hasOwnProperty(h) ? data[h] : ''))
  sheet.appendRow(row)

  return data
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update baris berdasarkan _rowIndex.
 */
function sheetUpdate(sheetName, rowIndex, data) {
  const sheet   = getSheet(sheetName)
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
                       .map(h => String(h).trim())

  // Tambah timestamp update jika ada kolom 'Update At'
  if (headers.includes('Update At')) {
    data['Update At'] = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm:ss')
  }

  headers.forEach((h, colIdx) => {
    if (data.hasOwnProperty(h)) {
      sheet.getRange(rowIndex, colIdx + 1).setValue(data[h])
    }
  })

  return { rowIndex, ...data }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE (Soft delete — set kolom Aktif = FALSE, atau hard delete)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hapus baris (hard delete) berdasarkan _rowIndex.
 */
function sheetDeleteRow(sheetName, rowIndex) {
  const sheet = getSheet(sheetName)
  sheet.deleteRow(rowIndex)
  return true
}

/**
 * Soft delete — set kolom 'Aktif' = FALSE.
 */
function sheetSoftDelete(sheetName, rowIndex) {
  return sheetUpdate(sheetName, rowIndex, { 'Aktif': false })
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate ID unik dengan prefix.
 */
function generateId(prefix) {
  const ts     = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMddHHmmss')
  const random = Math.floor(Math.random() * 900 + 100)
  return `${prefix}-${ts}-${random}`
}

/**
 * Format tanggal ke string Indonesia.
 */
function formatTanggal(date) {
  if (!date) return ''
  const d = (date instanceof Date) ? date : new Date(date)
  return Utilities.formatDate(d, CONFIG.TIMEZONE, 'dd/MM/yyyy')
}

/**
 * Format angka ke Rupiah.
 */
function formatRupiah(n) {
  if (!n && n !== 0) return 'Rp 0'
  return 'Rp ' + Math.round(Number(n)).toLocaleString('id-ID')
}

/**
 * Ambil nilai dari object secara aman.
 */
function safeVal(obj, key, defaultVal = '') {
  return (obj && obj[key] !== undefined && obj[key] !== null) ? obj[key] : defaultVal
}

/**
 * Bersihkan string — trim + uppercase.
 */
function cleanStr(str) {
  return String(str || '').trim().toUpperCase()
}
