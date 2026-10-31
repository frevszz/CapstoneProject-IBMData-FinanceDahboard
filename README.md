# 💰 Finance Dashboard

Dashboard keuangan pribadi yang modern, interaktif, dan responsif — dibangun dengan HTML, Tailwind CSS, Vanilla JavaScript, dan Chart.js. Tidak memerlukan backend, server, atau framework JavaScript apa pun.

---

## 🎯 Tujuan Proyek

Proyek ini bertujuan untuk:

- Membantu pengguna **mencatat dan memantau pemasukkan serta pengeluaran** secara real-time melalui antarmuka yang intuitif.
- Menyajikan **visualisasi data keuangan** yang informatif agar pengguna dapat memahami pola pengeluaran dan sumber pemasukkan mereka dengan mudah.
- Membuktikan bahwa dashboard analitik yang fungsional dan estetis dapat dibangun **murni dengan teknologi web standar** tanpa dependensi framework berat.

---

## 📋 Ringkasan Proyek

Finance Dashboard adalah aplikasi web satu halaman (*Single Page Application*) yang memungkinkan pengguna untuk:

| Fitur | Keterangan |
|---|---|
| **Input Pemasukkan** | Tambah pemasukkan dengan jumlah, sumber (Bank Transfer / Cash / E-Wallet / Lainnya), dan keterangan |
| **Input Pengeluaran** | Tambah pengeluaran dengan jumlah, kategori (8 pilihan), dan keterangan |
| **KPI Cards** | Tampilan ringkas Total Pemasukkan, Total Pengeluaran, Saldo Saat Ini, dan Total Transaksi |
| **Visualisasi 4 Chart** | Bar bulanan, Doughnut per kategori, Horizontal bar terbesar, Pie metode pembayaran |
| **Daftar Transaksi** | List lengkap dengan ikon +/− berwarna, badge kategori, tanggal, dan tombol hapus |
| **Filter Dinamis** | Filter berdasarkan tipe (pemasukkan/pengeluaran) dan kategori — memperbarui seluruh dashboard tanpa reload |
| **Persistensi Data** | Semua data tersimpan di `localStorage` — tidak hilang saat halaman di-refresh |
| **Toast Notifikasi** | Konfirmasi aksi berhasil/gagal muncul di sudut kanan bawah |

---

## ❗ Problem Statement

Banyak orang kesulitan memantau kondisi keuangan pribadi mereka karena:

1. **Tidak ada pencatatan yang konsisten** — pengeluaran dan pemasukkan tidak dicatat secara terstruktur.
2. **Data tersebar** — catatan keuangan berada di berbagai tempat (notes, buku, spreadsheet) sehingga sulit dianalisis.
3. **Tidak ada visualisasi** — tanpa grafik, sulit mengenali pola seperti kategori pengeluaran terbesar atau metode pembayaran yang paling sering digunakan.
4. **Ketergantungan koneksi internet** — banyak aplikasi keuangan memerlukan akun dan server, padahal untuk pencatatan harian hal itu tidak diperlukan.

**Solusi:** Finance Dashboard menyediakan antarmuka pencatatan keuangan yang berjalan sepenuhnya di browser, menyimpan data secara lokal, dan menyajikan visualisasi langsung tanpa perlu backend atau koneksi internet.

---

## 🗂️ Struktur Proyek

```
finance-dashboard/
│
├── index.html      # Struktur halaman utama (HTML5 semantik + Tailwind CSS)
├── style.css       # Styling tambahan (animasi, chart container, scrollbar)
├── script.js       # Seluruh logika aplikasi (Vanilla JS)
└── README.md       # Dokumentasi proyek ini
```

### Penjelasan Per File

#### `index.html`
Berisi seluruh markup halaman menggunakan **HTML5 semantik** (`<header>`, `<main>`, `<section>`). Styling utama menggunakan **Tailwind CSS via CDN**. Komponen yang tersedia:
- Header dengan logo dan tanggal saat ini
- 4 KPI cards
- Form input pemasukkan dan pengeluaran (side-by-side)
- 4 canvas untuk Chart.js
- Daftar transaksi dengan kontrol filter
- Toast notification element

#### `style.css`
Styling tambahan yang **tidak dapat di-handle oleh Tailwind** secara langsung:
- `.kpi-card` — efek lift saat hover (`translateY`)
- `.chart-container` — tinggi tetap 260px (desktop) / 210px (mobile) agar canvas tidak kolaps
- `.transaction-item` — tombol hapus muncul hanya saat hover
- `@keyframes toastIn / toastOut` — animasi slide toast
- Kustomisasi scrollbar dan penghapusan spin arrow pada `<input type="number">`

#### `script.js`
Logika aplikasi dibagi menjadi **16 seksi** berurutan dengan komentar JSDoc:

