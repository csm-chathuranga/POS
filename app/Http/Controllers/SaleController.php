<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SaleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Default date_from to today when no filters supplied at all
        $dateFrom = $request->filled('date_from')
            ? $request->date_from
            : ($request->hasAny(['search', 'date_from', 'date_to']) ? null : now()->toDateString());
        $dateTo   = $request->filled('date_to') ? $request->date_to : null;

        $query = Sale::with(['user', 'customer'])
            ->where('status', '!=', 'held');

        if ($request->filled('search')) {
            $query->where('invoice_no', 'like', '%' . $request->search . '%');
        }

        if ($dateFrom) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        $sales = $query->latest()->paginate(20)->withQueryString();

        $grandTotal = (clone $query)->sum('total');

        return Inertia::render('Sales/Index', [
            'sales'      => $sales,
            'grandTotal' => (float) $grandTotal,
            'filters'    => [
                'search'    => $request->search ?? '',
                'date_from' => $dateFrom ?? '',
                'date_to'   => $dateTo ?? '',
            ],
        ])->with(['flash' => session('flash')]);
    }

    /**
     * Show the form for creating a new resource (POS billing screen).
     */
    public function create()
    {
        $customers = Customer::where('active', true)->orderBy('name')->get();

        // Top 24 popular products by sales qty; fall back to newest if no sales yet
        $popularIds = SaleItem::select('product_id', DB::raw('SUM(qty) as total_sold'))
            ->groupBy('product_id')
            ->orderByDesc('total_sold')
            ->limit(24)
            ->pluck('product_id');

        $popularProducts = Product::where('active', true)
            ->where('stock_qty', '>', 0)
            ->when($popularIds->isNotEmpty(), fn ($q) => $q->whereIn('id', $popularIds))
            ->when($popularIds->isEmpty(),    fn ($q) => $q->orderByDesc('created_at'))
            ->limit(24)
            ->with('variants')
            ->get()
            ->when($popularIds->isNotEmpty(), fn ($col) => $col->sortBy(
                fn ($p) => $popularIds->search($p->id)
            ))
            ->map(fn ($p) => [
                'id'              => $p->id,
                'name'            => $p->name,
                'name_si'         => $p->name_si,
                'barcode'         => $p->barcode,
                'selling_price'   => (float) $p->selling_price,
                'wholesale_price' => (float) $p->wholesale_price,
                'stock_qty'       => (float) $p->stock_qty,
                'unit'            => $p->unit ?? 'pcs',
                'sizes'           => $p->variants->map(fn ($v) => [
                    'id'                => $v->id,
                    'label'             => $v->label,
                    'price'             => (float) $v->selling_price,
                    'conversion_factor' => (float) ($v->conversion_factor ?? 1),
                ])->values()->all(),
            ])
            ->values()
            ->all();

        $fastMovingProducts = Product::where('active', true)
            ->where('is_fast_moving', true)
            ->with('variants')
            ->get()
            ->map(fn ($p) => [
                'id'              => $p->id,
                'name'            => $p->name,
                'name_si'         => $p->name_si,
                'barcode'         => $p->barcode,
                'selling_price'   => (float) $p->selling_price,
                'wholesale_price' => (float) $p->wholesale_price,
                'stock_qty'       => (float) $p->stock_qty,
                'unit'            => $p->unit ?? 'pcs',
                'sizes'           => $p->variants->map(fn ($v) => [
                    'id'                => $v->id,
                    'label'             => $v->label,
                    'price'             => (float) $v->selling_price,
                    'conversion_factor' => (float) ($v->conversion_factor ?? 1),
                ])->values()->all(),
            ])
            ->values()
            ->all();

        return Inertia::render('Sales/Create', [
            'customers'          => $customers,
            'popularProducts'    => $popularProducts,
            'fastMovingProducts' => $fastMovingProducts,
        ])->with(['flash' => session('flash')]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'items'                  => 'required|array|min:1',
            'items.*.product_id'     => 'required|exists:products,id',
            'items.*.variant_id'     => 'nullable|exists:product_variants,id',
            'items.*.qty'            => 'required|numeric|min:0.01',
            'items.*.unit_price'     => 'required|numeric|min:0',
            'items.*.discount'       => 'nullable|numeric|min:0',
            'items.*.total'          => 'required|numeric|min:0',
            'payment_method'         => 'required|string|in:cash,card,credit,split',
            'card_receipt_no'        => 'nullable|string|max:100',
            'split_cash'             => 'nullable|numeric|min:0',
            'split_card'             => 'nullable|numeric|min:0',
            'subtotal'               => 'required|numeric|min:0',
            'discount'               => 'nullable|numeric|min:0',
            'tax'                    => 'nullable|numeric|min:0',
            'total'                  => 'required|numeric|min:0',
            'paid'                   => 'required|numeric|min:0',
            'customer_id'            => 'nullable|exists:customers,id',
            'note'                   => 'nullable|string',
        ]);

        $sale = DB::transaction(function () use ($request) {
            // Generate invoice number
            $date        = Carbon::now()->format('Ymd');
            $lastSale    = Sale::whereDate('created_at', Carbon::today())
                ->lockForUpdate()
                ->orderByDesc('id')
                ->first();
            $sequence    = $lastSale
                ? (intval(substr($lastSale->invoice_no, -4)) + 1)
                : 1;
            $invoiceNo   = 'INV-' . $date . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);

            $balance = $request->total - $request->paid;

            $sale = Sale::create([
                'invoice_no'  => $invoiceNo,
                'user_id'     => Auth::id(),
                'customer_id' => $request->customer_id,
                'subtotal'    => $request->subtotal,
                'discount'    => $request->discount ?? 0,
                'tax'         => $request->tax ?? 0,
                'total'       => $request->total,
                'paid'        => $request->paid,
                'balance'     => $balance,
                'status'      => 'completed',
                'note'        => $request->note,
            ]);

            foreach ($request->items as $item) {
                $product = Product::lockForUpdate()->findOrFail($item['product_id']);
                $variant = !empty($item['variant_id'])
                    ? ProductVariant::lockForUpdate()->findOrFail($item['variant_id'])
                    : null;

                // Validate stock availability inside the lock so concurrent sales can't race
                $soldQty = (float) $item['qty'];

                if ($variant) {
                    // Variant stock is tracked on the parent product in base units.
                    // Convert sold qty to base units using conversion_factor (default 1).
                    $factor        = max((float) ($variant->conversion_factor ?? 1), 0.000001);
                    $productQtyOut = $soldQty * $factor;
                    $availableQty  = (float) $product->stock_qty;

                    if ($availableQty < $productQtyOut) {
                        $label = $product->name . ' – ' . $variant->label;
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'items' => "Insufficient stock for \"{$label}\". Available: {$availableQty}, requested: {$productQtyOut}.",
                        ]);
                    }

                    $stockBefore = $product->stock_qty;
                    $product->decrement('stock_qty', $productQtyOut);
                } else {
                    $productQtyOut = $soldQty;
                    $availableQty  = (float) $product->stock_qty;

                    if ($availableQty < $productQtyOut) {
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'items' => "Insufficient stock for \"{$product->name}\". Available: {$availableQty}, requested: {$productQtyOut}.",
                        ]);
                    }

                    $stockBefore = $product->stock_qty;
                    $product->decrement('stock_qty', $productQtyOut);
                }

                SaleItem::create([
                    'sale_id'      => $sale->id,
                    'product_id'   => $product->id,
                    'variant_id'   => $variant?->id,
                    'product_name' => $item['name'] ?? ($variant ? $product->name . ' - ' . $variant->label : $product->name),
                    'unit_price'   => $item['unit_price'],
                    'cost_price'   => $variant ? $variant->cost_price : $product->cost_price,
                    'qty'          => $item['qty'],
                    'discount'     => $item['discount'] ?? 0,
                    'total'        => $item['total'],
                ]);

                StockMovement::create([
                    'product_id'   => $product->id,
                    'user_id'      => Auth::id(),
                    'type'         => 'out',
                    'qty'          => $productQtyOut,
                    'stock_before' => $stockBefore,
                    'stock_after'  => $stockBefore - $productQtyOut,
                    'reference'    => $sale->invoice_no,
                    'note'         => 'Sale: ' . $sale->invoice_no,
                ]);
            }

            // Record payment(s)
            if ($request->payment_method === 'split') {
                $splitCash = (float) ($request->split_cash ?? 0);
                $splitCard = (float) ($request->split_card ?? 0);
                Payment::create([
                    'sale_id'   => $sale->id,
                    'method'    => 'cash',
                    'amount'    => $splitCash,
                    'reference' => null,
                ]);
                Payment::create([
                    'sale_id'   => $sale->id,
                    'method'    => 'card',
                    'amount'    => $splitCard,
                    'reference' => $request->card_receipt_no ?: null,
                ]);
            } else {
                Payment::create([
                    'sale_id'   => $sale->id,
                    'method'    => $request->payment_method,
                    'amount'    => $request->paid,
                    'reference' => $request->payment_method === 'card' ? $request->card_receipt_no : null,
                ]);
            }

            // Handle credit sales
            if ($request->payment_method === 'credit' && $request->customer_id) {
                $customer = Customer::findOrFail($request->customer_id);
                $customer->increment('credit_balance', $balance);
            }

            return $sale;
        });

        return redirect(route('sales.show', $sale->id) . '?autoPrint=1')
            ->with('success', 'විකුණුම සාර්ථකව සම්පූර්ණ විය.');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $sale = Sale::with([
            'items.product:id,name_si',
            'payments',
            'customer',
            'user',
        ])->findOrFail($id);

        $settings = \App\Models\Setting::all()->pluck('value', 'key')->toArray();

        return Inertia::render('Sales/Show', [
            'sale'     => $sale,
            'settings' => $settings,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        // Sales are generally not edited in a POS system
        abort(403, 'Sales cannot be edited.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        abort(403, 'Sales cannot be updated.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $sale = Sale::findOrFail($id);
        $sale->delete();

        return redirect()->route('sales.index')->with('success', 'Sale deleted successfully.');
    }

    /**
     * Hold a sale bill.
     */
    public function holdBill(Request $request)
    {
        $request->validate([
            'items'          => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.qty'    => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.total'  => 'required|numeric|min:0',
            'subtotal'       => 'required|numeric|min:0',
            'discount'       => 'nullable|numeric|min:0',
            'tax'            => 'nullable|numeric|min:0',
            'total'          => 'required|numeric|min:0',
            'customer_id'    => 'nullable|exists:customers,id',
            'note'           => 'nullable|string',
        ]);

        $sale = DB::transaction(function () use ($request) {
            $date      = Carbon::now()->format('Ymd');
            $lastSale  = Sale::whereDate('created_at', Carbon::today())
                ->lockForUpdate()
                ->orderByDesc('id')
                ->first();
            $sequence  = $lastSale
                ? (intval(substr($lastSale->invoice_no, -4)) + 1)
                : 1;
            $invoiceNo = 'HOLD-' . $date . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);

            $sale = Sale::create([
                'invoice_no'  => $invoiceNo,
                'user_id'     => Auth::id(),
                'customer_id' => $request->customer_id,
                'subtotal'    => $request->subtotal,
                'discount'    => $request->discount ?? 0,
                'tax'         => $request->tax ?? 0,
                'total'       => $request->total,
                'paid'        => 0,
                'balance'     => $request->total,
                'status'      => 'held',
                'note'        => $request->note,
            ]);

            foreach ($request->items as $item) {
                $product = Product::findOrFail($item['product_id']);

                SaleItem::create([
                    'sale_id'      => $sale->id,
                    'product_id'   => $product->id,
                    'product_name' => $product->name,
                    'unit_price'   => $item['unit_price'],
                    'cost_price'   => $product->cost_price,
                    'qty'          => $item['qty'],
                    'discount'     => $item['discount'] ?? 0,
                    'total'        => $item['total'],
                ]);
            }

            return $sale;
        });

        return response()->json([
            'sale_id'    => $sale->id,
            'invoice_no' => $sale->invoice_no,
            'message'    => 'Bill held successfully.',
        ]);
    }

    /**
     * Get all held bills for the current user.
     */
    public function getHeldBills()
    {
        $heldBills = Sale::with(['customer', 'items.product'])
            ->where('status', 'held')
            ->where('user_id', Auth::id())
            ->latest()
            ->get();

        return response()->json($heldBills);
    }
}
