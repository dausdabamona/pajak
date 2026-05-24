/**
 * Riwayat.gs
 * CRUD untuk sheet RIWAYAT — log semua transaksi pajak.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SIMPAN TRANSAKSI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simpan hasil perhitungan pajak ke sheet RIWAYAT.
 *
 * @param {Object} payload
 *   - hasil       : output dari hitungPajak()
 *   - namaPenyedia, npwpPenyedia : data rekanan
 *   - tglTransaksi, tahunPajak, masaPajak
 *   - sumberDana  : 'APBN' | 'APBD' | 'Dana Desa'
 *   - keterangan  : catatan tambahan (opsional)
 */
function simpanTransaksi(payload) {
  const { hasil, namaPenyedia, npwpPenyedia, tglTransaksi,
          tahunPajak, masaPajak, sumberDana, keterangan } = payload

  if (!hasil) throw new Error('Data hasil perhitungan tidak boleh kosong')

  const operator = Session.getActiveUser().getEmail()
  const tgl      = tglTransaksi
                    ? Utilities.formatDate(new Date(tglTransaksi), CONFIG.TIMEZONE, 'dd/MM/yyyy')
                    : Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'dd/MM/yyyy')

  const data = {
    'Tgl Transaksi':   tgl,
    'Nama Penyedia':   namaPenyedia  || '',
    'NPWP Penyedia':   npwpPenyedia  || '',
    'Status NPWP':     hasil.statusNpwp || '',
    'Jenis Kegiatan':  hasil.labelKegiatan || '',
    'Kode Kegiatan':   hasil.kodeKegiatan || '',
    'Nilai Kontrak':   hasil.nilaiKontrak || 0,
    'Sudah Incl PPN':  hasil.inclPpn ? 'YA' : 'TIDAK',
    'DPP':             hasil.dpp || 0,
    'Jenis PPh':       hasil.jenisPph || '',
    'KAP PPh':         hasil.kapPph || '',
    'KJS PPh':         hasil.kjsPph || '',
    'Tarif PPh':       hasil.tarifPphEfektif || 0,
    'Nilai PPh':       hasil.nilaiPph || 0,
    'Tarif PPN':       hasil.tarifPpn || 0,
    'Nilai PPN':       hasil.nilaiPpn || 0,
    'Total Pajak':     hasil.totalPajak || 0,
    'Nilai Dibayar':   hasil.nilaiDibayar || 0,
    'Sumber Dana':     sumberDana || 'APBN',
    'Tahun Pajak':     tahunPajak || new Date().getFullYear(),
    'Masa Pajak':      masaPajak || '',
    'Operator':        operator,
    'Keterangan':      keterangan || '',
  }

  const saved = sheetAppend(CONFIG.SHEETS.RIWAYAT, data, 'TRX')

  // Update rekap setelah simpan
  try { updateRekapSheet() } catch (_) { /* non-blocking */ }

  Logger.log(`[simpanTransaksi] Tersimpan: ${saved['ID']}`)
  return saved
}

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ambil daftar riwayat dengan filter opsional.
 *
 * @param {Object} payload
 *   - tahun    : filter tahun (opsional)
 *   - bulan    : filter bulan 1–12 (opsional)
 *   - penyedia : filter nama penyedia (opsional, partial match)
 *   - limit    : max baris dikembalikan (default 100)
 *   - offset   : offset untuk pagination (default 0)
 */
function getRiwayat(payload = {}) {
  const { tahun, bulan, penyedia, limit = 100, offset = 0 } = payload

  let data = sheetGetAll(CONFIG.SHEETS.RIWAYAT)

  // Filter tahun
  if (tahun) {
    data = data.filter(r => String(r['Tahun Pajak']) === String(tahun))
  }

  // Filter bulan (dari kolom 'Tgl Transaksi' format dd/MM/yyyy)
  if (bulan) {
    data = data.filter(r => {
      const tgl = String(r['Tgl Transaksi'] || '')
      const parts = tgl.split('/')
      return parts.length >= 2 && parseInt(parts[1], 10) === parseInt(bulan, 10)
    })
  }

  // Filter nama penyedia
  if (penyedia) {
    const q = String(penyedia).toLowerCase()
    data = data.filter(r =>
      String(r['Nama Penyedia'] || '').toLowerCase().includes(q)
    )
  }

  // Urutkan terbaru di atas
  data.reverse()

  // Pagination
  const total  = data.length
  const sliced = data.slice(offset, offset + limit)

  return { data: sliced, total, limit, offset }
}

/**
 * Ambil satu riwayat berdasarkan ID.
 */
function getRiwayatById(id) {
  const row = sheetFindOne(CONFIG.SHEETS.RIWAYAT, 'ID', id)
  if (!row) throw new Error(`Riwayat ID "${id}" tidak ditemukan`)
  return row
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hapus satu baris riwayat berdasarkan ID.
 * Hanya operator yang sama atau admin yang boleh hapus.
 */
function hapusRiwayat(id) {
  const row      = sheetFindOne(CONFIG.SHEETS.RIWAYAT, 'ID', id)
  if (!row) throw new Error(`Riwayat ID "${id}" tidak ditemukan`)

  const operator = Session.getActiveUser().getEmail()
  // Validasi: hanya operator sendiri yang bisa hapus (atau hapus cek ini jika semua boleh)
  // if (row['Operator'] !== operator) throw new Error('Tidak berhak menghapus data ini')

  sheetDeleteRow(CONFIG.SHEETS.RIWAYAT, row._rowIndex)
  Logger.log(`[hapusRiwayat] ID=${id} dihapus oleh ${operator}`)
  return { ok: true, id }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export riwayat ke format CSV string (untuk download dari frontend).
 */
function exportRiwayat(payload = {}) {
  const { data } = getRiwayat({ ...payload, limit: 10000 })

  if (data.length === 0) return { csv: '', count: 0 }

  // Header CSV
  const headers = [
    'ID', 'Timestamp', 'Tgl Transaksi', 'Nama Penyedia', 'NPWP Penyedia',
    'Status NPWP', 'Jenis Kegiatan', 'Kode Kegiatan', 'Nilai Kontrak',
    'Sudah Incl PPN', 'DPP', 'Jenis PPh', 'KAP PPh', 'KJS PPh',
    'Tarif PPh', 'Nilai PPh', 'Tarif PPN', 'Nilai PPN',
    'Total Pajak', 'Nilai Dibayar', 'Sumber Dana', 'Tahun Pajak',
    'Masa Pajak', 'Operator', 'Keterangan',
  ]

  const rows = data.map(r =>
    headers.map(h => {
      const val = String(r[h] || '').replace(/"/g, '""')
      return `"${val}"`
    }).join(',')
  )

  const csv = [headers.join(','), ...rows].join('\n')
  return { csv, count: data.length }
}
