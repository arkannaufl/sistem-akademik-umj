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
        Schema::table('forums', function (Blueprint $table) {
            $table->enum('access_type', ['public', 'private'])->default('public')->after('status');
            $table->json('allowed_users')->nullable()->after('access_type'); // Array of user IDs yang berhak akses
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('forums', function (Blueprint $table) {
            $table->dropColumn(['access_type', 'allowed_users']);
        });
    }
};
