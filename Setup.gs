/**
 * Setup.gs
 * Inisialisasi sheet, config satker, dan SSP generator.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SETUP / INIT SHEETS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inisialisasi semua sheet yang diperlukan.
 * Jalankan SEKALI setelah membuat Google Sheets baru.
 * Aman dijalankan berkali-kali (idempotent).
 */
function initSheets() {
  const ss = getSpreadsheet()
  const hasil = []

  // Daftar sheet yang perlu dibuat
  const sheetsToCreate = [
    { name: CONFIG.SHEETS.RIWAYAT,         headers: SHEET_HEADERS.RIWAYAT },
    { name: CONFIG.SHEETS.MASTER_PENYEDIA, headers: SHEET_HEADERS.MASTER_PENYEDIA },
    { name: CONFIG.SHEETS.CONFIG_SATKER,   headers: SHEET_HEADERS.CONFIG_SATKER },
    { name: CONFIG.SHEETS.KUITANSI,        headers: SHEET_HEADERS.KUITANSI },
    { name: CONFIG.SHEETS.MASTER_PEGAWAI,  headers: SHEET_HEADERS.MASTER_PEGAWAI },
    { name: CONFIG.SHEETS.HONOR_NOMINATIF, headers: SHEET_HEADERS.HONOR_NOMINATIF },
    { name: CONFIG.SHEETS.REKAP,           headers: null },  // sheet ini dikelola program
  ]

  sheetsToCreate.forEach(({ name, headers }) => {
    let sheet = ss.getSheetByName(name)

    if (!sheet) {
      // Buat sheet baru
      sheet = ss.insertSheet(name)
      Logger.log(`[initSheets] Membuat sheet: ${name}`)
      hasil.push(`✅ Sheet "${name}" dibuat`)
    } else {
      Logger.log(`[initSheets] Sheet "${name}" sudah ada`)
      hasil.push(`ℹ️ Sheet "${name}" sudah ada`)
    }

    // Pasang header jika ada
    if (headers && sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      // Format header: bold, background biru, font putih
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#1a73e8')
        .setFontColor('#ffffff')
        .setHorizontalAlignment('center')
      // Freeze baris pertama
      sheet.setFrozenRows(1)
      // Auto-resize kolom
      sheet.autoResizeColumns(1, headers.length)
    }
  })

  // Isi config satker default jika belum ada
  initConfigSatker(ss)

  // Sembunyikan sheet CONFIG agar tidak mengganggu
  const configSheet = ss.getSheetByName(CONFIG.SHEETS.CONFIG_SATKER)
  if (configSheet) configSheet.hideSheet()

  Logger.log('[initSheets] Setup selesai')
  return { ok: true, messages: hasil }
}

/**
 * Isi config satker default jika belum ada data.
 * Jika sheet sudah punya data, hanya tambahkan key yang belum ada
 * (tidak overwrite nilai existing).
 */
