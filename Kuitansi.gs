/**
 * Kuitansi.gs
 * CRUD + generator HTML untuk Kuitansi Bukti Pembayaran.
 * Format mengikuti standar Poltek KP Sorong.
 */

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simpan kuitansi baru ke sheet KUITANSI.
 *
 * @param {Object} payload
 *   - noKuitansi        : opsional — jika kosong, auto-generate
 *   - tahunAnggaran     : default tahun berjalan
 *   - terimaDari        : default dari config
 *   - uangSejumlah      : nominal (angka)
 *   - terbilang         : opsional — auto jika kosong
 *   - untukPembayaran   : deskripsi
 *   - besarnyaBayar, nilaiPpn, nilaiPph, yangDiterima : komponen
 *   - tempat, tglKuitansi (yyyy-MM-dd)
 *   - penerimaNama      : nama yang menerima uang
 *   - ppkNama, ppkNip, bendaharaNama, bendaharaNip : default dari config
 *   - mak               : nomor MAK (default dari config)
 *   - riwayatId         : opsional — link ke transaksi pajak terkait
 *   - keterangan
 */
function simpanKuitansi(payload) {
  const cfg = getSatkerConfig()

  if (!payload.uangSejumlah || Number(payload.uangSejumlah) <= 0) {
    throw new Error('Uang sejumlah harus lebih dari 0')
  }
  if (!payload.untukPembayaran) {
    throw new Error('Uraian pembayaran wajib diisi')
  }
  if (!payload.penerimaNama) {
    throw new Error('Nama penerima wajib diisi')
  }

  const operator = Session.getActiveUser().getEmail()
  const tgl = payload.tglKuitansi
    ? Utilities.formatDate(new Date(payload.tglKuitansi), CONFIG.TIMEZONE, 'dd/MM/yyyy')
    : Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'dd/MM/yyyy')

  const tahunAnggaran = payload.tahunAnggaran
                          || cfg['TAHUN_ANGGARAN']
                          || new Date().getFullYear().toString()

  const noKuitansi = payload.noKuitansi && String(payload.noKuitansi).trim()
                       ? String(payload.noKuitansi).trim()
                       : getNextNomorKuitansi(payload.tglKuitansi, tahunAnggaran)

  const uang = Math.round(Number(payload.uangSejumlah))
  const terbilang = payload.terbilang && String(payload.terbilang).trim()
                      ? String(payload.terbilang).trim()
                      : terbilangRupiah(uang)

  const data = {
    'No Kuitansi':         noKuitansi,
    'Tahun Anggaran':      tahunAnggaran,
    'Terima Dari':         payload.terimaDari
                              || cfg['KUITANSI_TERIMA_DARI']
                              || `Pejabat Pembuat Komitmen ${cfg['NAMA_SATKER'] || CONFIG.SATKER}`,
    'Uang Sejumlah':       uang,
    'Terbilang':           terbilang,
    'Untuk Pembayaran':    String(payload.untukPembayaran || '').trim(),
    'Besarnya Pembayaran': Math.round(Number(payload.besarnyaBayar) || uang),
    'Nilai PPN':           Math.round(Number(payload.nilaiPpn) || 0),
    'Nilai PPh':           Math.round(Number(payload.nilaiPph) || 0),
    'Yang Diterima':       Math.round(Number(payload.yangDiterima) ||
                              (Math.round(Number(payload.besarnyaBayar) || uang) -
                               Math.round(Number(payload.nilaiPpn) || 0) -
                               Math.round(Number(payload.nilaiPph) || 0))),
    'Tempat':              payload.tempat || cfg['KOTA'] || 'Sorong',
    'Tgl Kuitansi':        tgl,
    'Penerima Nama':       String(payload.penerimaNama || '').trim(),
    'PPK Nama':            payload.ppkNama || cfg['NAMA_PPK'] || '',
    'PPK NIP':             payload.ppkNip  || cfg['NIP_PPK']  || '',
    'Bendahara Nama':      payload.bendaharaNama || cfg['NAMA_BENDAHARA'] || '',
    'Bendahara NIP':       payload.bendaharaNip  || cfg['NIP_BENDAHARA']  || '',
    'MAK':                 String(payload.mak || cfg['KUITANSI_MAK'] || '1'),
    'Riwayat ID':          payload.riwayatId || '',
    'Operator':            operator,
    'Keterangan':          payload.keterangan || '',
  }

  const saved = sheetAppend(CONFIG.SHEETS.KUITANSI, data, 'KWT')
  Logger.log(`[simpanKuitansi] Tersimpan: ${saved['ID']} — ${saved['No Kuitansi']}`)
  return saved
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update kuitansi berdasarkan ID.
 */
