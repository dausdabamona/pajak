/**
 * Kalkulator.gs
 * Logika perhitungan pajak bendahara pemerintah.
 * PPh 22 / PPh 23 / PPh Final 4(2) / PPh Ps.15 / PPN
 */

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE JENIS KEGIATAN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Master tarif pajak per jenis kegiatan.
 * Struktur: {
 *   pph      : nama jenis PPh
 *   kap      : Kode Akun Pajak PPh
 *   kjs      : Kode Jenis Setoran PPh
 *   tarif    : tarif PPh (desimal, 0.015 = 1.5%)
 *   ppn      : tarif PPN (desimal, 0 = bebas PPN, 0.11 = 11%)
 *   bebasPpn : true jika faktur pajak dicap BEBAS PPN
 *   ket      : keterangan singkat
 * }
 */
const KEGIATAN_PAJAK = {
  // ── Belanja Barang ──────────────────────────────────────────────────────
  '1':  { label:'Barang/Modal (ATK, Meja, Mobil, Kapal, dll)',
          pph:'PPh Pasal 22', kap:'411122', kjs:'910', tarif:0.015, ppn:0.11, bebasPpn:false,
          ket:'PPh 22 1,5%, PPN 11%' },

  '2':  { label:'Barang Tambang/Galian (Pasir, Batu belum dibentuk)',
          pph:'PPh Pasal 22', kap:'411122', kjs:'910', tarif:0.015, ppn:0, bebasPpn:false,
          ket:'PPh 22 1,5%, bebas PPN' },

  '3':  { label:'BBM, Listrik, Air Minum/PDAM, Benda Pos',
          pph:'PPh Pasal 22', kap:'411122', kjs:'910', tarif:0, ppn:0, bebasPpn:false,
          ket:'Bebas PPh dan PPN' },

  '4':  { label:'Pelumas (Oli)',
          pph:'PPh Pasal 22', kap:'411122', kjs:'910', tarif:0, ppn:0.11, bebasPpn:false,
          ket:'Bebas PPh 22, PPN 11%' },

  '5':  { label:'Barang dengan Dana BOS',
          pph:'PPh Pasal 22', kap:'411122', kjs:'910', tarif:0, ppn:0.11, bebasPpn:false,
          ket:'Dana BOS — bebas PPh 22, PPN 11%' },

  '6':  { label:'Sembako (Beras, Sagu, dll belum diolah)',
          pph:'PPh Pasal 22', kap:'411122', kjs:'910', tarif:0.015, ppn:0, bebasPpn:false,
          ket:'PPh 22 1,5%, bebas PPN' },

  '7':  { label:'Vaksin Polio (Pekan Imunisasi Nasional)',
          pph:'PPh Pasal 22', kap:'411122', kjs:'910', tarif:0.015, ppn:0, bebasPpn:true,
          ket:'PPh 22 1,5%, Faktur Pajak dicap BEBAS PPN' },

  '8':  { label:'Buku Pelajaran Umum, Kitab Suci, Buku Agama',
          pph:'PPh Pasal 22', kap:'411122', kjs:'910', tarif:0.015, ppn:0, bebasPpn:true,
          ket:'PPh 22 1,5%, Faktur Pajak dicap BEBAS PPN' },

  '9':  { label:'Pakan Ternak / Ikan',
          pph:'PPh Pasal 22', kap:'411122', kjs:'910', tarif:0.015, ppn:0, bebasPpn:true,
          ket:'PPh 22 1,5%, Faktur Pajak dicap BEBAS PPN' },

  '10': { label:'Bibit / Benih',
          pph:'PPh Pasal 22', kap:'411122', kjs:'910', tarif:0.015, ppn:0, bebasPpn:true,
          ket:'PPh 22 1,5%, Faktur Pajak dicap BEBAS PPN' },

  '11': { label:'Hasil Pertanian (dipetik langsung)',
          pph:'PPh Pasal 22', kap:'411122', kjs:'910', tarif:0.015, ppn:0, bebasPpn:true,
          ket:'PPh 22 1,5%, Faktur Pajak dicap BEBAS PPN' },

  // ── Hak atas Tanah & Bangunan ───────────────────────────────────────────
  '12': { label:'Pembebasan Tanah/Bangunan — Kepentingan Umum (Jalan, Waduk, dll)',
          pph:'PPh Final 4(2)', kap:'411128', kjs:'402', tarif:0, ppn:0, bebasPpn:false,
          ket:'Bebas PPh dan PPN' },

  '13': { label:'Pembebasan Tanah/Bangunan — Bangunan Lainnya',
          pph:'PPh Final 4(2)', kap:'411128', kjs:'402', tarif:0, ppn:0, bebasPpn:false,
          ket:'Bebas PPh dan PPN' },

  // ── Jasa ────────────────────────────────────────────────────────────────
  '14': { label:'Jasa (servis, instalasi, perawatan, dll)',
          pph:'PPh Pasal 23', kap:'411124', kjs:'104', tarif:0.02, ppn:0.11, bebasPpn:false,
          ket:'PPh 23 2%, PPN 11%' },

  '15': { label:'Jasa Makan Minum (Rumah Makan, Katering)',
          pph:'PPh Pasal 23', kap:'411124', kjs:'104', tarif:0.02, ppn:0, bebasPpn:false,
          ket:'PPh 23 2%, bebas PPN' },

  '16': { label:'Jasa Kesenian & Hiburan (kelompok)',
          pph:'PPh Pasal 23', kap:'411124', kjs:'104', tarif:0.02, ppn:0, bebasPpn:false,
          ket:'PPh 23 2%, bebas PPN' },

  '17': { label:'Jasa Pengiriman Surat dengan Perangko',
          pph:'PPh Pasal 23', kap:'411124', kjs:'104', tarif:0.02, ppn:0, bebasPpn:false,
          ket:'PPh 23 2%, bebas PPN' },

  '18': { label:'Jasa Pengiriman Surat tanpa Perangko',
          pph:'PPh Pasal 23', kap:'411124', kjs:'104', tarif:0.02, ppn:0.11, bebasPpn:false,
          ket:'PPh 23 2%, PPN 11%' },

  '19': { label:'Jasa Pengiriman Barang (Ekspedisi)',
          pph:'PPh Pasal 23', kap:'411124', kjs:'104', tarif:0, ppn:0.01, bebasPpn:false,
          ket:'Bebas PPh 23, PPN 1% (khusus ekspedisi)' },

  '20': { label:'Jasa Penyiaran Non-Komersil',
          pph:'PPh Pasal 23', kap:'411124', kjs:'104', tarif:0.02, ppn:0, bebasPpn:false,
          ket:'PPh 23 2%, bebas PPN' },

  // ── Sewa ────────────────────────────────────────────────────────────────
  '21': { label:'Sewa Mobilitas Laut (perusahaan pelayaran dalam negeri)',
          pph:'PPh Final Ps.15', kap:'411128', kjs:'410', tarif:0.012, ppn:0.11, bebasPpn:false,
          ket:'PPh Final Ps.15 1,2%, PPN 11%' },

  '22': { label:'Sewa Mobilitas Udara (penerbangan dalam negeri)',
          pph:'PPh Non Migas Lainnya', kap:'411129', kjs:'101', tarif:0.018, ppn:0, bebasPpn:false,
          ket:'PPh Non Migas 1,8%, bebas PPN' },

  '23': { label:'Sewa Mobilitas Laut & Udara (perusahaan luar negeri)',
          pph:'PPh Final Ps.15', kap:'411128', kjs:'411', tarif:0.026, ppn:0.11, bebasPpn:false,
          ket:'PPh Final Ps.15 2,6%, PPN 11%' },

  '24': { label:'Sewa Mobilitas Darat (kendaraan)',
          pph:'PPh Pasal 23', kap:'411124', kjs:'104', tarif:0.02, ppn:0.11, bebasPpn:false,
          ket:'PPh 23 2%, PPN 11%' },

  '25': { label:'Sewa Mobilitas Laut Lainnya',
          pph:'PPh Pasal 23', kap:'411124', kjs:'104', tarif:0.02, ppn:0.11, bebasPpn:false,
          ket:'PPh 23 2%, PPN 11%' },

  '26': { label:'Sewa Mobilitas Udara Lainnya',
          pph:'PPh Pasal 23', kap:'411124', kjs:'104', tarif:0.02, ppn:0.11, bebasPpn:false,
          ket:'PPh 23 2%, PPN 11%' },

  '27': { label:'Sewa Tanah dan/atau Bangunan (selain Hotel)',
          pph:'PPh Final 4(2)', kap:'411128', kjs:'403', tarif:0.10, ppn:0.11, bebasPpn:false,
          ket:'PPh Final 10%, PPN 11%' },

  '28': { label:'Sewa Tempat di Hotel',
          pph:'PPh Pasal 23', kap:'411124', kjs:'104', tarif:0.02, ppn:0, bebasPpn:false,
          ket:'PPh 23 2%, bebas PPN' },

  '29': { label:'Pengalihan Hak atas Tanah dan/atau Bangunan',
          pph:'PPh Final 4(2)', kap:'411128', kjs:'402', tarif:0.05, ppn:0.11, bebasPpn:false,
          ket:'PPh Final 5%, PPN 11%' },

  // ── Pekerjaan Konstruksi ────────────────────────────────────────────────
  '30': { label:'Pelaksana Konstruksi — Menengah Besar / PT',
          pph:'PPh Final 4(2)', kap:'411128', kjs:'409', tarif:0.0265, ppn:0.11, bebasPpn:false,
          ket:'PPh Final 2,65%, PPN 11%' },

  '31': { label:'Pelaksana Konstruksi — Grade 5/6/7',
          pph:'PPh Final 4(2)', kap:'411128', kjs:'409', tarif:0.0265, ppn:0.11, bebasPpn:false,
          ket:'PPh Final 2,65%, PPN 11%' },

  '32': { label:'Pelaksana Konstruksi — Kualifikasi Kecil (Grade 1/2/3/4, CV)',
          pph:'PPh Final 4(2)', kap:'411128', kjs:'409', tarif:0.0175, ppn:0.11, bebasPpn:false,
          ket:'PPh Final 1,75%, PPN 11%' },

  '33': { label:'Pelaksana Konstruksi — Non Kualifikasi',
          pph:'PPh Final 4(2)', kap:'411128', kjs:'409', tarif:0.04, ppn:0.11, bebasPpn:false,
          ket:'PPh Final 4%, PPN 11%' },

  '34': { label:'Perencana/Pengawas Konstruksi — Berkualifikasi',
          pph:'PPh Final 4(2)', kap:'411128', kjs:'409', tarif:0.04, ppn:0.11, bebasPpn:false,
          ket:'PPh Final 4%, PPN 11%' },

  '35': { label:'Perencana/Pengawas Konstruksi — Non Kualifikasi',
          pph:'PPh Final 4(2)', kap:'411128', kjs:'409', tarif:0.06, ppn:0.11, bebasPpn:false,
          ket:'PPh Final 6%, PPN 11%' },
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNGSI HITUNG PAJAK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ambil data jenis kegiatan berdasarkan kode.
 */
function getJenisKegiatan(kode) {
  const k = KEGIATAN_PAJAK[String(kode)]
  if (!k) throw new Error(`Kode kegiatan "${kode}" tidak ditemukan`)
  return k
}

/**
 * Ambil semua jenis kegiatan (untuk dropdown di frontend).
 */
function getAllJenisKegiatan() {
  return Object.entries(KEGIATAN_PAJAK).map(([kode, data]) => ({
    kode,
    label: data.label,
    pph:   data.pph,
    ket:   data.ket,
  }))
}

/**
 * Hitung pajak berdasarkan input.
 *
 * @param {Object} input
 *   - kodeKegiatan  {string}  kode dari KEGIATAN_PAJAK
 *   - nilaiKontrak  {number}  nilai transaksi
 *   - inclPpn       {boolean} true = nilai sudah termasuk PPN
 *   - statusNpwp    {string}  'BER-NPWP' | 'NON-NPWP'
 *
 * @returns {Object} hasil perhitungan lengkap
 */
function hitungPajak(input) {
  const { kodeKegiatan, nilaiKontrak, inclPpn, statusNpwp } = input

  if (!kodeKegiatan)       throw new Error('Kode kegiatan wajib diisi')
  if (!nilaiKontrak || nilaiKontrak <= 0) throw new Error('Nilai kontrak harus lebih dari 0')

  const k       = getJenisKegiatan(kodeKegiatan)
  const nilai   = Number(nilaiKontrak)
  const ppnRate = k.ppn

  // ── Hitung DPP ─────────────────────────────────────────────────────────
  let dpp
  let nilaiInclPpn

  if (inclPpn) {
    // Nilai sudah termasuk PPN → ekstrak balik
    dpp         = ppnRate > 0 ? nilai / (1 + ppnRate) : nilai
    nilaiInclPpn = nilai
  } else {
    // Nilai belum termasuk PPN
    dpp          = nilai
    nilaiInclPpn = ppnRate > 0 ? nilai * (1 + ppnRate) : nilai
  }

  // ── Tarif PPh (non-NPWP = 2x) ──────────────────────────────────────────
  const isNonNpwp   = String(statusNpwp).toUpperCase().includes('NON')
  let tarifPphEfektif = k.tarif
  if (isNonNpwp && k.tarif > 0) tarifPphEfektif = k.tarif * 2

  // ── Hitung nilai pajak ──────────────────────────────────────────────────
  const nilaiPph    = Math.round(dpp * tarifPphEfektif)
  const nilaiPpn    = Math.round(dpp * ppnRate)
  const totalPajak  = nilaiPph + nilaiPpn
  const nilaiDibayar = Math.round(nilaiInclPpn) - totalPajak

  // ── Buat uraian SSP ─────────────────────────────────────────────────────
  let uraianPph = ''
  if (k.pph.includes('Final 4(2)')) {
    uraianPph = `${k.pph} tarif ${pctStr(k.tarif)} atas ${k.label}`
  } else if (k.pph.includes('Pasal 22')) {
    uraianPph = `PPh Pasal 22 atas pembelian barang oleh Bendahara Pemerintah`
  } else if (k.pph.includes('Pasal 23')) {
    uraianPph = `PPh Pasal 23 atas jasa — ${k.label}`
  } else if (k.pph.includes('Ps.15')) {
    uraianPph = `PPh Final Pasal 15 tarif ${pctStr(k.tarif)} atas ${k.label}`
  } else {
    uraianPph = `${k.pph} atas ${k.label}`
  }

  const uraianPpn = `PPN atas ${k.label}`

  return {
    // Input
    kodeKegiatan,
    labelKegiatan:   k.label,
    nilaiKontrak:    nilai,
    inclPpn:         !!inclPpn,
    statusNpwp,
    isNonNpwp,

    // DPP
    dpp:             Math.round(dpp),
    nilaiInclPpn:    Math.round(nilaiInclPpn),

    // PPh
    jenisPph:        k.pph,
    kapPph:          k.kap,
    kjsPph:          k.kjs,
    tarifPphNormal:  k.tarif,
    tarifPphEfektif,
    nilaiPph,
    uraianPph,

    // PPN
    tarifPpn:        ppnRate,
    nilaiPpn,
    kapPpn:          '411211',
    kjsPpn:          '910',
    bebasPpn:        k.bebasPpn,
    uraianPpn,

    // Total
    totalPajak,
    nilaiDibayar,
    ket:             k.ket,
  }
}

/**
 * Format angka ke persen string (misal: 0.0175 → '1,75%')
 */
function pctStr(n) {
  const pct = (Number(n) * 100)
  const fixed = pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2)
  return fixed.replace('.', ',') + '%'
}

/**
 * Expose ke frontend: hitung + kembalikan hasil.
 * Dipanggil dari WebApp via doPost atau Sidebar via google.script.run.
 */
function hitungPajakServer(input) {
  return hitungPajak(input)
}

/**
 * Expose ke frontend: ambil semua jenis kegiatan untuk dropdown.
 */
function getJenisKegiatanList() {
  return getAllJenisKegiatan()
}