function initConfigSatker(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.CONFIG_SATKER)
  if (!sheet) return

  const defaults = [
    ['NAMA_SATKER',      'Politeknik Kelautan dan Perikanan Sorong'],
    ['NPWP_SATKER',      '00.172.581.1-951.000'],
    ['ALAMAT_SATKER',    'Jl. Kapitan Pattimura No. 1, Sorong'],
    ['KOTA',             'Sorong'],
    ['NAMA_BENDAHARA',   'Abdul Rauf M. Saleh'],
    ['NIP_BENDAHARA',    '198309122007011001'],
    ['NAMA_KPA',         'Daniel Heintje Ndahawali, S.Pi., M.Si.'],
    ['NIP_KPA',          '197207172002121003'],
    ['NAMA_PPK',         'Firdaus Dabamona, S.T.'],
    ['NIP_PPK',          '198201032007011002'],
    ['TAHUN_ANGGARAN',   new Date().getFullYear().toString()],
    ['SATUAN_KERJA',     'Poltek KP Sorong'],
    ['KPPN',             'KPPN Sorong'],
    ['KODE_SATKER',      ''],
    // ── Kop Surat Kuitansi ─────────────────────────────────────────────────
    ['KOP_BARIS_1',      'KEMENTERIAN KELAUTAN DAN PERIKANAN'],
    ['KOP_BARIS_2',      'BADAN PENYULUHAN DAN PENGEMBANGAN'],
    ['KOP_BARIS_3',      'SUMBER DAYA MANUSIA KELAUTAN DAN PERIKANAN'],
    ['KOP_BARIS_4',      'POLITEKNIK KELAUTAN DAN PERIKANAN SORONG'],
    ['KOP_ALAMAT',       'JALAN KAPITAN PATTIMURA, TANJUNG KASUARI - SUPRAU'],
    ['KOP_KOTAK_POS',    'KOTAK POS 118 KOTA SORONG, PAPUA BARAT DAYA 98411'],
    ['KOP_LAMAN',        'www.polikpsorong.ac.id'],
    ['KOP_SUREL',        'polteksorong@kkp.go.id'],
    ['KOP_LOGO_URL',     ''],
    // ── Kuitansi default ───────────────────────────────────────────────────
    ['KUITANSI_TERIMA_DARI', 'Pejabat Pembuat Komitmen Politeknik Kelautan dan Perikanan Sorong'],
    ['KUITANSI_MAK',         '1'],
    ['KUITANSI_PREFIX',      'KWT'],
    // ── Honor Nominatif default ────────────────────────────────────────────
    ['HONOR_JUDUL_DEFAULT',  'DAFTAR NOMINATIF PENERIMA HONOR'],
    ['HONOR_SUBJUDUL',       'PENGELOLA KEUANGAN POLITEKNIK KELAUTAN DAN PERIKANAN SORONG'],
  ]

  // Ambil keys existing
  const existingKeys = new Set()
  if (sheet.getLastRow() > 1) {
    const existing = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues()
    existing.forEach(row => {
      if (row[0]) existingKeys.add(String(row[0]).trim())
    })
  }

  // Hanya tambahkan key yang belum ada (preserve nilai existing)
  const toAdd = defaults.filter(([key]) => !existingKeys.has(key))

  if (toAdd.length > 0) {
    const startRow = Math.max(2, sheet.getLastRow() + 1)
    sheet.getRange(startRow, 1, toAdd.length, 2).setValues(toAdd)
    Logger.log(`[initConfigSatker] ${toAdd.length} config baru ditambahkan: ${toAdd.map(r=>r[0]).join(', ')}`)
  } else {
    Logger.log('[initConfigSatker] Tidak ada config baru — semua key sudah ada')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG SATKER (key-value store)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ambil semua config satker sebagai object.
 */
function getSatkerConfig() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.CONFIG_SATKER)
    const data  = sheet.getDataRange().getValues()
    if (data.length < 2) return {}

    const result = {}
    data.slice(1).forEach(row => {
      const key = String(row[0] || '').trim()
      const val = row[1]
      if (key) result[key] = val
    })
    return result
  } catch (_) {
    // Sheet belum dibuat — return default
    return {
      NAMA_SATKER:    CONFIG.SATKER,
      NPWP_SATKER:    '00.172.581.1-951.000',
      ALAMAT_SATKER:  'Jl. Kapitan Pattimura No. 1, Sorong',
      NAMA_PPK:       'Firdaus Dabamona, S.T.',
      NIP_PPK:        '198201032007011002',
    }
  }
}

/**
 * Simpan / update satu atau beberapa config.
 * @param {Object} payload - { KEY: value, ... }
 */
function simpanSatkerConfig(payload) {
  const sheet = getSheet(CONFIG.SHEETS.CONFIG_SATKER)
  const data  = sheet.getDataRange().getValues()

  Object.entries(payload).forEach(([key, value]) => {
    // Cari baris existing
    let found = false
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === key) {
        sheet.getRange(i + 1, 2).setValue(value)
        data[i][1] = value
        found = true
        break
      }
    }
    // Jika tidak ada, tambah baris baru
    if (!found) {
      sheet.appendRow([key, value])
      data.push([key, value])
    }
  })

  Logger.log('[simpanSatkerConfig] Config tersimpan: ' + Object.keys(payload).join(', '))
  return getSatkerConfig()
}

