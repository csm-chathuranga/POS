<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with('category');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        $products   = $query->latest()->paginate(20)->withQueryString();
        $categories = Category::orderBy('name')->get();

        return Inertia::render('Products/Index', [
            'products'   => $products,
            'categories' => $categories,
            'filters'    => $request->only(['search', 'category_id']),
        ])->with(['flash' => session('flash')]);
    }

    public function create()
    {
        $categories = Category::orderBy('name')->get();
        return Inertia::render('Products/Create', ['categories' => $categories])
            ->with(['flash' => session('flash')]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'name_si'         => 'nullable|string|max:255',
            'category_id'     => 'nullable|exists:categories,id',
            'barcode'         => 'nullable|string|max:100|unique:products,barcode',
            'sku'             => 'nullable|string|max:100|unique:products,sku',
            'description'     => 'nullable|string',
            'cost_price'      => 'nullable|numeric|min:0',
            'selling_price'   => 'required|numeric|min:0',
            'wholesale_price' => 'nullable|numeric|min:0',
            'stock_qty'       => 'nullable|numeric|min:0',
            'alert_qty'       => 'nullable|numeric|min:0',
            'unit'            => 'nullable|string|max:50',
            'active'          => 'boolean',
            'is_fast_moving'  => 'boolean',
            'variants'        => 'nullable|array',
            'variants.*.label'           => 'required|string|max:50',
            'variants.*.barcode'         => 'nullable|string|max:100|distinct|unique:product_variants,barcode',
            'variants.*.cost_price'      => 'nullable|numeric|min:0',
            'variants.*.selling_price'   => 'required|numeric|min:0',
            'variants.*.wholesale_price' => 'nullable|numeric|min:0',
            'variants.*.stock_qty'       => 'nullable|numeric|min:0',
            'variants.*.alert_qty'       => 'nullable|numeric|min:0',
        ]);

        if (empty($validated['barcode'])) {
            $validated['barcode'] = strtoupper(Str::slug($validated['name'], '') . '-' . strtoupper(Str::random(6)));
        }

        $variants = $validated['variants'] ?? [];
        unset($validated['variants']);

        $product = Product::create($validated);

        foreach ($variants as $v) {
            $product->variants()->create($v);
        }

        return redirect()->route('products.index')->with('success', 'Product created successfully.');
    }

    public function show(string $id)
    {
        $product = Product::with('category')->findOrFail($id);
        return Inertia::render('Products/Show', ['product' => $product])
            ->with(['flash' => session('flash')]);
    }

    public function edit(string $id)
    {
        $product    = Product::with('variants')->findOrFail($id);
        $categories = Category::orderBy('name')->get();

        return Inertia::render('Products/Edit', [
            'product'    => $product,
            'categories' => $categories,
        ])->with(['flash' => session('flash')]);
    }

    public function update(Request $request, string $id)
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'name_si'         => 'nullable|string|max:255',
            'category_id'     => 'nullable|exists:categories,id',
            'barcode'         => 'nullable|string|max:100|unique:products,barcode,' . $product->id,
            'sku'             => 'nullable|string|max:100|unique:products,sku,' . $product->id,
            'description'     => 'nullable|string',
            'cost_price'      => 'nullable|numeric|min:0',
            'selling_price'   => 'required|numeric|min:0',
            'wholesale_price' => 'nullable|numeric|min:0',
            'stock_qty'       => 'nullable|numeric|min:0',
            'alert_qty'       => 'nullable|numeric|min:0',
            'unit'            => 'nullable|string|max:50',
            'active'          => 'boolean',
            'is_fast_moving'  => 'boolean',
            'variants'        => 'nullable|array',
            'variants.*.id'              => 'nullable|integer',
            'variants.*.label'           => 'required|string|max:50',
            'variants.*.barcode'         => 'nullable|string|max:100',
            'variants.*.cost_price'      => 'nullable|numeric|min:0',
            'variants.*.selling_price'   => 'required|numeric|min:0',
            'variants.*.wholesale_price' => 'nullable|numeric|min:0',
            'variants.*.stock_qty'       => 'nullable|numeric|min:0',
            'variants.*.alert_qty'       => 'nullable|numeric|min:0',
        ]);

        $variants = $validated['variants'] ?? [];
        unset($validated['variants']);

        $product->update($validated);

        // Sync variants: upsert existing, delete removed
        $keptIds = [];
        foreach ($variants as $v) {
            if (!empty($v['id'])) {
                $variant = ProductVariant::where('product_id', $product->id)->find($v['id']);
                if ($variant) { $variant->update($v); $keptIds[] = $variant->id; }
            } else {
                $new = $product->variants()->create($v);
                $keptIds[] = $new->id;
            }
        }
        $product->variants()->whereNotIn('id', $keptIds)->delete();

        return redirect()->route('products.index')->with('success', 'Product updated successfully.');
    }

    public function destroy(string $id)
    {
        Product::findOrFail($id)->delete();
        return redirect()->route('products.index')->with('success', 'Product deleted successfully.');
    }

    /**
     * Search products for POS. Supports ?q= (name/barcode/si) and ?barcode= (exact match).
     * Products with sizes include a `sizes` array; the size picker is handled on the frontend.
     */
    public function search(Request $request)
    {
        // Exact barcode lookup — used by barcode scanner
        if ($request->filled('barcode')) {
            $barcode = trim($request->get('barcode'));
            $product = Product::where('active', true)->where('barcode', $barcode)
                ->with('variants')->first();
            if ($product) {
                return response()->json([$this->productToSearchItem($product)]);
            }
            return response()->json([]);
        }

        // Normal text search
        $search = trim($request->get('q', ''));

        $products = Product::where('active', true)
            ->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%")
                  ->orWhere('name_si', 'like', "%{$search}%");
            })
            ->with('variants')
            ->limit(20)
            ->get();

        return response()->json($products->map(fn ($p) => $this->productToSearchItem($p))->values());
    }

    /**
     * Return ALL active products for client-side caching in POS.
     */
    public function all()
    {
        $products = Product::where('active', true)->with('variants')->get();
        return response()->json($products->map(fn ($p) => $this->productToSearchItem($p))->values());
    }

    private function productToSearchItem(Product $product): array
    {
        $sizes = $product->relationLoaded('variants')
            ? $product->variants->map(fn ($v) => [
                'id'    => $v->id,
                'label' => $v->label,
                'price' => (float) $v->selling_price,
            ])->values()->all()
            : [];

        return [
            'id'              => $product->id,
            'variant_id'      => null,
            'name'            => $product->name,
            'name_si'         => $product->name_si,
            'barcode'         => $product->barcode,
            'selling_price'   => $product->selling_price,
            'wholesale_price' => $product->wholesale_price,
            'cost_price'      => $product->cost_price,
            'stock_qty'       => $product->stock_qty,
            'unit'            => $product->unit,
            'sizes'           => $sizes,
        ];
    }
}
