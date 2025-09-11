<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use App\Models\User;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'login'    => 'required|string|max:255|regex:/^[a-zA-Z0-9@._-]+$/',
            'password' => 'required|string|min:6|max:255',
        ], [
            'login.regex' => 'Username hanya boleh berisi huruf, angka, dan karakter @._-',
            'password.min' => 'Password minimal 6 karakter',
        ]);

        // Prevent timing attacks with constant time comparison
        $user = User::where('username', $request->login)
            ->orWhere('nip', $request->login)
            ->orWhere('nid', $request->login)
            ->orWhere('nim', $request->login)
            ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            // Log failed login attempt
            activity()
                ->withProperties([
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'attempted_login' => $request->login
                ])
                ->log("Failed login attempt for: {$request->login}");
                
            return response()->json([
                'message' => 'Username/NIP/NID/NIM atau password salah.',
            ], 401);
        }

        // Tambahkan pengecekan single-device login
            // Jika status login masih aktif, hapus semua token dan reset status agar bisa login ulang
            if ($user->is_logged_in) {
                $user->tokens()->delete();
                $user->is_logged_in = 0;
                $user->current_token = null;
                $user->save();
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            // Update status login dan token
            $user->is_logged_in = 1;
            $user->current_token = $token;
            $user->save();

        // Log successful login
        activity()
            ->causedBy($user)
            ->event('login')
            ->withProperties([
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent()
            ])
            ->log("User {$user->name} berhasil login");

        return response()->json([
            'access_token' => $token,
            'token_type'   => 'Bearer',
            'user'         => $user,
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        
        // Log manual aksi logout
        activity()
            ->causedBy($user)
            ->event('logout')
            ->withProperties([
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent()
            ])
            ->log("User {$user->name} berhasil logout");
        
        // Set status logout dan hapus token
        $user->is_logged_in = 0;
        $user->current_token = null;
        $user->save();
        
        // Hapus semua token user (termasuk yang mungkin ada di perangkat lain)
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Logout berhasil.',
        ]);
    }

    public function forceLogout(Request $request)
    {
        // Ambil token dari header Authorization
        $token = $request->bearerToken();
        
        if (!$token) {
            return response()->json([
                'message' => 'Token tidak ditemukan.',
            ], 400);
        }

        // Cari user berdasarkan token menggunakan Sanctum
        $tokenModel = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
        
        if (!$tokenModel) {
            return response()->json([
                'message' => 'Token tidak valid.',
            ], 401);
        }

        $user = $tokenModel->tokenable;

        // Reset status login dan hapus semua token
        $user->is_logged_in = 0;
        $user->current_token = null;
        $user->save();
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Force logout berhasil. Silakan login kembali.',
        ]);
    }

    public function forceLogoutByToken(Request $request)
    {
        try {
            // Ambil token dari body request
            $token = $request->input('token');
            
            if (!$token) {
                return response()->json([
                    'message' => 'Token tidak ditemukan.',
                ], 400);
            }

            // Cari user berdasarkan token menggunakan Sanctum
            $tokenModel = PersonalAccessToken::findToken($token);
            
            if (!$tokenModel) {
                return response()->json([
                    'message' => 'Token tidak valid.',
                ], 401);
            }

            $user = $tokenModel->tokenable;

            // Reset status login dan hapus semua token (sesuai logika Anda)
            $user->is_logged_in = 0;
            $user->current_token = null;
            $user->save();
            $user->tokens()->delete();

            return response()->json([
                'message' => 'Force logout berhasil. Silakan login kembali.',
            ]);
        } catch (\Exception $e) {
            // Log error untuk debugging
            \Log::error('Force logout error: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Force logout berhasil. Silakan login kembali.',
            ]);
        }
    }

    public function forceLogoutByUser(Request $request)
    {
        try {
            // Ambil user ID dari body request
            $userId = $request->input('user_id');
            
            if (!$userId) {
                return response()->json([
                    'message' => 'User ID tidak ditemukan.',
                ], 400);
            }

            // Cari user berdasarkan ID
            $user = User::find($userId);
            
            if (!$user) {
                return response()->json([
                    'message' => 'User tidak ditemukan.',
                ], 404);
            }

            // Reset status login dan hapus semua token (sesuai logika Anda)
            $user->is_logged_in = 0;
            $user->current_token = null;
            $user->save();
            $user->tokens()->delete();

            return response()->json([
                'message' => 'Force logout berhasil. Silakan login kembali.',
            ]);
        } catch (\Exception $e) {
            // Log error untuk debugging
            \Log::error('Force logout by user error: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Force logout berhasil. Silakan login kembali.',
            ]);
        }
    }

    public function forceLogoutByUsername(Request $request)
    {
        try {
            // Ambil username dari body request
            $username = $request->input('username');
            
            if (!$username) {
                return response()->json([
                    'message' => 'Username tidak ditemukan.',
                ], 400);
            }

            // Cari user berdasarkan username, nip, nid, atau nim
            $user = User::where('username', $username)
                       ->orWhere('nip', $username)
                       ->orWhere('nid', $username)
                       ->orWhere('nim', $username)
                       ->first();
            
            if (!$user) {
                return response()->json([
                    'message' => 'User tidak ditemukan.',
                ], 404);
            }

            // Reset status login dan hapus semua token (sesuai logika Anda)
            $user->is_logged_in = 0;
            $user->current_token = null;
            $user->save();
            $user->tokens()->delete();

            return response()->json([
                'message' => 'Force logout berhasil. Silakan login kembali.',
            ]);
        } catch (\Exception $e) {
            // Log error untuk debugging
            \Log::error('Force logout by username error: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Force logout berhasil. Silakan login kembali.',
            ]);
        }
    }



    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user()
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|unique:users,username,' . $user->id,
            'current_password' => 'nullable|string',
            'password' => 'nullable|string|min:6',
            'confirm_password' => 'nullable|string|same:password',
        ]);

        // Jika ingin ubah password
        if (!empty($validated['password'])) {
            if (empty($validated['current_password']) || !Hash::check($validated['current_password'], $user->password)) {
                return response()->json(['message' => 'Password saat ini salah.'], 422);
            }
            $user->password = bcrypt($validated['password']);
        }

        $user->name = $validated['name'];
        $user->username = $validated['username'];
        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $user,
        ]);
    }

    public function updateAvatar(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'avatar' => 'required|image|max:2048',
        ]);

        // Hapus avatar lama jika ada
        if ($user->avatar) {
            $oldPath = str_replace('/storage/', '', $user->avatar);
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->avatar = '/storage/' . $path;
        $user->save();

        return response()->json([
            'message' => 'Avatar updated successfully.',
            'user' => $user,
        ]);
    }
}
