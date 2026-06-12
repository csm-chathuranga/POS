<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id',
        'label',
        'barcode',
        'cost_price',
        'selling_price',
        'wholesale_price',
        'stock_qty',
        'alert_qty',
    ];

    protected $casts = [
        'cost_price'      => 'decimal:2',
        'selling_price'   => 'decimal:2',
        'wholesale_price' => 'decimal:2',
        'stock_qty'       => 'decimal:3',
        'alert_qty'       => 'decimal:3',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
