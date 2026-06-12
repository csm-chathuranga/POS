<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->foreignId('variant_id')->nullable()->after('product_id')
                  ->constrained('product_variants')->nullOnDelete();
        });

        // SQLite stores any numeric value regardless of column affinity,
        // so no ALTER COLUMN needed for decimal qty support.
        if (DB::getDriverName() !== 'sqlite') {
            Schema::table('sale_items', function (Blueprint $table) {
                $table->decimal('qty', 10, 3)->change();
            });
        }
    }

    public function down(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('variant_id');
        });
    }
};