function updateKuitansi(payload) {
  if (!payload.id) throw new Error('ID kuitansi wajib diisi untuk update')

  const existing = sheetFindOne(CONFIG.SHEETS.KUITANSI, 'ID', payload.id)
  if (!existing) throw new Error(`Kuitansi ID "${payload.id}" tidak ditemukan`)

  const data = {}
  if (payload.noKuitansi)      data['No Kuitansi']         = String(payload.noKuitansi).trim()
  if (payload.tahunAnggaran)   data['Tahun Anggaran']      = payload.tahunAnggaran
  if (payload.terimaDari)      data['Terima Dari']         = payload.terimaDari
  if (payload.uangSejumlah != null) {
    const uang = Math.round(Number(payload.uangSejumlah))
    data['Uang Sejumlah'] = uang
    data['Terbilang']     = payload.terbilang || terbilangRupiah(uang)
  }
  if (payload.untukPembayaran) data['Untuk Pembayaran']    = payload.untukPembayaran
  if (payload.besarnyaBayar != null) data['Besarnya Pembayaran'] = Math.round(Number(payload.besarnyaBayar))
  if (payload.nilaiPpn != null)      data['Nilai PPN']     = Math.round(Number(payload.nilaiPpn))
  if (payload.nilaiPph != null)      data['Nilai PPh']     = Math.round(Number(payload.nilaiPph))
  if (payload.yangDiterima != null)  data['Yang Diterima'] = Math.round(Number(payload.yangDiterima))
  if (payload.tempat)          data['Tempat']              = payload.tempat
  if (payload.tglKuitansi)     data['Tgl Kuitansi']        = Utilities.formatDate(new Date(payload.tglKuitansi), CONFIG.TIMEZONE, 'dd/MM/yyyy')
  if (payload.penerimaNama)    data['Penerima Nama']       = payload.penerimaNama
  if (payload.ppkNama)         data['PPK Nama']            = payload.ppkNama
  if (payload.ppkNip)          data['PPK NIP']             = payload.ppkNip
  if (payload.bendaharaNama)   data['Bendahara Nama']      = payload.bendaharaNama
  if (payload.bendaharaNip)    data['Bendahara NIP']       = payload.bendaharaNip
  if (payload.mak != null)     data['MAK']                 = String(payload.mak)
  if (payload.keterangan != null) data['Keterangan']       = payload.keterangan

  const updated = sheetUpdate(CONFIG.SHEETS.KUITANSI, existing._rowIndex, data)
  Logger.log(`[updateKuitansi] ID=${payload.id} diupdate`)
  return updated
}

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ambil daftar kuitansi dengan filter opsional.
 */
function getKuitansiList(payload = {}) {
  const { tahun, bulan, q, limit = 100, offset = 0 } = payload

  let data
  try {
    data = sheetGetAll(CONFIG.SHEETS.KUITANSI)
  } catch (_) {
    return { data: [], total: 0, limit, offset }
  }

  if (tahun) {
    data = data.filter(r => String(r['Tahun Anggaran']) === String(tahun))
  }

  if (bulan) {
    data = data.filter(r => {
      const tgl = String(r['Tgl Kuitansi'] || '')
      const parts = tgl.split('/')
      return parts.length >= 2 && parseInt(parts[1], 10) === parseInt(bulan, 10)
    })
  }

  if (q) {
    const keyword = String(q).toLowerCase()
    data = data.filter(r =>
      String(r['No Kuitansi'] || '').toLowerCase().includes(keyword) ||
      String(r['Penerima Nama'] || '').toLowerCase().includes(keyword) ||
      String(r['Untuk Pembayaran'] || '').toLowerCase().includes(keyword)
    )
  }

  data.reverse()
  const total  = data.length
  const sliced = data.slice(offset, offset + limit)

  return { data: sliced, total, limit, offset }
}

