<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('product_variants')->delete();
        DB::table('products')->delete();
        DB::table('categories')->delete();

        // ── Categories ────────────────────────────────────────────────────────
        $cats = [
            'Rice & Grains'           => 'හාල් සහ ධාන්‍ය',
            'Flour & Baking'          => 'පිටි සහ බේකිං',
            'Sugar & Salt'            => 'සීනි සහ ලුණු',
            'Oils & Fats'             => 'තෙල් සහ මේද',
            'Dhal & Pulses'           => 'දාල් සහ රනිල',
            'Spices & Condiments'     => 'කුළුබඩු සහ සෝස්',
            'Tea & Beverages'         => 'තේ සහ බීම',
            'Biscuits & Snacks'       => 'බිස්කට් සහ ස්නැක්ස්',
            'Canned & Packaged Foods' => 'ටින් සහ ඇසුරුම් ආහාර',
            'Cleaning & Household'    => 'ගෘහස්ත සහ පිරිසිදු',
            'Personal Care'           => 'පෞද්ගලික සත්කාර',
            'Dairy & Eggs'            => 'කිරි සහ බිත්තර',
        ];

        $catIds = [];
        foreach ($cats as $name => $nameSi) {
            $catIds[$name] = DB::table('categories')->insertGetId([
                'name'       => $name,
                'name_si'    => $nameSi,
                'slug'       => Str::slug($name),
                'active'     => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // ── Products WITH variants ─────────────────────────────────────────────
        // Each variant row: [label, cost, selling, wholesale, stock]
        // 'base' => index of the variant to use as the main product price (1kg/1L preferred).
        $withVariants = [

            // Rice & Grains
            [
                'cat' => 'Rice & Grains', 'name' => 'Samba Rice', 'name_si' => 'සම්බා හාල්',
                'sku' => 'RICE-SAM', 'unit' => 'kg', 'base' => 1,
                'v' => [
                    ['500g',  115,  130,  120, 100],
                    ['1kg',   230,  260,  245, 150],
                    ['5kg',  1100, 1250, 1180,  50],
                    ['25kg', 5200, 5800, 5500,  20],
                ],
            ],
            [
                'cat' => 'Rice & Grains', 'name' => 'Nadu Rice', 'name_si' => 'නාඩු හාල්',
                'sku' => 'RICE-NAD', 'unit' => 'kg', 'base' => 0,
                'v' => [
                    ['1kg',   215,  240,  228, 120],
                    ['5kg',  1020, 1150, 1090,  40],
                    ['25kg', 4800, 5400, 5100,  15],
                ],
            ],
            [
                'cat' => 'Rice & Grains', 'name' => 'Keeri Samba Rice', 'name_si' => 'කීරි සම්බා හාල්',
                'sku' => 'RICE-KS', 'unit' => 'kg', 'base' => 0,
                'v' => [
                    ['1kg',   280,  320,  300,  80],
                    ['5kg',  1350, 1550, 1450,  30],
                    ['25kg', 6500, 7200, 6800,  10],
                ],
            ],

            // Flour & Baking
            [
                'cat' => 'Flour & Baking', 'name' => 'Wheat Flour', 'name_si' => 'තිරිඟු පිටි',
                'sku' => 'FLR-WHT', 'unit' => 'kg', 'base' => 1,
                'v' => [
                    ['500g', 120, 140, 130,  80],
                    ['1kg',  235, 270, 255, 120],
                    ['2kg',  465, 530, 500,  60],
                ],
            ],
            [
                'cat' => 'Flour & Baking', 'name' => 'Rice Flour', 'name_si' => 'හාල් පිටි',
                'sku' => 'FLR-RICE', 'unit' => 'kg', 'base' => 1,
                'v' => [
                    ['500g', 100, 115, 108, 60],
                    ['1kg',  195, 225, 210, 80],
                ],
            ],

            // Sugar & Salt
            [
                'cat' => 'Sugar & Salt', 'name' => 'White Sugar', 'name_si' => 'සුදු සීනි',
                'sku' => 'SUG-WHT', 'unit' => 'kg', 'base' => 1,
                'v' => [
                    ['500g',  110,  125,  118, 100],
                    ['1kg',   215,  245,  230, 150],
                    ['5kg',  1050, 1200, 1130,  40],
                ],
            ],

            // Oils & Fats
            [
                'cat' => 'Oils & Fats', 'name' => 'Coconut Oil', 'name_si' => 'පොල් තෙල්',
                'sku' => 'OIL-COC', 'unit' => 'L', 'base' => 1,
                'v' => [
                    ['500ml',  350,  395,  375, 60],
                    ['1L',     690,  780,  740, 80],
                    ['2L',    1350, 1520, 1440, 30],
                ],
            ],
            [
                'cat' => 'Oils & Fats', 'name' => 'Sunflower Oil', 'name_si' => 'සූරියකාන්ත තෙල්',
                'sku' => 'OIL-SUN', 'unit' => 'L', 'base' => 1,
                'v' => [
                    ['500ml',  280,  320,  305, 50],
                    ['1L',     555,  630,  595, 70],
                    ['2L',    1100, 1250, 1180, 25],
                ],
            ],

            // Dhal & Pulses
            [
                'cat' => 'Dhal & Pulses', 'name' => 'Red Lentils', 'name_si' => 'රතු දාල්',
                'sku' => 'DAL-RED', 'unit' => 'kg', 'base' => 2,
                'v' => [
                    ['250g',  85, 100,  92,  80],
                    ['500g', 165, 195, 180, 100],
                    ['1kg',  325, 380, 355,  60],
                ],
            ],
            [
                'cat' => 'Dhal & Pulses', 'name' => 'Green Gram', 'name_si' => 'මුං ඇට',
                'sku' => 'DAL-GRN', 'unit' => 'kg', 'base' => 2,
                'v' => [
                    ['250g',  90, 105,  98, 60],
                    ['500g', 175, 205, 190, 80],
                    ['1kg',  340, 395, 370, 40],
                ],
            ],

            // Spices & Condiments — use 100g as base (most common purchase unit)
            [
                'cat' => 'Spices & Condiments', 'name' => 'Chili Powder', 'name_si' => 'මිරිස් කුඩු',
                'sku' => 'SPC-CHI', 'unit' => 'g', 'base' => 0,
                'v' => [
                    ['100g', 110, 130, 120, 60],
                    ['200g', 215, 250, 235, 80],
                    ['500g', 520, 600, 565, 30],
                ],
            ],
            [
                'cat' => 'Spices & Condiments', 'name' => 'Turmeric Powder', 'name_si' => 'කහ කුඩු',
                'sku' => 'SPC-TUR', 'unit' => 'g', 'base' => 1,
                'v' => [
                    ['50g',   75,  90,  83, 60],
                    ['100g', 145, 170, 158, 80],
                    ['200g', 280, 325, 305, 40],
                ],
            ],

            // Tea & Beverages — use 100g / 1kg as base
            [
                'cat' => 'Tea & Beverages', 'name' => 'Ceylon Black Tea', 'name_si' => 'සිලෝන් කළු තේ',
                'sku' => 'TEA-BLK', 'unit' => 'g', 'base' => 1,
                'v' => [
                    ['50g',  115,  135,  125,  80],
                    ['100g', 225,  260,  245, 100],
                    ['200g', 440,  510,  478,  60],
                    ['400g', 870, 1000,  940,  30],
                ],
            ],
            [
                'cat' => 'Tea & Beverages', 'name' => 'Milo', 'name_si' => 'මිලෝ',
                'sku' => 'BEV-MLO', 'unit' => 'g', 'base' => 2,
                'v' => [
                    ['200g',  290,  330,  315, 60],
                    ['400g',  570,  650,  615, 80],
                    ['1kg',  1380, 1580, 1490, 30],
                ],
            ],

            // Dairy & Eggs
            [
                'cat' => 'Dairy & Eggs', 'name' => 'Milk Powder', 'name_si' => 'කිරිපිටි',
                'sku' => 'MILK-PWD', 'unit' => 'kg', 'base' => 2,
                'v' => [
                    ['200g',  420,  480,  455, 60],
                    ['400g',  820,  940,  890, 50],
                    ['1kg',  2000, 2280, 2150, 30],
                ],
            ],

            // Cleaning & Household
            [
                'cat' => 'Cleaning & Household', 'name' => 'Washing Powder', 'name_si' => 'රෙදි සෝදන කුඩු',
                'sku' => 'CLN-WSH', 'unit' => 'kg', 'base' => 2,
                'v' => [
                    ['200g',  85, 100,  93,  80],
                    ['500g', 195, 225, 212, 100],
                    ['1kg',  380, 440, 415,  50],
                ],
            ],
            [
                'cat' => 'Cleaning & Household', 'name' => 'Toilet Paper', 'name_si' => 'වැසිකිළි කඩදාසි',
                'sku' => 'HH-TP', 'unit' => 'roll', 'base' => 0,
                'v' => [
                    ['4 Rolls',  195, 230, 215, 60],
                    ['8 Rolls',  380, 450, 420, 40],
                    ['12 Rolls', 560, 650, 615, 25],
                ],
            ],
            [
                'cat' => 'Cleaning & Household', 'name' => 'Tissue Paper', 'name_si' => 'ටිෂ්යූ කඩදාසි',
                'sku' => 'HH-TIS', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['100 Sheets',  85, 100,  93, 80],
                    ['200 Sheets', 165, 195, 182, 60],
                ],
            ],

            // Personal Care
            [
                'cat' => 'Personal Care', 'name' => 'Shampoo', 'name_si' => 'ශෑම්පූ',
                'sku' => 'PC-SHP', 'unit' => 'ml', 'base' => 1,
                'v' => [
                    ['80ml',  145, 170, 158, 60],
                    ['200ml', 340, 390, 368, 80],
                    ['400ml', 650, 750, 705, 40],
                ],
            ],
            [
                'cat' => 'Personal Care', 'name' => 'Bath Soap', 'name_si' => 'ස්නාන සාබන්',
                'sku' => 'PC-SOAP', 'unit' => 'g', 'base' => 1,
                'v' => [
                    ['75g',   75,  90,  83, 100],
                    ['100g',  98, 115, 107, 120],
                    ['150g', 145, 170, 158,  80],
                ],
            ],

            // Biscuits & Snacks
            [
                'cat' => 'Biscuits & Snacks', 'name' => 'Noodles', 'name_si' => 'නූඩ්ල්ස්',
                'sku' => 'SNK-NOD', 'unit' => 'g', 'base' => 0,
                'v' => [
                    ['100g',  75,  90,  83, 100],
                    ['400g', 280, 330, 310,  60],
                ],
            ],
        ];

        foreach ($withVariants as $p) {
            $base      = $p['v'][$p['base']];
            $baseCost  = $base[1];
            $basePrice = $base[2];
            $baseWs    = $base[3];
            $baseStock = $base[4];

            $pid = DB::table('products')->insertGetId([
                'category_id'     => $catIds[$p['cat']],
                'name'            => $p['name'],
                'name_si'         => $p['name_si'],
                'sku'             => $p['sku'],
                'unit'            => $p['unit'],
                'cost_price'      => $baseCost,
                'selling_price'   => $basePrice,
                'wholesale_price' => $baseWs,
                'stock_qty'       => $baseStock,
                'alert_qty'       => 5,
                'active'          => true,
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);

            foreach ($p['v'] as [$label, $cost, $price, $ws, $stock]) {
                DB::table('product_variants')->insert([
                    'product_id'      => $pid,
                    'label'           => $label,
                    'barcode'         => null,
                    'cost_price'      => $cost,
                    'selling_price'   => $price,
                    'wholesale_price' => $ws,
                    'stock_qty'       => $stock,
                    'alert_qty'       => 10,
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ]);
            }
        }

        // ── Simple products (no variants) ─────────────────────────────────────
        // [cat, name, name_si, cost, selling, wholesale, stock, unit, sku]
        $simple = [

            // Rice & Grains (6)
            ['Rice & Grains', 'Red Raw Rice',        'රතු හාල්',             190, 215, 203, 80,  'kg',  'RICE-RED'],
            ['Rice & Grains', 'Broken Rice',         'කුඩා හාල්',             145, 165, 155, 60,  'kg',  'RICE-BRK'],
            ['Rice & Grains', 'Basmati Rice (1kg)',  'බාස්මති හාල්',          420, 480, 455, 30,  'kg',  'RICE-BAS'],
            ['Rice & Grains', 'Oats (500g)',         'ඕට්ස්',               165, 195, 182, 50,  'g',   'GRN-OAT'],
            ['Rice & Grains', 'Semolina (1kg)',      'සෙමොලිනා',             120, 140, 132, 60,  'kg',  'GRN-SEM'],
            ['Rice & Grains', 'Corn (1kg)',          'බඩ ඉරිඟු',              95, 110, 103, 50,  'kg',  'GRN-CRN'],

            // Flour & Baking (4)
            ['Flour & Baking', 'Kurakkan Flour (500g)', 'කුරකම් පිටි',       130, 155, 143, 30,  'g',   'FLR-KRK'],
            ['Flour & Baking', 'Corn Flour (250g)',  'ඉරිඟු පිටි',           145, 170, 158, 40,  'g',   'FLR-CRN'],
            ['Flour & Baking', 'Baking Powder',      'බේකිං පවුඩර්',           85, 100,  93, 40,  'g',   'BKG-PWD'],
            ['Flour & Baking', 'Dried Yeast',        'වියළි යීස්ට්',           65,  80,  73, 30,  'g',   'BKG-YST'],

            // Sugar & Salt (4)
            ['Sugar & Salt', 'Brown Sugar (1kg)',    'දුඹුරු සීනි',            130, 155, 143, 60,  'kg',  'SUG-BRN'],
            ['Sugar & Salt', 'Jaggery (500g)',       'හකුරු',                 190, 225, 210, 40,  'kg',  'SUG-JGR'],
            ['Sugar & Salt', 'Iodised Salt (1kg)',   'අයොඩීකෘත ලුණු',          70,  85,  78, 100, 'kg',  'SLT-IOD'],
            ['Sugar & Salt', 'Rock Salt (1kg)',      'ගල් ලුණු',               55,  65,  60, 80,  'kg',  'SLT-RCK'],

            // Oils & Fats (3)
            ['Oils & Fats', 'Butter (100g)',         'බටර්',                  290, 340, 318, 40,  'g',   'FAT-BTR'],
            ['Oils & Fats', 'Margarine (250g)',      'මාගරීන්',               180, 215, 200, 40,  'g',   'FAT-MRG'],
            ['Oils & Fats', 'Ghee (200g)',           'ගී',                    550, 630, 595, 25,  'g',   'FAT-GHE'],

            // Dhal & Pulses (4)
            ['Dhal & Pulses', 'Chickpeas (500g)',    'කඩල',                   195, 225, 212, 50,  'kg',  'PUL-CHK'],
            ['Dhal & Pulses', 'Black Gram (500g)',   'උඳු',                   310, 360, 338, 40,  'kg',  'PUL-BLK'],
            ['Dhal & Pulses', 'Cowpea (500g)',       'කව්පි',                 260, 300, 282, 40,  'kg',  'PUL-CWP'],
            ['Dhal & Pulses', 'Soya Meat (200g)',    'සෝයා මස්',              145, 170, 158, 60,  'g',   'PUL-SOY'],

            // Spices & Condiments (13)
            ['Spices & Condiments', 'Black Pepper (100g)',  'ගම්මිරිස්',       280, 325, 305, 40, 'g',   'SPC-BPP'],
            ['Spices & Condiments', 'Cinnamon (50g)',       'කුරුඳු',           195, 230, 215, 40, 'g',   'SPC-CIN'],
            ['Spices & Condiments', 'Cardamom (25g)',       'එනසාල්',           380, 445, 415, 25, 'g',   'SPC-CAR'],
            ['Spices & Condiments', 'Cloves (25g)',         'කරාබු නැටි',       420, 490, 458, 20, 'g',   'SPC-CLV'],
            ['Spices & Condiments', 'Curry Powder (100g)', 'කරි කුඩු',         165, 195, 182, 60, 'g',   'SPC-CRP'],
            ['Spices & Condiments', 'Mustard Seeds (100g)','අබ ඇට',            145, 170, 158, 40, 'g',   'SPC-MST'],
            ['Spices & Condiments', 'Fenugreek (100g)',    'උළු හාල්',          120, 145, 133, 40, 'g',   'SPC-FEN'],
            ['Spices & Condiments', 'Goraka (100g)',       'ගොරකා',             165, 195, 182, 30, 'g',   'SPC-GRK'],
            ['Spices & Condiments', 'Maldive Fish (100g)', 'උම්බලකඩ',           280, 325, 305, 40, 'g',   'SPC-MLF'],
            ['Spices & Condiments', 'Tomato Sauce (350g)', 'ටොමැටෝ සෝස්',      125, 150, 138, 60, 'ml',  'SPC-TMS'],
            ['Spices & Condiments', 'Soy Sauce (300ml)',   'සෝයා සෝස්',        145, 175, 162, 50, 'ml',  'SPC-SOY'],
            ['Spices & Condiments', 'Vinegar (350ml)',     'විනාකිරි',            80,  95,  88, 50, 'ml',  'SPC-VNR'],
            ['Spices & Condiments', 'Dried Chili (50g)',   'වියළි මිරිස්',       95, 115, 105, 40, 'g',   'SPC-DRC'],

            // Tea & Beverages (5)
            ['Tea & Beverages', 'Green Tea (25 bags)',     'කොළ තේ',           280, 330, 308, 40, 'pcs', 'TEA-GRN'],
            ['Tea & Beverages', 'Coffee Powder (100g)',    'කෝපි කුඩු',         320, 380, 355, 40, 'g',   'BEV-COF'],
            ['Tea & Beverages', 'Horlicks (200g)',         'හෝලිකිස්',          285, 330, 310, 40, 'g',   'BEV-HOR'],
            ['Tea & Beverages', 'Ovaltine (200g)',         'ඕවල්ටීන්',          295, 345, 323, 35, 'g',   'BEV-OVL'],
            ['Tea & Beverages', 'Coconut Milk Can (400ml)','ටින් පොල් කිරි',   145, 170, 158, 60, 'pcs', 'BEV-CMK'],

            // Biscuits & Snacks (10)
            ['Biscuits & Snacks', 'Cream Crackers',       'ක්‍රීම් ක්‍රැකර්',  115, 135, 125, 80, 'g',   'BSC-CRC'],
            ['Biscuits & Snacks', 'Marie Biscuits',       'මේරි බිස්කට්',       95, 115, 105, 80, 'g',   'BSC-MAR'],
            ['Biscuits & Snacks', 'Chocolate Biscuits',   'චොකලට් බිස්කට්',    125, 150, 138, 80, 'g',   'BSC-CHO'],
            ['Biscuits & Snacks', 'Potato Chips (50g)',   'අල චිප්ස්',           55,  70,  63, 100,'g',   'SNK-CHP'],
            ['Biscuits & Snacks', 'Murukku (100g)',       'මූරුක්කු',             80, 100,  90, 60, 'g',   'SNK-MRK'],
            ['Biscuits & Snacks', 'Peanuts (100g)',       'රටකජු',              130, 155, 143, 60, 'g',   'SNK-PNT'],
            ['Biscuits & Snacks', 'Cashew Nuts (100g)',   'කජු',               380, 445, 415, 30, 'g',   'SNK-CSH'],
            ['Biscuits & Snacks', 'Pasta (400g)',         'පාස්තා',             145, 170, 158, 50, 'g',   'SNK-PST'],
            ['Biscuits & Snacks', 'Chocolate Bar',        'චොකලට් බාර්',         95, 120, 108, 60, 'pcs', 'SNK-CHB'],
            ['Biscuits & Snacks', 'Bread (400g)',         'පාන්',               120, 145, 133, 30, 'pcs', 'SNK-BRD'],

            // Canned & Packaged Foods (7)
            ['Canned & Packaged Foods', 'Canned Mackerel',        'ටින් කෙදිරිය',      195, 230, 215, 60, 'pcs', 'CAN-MCK'],
            ['Canned & Packaged Foods', 'Canned Sardines',        'ටින් ළා ඉස්සෝ',     165, 195, 182, 60, 'pcs', 'CAN-SRD'],
            ['Canned & Packaged Foods', 'Canned Tuna',            'ටින් කළාමිනා',      225, 265, 248, 50, 'pcs', 'CAN-TNA'],
            ['Canned & Packaged Foods', 'Tomato Paste (200g)',    'ටොමැටෝ ලේ',         115, 140, 128, 60, 'pcs', 'CAN-TMP'],
            ['Canned & Packaged Foods', 'Desiccated Coconut (200g)', 'කෝමළ',           95, 115, 105, 50, 'g',   'PKG-DCN'],
            ['Canned & Packaged Foods', 'Dried Fish Karawala (250g)', 'කරවල',          380, 450, 418, 30, 'g',   'PKG-DRF'],
            ['Canned & Packaged Foods', 'Kithul Treacle (500ml)', 'කිතුල් පැනි',        320, 380, 355, 25, 'ml',  'PKG-KTR'],

            // Cleaning & Household (10)
            ['Cleaning & Household', 'Dish Soap (500ml)',       'ඩිෂ් සෝප්',           125, 150, 138, 60, 'ml',  'CLN-DSP'],
            ['Cleaning & Household', 'Floor Cleaner (500ml)',   'බිම් ශෝදකය',          195, 230, 215, 40, 'ml',  'CLN-FLR'],
            ['Cleaning & Household', 'Bleach (500ml)',          'ජල',                   95, 115, 105, 50, 'ml',  'CLN-BLC'],
            ['Cleaning & Household', 'Washing Soap Bar',        'රෙදි සෝදන සාබන්',      65,  80,  73, 80, 'pcs', 'CLN-WSB'],
            ['Cleaning & Household', 'Mosquito Coil (10pcs)',   'මදුරු දූම්',            65,  80,  73, 80, 'pcs', 'HH-MOS'],
            ['Cleaning & Household', 'Matches (10 boxes)',      'ගිනිකූරු',              35,  45,  40, 100,'pcs', 'HH-MTH'],
            ['Cleaning & Household', 'Candles (4pcs)',          'ඉටිපන්දම්',             65,  80,  73, 60, 'pcs', 'HH-CND'],
            ['Cleaning & Household', 'Batteries AA (2pcs)',     'AA බැටරි',              75,  95,  85, 60, 'pcs', 'HH-BAT'],
            ['Cleaning & Household', 'Garbage Bags (20pcs)',    'කසල බෑග්',              85, 105,  95, 60, 'pcs', 'HH-GRB'],
            ['Cleaning & Household', 'Broom',                  'ගෙදර අමුණ',            195, 240, 220, 20, 'pcs', 'HH-BRM'],

            // Personal Care (10)
            ['Personal Care', 'Toothpaste (100g)',       'දත් ක්‍රීම්',            145, 170, 158, 60, 'g',   'PC-TP'],
            ['Personal Care', 'Toothbrush',              'දත් බ්‍රෂ්',             75,  95,  85, 60, 'pcs', 'PC-TB'],
            ['Personal Care', 'Hair Oil (100ml)',        'හිස් තෙල්',             145, 175, 162, 40, 'ml',  'PC-HOL'],
            ['Personal Care', 'Body Lotion (200ml)',     'ශරීර ලෝෂන්',           195, 230, 215, 40, 'ml',  'PC-BDL'],
            ['Personal Care', 'Deodorant (150ml)',       'දේහ ගඳකාරය',           245, 290, 270, 30, 'ml',  'PC-DEO'],
            ['Personal Care', 'Face Wash (100ml)',       'මුහුණ සෝදා',            195, 230, 215, 30, 'ml',  'PC-FWS'],
            ['Personal Care', 'Sanitary Pads (10pcs)',  'සනීපාරක්ෂක',            165, 195, 182, 40, 'pcs', 'PC-SPN'],
            ['Personal Care', 'Razor (3pcs)',            'රේසරය',                  65,  85,  75, 40, 'pcs', 'PC-RZR'],
            ['Personal Care', 'Baby Diapers (10pcs)',   'බේබි ඩයපර්',            380, 450, 418, 30, 'pcs', 'PC-DPR'],
            ['Personal Care', 'Cotton Buds (100pcs)',   'කොටන් බඩ්ස්',            75,  95,  85, 40, 'pcs', 'PC-CTB'],

            // Dairy & Eggs (6)
            ['Dairy & Eggs', 'Eggs (10pcs)',             'බිත්තර (10)',           330, 380, 358, 50, 'pcs', 'DAI-EGG'],
            ['Dairy & Eggs', 'Fresh Milk (1L)',          'නැවුම් කිරි',           195, 230, 215, 40, 'L',   'DAI-MLK'],
            ['Dairy & Eggs', 'Yogurt Plain (400ml)',     'සාදාරණ යෝගට්',          85, 105,  95, 30, 'pcs', 'DAI-YGT'],
            ['Dairy & Eggs', 'Cheese Slices (10pcs)',   'චීස් පෙත්ත',             95, 115, 105, 25, 'pcs', 'DAI-CHS'],
            ['Dairy & Eggs', 'Condensed Milk (397g)',   'ඝණ කිරි',               145, 175, 162, 40, 'pcs', 'DAI-CNM'],
            ['Dairy & Eggs', 'Curd (500ml)',             'මෙනිකේ',               165, 200, 185, 30, 'pcs', 'DAI-CRD'],
        ];

        foreach ($simple as [$cat, $name, $nameSi, $cost, $price, $ws, $stock, $unit, $sku]) {
            DB::table('products')->insert([
                'category_id'     => $catIds[$cat],
                'name'            => $name,
                'name_si'         => $nameSi,
                'sku'             => $sku,
                'unit'            => $unit,
                'cost_price'      => $cost,
                'selling_price'   => $price,
                'wholesale_price' => $ws,
                'stock_qty'       => $stock,
                'alert_qty'       => 10,
                'active'          => true,
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        }
    }
}
