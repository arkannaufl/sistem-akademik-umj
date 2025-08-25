<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('peran_utama', ['koordinator', 'tim_blok', 'dosen_mengajar', 'standby'])->nullable()->after('keahlian');
            $table->string('matkul_ketua_id')->nullable()->after('peran_utama');
            $table->string('matkul_anggota_id')->nullable()->after('matkul_ketua_id');
            $table->text('peran_kurikulum_mengajar')->nullable()->after('matkul_anggota_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['peran_utama', 'matkul_ketua_id', 'matkul_anggota_id', 'peran_kurikulum_mengajar']);
        });
    }
};
