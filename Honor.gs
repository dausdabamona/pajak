/**
 * Honor.gs
 * Daftar Nominatif Penerima Honor + PPh Pasal 21 final atas honorarium PNS.
 *
 * Dasar hukum tarif PPh 21 final atas honor PNS/Pejabat Negara/TNI/POLRI:
 *   PP No. 80 Tahun 2010 dan PMK No. 262/PMK.03/2010 :
 *     - Gol I & II           : 0%   (tidak dipotong)
 *     - Gol III              : 5%   (final)
 *     - Gol IV / Pejabat Neg : 15%  (final)
 *   Non-PNS: tarif Pasal 17 (kumulatif) — di aplikasi ini disetarakan dengan
 *   Gol III (5%) atau Gol IV (15%) sesuai pilihan user.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TARIF PPh 21
// ─────────────────────────────────────────────────────────────────────────────

const TARIF_PPH21 = {
  'I':                0,
  'II':               0,
  'III':              0.05,
  'IV':               0.15,
  'PEJABAT NEGARA':   0.15,
  'NON-PNS SETARA III': 0.05,
  'NON-PNS SETARA IV':  0.15,
}

/**
 * Hitung PPh 21 atas honor berdasarkan golongan.
 * @param {number} bruto      - honor kotor
 * @param {string} golongan   - 'I'|'II'|'III'|'IV'|'Pejabat Negara'|'Non-PNS Setara III'|'Non-PNS Setara IV'
 * @param {boolean} nonNpwp   - true jika tidak ber-NPWP (tarif 2x; default false)
 */
function hitungPph21(bruto, golongan, nonNpwp) {
  const key = String(golongan || '').trim().toUpperCase()
  let tarif = TARIF_PPH21[key]
  if (tarif === undefined) tarif = 0

  if (nonNpwp && tarif > 0) tarif *= 2  // PPh 21 non-NPWP juga 20% lebih tinggi (kebijakan internal)

  const pph    = Math.round(Number(bruto || 0) * tarif)
  const bersih = Math.round(Number(bruto || 0)) - pph

  return { tarif, pph, bersih }
}

/**
 * Ambil daftar opsi golongan untuk dropdown frontend.
 */
