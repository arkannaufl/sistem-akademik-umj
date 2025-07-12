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
            $table->json('keahlian')->nullable()->after('kompetensi');
            $table->enum('peran_utama', ['ketua', 'anggota', 'dosen_mengajar','standby'])->nullable()->after('peran_kurikulum');
            $table->string('matkul_ketua_id')->nullable()->after('peran_utama');
            $table->string('matkul_anggota_id')->nullable()->after('matkul_ketua_id');
            $table->string('peran_kurikulum_mengajar')->nullable()->after('matkul_anggota_id');

            $table->foreign('matkul_ketua_id')->references('kode')->on('mata_kuliah')->nullOnDelete();
            $table->foreign('matkul_anggota_id')->references('kode')->on('mata_kuliah')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['matkul_ketua_id']);
            $table->dropForeign(['matkul_anggota_id']);
            $table->dropColumn(['peran_utama', 'matkul_ketua_id', 'matkul_anggota_id', 'peran_kurikulum_mengajar']);
        });
    }
};
