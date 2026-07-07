<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Drop Spatie tables if they exist
        Schema::dropIfExists('role_has_permissions');
        Schema::dropIfExists('model_has_permissions');
        Schema::dropIfExists('model_has_roles');
        Schema::dropIfExists('permissions');

        // Drop old Spatie roles table
        Schema::dropIfExists('roles');

        // 2. Create clean roles table
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();           // admin, manager, cashier
            $table->string('display_name')->nullable(); // Admin, Manager, Cashier
            $table->timestamps();
        });

        // 3. Seed roles
        DB::table('roles')->insert([
            ['name' => 'admin',   'display_name' => 'Admin',   'created_at' => now(), 'updated_at' => now()],
            ['name' => 'manager', 'display_name' => 'Manager', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'cashier', 'display_name' => 'Cashier', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // 4. Create pivot table
        Schema::create('user_role', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->primary(['user_id', 'role_id']);
        });

        // 5. Migrate user_type → user_role pivot
        $roles = DB::table('roles')->pluck('id', 'name');
        $users = DB::table('users')->get(['id', 'user_type']);
        foreach ($users as $user) {
            $type = $user->user_type ?? 'cashier';
            if (isset($roles[$type])) {
                DB::table('user_role')->insertOrIgnore([
                    'user_id' => $user->id,
                    'role_id' => $roles[$type],
                ]);
            }
        }

        // 6. Drop user_type column
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('user_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_role');
        Schema::dropIfExists('roles');

        Schema::table('users', function (Blueprint $table) {
            $table->enum('user_type', ['admin', 'manager', 'cashier'])->default('cashier')->after('email');
        });
    }
};
