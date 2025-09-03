# Perbaikan Sistem Autentikasi - Single Device Login

## Masalah yang Ditemukan

### 1. Logout Otomatis
- User sering mengalami logout otomatis tanpa alasan yang jelas
- Token tidak divalidasi dengan benar saat setiap request
- Tidak ada pengecekan apakah token masih valid

### 2. Pesan "Akun Sedang Berada di Perangkat Lain"
- Sistem single-device login tidak berfungsi dengan baik
- Tidak ada validasi token aktif saat request
- User bisa login di multiple device tanpa batasan

## Solusi yang Diimplementasikan

### 1. Middleware Validasi Token (`ValidateActiveToken`)

**File:** `backend/app/Http/Middleware/ValidateActiveToken.php`

Middleware ini akan:
- Memvalidasi apakah user masih login (`is_logged_in = true`)
- Mengecek apakah token yang digunakan masih valid (`current_token`)
- Mengembalikan error yang sesuai jika token tidak valid

```php
// Validasi status login
if (!$user->is_logged_in) {
    return response()->json([
        'message' => 'Sesi Anda telah berakhir. Silakan login kembali.',
        'code' => 'SESSION_EXPIRED'
    ], 401);
}

// Validasi token aktif
if ($user->current_token !== $currentToken) {
    return response()->json([
        'message' => 'Akun ini sedang digunakan di perangkat lain.',
        'code' => 'DEVICE_CONFLICT'
    ], 401);
}
```

### 2. Perbaikan AuthController

**File:** `backend/app/Http/Controllers/AuthController.php`

#### Login Process:
- Menambahkan pengecekan single-device login
- Menyimpan token aktif ke database
- Logging untuk audit trail

#### Logout Process:
- Menghapus semua token user (termasuk di perangkat lain)
- Reset status login
- Logging untuk audit trail

#### Force Logout:
- Endpoint baru untuk force logout dari perangkat lain
- Berguna ketika user lupa logout di perangkat lain

### 3. Perbaikan Frontend

**File:** `frontend/src/utils/api.ts`

#### API Interceptor:
- Menangani error 401 dengan kode yang berbeda
- Dispatch event untuk session expired
- Pesan yang lebih informatif

**File:** `frontend/src/pages/AuthPages/SignIn.tsx`

#### Force Logout Modal:
- Modal untuk memberikan opsi force logout
- Retry login otomatis setelah force logout
- UX yang lebih baik

### 4. Middleware Registration

**File:** `backend/bootstrap/app.php`

```php
'validate.token' => \App\Http\Middleware\ValidateActiveToken::class,
```

### 5. Route Protection

**File:** `backend/routes/api.php`

Semua route yang memerlukan autentikasi sekarang menggunakan middleware `validate.token`:

```php
Route::middleware(['auth:sanctum', 'validate.token'])->get('/me', ...);
Route::middleware(['auth:sanctum', 'validate.token'])->post('/logout', ...);
Route::middleware(['auth:sanctum', 'validate.token'])->post('/force-logout', ...);
```

## Cara Kerja Sistem Baru

### 1. Login Process
1. User memasukkan credentials
2. Sistem mengecek apakah user sudah login di perangkat lain
3. Jika sudah, tampilkan modal force logout
4. Jika belum, buat token baru dan simpan ke database
5. Set `is_logged_in = true` dan `current_token = token`

### 2. Request Validation
1. Setiap request ke API yang dilindungi akan melalui middleware `validate.token`
2. Middleware mengecek apakah user masih login
3. Middleware mengecek apakah token masih valid
4. Jika tidak valid, return error dengan kode yang sesuai

### 3. Logout Process
1. User logout manual: hapus token dan reset status
2. Force logout: hapus semua token user
3. Logging untuk audit trail

### 4. Error Handling
- `SESSION_EXPIRED`: Sesi berakhir, redirect ke login
- `DEVICE_CONFLICT`: Akun digunakan di perangkat lain, tampilkan modal force logout

## Keuntungan Solusi Ini

1. **Keamanan**: Mencegah login ganda di multiple device
2. **User Experience**: Pesan error yang jelas dan opsi force logout
3. **Audit Trail**: Logging untuk semua aktivitas login/logout
4. **Konsistensi**: Validasi token di setiap request
5. **Fleksibilitas**: User bisa force logout jika lupa logout di perangkat lain

## Testing

Untuk menguji sistem ini:

1. Login di browser A
2. Coba login di browser B dengan akun yang sama
3. Sistem akan menampilkan pesan "Akun sedang digunakan di perangkat lain"
4. Pilih "Force Logout" untuk logout dari browser A
5. Login di browser B akan berhasil

## Monitoring

Sistem ini juga menyediakan logging untuk monitoring:
- Failed login attempts
- Successful logins
- Manual logouts
- Force logouts
- Session expirations

Semua log dapat dilihat di activity log Laravel.