// ─────────────────────────────────────────────────────────────────────────────
// SSP GENERATOR (HTML untuk cetak dari server)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate HTML SSP untuk dicetak.
 * Dipanggil dari frontend via doPost action='ssp.generate'
 *
 * @param {Object} payload
 *   - hasil        : output hitungPajak()
 *   - jenisSSP     : 'PPH' | 'PPN' | 'BOTH'
 *   - namaPenyedia, npwpPenyedia
 *   - tglTransaksi, tahunPajak
 *   - configSatker : optional override
 */
function generateSSP(payload) {
  const { hasil, jenisSSP, namaPenyedia, npwpPenyedia,
          tglTransaksi, tahunPajak } = payload

  const cfg = getSatkerConfig()

  const data = {
    namaSatker:    cfg['NAMA_SATKER']   || CONFIG.SATKER,
    npwpSatker:    cfg['NPWP_SATKER']   || '',
    alamatSatker:  cfg['ALAMAT_SATKER'] || '',
    namaBendahara: cfg['NAMA_BENDAHARA'] || '',
    namaPenyedia:  namaPenyedia || '',
    npwpPenyedia:  npwpPenyedia || '',
    tglTransaksi,
    tahunPajak:    tahunPajak || new Date().getFullYear(),
    hasil,
  }

  // Tentukan bulan dari tglTransaksi
  let bulanIndex = new Date().getMonth() + 1
  if (tglTransaksi) {
    const parts = String(tglTransaksi).split(/[-\/]/)
    if (parts.length >= 2) {
      // Cek format: dd/MM/yyyy atau yyyy-MM-dd
      const candidate = parts.length === 3 && parts[0].length === 4
        ? parseInt(parts[1], 10)   // yyyy-MM-dd
        : parseInt(parts[1], 10)   // dd/MM/yyyy
      if (candidate >= 1 && candidate <= 12) bulanIndex = candidate
    }
  }

  data.bulanIndex = bulanIndex

  const html = buildSSPHtml(data, jenisSSP || 'BOTH')
  return { html }
}

/**
 * Bangun HTML SSP lengkap (4 lembar per jenis).
 */
function buildSSPHtml(d, jenisSSP) {
  const LEMBAR = [
    { no: 1, unt: 'Untuk Arsip Wajib Pajak' },
    { no: 2, unt: 'Untuk KPPN' },
    { no: 3, unt: 'Untuk Dilaporkan ke KPP' },
    { no: 4, unt: 'Untuk Bank Persepsi / Kantor Pos' },
  ]

  let pages = ''

  if (jenisSSP === 'PPH' || jenisSSP === 'BOTH') {
    if (d.hasil.nilaiPph > 0) {
      LEMBAR.forEach(l => { pages += buildSspPage(d, 'PPH', l.no, l.unt) })
    }
  }
  if (jenisSSP === 'PPN' || jenisSSP === 'BOTH') {
    if (d.hasil.nilaiPpn > 0) {
      LEMBAR.forEach(l => { pages += buildSspPage(d, 'PPN', l.no, l.unt) })
    }
  }

  return pages
}

/**
 * Bangun satu lembar SSP.
 */
