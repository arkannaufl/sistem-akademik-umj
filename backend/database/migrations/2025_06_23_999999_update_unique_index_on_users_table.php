<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            // Drop old unique indexes if they exist
            try { $table->dropUnique('users_email_unique'); } catch (\Exception $e) {}
            try { $table->dropUnique('users_username_unique'); } catch (\Exception $e) {}
            // Add new unique indexes for (email, role) and (username, role)
            $table->unique(['email', 'role']);
            $table->unique(['username', 'role']);
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['email', 'role']);
            $table->dropUnique(['username', 'role']);
            $table->unique('email');
            $table->unique('username');
        });
    }
}; 