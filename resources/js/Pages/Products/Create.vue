<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head, Link, useForm } from '@inertiajs/vue3';
import { inject, ref } from 'vue';
import { invalidateProducts } from '@/stores/productCache';

const t = inject('t');

const props = defineProps({
    categories: { type: Array, default: () => [] },
});

const form = useForm({
    category_id:     '',
    name:            '',
    name_si:         '',
    barcode:         '',
    sku:             '',
    cost_price:      '',
    selling_price:   '',
    wholesale_price: '',
    stock_qty:       0,
    alert_qty:       5,
    unit:            'pcs',
    description:     '',
    active:          true,
    is_fast_moving:  false,
    variants:        [],
});

function addVariant() {
    form.variants.push({
        label:             '',
        selling_price:     '',
        conversion_factor: 1,
    });
}

function removeVariant(i) {
    form.variants.splice(i, 1);
}

function submit() {
    invalidateProducts();
    form.post(route('products.store'));
}
</script>

<template>
    <Head :title="t('page.new_product')" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex items-center gap-2">
                <Link :href="route('products.index')" class="text-gray-400 hover:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <h1 class="text-xl font-bold text-gray-800">{{ t('page.new_product') }}</h1>
            </div>
        </template>

        <div class="w-full">
            <form @submit.prevent="submit" class="space-y-5">

                <!-- ── Row 1: Basic Info + Prices ── -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">

                    <!-- Basic Info card -->
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
                        <h2 class="font-semibold text-sm text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-2">{{ t('set.shop_info') }}</h2>

                        <!-- Category -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('prod.category') }}</label>
                            <select v-model="form.category_id" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px]" :class="{ 'border-red-500': form.errors.category_id }">
                                <option value="">— {{ t('prod.category') }} —</option>
                                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                            </select>
                            <p v-if="form.errors.category_id" class="text-red-500 text-xs mt-1">{{ form.errors.category_id }}</p>
                        </div>

                        <!-- Name + Name SI -->
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('prod.name') }} <span class="text-red-500">*</span></label>
                                <input v-model="form.name" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" :class="{ 'border-red-500': form.errors.name }" placeholder="Product name" />
                                <p v-if="form.errors.name" class="text-red-500 text-xs mt-1">{{ form.errors.name }}</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('prod.name_si') }}</label>
                                <input v-model="form.name_si" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="නම" />
                            </div>
                        </div>

                        <!-- Barcode + SKU -->
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('prod.barcode') }}</label>
                                <input v-model="form.barcode" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" :class="{ 'border-red-500': form.errors.barcode }" placeholder="1234567890" />
                                <p v-if="form.errors.barcode" class="text-red-500 text-xs mt-1">{{ form.errors.barcode }}</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                                <input v-model="form.sku" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="PROD-001" />
                            </div>
                        </div>

                        <!-- Unit + Stock + Alert -->
                        <div class="grid grid-cols-3 gap-3">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('th.qty') }}</label>
                                <select v-model="form.unit" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="pcs">pcs</option>
                                    <option value="kg">kg</option>
                                    <option value="g">g</option>
                                    <option value="l">l</option>
                                    <option value="ml">ml</option>
                                    <option value="liter">liter</option>
                                    <option value="m">m</option>
                                    <option value="box">box</option>
                                    <option value="pack">pack</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('prod.initial_stock') }}</label>
                                <input v-model="form.stock_qty" type="number" min="0" step="0.001" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('prod.low_stock_alert') }}</label>
                                <input v-model="form.alert_qty" type="number" min="0" step="0.001" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>

                        <!-- Description -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('prod.description') }}</label>
                            <textarea v-model="form.description" rows="2" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" :placeholder="t('prod.description')"></textarea>
                        </div>

                        <!-- Flags -->
                        <div class="flex flex-col gap-3 pt-1">
                            <!-- Active toggle -->
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-gray-700">{{ t('lbl.active') }}</p>
                                </div>
                                <button type="button" @click="form.active = !form.active" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" :class="form.active ? 'bg-blue-600' : 'bg-gray-300'">
                                    <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow" :class="form.active ? 'translate-x-6' : 'translate-x-1'"></span>
                                </button>
                            </div>
                            <!-- Fast Moving toggle -->
                            <div class="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-100">
                                <div>
                                    <p class="text-sm font-medium text-amber-800">⚡ {{ t('prod.fast_moving') }}</p>
                                    <p class="text-xs text-amber-600">{{ t('prod.fast_moving_hint') }}</p>
                                </div>
                                <button type="button" @click="form.is_fast_moving = !form.is_fast_moving" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" :class="form.is_fast_moving ? 'bg-amber-500' : 'bg-gray-300'">
                                    <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow" :class="form.is_fast_moving ? 'translate-x-6' : 'translate-x-1'"></span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Prices card -->
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
                        <h2 class="font-semibold text-sm text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-2">{{ t('prod.buy_price') }} / {{ t('prod.sell_price') }}</h2>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('prod.buy_price') }} <span class="text-red-500">*</span></label>
                            <input v-model="form.cost_price" type="number" step="0.01" min="0" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" :class="{ 'border-red-500': form.errors.cost_price }" placeholder="0.00" />
                            <p v-if="form.errors.cost_price" class="text-red-500 text-xs mt-1">{{ form.errors.cost_price }}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('prod.sell_price') }} <span class="text-red-500">*</span></label>
                            <input v-model="form.selling_price" type="number" step="0.01" min="0" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" :class="{ 'border-red-500': form.errors.selling_price }" placeholder="0.00" />
                            <p v-if="form.errors.selling_price" class="text-red-500 text-xs mt-1">{{ form.errors.selling_price }}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('prod.wholesale_price') }}</label>
                            <input v-model="form.wholesale_price" type="number" step="0.01" min="0" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" :class="{ 'border-red-500': form.errors.wholesale_price }" placeholder="0.00" />
                        </div>

                        <div class="text-xs text-gray-400 pt-1">
                            Prices above are for the base product when no sizes are defined below.
                        </div>
                    </div>
                </div>

                <!-- ── Variants (Sizes) card ── -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h2 class="font-semibold text-gray-800">{{ t('prod.sizes') }}</h2>
                            <p class="text-xs text-gray-400 mt-0.5">{{ t('prod.sizes_hint') }}</p>
                        </div>
                        <button type="button" @click="addVariant()" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                            {{ t('prod.add_size') }}
                        </button>
                    </div>

                    <div v-if="form.variants.length === 0" class="text-center py-6 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                        {{ t('prod.no_sizes') }}
                    </div>

                    <div v-else class="space-y-2">
                        <!-- Header -->
                        <div class="grid grid-cols-[1fr_1fr_auto] gap-3 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                            <span>{{ t('prod.size_label') }}</span>
                            <span>{{ t('prod.sell_price') }}</span>
                            <span></span>
                        </div>

                        <div
                            v-for="(v, i) in form.variants"
                            :key="i"
                            class="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center p-2 rounded-lg bg-gray-50 border border-gray-100"
                        >
                            <input v-model="v.label" type="text" placeholder="100g / 200g / 500g" class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 w-full" />
                            <input v-model="v.selling_price" type="number" step="0.01" min="0" placeholder="Price" class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 w-full" />
                            <div>
                                <input v-model="v.conversion_factor" type="number" step="0.01" min="0.01" placeholder="1" class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 w-full" />
                                <p class="text-xs text-gray-400 mt-0.5 px-1">× base unit</p>
                            </div>
                            <button type="button" @click="removeVariant(i)" class="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <p v-if="form.errors.variants" class="text-red-500 text-xs mt-1">{{ form.errors.variants }}</p>
                    </div>
                </div>

                <!-- Buttons -->
                <div class="flex flex-col sm:flex-row gap-3">
                    <button type="submit" :disabled="form.processing" class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 px-6 rounded-lg transition-colors">
                        {{ form.processing ? t('lbl.loading') : t('btn.save') }}
                    </button>
                    <Link :href="route('products.index')" class="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center">
                        {{ t('btn.cancel') }}
                    </Link>
                </div>
            </form>
        </div>
    </AuthenticatedLayout>
</template>
