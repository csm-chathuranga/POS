<?php

/*
|--------------------------------------------------------------------------
| Domain → Database Mapping
|--------------------------------------------------------------------------
|
| SQLite: value must be an absolute file path.
| MySQL:  value is the database name.
|
| Domains not listed here use DB_DATABASE from .env as-is.
|
*/

return [

    'domains' => [
        // Add your live domains below:
        // 'shop1.example.lk' => storage_path('databases/shop1.sqlite'),
        // 'shop2.example.lk' => storage_path('databases/shop2.sqlite'),

        // Default / localhost — uses the main SQLite database
        'localhost' => database_path('database.sqlite'),
        'pos.lumac.lk' => database_path('database.sqlite'),
        'asitha-pos.lumac.lk' => database_path('asitha.sqlite'),

        
add
    ],

];
