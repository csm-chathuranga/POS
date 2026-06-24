<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Setting;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            'shop_name'          => 'LMUC Convenience Store',
            'shop_address'       => 'No. 1, Main Street, Colombo',
            'shop_phone'         => '0112345678',
            'shop_email'         => 'info@lmucstore.lk',
            'currency'           => 'Rs.',
            'tax_rate'           => '0',
            'receipt_footer'     => "ගෙවීම් සඳහා ස්තූතියි!\nThank you for shopping with us!",
            'ui_language'        => 'si',
            'bill_language'      => 'si',
            'sidebar_theme'      => 'slate',
            'primary_color'      => 'blue',
            'barcode_label_size' => '40x25',
            'barcode_show_price' => '1',
            'logo'               => '',
            'demo_mode'          => '0',
            'printer_name'       => '',
        ];

        foreach ($defaults as $key => $value) {
            Setting::firstOrCreate(['key' => $key], ['value' => $value]);
        }
    }
}
