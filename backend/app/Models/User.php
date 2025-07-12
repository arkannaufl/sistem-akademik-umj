<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name', 'username', 'email', 'password', 'avatar',
        'nip', 'nid', 'nidn', 'nim', 'gender', 'ipk', 'status', 'angkatan',
        'telp', 'ket', 'role',
        'kompetensi', 'peran_kurikulum',
        'keahlian',
        'is_logged_in',
        'current_token',
        'semester',
        'peran_utama', 'matkul_ketua_id', 'matkul_anggota_id', 'peran_kurikulum_mengajar',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'kompetensi' => 'array',
            'peran_kurikulum' => 'array',
            'keahlian' => 'array',
        ];
    }

    public function matkulKetua()
    {
        return $this->belongsTo(MataKuliah::class, 'matkul_ketua_id', 'kode');
    }

    public function matkulAnggota()
    {
        return $this->belongsTo(MataKuliah::class, 'matkul_anggota_id', 'kode');
    }
}
