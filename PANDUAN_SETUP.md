# Panduan Setup — Aplikasi Pajak Bendahara (Google Apps Script)
**Politeknik Kelautan dan Perikanan Sorong**

---

## Struktur File yang Dibuat

```
PajakBendahara-GAS/
├── Code.gs          ← Entry point: doGet, doPost, onOpen (Sidebar menu)
├── Config.gs        ← Konfigurasi pusat (nama sheet, kolom, dll)
├── SheetHelper.gs   ← Abstraksi CRUD Google Sheets
├── Kalkulator.gs    ← Logika hitung pajak (38 jenis kegiatan)
├── Riwayat.gs       ← CRUD riwayat transaksi pajak
├── Penyedia.gs      ← CRUD master data penyedia/rekanan
├── Dashboard.gs     ← Rekap & agregasi data
└── Setup.gs         ← Inisialisasi sheet, config satker, SSP generator
```

> **Tahap berikutnya:** WebApp.html (UI browser) dan Sidebar.html

---

## Langkah Setup (Urutan Penting)

### 1. Buat Google Sheets baru

1. Buka [sheets.google.com](https://sheets.google.com)
2. Buat spreadsheet baru
3. Salin ID dari URL:
   ```
   https://docs.google.com/spreadsheets/d/[SALIN_INI]/edit
   ```

### 2. Buat Google Apps Script project

1. Di Google Sheets → **Extensions → Apps Script**
2. Project terbuka di tab baru

### 3. Salin semua file `.gs`

Untuk setiap file `.gs`:
1. Klik **+** di panel kiri → pilih **Script**
2. Beri nama sesuai (misal: `Config`, `SheetHelper`, dst.)
3. Hapus semua kode default
4. Paste isi file yang sesuai
5. Klik **💾 Save**

**Urutan pembuatan file (penting):**
```
1. Config.gs
2. SheetHelper.gs
3. Kalkulator.gs
4. Riwayat.gs
5. Penyedia.gs
6. Dashboard.gs
7. Setup.gs
8. Code.gs        ← terakhir (butuh semua file di atas)
```

### 4. Isi SPREADSHEET_ID di Config.gs

Buka `Config.gs`, ganti baris ini:
```javascript
SPREADSHEET_ID: 'GANTI_DENGAN_ID_SPREADSHEET_ANDA',
```
dengan ID yang disalin di langkah 1.

### 5. Jalankan Setup Pertama Kali

1. Di Apps Script, pilih fungsi `initSheets` dari dropdown
2. Klik **▶ Run**
3. Izinkan akses ketika diminta (Google OAuth)
4. Tunggu hingga selesai

Sheet berikut akan otomatis dibuat:
- `RIWAYAT` — log transaksi pajak
- `MASTER_PENYEDIA` — data rekanan
- `CONFIG` — konfigurasi satker (tersembunyi)
- `REKAP` — rekap otomatis

### 6. Deploy sebagai Web App

1. Klik **Deploy → New deployment**
2. Klik ⚙️ → pilih **Web app**
3. Isi pengaturan:
   ```
   Description       : Pajak Bendahara v1.0
   Execute as        : Me (akun Google Anda)
   Who has access    : Anyone with Google account
   ```
4. Klik **Deploy**
5. Salin URL Web App yang diberikan

### 7. Update URL di frontend (WebApp.html & Sidebar.html)

Di file HTML, cari dan ganti:
```javascript
const WEB_APP_URL = 'GANTI_DENGAN_URL_DEPLOYMENT_ANDA'
```

---

## Cara Akses Aplikasi

### Via Sidebar (dari dalam Google Sheets):
1. Buka Google Sheets
2. Menu **🧮 Pajak Bendahara** akan muncul secara otomatis
3. Klik **Buka Kalkulator (Sidebar)**

### Via Web App (browser penuh):
1. Buka URL Web App yang disalin di langkah 6
2. Atau dari menu GSheet → **Buka Web App (Browser)**

---

## Konfigurasi Satker

Edit data satker melalui:
- Web App → menu **⚙️ Pengaturan**
- Atau langsung di sheet `CONFIG` (unhide dulu)

Data yang bisa dikonfigurasi:
| Key | Keterangan |
|-----|-----------|
| `NAMA_SATKER` | Nama lengkap satuan kerja |
| `NPWP_SATKER` | NPWP instansi |
| `ALAMAT_SATKER` | Alamat lengkap |
| `NAMA_BENDAHARA` | Nama bendahara pengeluaran |
| `NIP_BENDAHARA` | NIP bendahara |
| `NAMA_KPA` | Nama Kuasa Pengguna Anggaran |
| `NIP_KPA` | NIP KPA |
| `NAMA_PPK` | Nama PPK |
| `NIP_PPK` | NIP PPK |
| `TAHUN_ANGGARAN` | Tahun anggaran berjalan |

---

## Struktur Sheet RIWAYAT

| Kolom | Keterangan |
|-------|-----------|
| ID | Auto-generate (TRX-yyyyMMddHHmmss-xxx) |
| Timestamp | Waktu input |
| Tgl Transaksi | Tanggal transaksi |
| Nama Penyedia | Nama rekanan |
| NPWP Penyedia | NPWP rekanan |
| Status NPWP | BER-NPWP / NON-NPWP |
| Jenis Kegiatan | Label jenis kegiatan |
| Kode Kegiatan | Kode internal (1-35) |
| Nilai Kontrak | Nilai transaksi |
| Sudah Incl PPN | YA / TIDAK |
| DPP | Dasar Pengenaan Pajak |
| Jenis PPh | PPh Pasal 22 / 23 / Final 4(2) / dll |
| KAP PPh | Kode Akun Pajak PPh |
| KJS PPh | Kode Jenis Setoran PPh |
| Tarif PPh | Tarif efektif (desimal) |
| Nilai PPh | Jumlah PPh dipotong |
| Tarif PPN | Tarif PPN (desimal) |
| Nilai PPN | Jumlah PPN dipungut |
| Total Pajak | PPh + PPN |
| Nilai Dibayar | Nilai ke rekanan setelah potong pajak |
| Sumber Dana | APBN / APBD / Dana Desa |
| Tahun Pajak | Tahun pajak |
| Masa Pajak | Bulan masa pajak |
| Operator | Email penginput |
| Keterangan | Catatan tambahan |

---

## Jenis Kegiatan yang Didukung

### Belanja Barang (Kode 1-11)
- Barang/Modal, Galian, BBM/Listrik/Air, Pelumas, BOS, Sembako, Vaksin, Buku, Pakan, Bibit, Hasil Pertanian

### Jasa (Kode 14-20)
- Jasa umum, Katering, Kesenian, Pengiriman surat/barang, Penyiaran

### Sewa (Kode 21-28)
- Kapal dalam/luar negeri, Pesawat, Kendaraan darat, Tanah/bangunan, Hotel

### Hak atas Tanah & Bangunan (Kode 12-13, 29)
- Pembebasan tanah, Pengalihan hak

### Konstruksi (Kode 30-35)
- Pelaksana (Kecil/Menengah/Besar/Non-Kualifikasi)
- Perencana/Pengawas (Berkualifikasi/Non-Kualifikasi)

---

## Deployment & Re-deployment

Setiap kali ada perubahan kode GAS:
1. Klik **Deploy → Manage deployments**
2. Klik ✏️ Edit pada deployment aktif
3. Pilih **Version: New version**
4. Klik **Deploy**
5. URL tidak berubah — tidak perlu update di mana-mana

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| "Sheet tidak ditemukan" | Jalankan `initSheets()` dari Apps Script |
| "Permission denied" | Re-authorize: Run → Review permissions |
| Sidebar tidak muncul | Refresh Google Sheets, cek onOpen trigger |
| Data tidak tersimpan | Cek Executions log di Apps Script |
| Web App error 500 | Cek Logs di Apps Script → View → Logs |

---

*Dibuat: 2025 | Aplikasi Pajak Bendahara | Politeknik KP Sorong*
