# Panduan Deploy ke Vercel

Aplikasi ini telah dikonfigurasi untuk dapat dideploy ke Vercel. Namun, ada beberapa hal penting yang perlu diperhatikan:

## 1. Environment Variables
Pastikan Anda memasukkan semua variabel lingkungan berikut di dashboard Vercel (Settings > Environment Variables):

### Google Ads API
- `GADS_CLIENT_ID`
- `GADS_CLIENT_SECRET`
- `GADS_REFRESH_TOKEN`
- `GADS_DEVELOPER_TOKEN`
- `GADS_MCC_ID`

### WhatsApp (Fonnte)
- `WA_TOKEN`

### Frontend (Vite)
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_API_KEY`

## 2. Penyimpanan Data (PENTING)
Vercel menggunakan sistem file **Read-Only** dan **Ephemeral**. Artinya:
- File JSON di folder `data/` **tidak akan tersimpan secara permanen**.
- Setiap kali server restart atau dideploy ulang, data user dan kampanye yang disimpan secara lokal akan hilang.

**Rekomendasi:**
Untuk penggunaan produksi di Vercel, Anda sangat disarankan untuk mengubah sistem penyimpanan dari file JSON lokal ke database cloud seperti **Firestore (Firebase)** yang sudah ada di proyek ini.

## 3. Cara Deploy
1. Hubungkan repository GitHub Anda ke Vercel.
2. Vercel akan otomatis mendeteksi file `vercel.json` dan melakukan build.
3. Pastikan "Build Command" adalah `npm run build` dan "Output Directory" adalah `dist`.
