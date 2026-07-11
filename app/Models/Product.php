<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'name',
        'name_si',
        'barcode',
        'sku',
        'description',
        'image',
        'cost_price',
        'selling_price',
        'wholesale_price',
        'stock_qty',
        'alert_qty',
        'unit',
        'active',
        'is_fast_moving',
        'expiry_date',
        'promo_price',
        'promo_start_date',
        'promo_end_date',
    ];

    protected $casts = [
        'cost_price'       => 'decimal:2',
        'selling_price'    => 'decimal:2',
        'wholesale_price'  => 'decimal:2',
        'expiry_date'      => 'date',
        'promo_price'      => 'decimal:2',
        'promo_start_date' => 'date',
        'promo_end_date'   => 'date',
        'active'           => 'boolean',
        'is_fast_moving'   => 'boolean',
    ];

    public function variants()
    {
        return $this->hasMany(ProductVariant::class)->orderBy('id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function saleItems()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function purchaseItems()
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }

    public function scopeLowStock($query)
    {
        return $query->whereColumn('stock_qty', '<=', 'alert_qty');
    }

    public function scopeActive($query)
    {
        return $query->where('active', true);
    }
}
