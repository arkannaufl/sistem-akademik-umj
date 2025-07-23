<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'login'    => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('username', $request->login)
            ->orWhere('nip', $request->login)
            ->orWhere('nid', $request->login)
            ->orWhere('nim', $request->login)
            ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Username/NIP/NID/NIM atau password salah.',
            ], 401);
        }

        // Tambahkan pengecekan single-device login
        if ($user->is_logged_in) {
            return response()->json([
                'message' => 'Akun ini sudah login di perangkat lain.',
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        // Update status login dan token
        $user->is_logged_in = 1;
        $user->current_token = $token;
        $user->save();

        // Log manual aksi login tanpa perubahan field
        activity()
            ->causedBy($user)
            ->event('login')
            ->withProperties([])
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
        
        // Log manual aksi logout tanpa perubahan field
        activity()
            ->causedBy($user)
            ->event('logout')
            ->withProperties([])
            ->log("User {$user->name} berhasil logout");
        
        // Set status logout dan hapus token
        $user->is_logged_in = 0;
        $user->current_token = null;
        $user->save();
        $user->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout berhasil.',
        ]);
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
