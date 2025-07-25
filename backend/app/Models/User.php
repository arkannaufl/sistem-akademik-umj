<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, LogsActivity;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name', 'username', 'email', 'password', 'avatar',
        'nip', 'nid', 'nidn', 'nim', 'gender', 'ipk', 'status', 'angkatan',
        'telp', 'ket', 'role',
        'kompetensi',
        'keahlian',
        'is_logged_in',
        'current_token',
        'semester',
        'matkul_ketua_id', 'matkul_anggota_id', 'peran_kurikulum_mengajar',
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
            'keahlian' => 'array',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogIfAttributesChangedOnly(['password', 'current_token', 'remember_token', 'is_logged_in', 'updated_at'])
            ->setDescriptionForEvent(fn(string $eventName) => "User {$this->name} telah di-{$eventName}");
    }

    public function matkulKetua()
    {
        return $this->belongsTo(MataKuliah::class, 'matkul_ketua_id', 'kode');
    }

    public function matkulAnggota()
    {
        return $this->belongsTo(MataKuliah::class, 'matkul_anggota_id', 'kode');
    }

    public function dosenPeran()
    {
        return $this->hasMany(DosenPeran::class, 'user_id');
    }
}
