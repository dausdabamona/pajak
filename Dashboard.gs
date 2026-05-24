/**
 * Dashboard.gs
 * Rekap, agregasi, dan statistik data pajak untuk dashboard.
 */

// ─────────────────────────────────────────────────────────────────────────────
// REKAP DASHBOARD UTAMA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ambil data ringkasan untuk dashboard.
 * @param {Object} payload - { tahun, bulan }
 */
function getRekapDashboard(payload = {}) {
  const tahun  = payload.tahun  || new Date().getFullYear()
  const semua  = sheetGetAll(CONFIG.SHEETS.RIWAYAT)

  // Filter tahun berjalan
  const dataTahun = semua.filter(r => String(r['Tahun Pajak']) === String(tahun))

  // Filter bulan ini
  const bulanIni   = new Date().getMonth() + 1
  const dataBulan  = dataTahun.filter(r => {
    const tgl    = String(r['Tgl Transaksi'] || '')
    const parts  = tgl.split('/')
    return parts.length >= 2 && parseInt(parts[1], 10) === bulanIni
  })

  // ── Totals ──────────────────────────────────────────────────────────────
  const totalPph      = sumCol(dataTahun, 'Nilai PPh')
  const totalPpn      = sumCol(dataTahun, 'Nilai PPN')
  const totalPajak    = sumCol(dataTahun, 'Total Pajak')
  const totalTransaksi = sumCol(dataTahun, 'Nilai Kontrak')
  const jmlTransaksi  = dataTahun.length

  const pphBulan      = sumCol(dataBulan, 'Nilai PPh')
  const ppnBulan      = sumCol(dataBulan, 'Nilai PPN')
  const totalBulan    = sumCol(dataBulan, 'Total Pajak')
  const jmlBulan      = dataBulan.length

  // ── Rekap per jenis PPh ──────────────────────────────────────────────────
  const perJenisPph = groupAndSum(dataTahun, 'Jenis PPh', 'Nilai PPh')

  // ── Top 5 penyedia ────────────────────────────────────────────────────────
  const top5Penyedia = getTop5Penyedia(dataTahun)

  // ── 6 bulan terakhir ─────────────────────────────────────────────────────
  const tren6Bulan = getTren6Bulan(semua, tahun)

  // ── Jumlah penyedia aktif ─────────────────────────────────────────────────
  const penyediaAktif = sheetGetAll(CONFIG.SHEETS.MASTER_PENYEDIA)
    .filter(r => r['Aktif'] !== false && String(r['Aktif']).toUpperCase() !== 'FALSE').length

  return {
    tahun,
    bulanIni,
    // Summary tahun
    totalPph, totalPpn, totalPajak, totalTransaksi, jmlTransaksi,
    // Summary bulan ini
    pphBulan, ppnBulan, totalBulan, jmlBulan,
    // Breakdown
    perJenisPph,
    top5Penyedia,
    tren6Bulan,
    penyediaAktif,
    // Timestamp
    generatedAt: Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm'),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REKAP BULANAN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rekap per bulan untuk satu tahun.
 * Digunakan untuk chart bar bulanan.
 */
function getRekapBulanan(tahun) {
  const semua     = sheetGetAll(CONFIG.SHEETS.RIWAYAT)
  const dataTahun = semua.filter(r => String(r['Tahun Pajak']) === String(tahun || new Date().getFullYear()))

  const BULAN_LABEL = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']

  const hasil = BULAN_LABEL.map((label, idx) => {
    const bulanNum = idx + 1
    const dataBulan = dataTahun.filter(r => {
      const tgl   = String(r['Tgl Transaksi'] || '')
      const parts = tgl.split('/')
      return parts.length >= 2 && parseInt(parts[1], 10) === bulanNum
    })
    return {
      bulan:      bulanNum,
      label,
      jml:        dataBulan.length,
      pph:        sumCol(dataBulan, 'Nilai PPh'),
      ppn:        sumCol(dataBulan, 'Nilai PPN'),
      totalPajak: sumCol(dataBulan, 'Total Pajak'),
      nilaiKontrak: sumCol(dataBulan, 'Nilai Kontrak'),
    }
  })

  return { tahun, bulan: hasil }
}

// ─────────────────────────────────────────────────────────────────────────────
// REKAP TAHUNAN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rekap per tahun (semua tahun yang ada di data).
 */
function getRekapTahunan() {
  const semua = sheetGetAll(CONFIG.SHEETS.RIWAYAT)

  // Kumpulkan semua tahun unik
  const tahunSet = new Set(semua.map(r => String(r['Tahun Pajak'])).filter(Boolean))
  const tahunList = [...tahunSet].sort()

  return tahunList.map(tahun => {
    const data = semua.filter(r => String(r['Tahun Pajak']) === tahun)
    return {
      tahun,
      jml:        data.length,
      pph:        sumCol(data, 'Nilai PPh'),
      ppn:        sumCol(data, 'Nilai PPN'),
      totalPajak: sumCol(data, 'Total Pajak'),
      nilaiKontrak: sumCol(data, 'Nilai Kontrak'),
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE SHEET REKAP (formula-based, dipanggil setelah simpan transaksi)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Perbarui sheet REKAP dengan data agregat terkini.
 * Dipanggil otomatis setelah setiap simpan transaksi.
 */
function updateRekapSheet() {
  const ss = getSpreadsheet()
  let rekapSheet = ss.getSheetByName(CONFIG.SHEETS.REKAP)

  // Buat sheet REKAP jika belum ada
  if (!rekapSheet) {
    rekapSheet = ss.insertSheet(CONFIG.SHEETS.REKAP)
  }

  rekapSheet.clearContents()

  const tahun   = new Date().getFullYear()
  const rekap   = getRekapDashboard({ tahun })
  const bulanan = getRekapBulanan(tahun)

  const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm:ss')

  // ── Tulis summary ─────────────────────────────────────────────────────────
  const rows = [
    [`REKAP PAJAK BENDAHARA — ${CONFIG.SATKER}`, '', '', '', ''],
    [`Diperbarui: ${now}`, '', '', '', ''],
    ['', '', '', '', ''],
    [`RINGKASAN TAHUN ${tahun}`, '', '', '', ''],
    ['Jumlah Transaksi', rekap.jmlTransaksi, '', '', ''],
    ['Total Nilai Kontrak', rekap.totalTransaksi, '', '', ''],
    ['Total PPh Dipotong', rekap.totalPph, '', '', ''],
    ['Total PPN Dipungut', rekap.totalPpn, '', '', ''],
    ['Total Pajak Disetor', rekap.totalPajak, '', '', ''],
    ['', '', '', '', ''],
    [`REKAP BULANAN ${tahun}`, '', '', '', ''],
    ['Bulan', 'Jml Transaksi', 'PPh', 'PPN', 'Total Pajak'],
    ...bulanan.bulan.map(b => [b.label, b.jml, b.pph, b.ppn, b.totalPajak]),
    ['', '', '', '', ''],
    ['REKAP PER JENIS PPh', '', '', '', ''],
    ['Jenis PPh', 'Total (Rp)', '', '', ''],
    ...Object.entries(rekap.perJenisPph).map(([k, v]) => [k, v, '', '', '']),
  ]

  if (rows.length > 0) {
    rekapSheet.getRange(1, 1, rows.length, 5).setValues(rows)
  }

  // Format kolom angka
  const angkaCols = [2, 3, 4, 5]
  angkaCols.forEach(col => {
    rekapSheet.getRange(5, col, rows.length - 4, 1)
      .setNumberFormat('#,##0')
  })

  // Bold header
  rekapSheet.getRange(1, 1).setFontWeight('bold').setFontSize(12)
  rekapSheet.getRange(4, 1).setFontWeight('bold')
  rekapSheet.getRange(11, 1).setFontWeight('bold')
  rekapSheet.getRange(12, 1, 1, 5).setFontWeight('bold').setBackground('#4a86e8').setFontColor('#ffffff')

  Logger.log('[updateRekapSheet] Selesai')
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER AGREGASI
// ─────────────────────────────────────────────────────────────────────────────

function sumCol(data, col) {
  return data.reduce((sum, r) => sum + (Number(r[col]) || 0), 0)
}

function groupAndSum(data, groupCol, sumCol_) {
  const result = {}
  data.forEach(r => {
    const key = String(r[groupCol] || 'Lainnya')
    result[key] = (result[key] || 0) + (Number(r[sumCol_]) || 0)
  })
  return result
}

function getTop5Penyedia(data) {
  const map = {}
  data.forEach(r => {
    const nama = String(r['Nama Penyedia'] || '—')
    if (!map[nama]) map[nama] = { nama, jml: 0, totalPajak: 0 }
    map[nama].jml++
    map[nama].totalPajak += Number(r['Total Pajak']) || 0
  })
  return Object.values(map)
    .sort((a, b) => b.totalPajak - a.totalPajak)
    .slice(0, 5)
}

function getTren6Bulan(semuaData, tahun) {
  const now    = new Date()
  const result = []
  for (let i = 5; i >= 0; i--) {
    const d     = new Date(tahun, now.getMonth() - i, 1)
    const bln   = d.getMonth() + 1
    const thn   = d.getFullYear()
    const label = Utilities.formatDate(d, CONFIG.TIMEZONE, 'MMM yyyy')
    const dataBulan = semuaData.filter(r => {
      const tgl   = String(r['Tgl Transaksi'] || '')
      const parts = tgl.split('/')
      return parts.length >= 2 &&
             parseInt(parts[1], 10) === bln &&
             String(r['Tahun Pajak']) === String(thn)
    })
    result.push({
      label,
      bulan:      bln,
      tahun:      thn,
      jml:        dataBulan.length,
      pph:        sumCol(dataBulan, 'Nilai PPh'),
      ppn:        sumCol(dataBulan, 'Nilai PPN'),
      totalPajak: sumCol(dataBulan, 'Total Pajak'),
    })
  }
  return result
}