function buildSspPage(d, jenis, nomorLembar, peruntukan) {
  const isPph     = jenis === 'PPH'
  const jumlah    = isPph ? d.hasil.nilaiPph : d.hasil.nilaiPpn
  const kap       = isPph ? d.hasil.kapPph : '411211'
  const kjs       = isPph ? d.hasil.kjsPph : '910'
  const uraian    = isPph ? d.hasil.uraianPph : d.hasil.uraianPpn
  const terbilang_ = terbilangRupiah(jumlah)
  const tglFmt    = formatTglIndonesia(d.tglTransaksi)

  // NPWP digit-per-digit
  const npwpClean = String(d.npwpSatker || '').replace(/\D/g,'').padEnd(15,'0')
  const npwpHtml  = buildNpwpBoxes(npwpClean)
  const kapHtml   = buildDigitBoxes(kap, 6, '8mm', '7mm')
  const kjsHtml   = buildDigitBoxes(kjs, 3, '8mm', '7mm')
  const masaHtml  = buildMasaBoxes(d.bulanIndex)
  const tahunHtml = buildDigitBoxes(String(d.tahunPajak || new Date().getFullYear()), 4, '7mm', '7mm')

  return `<div class="ssp-page">
  <div class="ssp-header">
    <div class="ssp-left"><b>KEMENTERIAN KEUANGAN R.I.</b><br>DIREKTORAT JENDERAL PAJAK</div>
    <div class="ssp-center"><div class="ssp-title">SURAT SETORAN PAJAK</div><div class="ssp-sub">(SSP)</div></div>
    <div class="ssp-right"><div class="ssp-lembar">${nomorLembar}</div><div>LEMBAR</div><div class="ssp-peruntukan">${peruntukan}</div></div>
  </div>
  <div class="ssp-row"><div class="ssp-key">NPWP</div><div class="ssp-colon">:</div><div class="ssp-val">${npwpHtml}</div></div>
  <div class="ssp-note">Diisi sesuai dengan Nomor Pokok Wajib Pajak yang dimiliki</div>
  <div class="ssp-row"><div class="ssp-key">NAMA WP</div><div class="ssp-colon">:</div><div class="ssp-val ssp-bold">${d.namaSatker}</div></div>
  <div class="ssp-row"><div class="ssp-key">ALAMAT WP</div><div class="ssp-colon">:</div><div class="ssp-val">${d.alamatSatker}</div></div>
  <div class="ssp-row"><div class="ssp-key">NOP</div><div class="ssp-colon">:</div><div class="ssp-val"></div></div>
  <div class="ssp-kap-area">
    <div class="ssp-kap-box"><div class="ssp-kap-label">Kode Akun Pajak</div>${kapHtml}</div>
    <div class="ssp-kap-box"><div class="ssp-kap-label">Kode Jenis Setoran</div>${kjsHtml}</div>
    <div class="ssp-uraian-box"><div class="ssp-uraian-label">Uraian Pembayaran :</div><b>${uraian}</b></div>
  </div>
  <div class="masa-section">
    <div class="masa-header-row">
      <span><b>Masa Pajak</b></span>
      <span style="display:flex;align-items:center;gap:4mm">Tahun Pajak &nbsp; ${tahunHtml}</span>
    </div>
    ${masaHtml}
    <div class="masa-note">Beri tanda silang (X) pada kolom bulan sesuai masa yang berkenaan</div>
  </div>
  <div class="ssp-row"><div class="ssp-key">Nomor Ketetapan</div><div class="ssp-colon">:</div><div class="ssp-val">_______ / _______ / _______ / _______</div></div>
  <div class="jumlah-section">
    <div class="jumlah-label">Jumlah Pembayaran :</div>
    <div class="jumlah-value">Rp ${Math.round(jumlah).toLocaleString('id-ID')}</div>
    <div class="ssp-note">Diisi dengan rupiah penuh</div>
  </div>
  <div class="terbilang-row">Terbilang : ( ${terbilang_} )</div>
  <div class="ttd-area">
    <div class="ttd-box"><div>Diterima oleh Kantor Penerima Pembayaran</div><div style="margin-top:1mm">Tanggal ............................................</div><div class="ttd-line">Cap dan tanda tangan</div></div>
    <div class="ttd-box"><div>Wajib Pajak / Penyetor</div><div style="margin-top:1mm">Sorong, ${tglFmt}</div><div class="ttd-line">${d.namaBendahara || '( Nama Bendahara Pengeluaran )'}</div></div>
  </div>
  <div class="ssp-footer">" Terima kasih Telah Membayar Pajak - Pajak Untuk Pembangunan Bangsa "</div>
  <div class="validasi-box">Ruang Validasi Kantor Penerima Pembayaran</div>
  <div class="ssp-kode">F.2.0.32.01</div>
</div>`
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER SSP
// ─────────────────────────────────────────────────────────────────────────────

function buildNpwpBoxes(clean) {
  const groups = [clean.slice(0,2), clean.slice(2,5), clean.slice(5,8), clean.slice(8,9), clean.slice(9,12), clean.slice(12,15)]
  const seps   = ['.','.','.', '-', '.']
  let html = '<div style="display:flex;align-items:center;gap:1px">'
  groups.forEach((g, gi) => {
    ;[...g].forEach(ch => { html += `<div style="width:7mm;height:6mm;border:1px solid #333;display:flex;align-items:center;justify-content:center;font-weight:bold">${ch}</div>` })
    if (gi < seps.length) html += `<div style="width:3mm;text-align:center;font-weight:bold">${seps[gi]}</div>`
  })
  html += '</div>'
  return html
}

function buildDigitBoxes(str, len, w, h) {
  const padded = String(str || '').padEnd(len, ' ')
  return '<div style="display:flex;gap:1px">' +
    [...padded].map(c => `<div style="width:${w};height:${h};border:1px solid #333;display:flex;align-items:center;justify-content:center;font-size:11pt;font-weight:bold">${c.trim()}</div>`).join('') +
    '</div>'
}

function buildMasaBoxes(bulanAktif) {
  const labels = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']
  let html = '<div style="display:flex;gap:2.5mm;align-items:center;flex-wrap:nowrap">'
  labels.forEach((lbl, i) => {
    const checked = (i + 1) === bulanAktif
    html += `<div style="display:flex;flex-direction:column;align-items:center;gap:0.5mm">
      <span style="font-size:6.5pt">${lbl}</span>
      <div style="width:5.5mm;height:5.5mm;border:1px solid #333;display:flex;align-items:center;justify-content:center;${checked ? 'background:#222;color:#fff' : ''}">${checked ? 'X' : ''}</div>
    </div>`
  })
  html += '</div>'
  return html
}

function formatTglIndonesia(tglStr) {
  const BLN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  if (!tglStr) {
    const d = new Date()
    return `${d.getDate()} ${BLN[d.getMonth()]} ${d.getFullYear()}`
  }
  // Deteksi format: dd/MM/yyyy atau yyyy-MM-dd
  const parts = String(tglStr).split(/[-\/]/)
  let d, m, y
  if (parts[0].length === 4) { [y, m, d] = parts } else { [d, m, y] = parts }
  return `${parseInt(d,10)} ${BLN[parseInt(m,10)-1]} ${y}`
}

function terbilangRupiah(n) {
  const s = terbilangNum(Math.round(n))
  return s.charAt(0).toUpperCase() + s.slice(1) + ' Rupiah'
}

function terbilangNum(n) {
  const SATU = ['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan',
    'sepuluh','sebelas','dua belas','tiga belas','empat belas','lima belas',
    'enam belas','tujuh belas','delapan belas','sembilan belas']
  if (n === 0) return 'nol'
  if (n < 0) return 'minus ' + terbilangNum(-n)
  let r = ''
  if (n >= 1e12) { r += terbilangNum(Math.floor(n/1e12)) + ' triliun '; n %= 1e12 }
  if (n >= 1e9)  { r += terbilangNum(Math.floor(n/1e9)) + ' miliar ';   n %= 1e9  }
  if (n >= 1e6)  { r += terbilangNum(Math.floor(n/1e6)) + ' juta ';     n %= 1e6  }
  if (n >= 1e3)  { r += (Math.floor(n/1e3)===1 ? 'seribu' : terbilangNum(Math.floor(n/1e3))+' ribu') + ' '; n %= 1e3 }
  if (n >= 100)  { r += (Math.floor(n/100)===1 ? 'seratus' : SATU[Math.floor(n/100)]+' ratus') + ' '; n %= 100 }
  if (n > 0)     { r += n < 20 ? SATU[n] : SATU[Math.floor(n/10)]+' puluh'+(n%10 ? ' '+SATU[n%10] : '') }
  return r.trim()
}