| Seksi | Fungsi |
|---|---|
| 1. Constants & State | Definisi konstanta warna, nama bulan, dan state global |
| 2. LocalStorage Helpers | `loadFromStorage()`, `saveToStorage()` |
| 3. Data Helpers | `formatRupiah()`, `formatDate()`, `getYearMonth()`, `generateId()`, `getFilteredTransactions()` |
| 4. KPI Calculations | `calcTotals()` |
| 5. KPI Rendering | `renderKPIs()` |
| 6–7. Chart Helpers & Rendering | `destroyChart()`, `toggleChartEmpty()`, 4 fungsi render chart |
| 8. Transaction List | `renderTransactionList()`, `buildTransactionHTML()`, `escapeHtml()` |
| 9. Filter Dropdown | `rebuildCategoryFilter()` |
| 10. Dashboard Refresh | `refreshDashboard()` — satu fungsi yang memanggil semua render |
| 11. Form Handlers | `handleIncomeSubmit()`, `handleExpenseSubmit()` |
| 12. Delete | `deleteTransaction()`, `clearAllTransactions()` |
| 13. Filter Handlers | `handleFilterTypeChange()`, `handleFilterCategoryChange()` |
| 14. Toast | `showToast()` |
| 15. Header Date | `renderCurrentDate()` |
| 16. Init | `init()` — entry point, dipanggil saat `DOMContentLoaded` |

---

## 📊 Visualisasi Chart

| Chart | Tipe | Data Sumber | Keterangan |
|---|---|---|---|
| Pemasukkan vs Pengeluaran Bulanan | Bar (grouped) | Semua transaksi | Dikelompokkan per bulan secara otomatis |
| Pengeluaran per Kategori | Doughnut | Transaksi pengeluaran (terfilter) | Menampilkan proporsi per kategori |
| Pengeluaran Terbesar | Horizontal Bar | Top 7 pengeluaran (terfilter) | Diurutkan dari terbesar |
| Metode Pembayaran | Pie | Transaksi pemasukkan (terfilter) | Distribusi sumber dana |

> Semua chart mengambil data dari form input pengguna — **tidak ada data dummy**.

---

## 🔧 Teknologi yang Digunakan

| Teknologi | Versi | Peran |
|---|---|---|
| HTML5 | — | Struktur halaman (semantik) |
| [Tailwind CSS](https://tailwindcss.com) | CDN latest | Styling utama (utility-first) |
| [Chart.js](https://www.chartjs.org) | 4.4.0 | Visualisasi data |
| Vanilla JavaScript | ES6+ | Logika aplikasi |
| localStorage API | Browser native | Persistensi data |

---

## 🚀 Cara Menjalankan Proyek

Proyek ini **tidak memerlukan instalasi apa pun**. Cukup ikuti langkah berikut:

### Cara 1 — Buka Langsung di Browser (Paling Mudah)

1. Pastikan ketiga file berada dalam **satu folder yang sama**:
   ```
   finance-dashboard/
   ├── index.html
   ├── style.css
   └── script.js
   ```
2. Klik dua kali pada file `index.html`, atau klik kanan → **Open with** → pilih browser (Chrome / Firefox / Edge).
3. Dashboard langsung berjalan. ✅

> ⚠️ **Catatan:** Beberapa browser memblokir akses `localStorage` ketika file dibuka via protokol `file://`. Jika KPI tidak muncul atau data tidak tersimpan, gunakan Cara 2 di bawah.

---

### Cara 2 — Menggunakan Live Server (Direkomendasikan untuk Development)

Jika Anda menggunakan **Visual Studio Code**:

1. Install ekstensi [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) dari marketplace VS Code.
2. Buka folder proyek di VS Code.
3. Klik kanan pada `index.html` → pilih **"Open with Live Server"**.
4. Browser akan otomatis terbuka di `http://127.0.0.1:5500`. ✅

---

### Cara 3 — Menggunakan Python HTTP Server

Jika Python terinstal di sistem Anda:

```bash
# Python 3
cd finance-dashboard
python -m http.server 8080
```

Kemudian buka browser dan akses: `http://localhost:8080`

---

### Cara 4 — Menggunakan Node.js HTTP Server

Jika Node.js terinstal:

```bash
# Install serve secara global (sekali saja)
npm install -g serve

# Jalankan dari folder proyek
cd finance-dashboard
serve .
```

Kemudian buka URL yang ditampilkan di terminal (biasanya `http://localhost:3000`).

---

## 📝 Catatan Pengembangan

- **Data tersimpan per-browser dan per-origin** — data di Chrome tidak akan muncul di Firefox, dan sebaliknya.
- **Hapus semua data** — gunakan tombol "Hapus Semua" di bagian Daftar Transaksi, atau buka DevTools → Application → Local Storage → hapus key `finance_dashboard_transactions`.
- **Menambahkan kategori baru** — edit opsi `<select id="expenseCategory">` di `index.html` dan tambahkan entri warna badge di konstanta `CATEGORY_COLORS` di `script.js`.
- **Menambahkan sumber pemasukkan baru** — edit opsi `<select id="incomeSource">` di `index.html` dan tambahkan entri di konstanta `SOURCE_DISPLAY_MAP`, `SOURCE_BADGE`, dan `SOURCE_LABEL` di `script.js`.

---

## 📄 Lisensi

Proyek ini dibuat untuk tujuan pembelajaran. Bebas digunakan dan dimodifikasi sesuai kebutuhan.
