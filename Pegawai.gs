/**
 * Pegawai.gs
 * CRUD untuk sheet MASTER_PEGAWAI — data pegawai penerima honor.
 */

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

function getPegawaiList(payload = {}) {
  let data = sheetGetAll(CONFIG.SHEETS.MASTER_PEGAWAI)

  const filterAktif = payload.aktif !== false
  if (filterAktif) {
    data = data.filter(r => r['Aktif'] !== false && String(r['Aktif']).toUpperCase() !== 'FALSE')
  }

  data.sort((a, b) => String(a['Nama'] || '').localeCompare(String(b['Nama'] || ''), 'id'))
  return data
}

function getPegawaiById(id) {
  const row = sheetFindOne(CONFIG.SHEETS.MASTER_PEGAWAI, 'ID', id)
  if (!row) throw new Error(`Pegawai ID "${id}" tidak ditemukan`)
  return row
}

/**
 * Cari pegawai berdasarkan nama, NIP, atau jabatan (untuk autocomplete).
 */
function cariPegawai(q) {
  if (!q || String(q).trim().length < 2) return []
  const keyword = String(q).trim().toLowerCase()

  return sheetGetAll(CONFIG.SHEETS.MASTER_PEGAWAI)
    .filter(r => {
      const aktif = r['Aktif'] !== false && String(r['Aktif']).toUpperCase() !== 'FALSE'
      const matchNama = String(r['Nama'] || '').toLowerCase().includes(keyword)
      const matchNip  = String(r['NIP'] || '').replace(/\D/g,'').includes(keyword.replace(/\D/g,''))
      const matchJab  = String(r['Jabatan'] || '').toLowerCase().includes(keyword)
      return aktif && (matchNama || matchNip || matchJab)
    })
    .slice(0, 10)
    .map(r => ({
      id:         r['ID'],
      nip:        r['NIP'],
      nama:       r['Nama'],
      jabatan:    r['Jabatan'],
      golongan:   r['Golongan'],
      unitKerja:  r['Unit Kerja'],
      npwp:       r['NPWP'],
      statusNpwp: r['Status NPWP'],
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────

function simpanPegawai(payload) {
  if (!payload.nama) throw new Error('Nama pegawai wajib diisi')

  // Cek duplikat NIP
  if (payload.nip) {
    const nipClean = String(payload.nip).replace(/\D/g,'')
    const duplikat = sheetGetAll(CONFIG.SHEETS.MASTER_PEGAWAI)
      .find(r =>
        String(r['NIP']).replace(/\D/g,'') === nipClean &&
        r['Aktif'] !== false
      )
    if (duplikat) {
      throw new Error(`NIP ${payload.nip} sudah terdaftar atas nama "${duplikat['Nama']}"`)
    }
  }

  const data = {
    'NIP':         String(payload.nip || '').trim(),
    'Nama':        String(payload.nama || '').trim(),
    'Jabatan':     String(payload.jabatan || '').trim(),
    'Golongan':    String(payload.golongan || 'III').trim(),
    'Unit Kerja':  String(payload.unitKerja || '').trim(),
    'NPWP':        String(payload.npwp || '').trim(),
    'Status NPWP': payload.statusNpwp || 'BER-NPWP',
    'Aktif':       true,
    'Update At':   '',
  }

  const saved = sheetAppend(CONFIG.SHEETS.MASTER_PEGAWAI, data, 'PGW')
  Logger.log(`[simpanPegawai] Tersimpan: ${saved['ID']} — ${saved['Nama']}`)
  return saved
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────

function updatePegawai(payload) {
  if (!payload.id) throw new Error('ID pegawai wajib diisi untuk update')

  const existing = sheetFindOne(CONFIG.SHEETS.MASTER_PEGAWAI, 'ID', payload.id)
  if (!existing) throw new Error(`Pegawai ID "${payload.id}" tidak ditemukan`)

  const data = {}
  if (payload.nip !== undefined)       data['NIP']         = String(payload.nip || '').trim()
  if (payload.nama)                    data['Nama']        = String(payload.nama).trim()
  if (payload.jabatan !== undefined)   data['Jabatan']     = String(payload.jabatan || '').trim()
  if (payload.golongan)                data['Golongan']    = String(payload.golongan).trim()
  if (payload.unitKerja !== undefined) data['Unit Kerja']  = String(payload.unitKerja || '').trim()
  if (payload.npwp !== undefined)      data['NPWP']        = String(payload.npwp || '').trim()
  if (payload.statusNpwp)              data['Status NPWP'] = payload.statusNpwp
  if (payload.aktif !== undefined)     data['Aktif']       = payload.aktif

  const updated = sheetUpdate(CONFIG.SHEETS.MASTER_PEGAWAI, existing._rowIndex, data)
  Logger.log(`[updatePegawai] ID=${payload.id} diupdate`)
  return updated
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE (soft delete)
// ─────────────────────────────────────────────────────────────────────────────

function hapusPegawai(id) {
  const existing = sheetFindOne(CONFIG.SHEETS.MASTER_PEGAWAI, 'ID', id)
  if (!existing) throw new Error(`Pegawai ID "${id}" tidak ditemukan`)

  sheetUpdate(CONFIG.SHEETS.MASTER_PEGAWAI, existing._rowIndex, { 'Aktif': false })
  Logger.log(`[hapusPegawai] ID=${id} dinonaktifkan`)
  return { ok: true, id }
}
