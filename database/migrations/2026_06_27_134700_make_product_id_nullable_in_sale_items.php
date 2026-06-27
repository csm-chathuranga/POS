<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Discover the actual FK name (varies per tenant DB) and drop it
        $fks = DB::select("
            SELECT CONSTRAINT_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'sale_items'
              AND COLUMN_NAME = 'product_id'
              AND REFERENCED_TABLE_NAME = 'products'
        ");

        foreach ($fks as $fk) {
            DB::statement("ALTER TABLE sale_items DROP FOREIGN KEY `{$fk->CONSTRAINT_NAME}`");
        }

        DB::statement('ALTER TABLE sale_items MODIFY COLUMN product_id BIGINT UNSIGNED NULL');

        // Re-add with the standard Laravel name
        DB::statement('ALTER TABLE sale_items ADD CONSTRAINT sale_items_product_id_foreign FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE');
    }

    public function down(): void
    {
        $fks = DB::select("
            SELECT CONSTRAINT_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'sale_items'
              AND COLUMN_NAME = 'product_id'
              AND REFERENCED_TABLE_NAME = 'products'
        ");

        foreach ($fks as $fk) {
            DB::statement("ALTER TABLE sale_items DROP FOREIGN KEY `{$fk->CONSTRAINT_NAME}`");
        }

        DB::statement('ALTER TABLE sale_items MODIFY COLUMN product_id BIGINT UNSIGNED NOT NULL');
        DB::statement('ALTER TABLE sale_items ADD CONSTRAINT sale_items_product_id_foreign FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE');
    }
};