function getGolonganList() {
  return [
    { kode: 'I',                  label: 'Gol I',              tarif: 0 },
    { kode: 'II',                 label: 'Gol II',             tarif: 0 },
    { kode: 'III',                label: 'Gol III',            tarif: 0.05 },
    { kode: 'IV',                 label: 'Gol IV',             tarif: 0.15 },
    { kode: 'Pejabat Negara',     label: 'Pejabat Negara',     tarif: 0.15 },
    { kode: 'Non-PNS Setara III', label: 'Non-PNS (5%)',       tarif: 0.05 },
    { kode: 'Non-PNS Setara IV',  label: 'Non-PNS (15%)',      tarif: 0.15 },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD HONOR_NOMINATIF
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simpan nominatif honor baru.
 *
 * payload:
 *   - noSk, tglSk, periodeBulan (1..12), periodeTahun
 *   - judul, kegiatan, mak
 *   - tempat, tglSurat
 *   - ppkNama, ppkNip, bendaharaNama, bendaharaNip
 *   - keterangan
 *   - detail: [{ no, nama, nip, jabatan, golongan, bruto, nonNpwp }]
 */
function simpanNominatif(payload) {
  if (!payload.judul)        throw new Error('Judul nominatif wajib diisi')
  if (!payload.periodeBulan) throw new Error('Periode bulan wajib diisi')
  if (!payload.periodeTahun) throw new Error('Periode tahun wajib diisi')
  if (!Array.isArray(payload.detail) || payload.detail.length === 0) {
    throw new Error('Minimal satu penerima wajib diisi')
  }

  // Hitung ulang totalnya di server
  const detail = payload.detail.map((d, idx) => {
    const bruto = Number(d.bruto || 0)
    const h = hitungPph21(bruto, d.golongan, !!d.nonNpwp)
    return {
      no:       idx + 1,
      nama:     String(d.nama || '').trim(),
      nip:      String(d.nip || '').trim(),
      jabatan:  String(d.jabatan || '').trim(),
      golongan: String(d.golongan || '').trim(),
      nonNpwp:  !!d.nonNpwp,
      bruto,
      tarifPph: h.tarif,
      pph:      h.pph,
      bersih:   h.bersih,
    }
  })

  const totalBruto  = detail.reduce((s, d) => s + d.bruto,  0)
  const totalPph    = detail.reduce((s, d) => s + d.pph,    0)
  const totalBersih = detail.reduce((s, d) => s + d.bersih, 0)

  const data = {
    'No SK':           String(payload.noSk || '').trim(),
    'Tgl SK':          payload.tglSk || '',
    'Periode Bulan':   Number(payload.periodeBulan),
    'Periode Tahun':   Number(payload.periodeTahun),
    'Judul':           String(payload.judul || '').trim(),
    'Kegiatan':        String(payload.kegiatan || '').trim(),
    'MAK':             String(payload.mak || '').trim(),
    'Detail JSON':     JSON.stringify(detail),
    'Total Bruto':     totalBruto,
    'Total PPh':       totalPph,
    'Total Bersih':    totalBersih,
    'Tempat':          String(payload.tempat || '').trim(),
    'Tgl Surat':       payload.tglSurat || '',
    'PPK Nama':        String(payload.ppkNama || '').trim(),
    'PPK NIP':         String(payload.ppkNip || '').trim(),
    'Bendahara Nama':  String(payload.bendaharaNama || '').trim(),
    'Bendahara NIP':   String(payload.bendaharaNip || '').trim(),
    'Riwayat ID':      '',
    'Kuitansi ID':     '',
    'Operator':        Session.getActiveUser().getEmail() || '',
    'Keterangan':      String(payload.keterangan || '').trim(),
  }

  const saved = sheetAppend(CONFIG.SHEETS.HONOR_NOMINATIF, data, 'HNR')
  Logger.log(`[simpanNominatif] ${saved['ID']} — total ${totalBruto}`)
  return saved
}

function updateNominatif(payload) {
  if (!payload.id) throw new Error('ID nominatif wajib diisi untuk update')
  const existing = sheetFindOne(CONFIG.SHEETS.HONOR_NOMINATIF, 'ID', payload.id)
  if (!existing) throw new Error(`Nominatif ID "${payload.id}" tidak ditemukan`)

  const detail = (payload.detail || []).map((d, idx) => {
    const bruto = Number(d.bruto || 0)
    const h = hitungPph21(bruto, d.golongan, !!d.nonNpwp)
    return {
      no: idx + 1, nama: String(d.nama || '').trim(), nip: String(d.nip || '').trim(),
      jabatan: String(d.jabatan || '').trim(), golongan: String(d.golongan || '').trim(),
      nonNpwp: !!d.nonNpwp, bruto, tarifPph: h.tarif, pph: h.pph, bersih: h.bersih,
    }
  })

  const totalBruto  = detail.reduce((s, d) => s + d.bruto,  0)
  const totalPph    = detail.reduce((s, d) => s + d.pph,    0)
  const totalBersih = detail.reduce((s, d) => s + d.bersih, 0)

  const data = {
    'No SK':           String(payload.noSk || '').trim(),
    'Tgl SK':          payload.tglSk || '',
    'Periode Bulan':   Number(payload.periodeBulan),
    'Periode Tahun':   Number(payload.periodeTahun),
    'Judul':           String(payload.judul || '').trim(),
    'Kegiatan':        String(payload.kegiatan || '').trim(),
    'MAK':             String(payload.mak || '').trim(),
    'Detail JSON':     JSON.stringify(detail),
    'Total Bruto':     totalBruto,
    'Total PPh':       totalPph,
    'Total Bersih':    totalBersih,
    'Tempat':          String(payload.tempat || '').trim(),
    'Tgl Surat':       payload.tglSurat || '',
    'PPK Nama':        String(payload.ppkNama || '').trim(),
    'PPK NIP':         String(payload.ppkNip || '').trim(),
    'Bendahara Nama':  String(payload.bendaharaNama || '').trim(),
    'Bendahara NIP':   String(payload.bendaharaNip || '').trim(),
    'Keterangan':      String(payload.keterangan || '').trim(),
  }

  const updated = sheetUpdate(CONFIG.SHEETS.HONOR_NOMINATIF, existing._rowIndex, data)
  Logger.log(`[updateNominatif] ${payload.id} diupdate`)
  return updated
}

function getNominatifList(payload = {}) {
  let data
  try {
    data = sheetGetAll(CONFIG.SHEETS.HONOR_NOMINATIF)
  } catch (_) {
    return []
  }

  if (payload.tahun) {
    data = data.filter(r => Number(r['Periode Tahun']) === Number(payload.tahun))
  }
  if (payload.bulan) {
    data = data.filter(r => Number(r['Periode Bulan']) === Number(payload.bulan))
  }
  if (payload.q) {
    const k = String(payload.q).toLowerCase()
    data = data.filter(r =>
      String(r['Judul'] || '').toLowerCase().includes(k) ||
      String(r['No SK'] || '').toLowerCase().includes(k) ||
      String(r['Kegiatan'] || '').toLowerCase().includes(k)
    )
  }

  data.sort((a, b) => String(b['Timestamp'] || '').localeCompare(String(a['Timestamp'] || '')))
  return data
}

function getNominatifById(id) {
  const row = sheetFindOne(CONFIG.SHEETS.HONOR_NOMINATIF, 'ID', id)
  if (!row) throw new Error(`Nominatif ID "${id}" tidak ditemukan`)
  // Parse detail JSON
  try {
    row.detail = JSON.parse(row['Detail JSON'] || '[]')
  } catch (_) {
    row.detail = []
  }
  return row
}

function hapusNominatif(id) {
  const existing = sheetFindOne(CONFIG.SHEETS.HONOR_NOMINATIF, 'ID', id)
  if (!existing) throw new Error(`Nominatif ID "${id}" tidak ditemukan`)
  sheetDeleteRow(CONFIG.SHEETS.HONOR_NOMINATIF, existing._rowIndex)
  Logger.log(`[hapusNominatif] ID=${id} dihapus`)
  return { ok: true, id }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRASI: Buat draft kuitansi dari nominatif
// ─────────────────────────────────────────────────────────────────────────────

function buatKuitansiDariNominatif(id) {
  const n = getNominatifById(id)
  const cfg = getSatkerConfig()

  const BLN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus',
               'September','Oktober','November','Desember']
  const periodeStr = `${BLN[Number(n['Periode Bulan']) - 1] || ''} ${n['Periode Tahun']}`
  const untuk = `Pembayaran ${n['Judul']} periode ${periodeStr}` +
                (n['No SK'] ? ` (SK No. ${n['No SK']})` : '')

  return {
    isFromNominatif:  true,
    nominatifId:      n['ID'],
    tahunAnggaran:    Number(n['Periode Tahun']) || new Date().getFullYear(),
    terimaDari:       cfg['KUITANSI_TERIMA_DARI'] || '',
    uangSejumlah:     Number(n['Total Bruto']) || 0,
    untukPembayaran:  untuk,
    besarnyaBayar:    Number(n['Total Bruto']) || 0,
    nilaiPpn:         0,
    nilaiPph:         Number(n['Total PPh']) || 0,
    yangDiterima:     Number(n['Total Bersih']) || 0,
    tempat:           n['Tempat'] || cfg['KOTA'] || 'Sorong',
    tglKuitansi:      n['Tgl Surat'] || '',
    penerimaNama:     n['PPK Nama'] || cfg['NAMA_PPK'] || '',
    ppkNama:          n['PPK Nama'] || cfg['NAMA_PPK'] || '',
    ppkNip:           n['PPK NIP']  || cfg['NIP_PPK'] || '',
    bendaharaNama:    n['Bendahara Nama'] || cfg['NAMA_BENDAHARA'] || '',
    bendaharaNip:     n['Bendahara NIP']  || cfg['NIP_BENDAHARA'] || '',
    mak:              n['MAK'] || '',
    keterangan:       `Berdasarkan Nominatif ${n['ID']}`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRASI: Catat PPh 21 ke sheet RIWAYAT (1 transaksi total)
// ─────────────────────────────────────────────────────────────────────────────

function catatPph21KeRiwayat(id) {
  const n = getNominatifById(id)

  if (n['Riwayat ID']) {
    throw new Error(`Nominatif ini sudah dicatat ke Riwayat (ID: ${n['Riwayat ID']})`)
  }

  const totalBruto = Number(n['Total Bruto']) || 0
  const totalPph   = Number(n['Total PPh'])   || 0
  const bersih     = Number(n['Total Bersih']) || 0

  if (totalPph <= 0) {
    throw new Error('Tidak ada PPh 21 yang perlu dicatat (total PPh = 0)')
  }

  const BLN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus',
               'September','Oktober','November','Desember']
  const masaStr = `${BLN[Number(n['Periode Bulan']) - 1] || ''} ${n['Periode Tahun']}`

  const data = {
    'Tgl Transaksi':  n['Tgl Surat'] || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'dd/MM/yyyy'),
    'Nama Penyedia':  `Honor ${n['Judul']} — ${masaStr}`,
    'NPWP Penyedia':  '',
    'Status NPWP':    'BER-NPWP',
    'Jenis Kegiatan': 'Honor / PPh 21 Final',
    'Kode Kegiatan':  'HONOR21',
    'Nilai Kontrak':  totalBruto,
    'Sudah Incl PPN': false,
    'DPP':            totalBruto,
    'Jenis PPh':      'PPh Pasal 21 Final',
    'KAP PPh':        '411121',
    'KJS PPh':        '402',
    'Tarif PPh':      totalBruto > 0 ? (totalPph / totalBruto) : 0,
    'Nilai PPh':      totalPph,
    'Tarif PPN':      0,
    'Nilai PPN':      0,
    'Total Pajak':    totalPph,
    'Nilai Dibayar':  bersih,
    'Sumber Dana':    n['MAK'] || '',
    'Tahun Pajak':    Number(n['Periode Tahun']),
    'Masa Pajak':     Number(n['Periode Bulan']),
    'Operator':       Session.getActiveUser().getEmail() || '',
    'Keterangan':     `Honor Nominatif ${n['ID']}` + (n['No SK'] ? ` — SK ${n['No SK']}` : ''),
  }

  const saved = sheetAppend(CONFIG.SHEETS.RIWAYAT, data, 'TRX')

  // Update nominatif dengan link ke riwayat
  sheetUpdate(CONFIG.SHEETS.HONOR_NOMINATIF, n._rowIndex, { 'Riwayat ID': saved['ID'] })

  Logger.log(`[catatPph21KeRiwayat] Nominatif ${n['ID']} → Riwayat ${saved['ID']}`)
  return saved
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML CETAK NOMINATIF
// ─────────────────────────────────────────────────────────────────────────────

function generateNominatifHTML(payload) {
  let n, detail
  if (payload.id) {
    n = getNominatifById(payload.id)
    detail = n.detail
  } else {
    // Preview: payload sudah berisi data lengkap
    n = normalizeNominatifPreview(payload)
    detail = (payload.detail || []).map((d, idx) => {
      const bruto = Number(d.bruto || 0)
      const h = hitungPph21(bruto, d.golongan, !!d.nonNpwp)
      return {
        no: idx + 1, nama: d.nama, nip: d.nip, jabatan: d.jabatan,
        golongan: d.golongan, bruto, tarifPph: h.tarif, pph: h.pph, bersih: h.bersih,
      }
    })
  }

  const cfg = getSatkerConfig()
  const html = buildNominatifPage(n, detail, cfg)
  return { html }
}

function normalizeNominatifPreview(p) {
  return {
    'No SK':           p.noSk || '',
    'Tgl SK':          p.tglSk || '',
    'Periode Bulan':   Number(p.periodeBulan) || (new Date().getMonth() + 1),
    'Periode Tahun':   Number(p.periodeTahun) || new Date().getFullYear(),
    'Judul':           p.judul || '',
    'Kegiatan':        p.kegiatan || '',
    'MAK':             p.mak || '',
    'Tempat':          p.tempat || '',
    'Tgl Surat':       p.tglSurat || '',
    'PPK Nama':        p.ppkNama || '',
    'PPK NIP':         p.ppkNip || '',
    'Bendahara Nama':  p.bendaharaNama || '',
    'Bendahara NIP':   p.bendaharaNip || '',
    'Total Bruto':     0, 'Total PPh': 0, 'Total Bersih': 0,
  }
}

function buildNominatifPage(n, detail, cfg) {
  const BLN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus',
               'September','Oktober','November','Desember']
  const bulanStr = (BLN[Number(n['Periode Bulan']) - 1] || '').toUpperCase()
  const tahunStr = String(n['Periode Tahun'] || '')

  const totalBruto  = detail.reduce((s, d) => s + Number(d.bruto || 0),  0)
  const totalPph    = detail.reduce((s, d) => s + Number(d.pph   || 0),  0)
  const totalBersih = detail.reduce((s, d) => s + Number(d.bersih|| 0),  0)

  const tglSurat = formatTglIndonesia(n['Tgl Surat'])

  const fmt = (v) => Number(v || 0).toLocaleString('id-ID')

  // Build rows
  const baris = detail.map(d => {
    const tarifLabel = d.tarifPph > 0 ? `${(d.tarifPph * 100).toFixed(0).replace('.','')}%` : '—'
    return `<tr>
      <td class="cell-center">${d.no}</td>
      <td class="cell-left">${escapeHtml(d.nama)}${d.nip ? `<br><span class="nip">NIP: ${escapeHtml(d.nip)}</span>` : ''}</td>
      <td class="cell-left">${escapeHtml(d.jabatan || '')}</td>
      <td class="cell-right">${fmt(d.bruto)}</td>
      <td class="cell-right">${d.pph > 0 ? fmt(d.pph) : ''}</td>
      <td class="cell-right">${fmt(d.bersih)}</td>
    </tr>`
  }).join('')

  const kopLogo = cfg['KOP_LOGO_URL']
    ? `<img src="${cfg['KOP_LOGO_URL']}" class="kop-logo" alt="logo">`
    : `<div class="kop-logo-placeholder"></div>`

  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>Nominatif Honor — ${escapeHtml(n['Judul'] || '')}</title>
<style>
  @page { size: A4; margin: 12mm 15mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; color:#000; font-size:11pt; margin:0; padding:0; }
  .page { width: 180mm; margin: 0 auto; padding: 6mm 0; }

  .kop { display:flex; align-items:center; gap:8mm; border-bottom:3px solid #000; padding-bottom:4mm; margin-bottom:4mm; }
  .kop-logo, .kop-logo-placeholder { width:22mm; height:22mm; flex-shrink:0; }
  .kop-logo-placeholder { border:1px dashed #999; display:flex; align-items:center; justify-content:center; font-size:8pt; color:#999; }
  .kop-logo-placeholder::after { content:'LOGO'; }
  .kop-text { flex:1; text-align:center; line-height:1.25; }
  .kop-text .b1 { font-weight:bold; font-size:13pt; }
  .kop-text .b2, .kop-text .b3 { font-weight:bold; font-size:13pt; }
  .kop-text .b4 { font-weight:bold; font-size:14pt; }
  .kop-text .alamat { font-size:9pt; margin-top:1mm; }

  .judul { text-align:center; font-weight:bold; font-size:12pt; margin: 6mm 0 1mm; text-decoration:underline; }
  .subjudul { text-align:center; font-weight:bold; font-size:11pt; }
  .periode { text-align:center; font-weight:bold; font-size:11pt; text-decoration:underline; margin-bottom:1mm; }
  .sk-info { text-align:center; font-size:10pt; margin-bottom:3mm; }

  table.nominatif { width:100%; border-collapse:collapse; margin-top:3mm; font-size:10.5pt; }
  table.nominatif th, table.nominatif td { border:1px solid #000; padding:3mm 2mm; vertical-align:middle; }
  table.nominatif th { background:#e3f2fd; font-weight:bold; text-align:center; font-size:10pt; }
  table.nominatif .cell-center { text-align:center; }
  table.nominatif .cell-left   { text-align:left; }
  table.nominatif .cell-right  { text-align:right; }
  table.nominatif .col-no    { width:8%; }
  table.nominatif .col-nama  { width:28%; }
  table.nominatif .col-jab   { width:24%; }
  table.nominatif .col-num   { width:13%; }
  table.nominatif .nip       { font-size:9pt; color:#444; }
  table.nominatif .row-num   { background:#f5f5f5; font-style:italic; text-align:center; }
  table.nominatif .row-total { background:#bbdefb; font-weight:bold; }
  table.nominatif .row-total td { text-align:right; }
  table.nominatif .row-total td:first-child { text-align:center; }

  .terbilang { margin-top:4mm; font-size:11pt; }
  .terbilang b { font-style:italic; }

  .ttd { display:flex; justify-content:space-between; margin-top:10mm; font-size:11pt; }
  .ttd-col { width:45%; text-align:center; }
  .ttd-col .jabatan { margin-bottom:18mm; }
  .ttd-col .nama { font-weight:bold; text-decoration:underline; }
  .ttd-col .nip { font-size:10pt; }

  @media print { body { background:#fff; } .no-print { display:none; } }
  .toolbar { padding:8px 12px; background:#1a73e8; color:#fff; text-align:right; }
  .toolbar button { padding:6px 14px; background:#fff; color:#1a73e8; border:none; border-radius:4px; cursor:pointer; font-weight:600; margin-left:6px; }
</style>
</head>
<body>
<div class="toolbar no-print">
  <button onclick="window.print()">🖨️ Cetak</button>
  <button onclick="window.close()">Tutup</button>
</div>

<div class="page">
  <div class="kop">
    ${kopLogo}
    <div class="kop-text">
      <div class="b1">${escapeHtml(cfg['KOP_BARIS_1'] || 'KEMENTERIAN KELAUTAN DAN PERIKANAN')}</div>
      <div class="b2">${escapeHtml(cfg['KOP_BARIS_2'] || '')}</div>
      <div class="b3">${escapeHtml(cfg['KOP_BARIS_3'] || '')}</div>
      <div class="b4">${escapeHtml(cfg['KOP_BARIS_4'] || 'POLITEKNIK KELAUTAN DAN PERIKANAN SORONG')}</div>
      <div class="alamat">${escapeHtml(cfg['KOP_ALAMAT'] || '')}</div>
      <div class="alamat">${escapeHtml(cfg['KOP_KOTAK_POS'] || '')}</div>
      <div class="alamat">E-MAIL : ${escapeHtml(cfg['KOP_SUREL'] || '')} &nbsp; WEBSITE : ${escapeHtml(cfg['KOP_LAMAN'] || '')}</div>
    </div>
  </div>

  <div class="judul">${escapeHtml(n['Judul'] || 'DAFTAR NOMINATIF PENERIMA HONOR')}</div>
  ${n['Kegiatan'] ? `<div class="subjudul">${escapeHtml(n['Kegiatan'])}</div>` : ''}
  <div class="periode">PERIODE BULAN ${bulanStr} ${tahunStr}</div>
  ${n['No SK'] ? `<div class="sk-info">Sesuai SK Nomor: ${escapeHtml(n['No SK'])}${n['Tgl SK'] ? ` tanggal ${formatTglIndonesia(n['Tgl SK'])}` : ''}</div>` : ''}

  <table class="nominatif">
    <thead>
      <tr>
        <th class="col-no" rowspan="2">No.</th>
        <th class="col-nama" rowspan="2">N a m a</th>
        <th class="col-jab" rowspan="2">Jabatan</th>
        <th class="col-num" rowspan="2">Honorarium<br>Perbulan<br>(Rp)</th>
        <th class="col-num">PPh Pasal 21</th>
        <th class="col-num" rowspan="2">Honorarium<br>Bersih<br>(Rp)</th>
      </tr>
      <tr>
        <th style="font-size:9pt;font-weight:normal">Gol IV : 15%<br>Gol III : 5%<br>(Rp)</th>
      </tr>
      <tr class="row-num">
        <td>1</td><td>2</td><td>3</td><td>5</td><td>6</td><td>7</td>
      </tr>
    </thead>
    <tbody>
      ${baris}
      <tr class="row-total">
        <td colspan="3" style="text-align:center">JUMLAH</td>
        <td>${fmt(totalBruto)}</td>
        <td>${fmt(totalPph)}</td>
        <td>${fmt(totalBersih)}</td>
      </tr>
    </tbody>
  </table>

  <div class="terbilang">Terbilang : <b>${terbilangRupiah(totalBersih)}</b></div>

  <div class="ttd">
    <div class="ttd-col">
      <div class="jabatan">Pejabat Pembuat Komitmen,</div>
      <div class="nama">${escapeHtml(n['PPK Nama'] || cfg['NAMA_PPK'] || '')}</div>
      <div class="nip">NIP. ${escapeHtml(n['PPK NIP'] || cfg['NIP_PPK'] || '')}</div>
    </div>
    <div class="ttd-col">
      <div style="text-align:right;margin-bottom:1mm">${escapeHtml(n['Tempat'] || cfg['KOTA'] || 'Sorong')}, ${tglSurat || '...........................'}</div>
      <div class="jabatan">Bendahara Pengeluaran,</div>
      <div class="nama">${escapeHtml(n['Bendahara Nama'] || cfg['NAMA_BENDAHARA'] || '')}</div>
      <div class="nip">NIP. ${escapeHtml(n['Bendahara NIP'] || cfg['NIP_BENDAHARA'] || '')}</div>
    </div>
  </div>
</div>
</body></html>`
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
