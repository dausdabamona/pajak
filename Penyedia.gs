/**
 * Penyedia.gs
 * CRUD untuk sheet MASTER_PENYEDIA — data rekanan / penyedia.
 */

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ambil semua penyedia aktif.
 * @param {Object} payload - { aktif: true/false/null }
 */
function getPenyediaList(payload = {}) {
  let data = sheetGetAll(CONFIG.SHEETS.MASTER_PENYEDIA)

  // Default: tampilkan yang aktif saja
  const filterAktif = payload.aktif !== false  // default true
  if (filterAktif) {
    data = data.filter(r => r['Aktif'] !== false && String(r['Aktif']).toUpperCase() !== 'FALSE')
  }

  // Urutkan berdasarkan nama
  data.sort((a, b) => String(a['Nama'] || '').localeCompare(String(b['Nama'] || ''), 'id'))

  return data
}

/**
 * Ambil satu penyedia berdasarkan ID.
 */
function getPenyediaById(id) {
  const row = sheetFindOne(CONFIG.SHEETS.MASTER_PENYEDIA, 'ID', id)
  if (!row) throw new Error(`Penyedia ID "${id}" tidak ditemukan`)
  return row
}

/**
 * Cari penyedia berdasarkan nama atau NPWP (partial match, case-insensitive).
 * Dipakai untuk autocomplete di form input.
 */
function cariPenyedia(q) {
  if (!q || String(q).trim().length < 2) return []
  const keyword = String(q).trim().toLowerCase()

  return sheetGetAll(CONFIG.SHEETS.MASTER_PENYEDIA)
    .filter(r => {
      const aktif = r['Aktif'] !== false && String(r['Aktif']).toUpperCase() !== 'FALSE'
      const matchNama  = String(r['Nama'] || '').toLowerCase().includes(keyword)
      const matchNpwp  = String(r['NPWP'] || '').replace(/\D/g,'').includes(keyword.replace(/\D/g,''))
      return aktif && (matchNama || matchNpwp)
    })
    .slice(0, 10)  // Max 10 hasil autocomplete
    .map(r => ({
      id:         r['ID'],
      nama:       r['Nama'],
      npwp:       r['NPWP'],
      statusNpwp: r['Status NPWP'],
      alamat:     r['Alamat'],
      kota:       r['Kota'],
      kualifikasi: r['Kualifikasi'],
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simpan penyedia baru.
 *
 * @param {Object} payload
 *   - nama, npwp, statusNpwp, alamat, kota, noTelp, email
 *   - bank, noRekening, atasNama, kualifikasi
 */
function simpanPenyedia(payload) {
  // Validasi wajib
  if (!payload.nama) throw new Error('Nama penyedia wajib diisi')

  // Cek duplikat NPWP jika diisi
  if (payload.npwp) {
    const duplikat = sheetGetAll(CONFIG.SHEETS.MASTER_PENYEDIA)
      .find(r =>
        String(r['NPWP']).replace(/\D/g,'') === String(payload.npwp).replace(/\D/g,'') &&
        r['Aktif'] !== false
      )
    if (duplikat) {
      throw new Error(`NPWP ${payload.npwp} sudah terdaftar atas nama "${duplikat['Nama']}"`)
    }
  }

  const data = {
    'Nama':        String(payload.nama || '').trim(),
    'NPWP':        String(payload.npwp || '').trim(),
    'Status NPWP': payload.statusNpwp || 'BER-NPWP',
    'Alamat':      String(payload.alamat || '').trim(),
    'Kota':        String(payload.kota || '').trim(),
    'No Telp':     String(payload.noTelp || '').trim(),
    'Email':       String(payload.email || '').trim().toLowerCase(),
    'Bank':        String(payload.bank || '').trim(),
    'No Rekening': String(payload.noRekening || '').trim(),
    'Atas Nama':   String(payload.atasNama || '').trim(),
    'Kualifikasi': String(payload.kualifikasi || '').trim(),
    'Aktif':       true,
    'Update At':   '',
  }

  const saved = sheetAppend(CONFIG.SHEETS.MASTER_PENYEDIA, data, 'PYD')
  Logger.log(`[simpanPenyedia] Tersimpan: ${saved['ID']} — ${saved['Nama']}`)
  return saved
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update data penyedia berdasarkan ID.
 */
function updatePenyedia(payload) {
  if (!payload.id) throw new Error('ID penyedia wajib diisi untuk update')

  const existing = sheetFindOne(CONFIG.SHEETS.MASTER_PENYEDIA, 'ID', payload.id)
  if (!existing) throw new Error(`Penyedia ID "${payload.id}" tidak ditemukan`)

  const data = {}
  if (payload.nama)                 data['Nama']        = String(payload.nama).trim()
  if (payload.npwp !== undefined)   data['NPWP']        = String(payload.npwp || '').trim()
  if (payload.statusNpwp)           data['Status NPWP'] = payload.statusNpwp
  if (payload.alamat !== undefined) data['Alamat']      = String(payload.alamat || '').trim()
  if (payload.kota !== undefined)   data['Kota']        = String(payload.kota || '').trim()
  if (payload.noTelp !== undefined) data['No Telp']     = String(payload.noTelp || '').trim()
  if (payload.email !== undefined)  data['Email']       = String(payload.email || '').trim().toLowerCase()
  if (payload.bank !== undefined)   data['Bank']        = String(payload.bank || '').trim()
  if (payload.noRekening !== undefined) data['No Rekening'] = String(payload.noRekening || '').trim()
  if (payload.atasNama !== undefined)   data['Atas Nama']   = String(payload.atasNama || '').trim()
  if (payload.kualifikasi !== undefined) data['Kualifikasi'] = String(payload.kualifikasi || '').trim()
  if (payload.aktif !== undefined)  data['Aktif']       = payload.aktif

  const updated = sheetUpdate(CONFIG.SHEETS.MASTER_PENYEDIA, existing._rowIndex, data)
  Logger.log(`[updatePenyedia] ID=${payload.id} diupdate`)
  return updated
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE (soft delete)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Non-aktifkan penyedia (soft delete).
 */
function hapusPenyedia(id) {
  const existing = sheetFindOne(CONFIG.SHEETS.MASTER_PENYEDIA, 'ID', id)
  if (!existing) throw new Error(`Penyedia ID "${id}" tidak ditemukan`)

  sheetUpdate(CONFIG.SHEETS.MASTER_PENYEDIA, existing._rowIndex, { 'Aktif': false })
  Logger.log(`[hapusPenyedia] ID=${id} dinonaktifkan`)
  return { ok: true, id }
}