/**
 * Ambil satu kuitansi berdasarkan ID.
 */
function getKuitansiById(id) {
  const row = sheetFindOne(CONFIG.SHEETS.KUITANSI, 'ID', id)
  if (!row) throw new Error(`Kuitansi ID "${id}" tidak ditemukan`)
  return row
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

function hapusKuitansi(id) {
  const row = sheetFindOne(CONFIG.SHEETS.KUITANSI, 'ID', id)
  if (!row) throw new Error(`Kuitansi ID "${id}" tidak ditemukan`)
  sheetDeleteRow(CONFIG.SHEETS.KUITANSI, row._rowIndex)
  Logger.log(`[hapusKuitansi] ID=${id} dihapus`)
  return { ok: true, id }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOMOR KUITANSI — auto increment per tahun
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate nomor kuitansi berikutnya.
 * Format: KWT-{nomor}/{bulanRomawi}/{tahun}
 * Contoh: KWT-290/V/2026
 *
 * Nomor urut dihitung berdasarkan jumlah kuitansi pada tahun anggaran tersebut + 1.
 */
function getNextNomorKuitansi(tglKuitansi, tahunAnggaran) {
  const cfg = getSatkerConfig()
  const prefix = cfg['KUITANSI_PREFIX'] || 'KWT'

  const d = tglKuitansi ? new Date(tglKuitansi) : new Date()
  const bulanRomawi = toRomawi(d.getMonth() + 1)
  const tahun = tahunAnggaran || cfg['TAHUN_ANGGARAN'] || d.getFullYear()

  // Hitung nomor urut berdasarkan kuitansi pada tahun anggaran tersebut
  let urut = 1
  try {
    const rows = sheetGetAll(CONFIG.SHEETS.KUITANSI)
    const sameYear = rows.filter(r => String(r['Tahun Anggaran']) === String(tahun))
    // Coba ambil nomor terbesar dari format KWT-NNN/.../...
    let maxNo = 0
    sameYear.forEach(r => {
      const m = String(r['No Kuitansi'] || '').match(/^[A-Z]+-(\d+)/)
      if (m) {
        const n = parseInt(m[1], 10)
        if (!isNaN(n) && n > maxNo) maxNo = n
      }
    })
    urut = (maxNo > 0 ? maxNo : sameYear.length) + 1
  } catch (_) { /* sheet belum ada */ }

  return `${prefix}-${urut}/${bulanRomawi}/${tahun}`
}

/**
 * Konversi angka bulan (1-12) ke angka Romawi.
 */
function toRomawi(n) {
  const map = ['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII']
  return map[Number(n)] || ''
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE HTML — Kuitansi siap cetak
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bangun HTML satu kuitansi siap cetak.
 *
 * @param {Object} payload — bisa berupa data kuitansi tersimpan,
 *                            atau preview dari form input (sebelum disimpan).
 */
function generateKuitansiHTML(payload) {
  const cfg = getSatkerConfig()

  const d = (payload && payload._stored) ? payload : normalizeKuitansiData(payload, cfg)
  const html = buildKuitansiPage(d, cfg)
  return { html }
}

/**
 * Normalisasi data preview (dari form input) ke format display.
 */
function normalizeKuitansiData(p, cfg) {
  const tgl = p.tglKuitansi
    ? Utilities.formatDate(new Date(p.tglKuitansi), CONFIG.TIMEZONE, 'dd/MM/yyyy')
    : Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'dd/MM/yyyy')

  const uang = Math.round(Number(p.uangSejumlah) || 0)
  const besarnya = Math.round(Number(p.besarnyaBayar) || uang)
  const ppn = Math.round(Number(p.nilaiPpn) || 0)
  const pph = Math.round(Number(p.nilaiPph) || 0)
  const yangDiterima = p.yangDiterima != null
    ? Math.round(Number(p.yangDiterima))
    : (besarnya - ppn - pph)

  return {
    'No Kuitansi':         p.noKuitansi || getNextNomorKuitansi(p.tglKuitansi, p.tahunAnggaran),
    'Tahun Anggaran':      p.tahunAnggaran || cfg['TAHUN_ANGGARAN'] || new Date().getFullYear(),
    'Terima Dari':         p.terimaDari || cfg['KUITANSI_TERIMA_DARI'] || `Pejabat Pembuat Komitmen ${cfg['NAMA_SATKER'] || CONFIG.SATKER}`,
    'Uang Sejumlah':       uang,
    'Terbilang':           p.terbilang || terbilangRupiah(uang),
    'Untuk Pembayaran':    p.untukPembayaran || '',
    'Besarnya Pembayaran': besarnya,
    'Nilai PPN':           ppn,
    'Nilai PPh':           pph,
    'Yang Diterima':       yangDiterima,
    'Tempat':              p.tempat || cfg['KOTA'] || 'Sorong',
    'Tgl Kuitansi':        tgl,
    'Penerima Nama':       p.penerimaNama || '',
    'PPK Nama':            p.ppkNama || cfg['NAMA_PPK'] || '',
    'PPK NIP':             p.ppkNip  || cfg['NIP_PPK']  || '',
    'Bendahara Nama':      p.bendaharaNama || cfg['NAMA_BENDAHARA'] || '',
    'Bendahara NIP':       p.bendaharaNip  || cfg['NIP_BENDAHARA']  || '',
    'MAK':                 String(p.mak || cfg['KUITANSI_MAK'] || '1'),
  }
}

/**
 * Bangun HTML satu halaman kuitansi (A4 portrait).
 */
function buildKuitansiPage(d, cfg) {
  const fmtRp = n => Math.round(Number(n) || 0).toLocaleString('id-ID')
  const fmtRpKoma = n => {
    const r = Math.round(Number(n) || 0).toLocaleString('id-ID')
    return r + ',00'
  }
  const tglIndo = formatTglIndonesia(toIsoDate(d['Tgl Kuitansi']))

  const kopBaris1 = cfg['KOP_BARIS_1'] || 'KEMENTERIAN KELAUTAN DAN PERIKANAN'
  const kopBaris2 = cfg['KOP_BARIS_2'] || 'BADAN PENYULUHAN DAN PENGEMBANGAN'
  const kopBaris3 = cfg['KOP_BARIS_3'] || 'SUMBER DAYA MANUSIA KELAUTAN DAN PERIKANAN'
  const kopBaris4 = cfg['KOP_BARIS_4'] || 'POLITEKNIK KELAUTAN DAN PERIKANAN SORONG'
  const kopAlamat = cfg['KOP_ALAMAT'] || ''
  const kopKotakPos = cfg['KOP_KOTAK_POS'] || ''
  const kopLaman = cfg['KOP_LAMAN'] || ''
  const kopSurel = cfg['KOP_SUREL'] || ''
  const kopLogoUrl = cfg['KOP_LOGO_URL'] || ''

  const logoNormalized = normalizeLogoUrlServer(kopLogoUrl)
  const logoBlock = logoNormalized
    ? `<img src="${escapeHtml(logoNormalized)}" alt="logo">`
    : `<div style="width:24mm;height:24mm;border:1.5pt solid #1f3a5f;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:7pt;color:#1f3a5f;text-align:center;line-height:1.2;font-family:'Cormorant Garamond',serif">LOGO<br>SATKER</div>`

  return `<div class="kw-page">
  <!-- KOP SURAT -->
  <div class="kw-kop">
    <div class="kw-kop-logo">${logoBlock}</div>
    <div class="kw-kop-text">
      <div class="kw-kop-l1">${escapeHtml(kopBaris1)}</div>
      <div class="kw-kop-l2">${escapeHtml(kopBaris2)}</div>
      <div class="kw-kop-l2">${escapeHtml(kopBaris3)}</div>
      <div class="kw-kop-l1">${escapeHtml(kopBaris4)}</div>
      <div class="kw-kop-alamat">${escapeHtml(kopAlamat)}</div>
      <div class="kw-kop-alamat">${escapeHtml(kopKotakPos)}</div>
      <div class="kw-kop-alamat">Laman: <i>${escapeHtml(kopLaman)}</i> &nbsp;&middot;&nbsp; Surel: <i>${escapeHtml(kopSurel)}</i></div>
    </div>
  </div>
  <div class="kw-divider"></div>

  <!-- NO KUITANSI & TA -->
  <table class="kw-meta">
    <tr>
      <td class="kw-meta-label">No Kuitansi</td>
      <td class="kw-meta-val">${escapeHtml(d['No Kuitansi'])}</td>
      <td class="kw-meta-ta">T.A. ${escapeHtml(String(d['Tahun Anggaran']))}</td>
    </tr>
  </table>

  <!-- JUDUL -->
  <div class="kw-title-wrap">
    <div class="kw-title">Kuitansi Bukti Pembayaran</div>
    <div class="kw-title-sub">— Surat Bukti Tanda Terima Uang —</div>
  </div>

  <!-- FIELDS UTAMA -->
  <table class="kw-body">
    <tr>
      <td class="kw-lbl">Telah terima dari</td>
      <td class="kw-sep">:</td>
      <td class="kw-fill">${escapeHtml(d['Terima Dari'])}</td>
    </tr>
    <tr>
      <td class="kw-lbl">Uang sejumlah</td>
      <td class="kw-sep">:</td>
      <td class="kw-fill"><span class="kw-amount-box">Rp ${fmtRpKoma(d['Uang Sejumlah'])}</span></td>
    </tr>
    <tr>
      <td class="kw-lbl">Terbilang</td>
      <td class="kw-sep">:</td>
      <td class="kw-fill kw-italic">${escapeHtml(d['Terbilang'])}</td>
    </tr>
    <tr>
      <td class="kw-lbl" style="vertical-align:top;padding-top:2mm">Untuk Pembayaran</td>
      <td class="kw-sep" style="vertical-align:top;padding-top:2mm">:</td>
      <td class="kw-fill">${escapeHtml(d['Untuk Pembayaran'])}</td>
    </tr>
  </table>

  <!-- RINCIAN -->
  <div class="kw-rincian-wrap">
    <table class="kw-rincian">
      <tr>
        <td class="kw-r-lbl">Besarnya pembayaran</td>
        <td class="kw-r-val">Rp ${fmtRp(d['Besarnya Pembayaran'])}</td>
      </tr>
      <tr>
        <td class="kw-r-lbl">PPN dipungut</td>
        <td class="kw-r-val">Rp ${fmtRp(d['Nilai PPN'])}</td>
      </tr>
      <tr>
        <td class="kw-r-lbl">PPh dipotong</td>
        <td class="kw-r-val">Rp ${fmtRp(d['Nilai PPh'])}</td>
      </tr>
      <tr class="kw-r-total">
        <td class="kw-r-lbl">Yang diterima</td>
        <td class="kw-r-val">Rp ${fmtRp(d['Yang Diterima'])}</td>
      </tr>
    </table>
  </div>

  <!-- TANGGAL & PENERIMA -->
  <div class="kw-tgl-block">
    <div class="kw-tgl">${escapeHtml(d['Tempat'])}, ${tglIndo}</div>
    <div class="kw-yg-terima">Yang menerima,</div>
    <div class="kw-penerima">${escapeHtml(d['Penerima Nama'])}</div>
  </div>

  <!-- SETUJU + TTD -->
  <div class="kw-setuju">Setuju dan lunas dibayar pada tanggal ${tglIndo}</div>
  <table class="kw-ttd-area">
    <tr>
      <td class="kw-ttd-col">
        <div class="kw-ttd-jab">Pejabat Pembuat Komitmen,</div>
        <div class="kw-ttd-nama">${escapeHtml(d['PPK Nama'])}</div>
        <div class="kw-ttd-nip">NIP. ${escapeHtml(d['PPK NIP'])}</div>
      </td>
      <td class="kw-ttd-col">
        <div class="kw-ttd-jab">Bendahara Pengeluaran,</div>
        <div class="kw-ttd-nama">${escapeHtml(d['Bendahara Nama'])}</div>
        <div class="kw-ttd-nip">NIP. ${escapeHtml(d['Bendahara NIP'])}</div>
      </td>
    </tr>
  </table>

  <!-- MAK -->
  <div class="kw-mak-wrap">
    <span class="kw-mak">MAK</span>
    <span class="kw-mak-val">${escapeHtml(d['MAK'])}</span>
  </div>
</div>`
}

/**
 * Normalisasi URL logo (Drive sharing URL → format yang bisa dimuat sebagai gambar).
 * Dipakai server-side saat build HTML kuitansi/nominatif.
 */
function normalizeLogoUrlServer(url) {
  if (!url) return ''
  const s = String(url).trim()
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?[^"']*id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/thumbnail\?[^"']*id=([a-zA-Z0-9_-]+)/,
    /lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/,
  ]
  for (let i = 0; i < patterns.length; i++) {
    const m = s.match(patterns[i])
    if (m && m[1]) return `https://lh3.googleusercontent.com/d/${m[1]}=w400`
  }
  return s
}

/**
 * Escape HTML untuk safety.
 */
function escapeHtml(s) {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Konversi tanggal dd/MM/yyyy → yyyy-MM-dd untuk formatTglIndonesia.
 */
function toIsoDate(s) {
  if (!s) return new Date().toISOString().slice(0, 10)
  const str = String(s).trim()
  // sudah ISO?
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str
  const parts = str.split(/[\/\-]/)
  if (parts.length >= 3) {
    const [d, m, y] = parts
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  }
  return str
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: ambil data dari riwayat utk pre-fill kuitansi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bangun draft kuitansi berdasarkan data riwayat transaksi.
 */
function buatDraftKuitansiDariRiwayat(riwayatId) {
  const row = sheetFindOne(CONFIG.SHEETS.RIWAYAT, 'ID', riwayatId)
  if (!row) throw new Error(`Riwayat ID "${riwayatId}" tidak ditemukan`)

  const cfg = getSatkerConfig()
  const nilaiKontrak = Number(row['Nilai Kontrak']) || 0
  const nilaiPpn    = Number(row['Nilai PPN']) || 0
  const nilaiPph    = Number(row['Nilai PPh']) || 0
  const nilaiDibayar = Number(row['Nilai Dibayar']) || (nilaiKontrak - nilaiPph - nilaiPpn)

  // Konversi Tgl Transaksi (dd/MM/yyyy) → yyyy-MM-dd untuk input date
  const tgl = toIsoDate(row['Tgl Transaksi'])

  return {
    riwayatId:        row['ID'],
    tglKuitansi:      tgl,
    tahunAnggaran:    row['Tahun Pajak'] || cfg['TAHUN_ANGGARAN'] || new Date().getFullYear(),
    terimaDari:       cfg['KUITANSI_TERIMA_DARI']
                        || `Pejabat Pembuat Komitmen ${cfg['NAMA_SATKER'] || CONFIG.SATKER}`,
    uangSejumlah:     nilaiKontrak,
    terbilang:        terbilangRupiah(nilaiKontrak),
    untukPembayaran:  `Pembayaran ${row['Jenis Kegiatan'] || ''}${row['Keterangan'] ? ' — ' + row['Keterangan'] : ''}`.trim(),
    besarnyaBayar:    nilaiKontrak,
    nilaiPpn:         nilaiPpn,
    nilaiPph:         nilaiPph,
    yangDiterima:     nilaiDibayar,
    tempat:           cfg['KOTA'] || 'Sorong',
    penerimaNama:     row['Nama Penyedia'] || '',
    ppkNama:          cfg['NAMA_PPK'] || '',
    ppkNip:           cfg['NIP_PPK']  || '',
    bendaharaNama:    cfg['NAMA_BENDAHARA'] || '',
    bendaharaNip:     cfg['NIP_BENDAHARA']  || '',
    mak:              cfg['KUITANSI_MAK'] || '1',
  }
}
