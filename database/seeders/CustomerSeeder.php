<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $customers = [
            [
                'name'           => 'Samantha Kumara',
                'phone'          => '0771234567',
                'email'          => 'samantha@gmail.com',
                'address'        => 'No.22, Malabe Road, Kaduwela',
                'credit_limit'   => 5000.00,
                'credit_balance' => 0.00,
                'active'         => true,
            ],
            [
                'name'           => 'Dilini Perera',
                'phone'          => '0712345678',
                'email'          => null,
                'address'        => 'No.4, Station Road, Gampaha',
                'credit_limit'   => 3000.00,
                'credit_balance' => 850.00,
                'active'         => true,
            ],
            [
                'name'           => 'Ruwan Bandara',
                'phone'          => '0779876543',
                'email'          => 'ruwan.bandara@yahoo.com',
                'address'        => 'Weliveriya, Gampaha',
                'credit_limit'   => 10000.00,
                'credit_balance' => 2500.00,
                'active'         => true,
            ],
            [
                'name'           => 'Manel Senanayake',
                'phone'          => '0763456789',
                'email'          => null,
                'address'        => 'No.7, Temple Road, Ja-Ela',
                'credit_limit'   => 2000.00,
                'credit_balance' => 0.00,
                'active'         => true,
            ],
            [
                'name'           => 'Asela Jayasuriya',
                'phone'          => '0756789012',
                'email'          => 'asela.j@gmail.com',
                'address'        => 'No.15, Colombo Road, Negombo',
                'credit_limit'   => 7500.00,
                'credit_balance' => 1200.00,
                'active'         => true,
            ],
            [
                'name'           => 'Kamani Fernando',
                'phone'          => '0775543210',
                'email'          => null,
                'address'        => 'Katana, Gampaha',
                'credit_limit'   => 1500.00,
                'credit_balance' => 0.00,
                'active'         => true,
            ],
            [
                'name'           => 'Pradeep Wijesinghe',
                'phone'          => '0701122334',
                'email'          => 'pradeep@hotmail.com',
                'address'        => 'No.3, New Town, Kurunegala',
                'credit_limit'   => 5000.00,
                'credit_balance' => 3100.00,
                'active'         => true,
            ],
            [
                'name'           => 'Hasini Rathnayake',
                'phone'          => '0718899001',
                'email'          => null,
                'address'        => 'Kelaniya, Colombo',
                'credit_limit'   => 2000.00,
                'credit_balance' => 0.00,
                'active'         => true,
            ],
        ];

        foreach ($customers as $c) {
            DB::table('customers')->insert(array_merge($c, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }
}
