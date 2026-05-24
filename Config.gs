/**
 * Config.gs
 * Konfigurasi pusat Aplikasi Pajak Bendahara — Politeknik KP Sorong
 * Ganti SPREADSHEET_ID dengan ID Google Sheets Anda setelah setup.
 */

const CONFIG = {

  // ── ID Google Sheets (isi setelah buat file baru) ──────────────────────────
  // Cara ambil ID: buka GSheet → salin dari URL:
  // https://docs.google.com/spreadsheets/d/[INI_YANG_DISALIN]/edit
  SPREADSHEET_ID: 'GANTI_DENGAN_ID_SPREADSHEET_ANDA',

  // ── Nama-nama sheet ────────────────────────────────────────────────────────
  SHEETS: {
    RIWAYAT:         'RIWAYAT',          // Log semua transaksi pajak
    MASTER_PENYEDIA: 'MASTER_PENYEDIA',  // Data rekanan / penyedia
    CONFIG_SATKER:   'CONFIG',           // Data satker & bendahara
    REKAP:           'REKAP',            // Sheet rekap otomatis (formula)
    KUITANSI:        'KUITANSI',         // Log kuitansi bukti pembayaran
  },

  // ── Kolom RIWAYAT (0-indexed) ──────────────────────────────────────────────
  COL_RIWAYAT: {
    ID:               0,
    TIMESTAMP:        1,
    TGL_TRANSAKSI:    2,
    NAMA_PENYEDIA:    3,
    NPWP_PENYEDIA:    4,
    STATUS_NPWP:      5,
    JENIS_KEGIATAN:   6,
    KODE_KEGIATAN:    7,
    NILAI_KONTRAK:    8,
    INCL_PPN:         9,   // TRUE/FALSE
    DPP:              10,
    JENIS_PPH:        11,
    KAP_PPH:          12,
    KJS_PPH:          13,
    TARIF_PPH:        14,
    NILAI_PPH:        15,
    TARIF_PPN:        16,
    NILAI_PPN:        17,
    TOTAL_PAJAK:      18,
    NILAI_DIBAYAR:    19,
    SUMBER_DANA:      20,
    TAHUN_PAJAK:      21,
    MASA_PAJAK:       22,
    OPERATOR:         23,  // email user yang input
    KETERANGAN:       24,
  },

  // ── Kolom KUITANSI (0-indexed) ────────────────────────────────────────────
  COL_KUITANSI: {
    ID:                 0,
    TIMESTAMP:          1,
    NO_KUITANSI:        2,
    TAHUN_ANGGARAN:     3,
    TERIMA_DARI:        4,
    UANG_SEJUMLAH:      5,
    TERBILANG:          6,
    UNTUK_PEMBAYARAN:   7,
    BESARNYA_BAYAR:     8,
    NILAI_PPN:          9,
    NILAI_PPH:          10,
    YANG_DITERIMA:      11,
    TEMPAT:             12,
    TGL_KUITANSI:       13,
    PENERIMA_NAMA:      14,
    PPK_NAMA:           15,
    PPK_NIP:            16,
    BENDAHARA_NAMA:     17,
    BENDAHARA_NIP:      18,
    MAK:                19,
    RIWAYAT_ID:         20,
    OPERATOR:           21,
    KETERANGAN:         22,
  },

  // ── Kolom MASTER_PENYEDIA (0-indexed) ─────────────────────────────────────
  COL_PENYEDIA: {
    ID:           0,
    NAMA:         1,
    NPWP:         2,
    STATUS_NPWP:  3,   // BER-NPWP / NON-NPWP
    ALAMAT:       4,
    KOTA:         5,
    NO_TELP:      6,
    EMAIL:        7,
    BANK:         8,
    NO_REKENING:  9,
    ATAS_NAMA:    10,
    KUALIFIKASI:  11,  // untuk kontraktor: Kecil/Menengah/Besar
    AKTIF:        12,  // TRUE/FALSE
    TIMESTAMP:    13,
    UPDATE_AT:    14,
  },

  // ── Timezone ───────────────────────────────────────────────────────────────
  TIMEZONE: 'Asia/Jayapura',  // WIT (UTC+9) — Sorong

  // ── Versi Aplikasi ─────────────────────────────────────────────────────────
  APP_NAME:    'Pajak Bendahara',
  APP_VERSION: '1.1.0',
  SATKER:      'Politeknik Kelautan dan Perikanan Sorong',
}

/**
 * Header baris pertama masing-masing sheet.
 * Digunakan saat inisialisasi/setup sheet baru.
 */
const SHEET_HEADERS = {

  RIWAYAT: [
    'ID', 'Timestamp', 'Tgl Transaksi', 'Nama Penyedia', 'NPWP Penyedia',
    'Status NPWP', 'Jenis Kegiatan', 'Kode Kegiatan', 'Nilai Kontrak',
    'Sudah Incl PPN', 'DPP', 'Jenis PPh', 'KAP PPh', 'KJS PPh',
    'Tarif PPh', 'Nilai PPh', 'Tarif PPN', 'Nilai PPN',
    'Total Pajak', 'Nilai Dibayar', 'Sumber Dana', 'Tahun Pajak',
    'Masa Pajak', 'Operator', 'Keterangan',
  ],

  MASTER_PENYEDIA: [
    'ID', 'Nama', 'NPWP', 'Status NPWP', 'Alamat', 'Kota',
    'No Telp', 'Email', 'Bank', 'No Rekening', 'Atas Nama',
    'Kualifikasi', 'Aktif', 'Timestamp', 'Update At',
  ],

  KUITANSI: [
    'ID', 'Timestamp', 'No Kuitansi', 'Tahun Anggaran',
    'Terima Dari', 'Uang Sejumlah', 'Terbilang', 'Untuk Pembayaran',
    'Besarnya Pembayaran', 'Nilai PPN', 'Nilai PPh', 'Yang Diterima',
    'Tempat', 'Tgl Kuitansi', 'Penerima Nama',
    'PPK Nama', 'PPK NIP', 'Bendahara Nama', 'Bendahara NIP',
    'MAK', 'Riwayat ID', 'Operator', 'Keterangan',
  ],

  CONFIG_SATKER: [
    'Key', 'Value',
  ],
}
