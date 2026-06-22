<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\StockMovement;
use App\Models\Supplier;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PurchaseController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Purchase::with(['supplier', 'user']);

        if ($request->filled('search')) {
            $query->where('grn_no', 'like', '%' . $request->search . '%');
        }

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('purchase_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('purchase_date', '<=', $request->date_to);
        }

        $purchases = $query->latest()->paginate(20)->withQueryString();
        $suppliers = Supplier::orderBy('name')->get();

        return Inertia::render('Purchases/Index', [
            'purchases' => $purchases,
            'suppliers' => $suppliers,
            'filters'   => $request->only(['search', 'supplier_id', 'date_from', 'date_to']),
        ])->with(['flash' => session('flash')]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $suppliers = Supplier::where('active', true)->orderBy('name')->get();
        $products  = Product::with('category')->where('active', true)->orderBy('name')->get();

        return Inertia::render('Purchases/Create', [
            'suppliers' => $suppliers,
            'products'  => $products,
        ])->with(['flash' => session('flash')]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'supplier_id'            => 'nullable|exists:suppliers,id',
            'purchase_date'          => 'required|date',
            'items'                  => 'required|array|min:1',
            'items.*.product_id'     => 'required|exists:products,id',
            'items.*.qty'            => 'required|numeric|min:0.01',
            'items.*.cost_price'      => 'required|numeric|min:0',
            'items.*.selling_price'  => 'required|numeric|min:0',
            'items.*.wholesale_price'=> 'required|numeric|min:0',
            'items.*.total'          => 'required|numeric|min:0',
            'total'                  => 'required|numeric|min:0',
            'paid'                   => 'nullable|numeric|min:0',
            'status'                 => 'nullable|string',
            'note'                   => 'nullable|string',
        ]);

        $purchase = DB::transaction(function () use ($request) {
            // Generate GRN number
            $date        = Carbon::now()->format('Ymd');
            $lastPurchase = Purchase::whereDate('created_at', Carbon::today())
                ->lockForUpdate()
                ->orderByDesc('id')
                ->first();
            $sequence    = $lastPurchase
                ? (intval(substr($lastPurchase->grn_no, -4)) + 1)
                : 1;
            $grnNo       = 'GRN-' . $date . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);

            $purchase = Purchase::create([
                'grn_no'        => $grnNo,
                'supplier_id'   => $request->supplier_id,
                'user_id'       => Auth::id(),
                'total'         => $request->total,
                'paid'          => $request->paid ?? 0,
                'status'        => $request->status ?? 'received',
                'purchase_date' => $request->purchase_date,
                'note'          => $request->note,
            ]);

            foreach ($request->items as $item) {
                $product = Product::lockForUpdate()->findOrFail($item['product_id']);

                PurchaseItem::create([
                    'purchase_id'  => $purchase->id,
                    'product_id'   => $product->id,
                    'product_name' => $product->name,
                    'cost_price'   => $item['cost_price'],
                    'qty'          => $item['qty'],
                    'total'        => $item['total'],
                ]);

                $stockBefore = $product->stock_qty;
                $product->increment('stock_qty', $item['qty']);

                // Update prices from purchase
                $product->update([
                    'cost_price'      => $item['cost_price'],
                    'selling_price'   => $item['selling_price'],
                    'wholesale_price' => $item['wholesale_price'],
                ]);

                StockMovement::create([
                    'product_id'   => $product->id,
                    'user_id'      => Auth::id(),
                    'type'         => 'in',
                    'qty'          => $item['qty'],
                    'stock_before' => $stockBefore,
                    'stock_after'  => $stockBefore + $item['qty'],
                    'reference'    => $purchase->grn_no,
                    'note'         => 'Purchase: ' . $purchase->grn_no,
                ]);
            }

            return $purchase;
        });

        return redirect()->route('purchases.index')->with('success', 'Purchase recorded successfully. GRN: ' . $purchase->grn_no);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $purchase = Purchase::with(['items.product', 'supplier', 'user'])->findOrFail($id);

        return Inertia::render('Purchases/Show', [
            'purchase' => $purchase,
        ])->with(['flash' => session('flash')]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        $purchase  = Purchase::with('items.product')->findOrFail($id);
        $suppliers = Supplier::where('active', true)->orderBy('name')->get();
        $products  = Product::with('category')->where('active', true)->orderBy('name')->get();

        return Inertia::render('Purchases/Edit', [
            'purchase'  => $purchase,
            'suppliers' => $suppliers,
            'products'  => $products,
        ])->with(['flash' => session('flash')]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $purchase = Purchase::findOrFail($id);

        $request->validate([
            'supplier_id'   => 'nullable|exists:suppliers,id',
            'purchase_date' => 'required|date',
            'total'         => 'required|numeric|min:0',
            'paid'          => 'nullable|numeric|min:0',
            'status'        => 'nullable|string',
            'note'          => 'nullable|string',
        ]);

        $purchase->update([
            'supplier_id'   => $request->supplier_id,
            'total'         => $request->total,
            'paid'          => $request->paid ?? 0,
            'status'        => $request->status ?? $purchase->status,
            'purchase_date' => $request->purchase_date,
            'note'          => $request->note,
        ]);

        return redirect()->route('purchases.index')->with('success', 'Purchase updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $purchase = Purchase::findOrFail($id);
        $purchase->items()->delete();
        $purchase->delete();

        return redirect()->route('purchases.index')->with('success', 'Purchase ' . $purchase->grn_no . ' deleted successfully.');
    }
}
