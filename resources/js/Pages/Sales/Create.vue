<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head, Link, useForm, usePage } from '@inertiajs/vue3';
import { ref, computed, inject, onMounted, onUnmounted, nextTick } from 'vue';
import axios from 'axios';

// ─── Props ────────────────────────────────────────────────────────────────────
const props = defineProps({
    customers:          { type: Array, default: () => [] },
    popularProducts:    { type: Array, default: () => [] },
    fastMovingProducts: { type: Array, default: () => [] },
});

const t = inject('t');

// ─── Fullscreen ───────────────────────────────────────────────────────────────
const posFullscreen = inject('posFullscreen');

function toggleFullscreen() {
    if (!posFullscreen?.value) {
        if (posFullscreen) posFullscreen.value = true;
        document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
        exitFullscreen();
    }
}

function exitFullscreen() {
    if (posFullscreen) posFullscreen.value = false;
    if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
    }
}

function onFullscreenChange() {
    if (!document.fullscreenElement && posFullscreen) {
        posFullscreen.value = false;
    }
}

// ─── Auth / Permissions ───────────────────────────────────────────────────────
const page        = usePage();
const authUser    = computed(() => page.props.auth?.user);
const canDiscount = computed(() =>
    ['admin', 'manager'].includes(authUser.value?.role)
);

// ─── Refs ─────────────────────────────────────────────────────────────────────
const searchInput     = ref(null);
const dropdownList    = ref(null);
const searchContainer = ref(null);
const searchQuery    = ref('');
const searchResults  = ref([]);
const showDropdown   = ref(false);
const activeIndex    = ref(-1);   // highlighted row in dropdown (-1 = none)

// ─── Product cache ────────────────────────────────────────────────────────────
const allProducts    = ref([]);   // full catalogue, loaded once on mount
const productsReady  = ref(false);

const cart             = ref([]);
const selectedCustomer = ref(null);
const priceMode        = ref('retail'); // 'retail' | 'wholesale'
const paymentMethod    = ref('cash');
const cashPaid         = ref('');
const shakePaid        = ref(false);
const billDiscount     = ref('');   // bill-level discount (Rs.)
const discountType     = ref('amount'); // 'amount' | 'percent'
const holdNote         = ref('');
const showHoldModal    = ref(false);
const submitting       = ref(false);
const errorMsg         = ref('');

// ─── Dark mode ────────────────────────────────────────────────────────────────
const darkMode = ref(localStorage.getItem('pos_dark') === '1');
function toggleDarkMode() {
    darkMode.value = !darkMode.value;
    localStorage.setItem('pos_dark', darkMode.value ? '1' : '0');
    document.documentElement.classList.toggle('dark', darkMode.value);
}

// ─── Held bills ───────────────────────────────────────────────────────────────
const heldBills          = ref(JSON.parse(localStorage.getItem('heldBills') || '[]'));
const showHeldBillsModal = ref(false);

function refreshHeldBills() {
    heldBills.value = JSON.parse(localStorage.getItem('heldBills') || '[]');
}

function restoreHeldBill(index) {
    const bill = heldBills.value[index];
    cart.value             = bill.cart;
    selectedCustomer.value = bill.customer || null;
    const updated = [...heldBills.value];
    updated.splice(index, 1);
    localStorage.setItem('heldBills', JSON.stringify(updated));
    heldBills.value          = updated;
    showHeldBillsModal.value = false;
    refocusSearch();
}

function deleteHeldBill(index) {
    const updated = [...heldBills.value];
    updated.splice(index, 1);
    localStorage.setItem('heldBills', JSON.stringify(updated));
    heldBills.value = updated;
}

// ─── Quick customer add ───────────────────────────────────────────────────────
const showQuickCustomer  = ref(false);
const quickCustomerName  = ref('');
const quickCustomerPhone = ref('');
const quickCustomerError = ref('');
const quickSaving        = ref(false);
const localCustomers     = ref([...props.customers]);

function openQuickCustomer() {
    quickCustomerName.value  = '';
    quickCustomerPhone.value = '';
    quickCustomerError.value = '';
    showQuickCustomer.value  = true;
    nextTick(() => document.getElementById('qc-name-input')?.focus());
}

async function saveQuickCustomer() {
    quickCustomerError.value = '';
    if (!quickCustomerName.value.trim()) {
        quickCustomerError.value = t('cust.name_required');
        return;
    }
    quickSaving.value = true;
    try {
        const res = await axios.post(route('customers.quick-store'), {
            name:  quickCustomerName.value.trim(),
            phone: quickCustomerPhone.value.trim() || null,
        });
        const c = res.data.customer;
        localCustomers.value.push(c);
        selectedCustomer.value = c;
        showQuickCustomer.value = false;
        refocusSearch();
    } catch (err) {
        quickCustomerError.value = err.response?.data?.message
            || Object.values(err.response?.data?.errors || {})[0]?.[0]
            || t('err.generic');
    } finally {
        quickSaving.value = false;
    }
}

// ─── Inertia form ─────────────────────────────────────────────────────────────
const form = useForm({
    items:          [],
    customer_id:    null,
    payment_method: 'cash',
    paid:           0,
    subtotal:       0,
    discount:       0,
    tax:            0,
    total:          0,
});

// ─── Computed totals ──────────────────────────────────────────────────────────
const subtotal = computed(() =>
    cart.value.reduce((s, i) => s + i.qty * i.unit_price, 0)
);
const lineDiscount = computed(() =>
    cart.value.reduce((s, i) => s + Number(i.discount || 0), 0)
);
const billDiscountAmt = computed(() => {
    const v = parseFloat(billDiscount.value) || 0;
    if (discountType.value === 'percent') {
        return Math.min((subtotal.value - lineDiscount.value) * v / 100, subtotal.value - lineDiscount.value);
    }
    return Math.min(v, subtotal.value - lineDiscount.value);
});
const totalDiscount = computed(() => lineDiscount.value + billDiscountAmt.value);
const tax     = computed(() => 0);
const total   = computed(() => Math.max(0, subtotal.value - totalDiscount.value + tax.value));
const balance = computed(() => (parseFloat(cashPaid.value) || 0) - total.value);

// ─── Dropdown items: popular when query empty, search results otherwise ───────
const dropdownItems = computed(() =>
    searchQuery.value.trim() === '' ? props.popularProducts : searchResults.value
);

// ─── Size picker ─────────────────────────────────────────────────────────────
const sizePickerProduct = ref(null);
const showSizePicker    = ref(false);
const sizeActiveIndex   = ref(0);

function selectSize(size) {
    const p = sizePickerProduct.value;
    showSizePicker.value    = false;
    sizePickerProduct.value = null;
    sizeActiveIndex.value   = 0;
    addToCart({
        ...p,
        variant_id:      size.id,
        name:            p.name + ' - ' + size.label,
        name_si:         p.name_si ? p.name_si + ' - ' + size.label : null,
        selling_price:   size.price,
        wholesale_price: size.price,
        unit:            'pcs',
        sizes:           [],
    });
}

// ─── Barcode scan detection ───────────────────────────────────────────────────
const lastKeyTime    = ref(0);
const keyIntervals   = ref([]);
const isScanMode     = ref(false);

function onSearchKeypress(e) {
    if (e.key === 'Enter') return;
    const now = Date.now();
    if (lastKeyTime.value > 0) {
        keyIntervals.value.push(now - lastKeyTime.value);
    }
    lastKeyTime.value = now;
    if (keyIntervals.value.length >= 3) {
        isScanMode.value = keyIntervals.value.slice(-6).every(i => i < 60);
    }
}

function resetScanState() {
    lastKeyTime.value  = 0;
    keyIntervals.value = [];
    isScanMode.value   = false;
}

// ─── Product search ───────────────────────────────────────────────────────────
function onSearchFocus() {
    activeIndex.value  = -1;
    showDropdown.value = dropdownItems.value.length > 0;
}

function onSearchBlur(e) {
    const to = e.relatedTarget;
    // Keep focus if moving to another input (cart qty, price, cash paid, etc.)
    if (to && (to.tagName === 'INPUT' || to.tagName === 'TEXTAREA' || to.tagName === 'SELECT')) return;
    // Otherwise re-focus search after a short delay (allows button clicks to register first)
    setTimeout(() => {
        if (document.activeElement !== searchInput.value) {
            searchInput.value?.focus();
        }
    }, 150);
}

function onSearchInput() {
    activeIndex.value = -1;
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) {
        searchResults.value = [];
        showDropdown.value  = props.popularProducts.length > 0;
        resetScanState();
        return;
    }
    // Client-side filter against cached catalogue
    searchResults.value = allProducts.value.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.name_si && p.name_si.includes(q)) ||
        (p.barcode && p.barcode.includes(q))
    ).slice(0, 20);
    showDropdown.value = searchResults.value.length > 0;
}

function onArrowDown(e) {
    if (showSizePicker.value) return;
    if (!showDropdown.value) { showDropdown.value = dropdownItems.value.length > 0; return; }
    e.preventDefault();
    activeIndex.value = Math.min(activeIndex.value + 1, dropdownItems.value.length - 1);
    scrollActiveIntoView();
}

function onArrowUp(e) {
    if (showSizePicker.value) return;
    if (!showDropdown.value) return;
    e.preventDefault();
    activeIndex.value = Math.max(activeIndex.value - 1, 0);
    scrollActiveIntoView();
}

function scrollActiveIntoView() {
    nextTick(() => {
        const list = dropdownList.value;
        if (!list) return;
        const item = list.children[activeIndex.value];
        item?.scrollIntoView({ block: 'nearest' });
    });
}

async function onSearchEnter(e) {
    if (showSizePicker.value) return;
    e.preventDefault();
    const q = searchQuery.value.trim();

    // Barcode scan — exact client-side lookup
    if (isScanMode.value && q) {
        resetScanState();
        searchQuery.value   = '';
        searchResults.value = [];
        showDropdown.value  = false;
        const hit = allProducts.value.find(p => p.barcode === q);
        if (hit) addToCart(hit);
        return;
    }

    const items = dropdownItems.value;

    // Arrow-key selection takes priority
    if (activeIndex.value >= 0 && items[activeIndex.value]) {
        addToCart(items[activeIndex.value]);
        if (showSizePicker.value) e.stopPropagation();
        return;
    }

    // Best match in current results, fall back to first item
    if (!q || items.length === 0) return;
    const ql = q.toLowerCase();
    const found = items.find(p => p.barcode && p.barcode.toLowerCase() === ql)
               || items.find(p => p.name.toLowerCase().includes(ql))
               || items.find(p => p.name_si && p.name_si.includes(q))
               || items[0];
    if (found) {
        addToCart(found);
        if (showSizePicker.value) e.stopPropagation();
    }
}

function setPriceMode(mode) {
    priceMode.value = mode;
    // Re-price all items already in cart using prices stored on each item
    cart.value.forEach(item => {
        const wsPrice = parseFloat(item.wholesale_price) || 0;
        item.unit_price = mode === 'wholesale' && wsPrice > 0
            ? wsPrice
            : parseFloat(item.selling_price) || 0;
        recalcLine(item);
    });
}

function addToCart(product) {
    // Show size picker if product has sizes defined
    if (product.sizes?.length > 0) {
        sizePickerProduct.value = product;
        showSizePicker.value    = true;
        sizeActiveIndex.value   = 0;
        searchQuery.value       = '';
        searchResults.value     = [];
        showDropdown.value      = false;
        activeIndex.value       = -1;
        return;
    }

    const isWeightUnit = ['kg', 'g', 'l', 'ml', 'liter'].includes((product.unit || '').toLowerCase());
    const variantId    = product.variant_id || null;
    const existing     = cart.value.find(i =>
        i.product_id === product.id && i.variant_id === variantId
    );

    searchQuery.value   = '';
    searchResults.value = [];
    showDropdown.value  = false;
    activeIndex.value   = -1;

    if (existing) {
        if (!isWeightUnit) {
            existing.qty += 1;
            recalcLine(existing);
        }
        nextTick(() => {
            const idx = cart.value.indexOf(existing);
            const inputs = document.querySelectorAll('.cart-qty-input');
            if (inputs[idx]) { inputs[idx].focus(); inputs[idx].select(); }
        });
    } else {
        const wsPrice = parseFloat(product.wholesale_price) || 0;
        const unitPrice = priceMode.value === 'wholesale' && wsPrice > 0
            ? wsPrice
            : parseFloat(product.selling_price) || 0;

        cart.value.push({
            product_id:      product.id,
            variant_id:      variantId,
            name:            product.name_si ? `${product.name} / ${product.name_si}` : product.name,
            barcode:         product.barcode || '',
            qty:             isWeightUnit ? null : 1,
            unit_price:      unitPrice,
            selling_price:   parseFloat(product.selling_price) || 0,
            wholesale_price: wsPrice,
            discount:        0,
            total:           0,
            unit:            product.unit || 'pcs',
            stock_qty:       product.stock_qty || 0,
            alert_qty:       product.alert_qty || 5,
        });
        if (!isWeightUnit) recalcLine(cart.value[cart.value.length - 1]);
        nextTick(() => {
            const inputs = document.querySelectorAll('.cart-qty-input');
            const last = inputs[inputs.length - 1];
            if (last) { last.focus(); last.select(); }
        });
    }
}

function recalcLine(item) {
    item.total = item.qty * item.unit_price - Number(item.discount || 0);
}

function removeFromCart(index) {
    cart.value.splice(index, 1);
}

function updateQty(item, val) {
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0) {
        item.qty = n;
        recalcLine(item);
    }
}

function updateDiscount(item, val) {
    item.discount = parseFloat(val) || 0;
    recalcLine(item);
}

function updatePrice(item, val) {
    const p = parseFloat(val);
    if (!isNaN(p) && p >= 0) {
        item.unit_price = p;
        recalcLine(item);
    }
}

// ─── Customer ─────────────────────────────────────────────────────────────────
function selectCustomer(e) {
    const id = parseInt(e.target.value);
    selectedCustomer.value = props.customers.find(c => c.id === id) || null;
}

// ─── Payment methods ──────────────────────────────────────────────────────────
function setPaymentMethod(method) {
    paymentMethod.value = method;
    if (method !== 'credit') {
        selectedCustomer.value = null;
    }
    if (method === 'cash') {
        nextTick(() => {
            document.getElementById('cash-paid-input')?.focus();
        });
    }
}

// ─── Submit sale ──────────────────────────────────────────────────────────────
function submitSale() {
    errorMsg.value = '';
    if (cart.value.length === 0) { errorMsg.value = t('err.cart_empty'); return; }
    if (total.value <= 0)        { errorMsg.value = t('err.zero_total'); return; }
    if (paymentMethod.value === 'credit' && !selectedCustomer.value) {
        errorMsg.value = t('err.credit_needs_customer'); return;
    }
    if (paymentMethod.value === 'cash') {
        const paid = parseFloat(cashPaid.value) || 0;
        if (!paid) {
            nextTick(() => {
                const el = document.getElementById('cash-paid-input');
                if (el) { el.focus(); el.select(); }
            });
            shakePaid.value = true;
            setTimeout(() => { shakePaid.value = false; }, 600);
            return;
        }
        if (paid < total.value) { errorMsg.value = t('err.insufficient_cash'); return; }
    }
    submitting.value = true;
    form.items          = cart.value.map(i => ({
        product_id: i.product_id,
        variant_id: i.variant_id || null,
        name:       i.name,
        qty:        i.qty,
        unit_price: i.unit_price,
        discount:   i.discount,
        total:      i.total,
    }));
    form.customer_id    = selectedCustomer.value?.id || null;
    form.payment_method = paymentMethod.value;
    form.paid           = paymentMethod.value === 'cash'
        ? parseFloat(cashPaid.value) || 0
        : paymentMethod.value === 'credit'
            ? parseFloat(cashPaid.value) || 0
            : total.value;
    form.subtotal       = subtotal.value;
    form.discount       = totalDiscount.value;
    form.tax            = tax.value;
    form.total          = total.value;

    form.post(route('sales.store'), {
        onError: (errors) => {
            submitting.value = false;
            errorMsg.value   = Object.values(errors)[0] || t('err.generic');
        },
    });
}

// ─── Hold bill ────────────────────────────────────────────────────────────────
function holdBill() {
    if (cart.value.length === 0) return;
    showHoldModal.value = true;
}

function confirmHold() {
    // Store held bill in localStorage for later retrieval
    const held = JSON.parse(localStorage.getItem('heldBills') || '[]');
    held.push({
        id:         Date.now(),
        note:       holdNote.value,
        cart:       cart.value,
        customer:   selectedCustomer.value,
        createdAt:  new Date().toISOString(),
    });
    localStorage.setItem('heldBills', JSON.stringify(held));
    heldBills.value        = held;
    cart.value             = [];
    selectedCustomer.value = null;
    cashPaid.value         = '';
    billDiscount.value     = '';
    holdNote.value         = '';
    showHoldModal.value    = false;
    refocusSearch();
}

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────
function handleGlobalKeyboard(e) {
    // Size picker keyboard navigation takes priority
    if (showSizePicker.value && sizePickerProduct.value) {
        const sizes = sizePickerProduct.value.sizes;
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                sizeActiveIndex.value = Math.min(sizeActiveIndex.value + 1, sizes.length - 1);
                return;
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                sizeActiveIndex.value = Math.max(sizeActiveIndex.value - 1, 0);
                return;
            case 'Enter':
                e.preventDefault();
                if (sizes[sizeActiveIndex.value]) selectSize(sizes[sizeActiveIndex.value]);
                return;
            case 'Escape':
                e.preventDefault();
                showSizePicker.value = false;
                sizePickerProduct.value = null;
                sizeActiveIndex.value = 0;
                return;
        }
        return;
    }

    switch (e.key) {
        case 'F1':     e.preventDefault(); refocusSearch();          break;
        case 'F2':     e.preventDefault(); setPaymentMethod('cash'); break;
        case 'F3':     e.preventDefault(); setPaymentMethod('card'); break;
        case 'F4':     e.preventDefault(); setPaymentMethod('credit'); break;
        case 'F5':     e.preventDefault(); holdBill();               break;
        case 'F10':    e.preventDefault(); submitSale();             break;
        case 'Escape':
            if (posFullscreen?.value && !showDropdown.value && !showHoldModal.value) {
                e.preventDefault();
                exitFullscreen();
            }
            break;
    }
}

function refocusSearch() {
    nextTick(() => searchInput.value?.focus());
}

const CACHE_KEY = 'pos_products_v1';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function loadAllProducts() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
            const { ts, data } = JSON.parse(raw);
            if (Date.now() - ts < CACHE_TTL) {
                allProducts.value  = data;
                productsReady.value = true;
                return;
            }
        }
    } catch {}
    try {
        const res = await axios.get('/api/products/all');
        allProducts.value   = res.data;
        productsReady.value = true;
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: res.data }));
    } catch {
        productsReady.value = true; // fail open — search just returns no results
    }
}

function handleOutsideClick(e) {
    if (searchContainer.value && !searchContainer.value.contains(e.target)) {
        showDropdown.value = false;
        activeIndex.value  = -1;
    }
}

onMounted(() => {
    if (darkMode.value) document.documentElement.classList.add('dark');
    window.addEventListener('keydown', handleGlobalKeyboard);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('mousedown', handleOutsideClick);
    loadAllProducts();
    refocusSearch();
});

onUnmounted(() => {
    document.documentElement.classList.remove('dark');
    window.removeEventListener('keydown', handleGlobalKeyboard);
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    document.removeEventListener('mousedown', handleOutsideClick);
    if (posFullscreen?.value) exitFullscreen();
});

// ─── Formatting ───────────────────────────────────────────────────────────────
function fmt(val) {
    return 'Rs. ' + Number(val || 0).toLocaleString('en-LK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}
</script>

<template>
    <Head :title="t('page.new_sale')" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex items-center gap-2 w-full">
                <Link :href="route('sales.index')" class="text-gray-400 hover:text-gray-600 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <h1 class="text-xl font-bold text-gray-800 dark:text-slate-100">{{ t('page.new_sale') }} / POS Billing</h1>

                <span class="text-xs text-gray-400 dark:text-slate-500 hidden sm:block ml-auto">F1=Search · F2=Cash · F3=Card · F4=Credit · F5=Hold · F10=Complete</span>

                <!-- Dark mode toggle -->
                <button
                    type="button"
                    @click="toggleDarkMode"
                    class="flex-shrink-0 p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                    :title="darkMode ? 'Light mode' : 'Dark mode'"
                >
                    <!-- Sun -->
                    <svg v-if="darkMode" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <!-- Moon -->
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                </button>

                <!-- Fullscreen toggle button -->
                <button
                    type="button"
                    @click="toggleFullscreen"
                    class="flex-shrink-0 ml-2 p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    :title="posFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen'"
                >
                    <!-- Enter fullscreen icon -->
                    <svg v-if="!posFullscreen" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    <!-- Exit fullscreen icon -->
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                    </svg>
                </button>
            </div>
        </template>

        <!-- Error banner -->
        <div v-if="errorMsg" class="mb-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span class="text-sm font-medium">{{ errorMsg }}</span>
            <button @click="errorMsg = ''" class="text-red-500 hover:text-red-700 ml-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
            </button>
        </div>

        <!-- ── Main two-column layout ── -->
        <div class="flex flex-col lg:flex-row gap-4 h-full">

            <!-- ══════════════════════════════════════════
                 LEFT PANEL: Search + Cart
            ═══════════════════════════════════════════ -->
            <div class="flex-1 lg:w-[60%] flex flex-col gap-3 min-w-0">

                <!-- Barcode / Product Search -->
                <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-3">
                    <div class="flex items-center gap-2">
                    <div ref="searchContainer" class="relative flex-1">
                        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            ref="searchInput"
                            v-model="searchQuery"
                            type="text"
                            :placeholder="t('pos.search_product')"
                            autocomplete="off"
                            class="w-full pl-12 pr-28 py-4 text-lg lg:text-xl border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 min-h-[60px] lg:min-h-[68px] font-medium bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-900"
                            @focus="onSearchFocus"
                            @blur="onSearchBlur"
                            @input="onSearchInput"
                            @keypress="onSearchKeypress"
                            @keydown.enter="onSearchEnter"
                            @keydown.arrow-down="onArrowDown"
                            @keydown.arrow-up="onArrowUp"
                            @keydown.escape="showDropdown = false; searchQuery = ''; activeIndex = -1"
                        />
                        <!-- Scan button + status indicator -->
                        <div class="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
                            <svg v-if="!productsReady" class="animate-spin h-4 w-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                            <button
                                type="button"
                                @mousedown.prevent="refocusSearch"
                                :title="isScanMode ? 'Scanner active' : 'Click to focus for scanning'"
                                class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all"
                                :class="isScanMode
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                    : 'bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-blue-500 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'"
                            >
                                <!-- barcode icon -->
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 5h2M7 5h2M13 5h2M17 5h4M3 19h2M7 19h2M13 19h2M17 19h4M3 9v6M7 9v2M7 13v2M11 9v6M13 9v2M13 13v2M17 9v6M21 9v6" />
                                </svg>
                                <span class="text-xs font-semibold hidden sm:block">{{ isScanMode ? 'Scanning…' : 'Scan' }}</span>
                                <!-- live pulse dot -->
                                <span v-if="isScanMode" class="relative flex h-2 w-2">
                                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                            </button>
                        </div>

                        <!-- Dropdown -->
                        <div
                            v-if="showDropdown && dropdownItems.length"
                            ref="dropdownList"
                            class="absolute top-full left-0 right-0 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-xl mt-1 max-h-80 overflow-y-auto"
                        >
                            <!-- Header label when showing popular items -->
                            <div v-if="!searchQuery.trim()" class="px-4 py-1.5 bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                                {{ t('dash.quick_actions') }}
                            </div>

                            <button
                                v-for="(product, idx) in dropdownItems"
                                :key="product.id"
                                type="button"
                                class="w-full text-left px-4 py-3 flex items-center justify-between border-b border-gray-50 dark:border-slate-700 last:border-b-0 transition-colors"
                                :class="idx === activeIndex
                                    ? 'bg-blue-600 text-white'
                                    : 'hover:bg-blue-50 dark:hover:bg-slate-700'"
                                @mousedown.prevent="addToCart(product)"
                                @mouseover="activeIndex = idx"
                            >
                                <div>
                                    <p class="font-medium text-sm" :class="idx === activeIndex ? 'text-white' : 'text-gray-800 dark:text-gray-200'">{{ product.name }}</p>
                                    <p v-if="product.name_si" class="text-xs" :class="idx === activeIndex ? 'text-blue-200' : 'text-gray-500 dark:text-slate-400'">{{ product.name_si }}</p>
                                    <p class="text-xs font-mono" :class="idx === activeIndex ? 'text-blue-300' : 'text-gray-400 dark:text-slate-500'">{{ product.barcode }}</p>
                                </div>
                                <div class="text-right ml-4 flex-shrink-0">
                                    <p class="font-bold" :class="idx === activeIndex ? 'text-white' : 'text-blue-700 dark:text-blue-400'">{{ fmt(product.selling_price) }}</p>
                                    <p class="text-xs" :class="idx === activeIndex ? 'text-blue-200' : (product.stock_qty > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500')">
                                        {{ t('th.stock') }}: {{ product.stock_qty }} {{ product.unit }}
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>
                    <!-- Retail / Wholesale toggle -->
                    <div class="flex-shrink-0 flex items-center rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600 h-[60px]">
                        <button
                            type="button"
                            @click="setPriceMode('retail')"
                            class="h-full px-4 text-sm font-semibold transition-colors"
                            :class="priceMode === 'retail'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'"
                        >{{ t('lbl.retail') }}</button>
                        <button
                            type="button"
                            @click="setPriceMode('wholesale')"
                            class="h-full px-4 text-sm font-semibold transition-colors border-l border-gray-200 dark:border-slate-600"
                            :class="priceMode === 'wholesale'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-50 text-gray-500 hover:bg-green-50 hover:text-green-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'"
                        >{{ t('lbl.wholesale') }}</button>
                    </div>
                    </div>
                </div>

                <!-- Cart Table -->
                <div class="bg-gray-50 dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex-1 flex flex-col overflow-hidden">
                    <!-- Cart header -->
                    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                        <h2 class="font-bold text-gray-700 dark:text-slate-200 text-base lg:text-lg flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {{ t('page.sales') }}
                        </h2>
                        <span class="text-sm text-gray-500 dark:text-slate-400">{{ cart.length }} {{ t('th.product') }}</span>
                    </div>

                    <!-- Empty state -->
                    <div v-if="cart.length === 0" class="flex-1 flex flex-col items-center justify-center py-16 text-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        <p class="text-sm">{{ t('pos.cart_empty') }}</p>
                        <p class="text-xs mt-1">{{ t('pos.add_items') }}</p>
                    </div>

                    <!-- Cart items table (desktop) -->
                    <div v-else class="overflow-auto flex-1">
                        <table class="w-full text-sm lg:text-base">
                            <thead class="bg-gray-50 dark:bg-slate-900 sticky top-0 z-10">
                                <tr class="text-xs lg:text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    <th class="px-4 py-2.5 text-left">{{ t('th.product') }}</th>
                                    <th class="px-3 py-2.5 text-center w-28 lg:w-36">{{ t('th.qty') }}</th>
                                    <th class="px-3 py-2.5 text-right w-28 lg:w-32">{{ t('th.price') }}</th>
                                    <th v-if="canDiscount" class="px-3 py-2.5 text-right w-28 lg:w-32">{{ t('lbl.discount') }}</th>
                                    <th class="px-3 py-2.5 text-right w-28 lg:w-36">{{ t('lbl.total') }}</th>
                                    <th class="px-3 py-2.5 w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="(item, idx) in cart"
                                    :key="item.product_id"
                                    class="border-b border-gray-50 dark:border-slate-700 transition-colors"
                                    :class="idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-100/60 dark:bg-slate-800/60'"
                                >
                                    <td class="px-4 py-3">
                                        <p class="font-medium text-gray-800 dark:text-gray-100 leading-tight text-sm lg:text-base">{{ item.name }}</p>
                                        <div class="flex items-center gap-2 mt-0.5">
                                            <p class="text-xs text-gray-400 dark:text-slate-500 font-mono">{{ item.barcode }}</p>
                                            <span
                                                v-if="item.stock_qty <= item.alert_qty"
                                                class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600"
                                            >Low stock: {{ item.stock_qty }}</span>
                                        </div>
                                    </td>
                                    <td class="px-3 py-2.5">
                                        <div class="flex items-center gap-1">
                                            <button
                                                type="button"
                                                @click="updateQty(item, (parseFloat(item.qty)||1) - 1)"
                                                class="w-8 h-8 lg:w-9 lg:h-9 flex items-center justify-center rounded-md border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors text-base lg:text-lg font-bold flex-shrink-0"
                                            >−</button>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                :value="item.qty ?? ''"
                                                :placeholder="['kg','g','l','ml','liter'].includes(item.unit) ? '0' : '1'"
                                                @input="e => updateQty(item, e.target.value)"
                                                @keydown.enter.prevent="refocusSearch()"
                                                class="cart-qty-input w-14 lg:w-18 text-center border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg py-1.5 px-1 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-800 text-sm lg:text-base font-medium"
                                            />
                                            <button
                                                type="button"
                                                @click="updateQty(item, (parseFloat(item.qty)||0) + 1)"
                                                class="w-8 h-8 lg:w-9 lg:h-9 flex items-center justify-center rounded-md border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-green-50 hover:border-green-300 hover:text-green-600 transition-colors text-base lg:text-lg font-bold flex-shrink-0"
                                            >+</button>
                                        </div>
                                    </td>
                                    <td class="px-3 py-2.5">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            :value="item.unit_price"
                                            @change="e => updatePrice(item, e.target.value)"
                                            class="w-24 lg:w-28 text-right border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-800 text-sm lg:text-base font-medium text-gray-700"
                                        />
                                    </td>
                                    <td v-if="canDiscount" class="px-3 py-2.5">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            :value="item.discount"
                                            @change="e => updateDiscount(item, e.target.value)"
                                            class="w-24 lg:w-28 text-right border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-orange-800 text-sm lg:text-base"
                                        />
                                    </td>
                                    <td class="px-3 py-3 text-right">
                                        <span class="text-base lg:text-lg font-extrabold" :class="item.total < 0 ? 'text-red-600' : 'text-blue-700'">
                                            {{ fmt(item.total) }}
                                        </span>
                                    </td>
                                    <td class="px-2 py-2.5 text-center">
                                        <button
                                            type="button"
                                            @click="removeFromCart(idx)"
                                            class="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-1.5 transition-colors"
                                            :title="t('btn.delete')"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Cart footer totals (inline summary) -->
                    <div v-if="cart.length > 0" class="border-t border-gray-200 dark:border-slate-700 px-4 py-3 bg-gray-100 dark:bg-slate-900 grid grid-cols-3 gap-2">
                        <!-- Subtotal -->
                        <div class="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-2.5 gap-2">
                            <span class="text-xs lg:text-sm font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wide whitespace-nowrap">{{ t('lbl.subtotal') }}</span>
                            <span class="text-sm lg:text-base font-bold text-gray-800 dark:text-slate-200 whitespace-nowrap">{{ fmt(subtotal) }}</span>
                        </div>
                        <!-- Discount -->
                        <div class="flex items-center justify-between rounded-xl border px-3 py-2.5 gap-2"
                            :class="totalDiscount > 0
                                ? 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-900'
                                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'"
                        >
                            <span class="text-xs lg:text-sm font-medium uppercase tracking-wide whitespace-nowrap"
                                :class="totalDiscount > 0 ? 'text-orange-400 dark:text-orange-500' : 'text-gray-400 dark:text-slate-500'">
                                {{ t('lbl.discount') }}
                            </span>
                            <span class="text-sm lg:text-base font-bold whitespace-nowrap"
                                :class="totalDiscount > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-slate-600'">
                                {{ totalDiscount > 0 ? '-' + fmt(totalDiscount) : fmt(0) }}
                            </span>
                        </div>
                        <!-- Grand total -->
                        <div class="flex items-center justify-between bg-emerald-600 dark:bg-emerald-700 rounded-xl border border-emerald-500 px-3 py-2.5 gap-2">
                            <span class="text-xs lg:text-sm font-medium text-emerald-100 uppercase tracking-wide whitespace-nowrap">{{ t('lbl.grand_total') }}</span>
                            <span class="text-sm lg:text-base font-extrabold text-white whitespace-nowrap">{{ fmt(total) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Fast Moving Products -->
                <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-purple-100 dark:border-slate-700 p-3">
                    <p class="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" />
                        </svg>
                        {{ t('pos.fast_moving') }}
                    </p>
                    <div v-if="fastMovingProducts.length > 0" class="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-8 gap-1.5">
                        <button
                            v-for="product in fastMovingProducts"
                            :key="product.id"
                            type="button"
                            @click="addToCart(product)"
                            class="flex flex-col items-center text-center p-2 rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 dark:hover:bg-purple-900 hover:border-purple-300 active:scale-95 transition-all"
                        >
                            <span class="text-xs font-semibold text-purple-900 dark:text-purple-200 leading-tight line-clamp-2 w-full">{{ product.name_si || product.name }}</span>
                            <span v-if="product.sizes?.length > 0" class="text-[10px] text-purple-500 dark:text-purple-400 font-medium">{{ product.sizes.length }} sizes</span>
                            <span v-else class="text-xs font-bold text-purple-700 dark:text-purple-300 mt-0.5">{{ fmt(product.selling_price) }}</span>
                        </button>
                    </div>
                    <p v-else class="text-xs text-amber-400 italic">{{ t('prod.fast_moving_hint') }}</p>
                </div>
            </div>

            <!-- ══════════════════════════════════════════
                 RIGHT PANEL: Customer + Payment
            ═══════════════════════════════════════════ -->
            <div class="lg:w-[40%] flex flex-col gap-3">

                <!-- Totals summary + bill discount -->
                <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 space-y-2">
                    <div class="flex justify-between text-sm lg:text-base text-gray-600 dark:text-slate-300">
                        <span>{{ t('lbl.subtotal') }}</span>
                        <span class="font-medium">{{ fmt(subtotal) }}</span>
                    </div>

                    <!-- Bill-level discount row -->
                    <div class="space-y-1.5">
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-orange-600 font-medium">{{ t('lbl.discount') }}</span>
                            <span v-if="billDiscountAmt > 0" class="text-sm font-semibold text-orange-600">-{{ fmt(billDiscountAmt) }}</span>
                        </div>
                        <!-- Quick % presets -->
                        <div class="flex gap-1">
                            <button
                                v-for="pct in [5, 10, 15, 20]"
                                :key="pct"
                                type="button"
                                :disabled="cart.length === 0"
                                @click="discountType = 'percent'; billDiscount = String(pct)"
                                class="flex-1 py-1.5 rounded-lg text-xs lg:text-sm font-bold border transition-colors disabled:opacity-40"
                                :class="discountType === 'percent' && Number(billDiscount) === pct
                                    ? 'border-orange-500 bg-orange-500 text-white'
                                    : 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 dark:border-slate-600 dark:bg-slate-700 dark:text-orange-300 dark:hover:bg-slate-600'"
                            >{{ pct }}%</button>
                            <button
                                type="button"
                                :disabled="cart.length === 0"
                                @click="discountType = 'amount'; billDiscount = ''; $nextTick(() => $el.closest('.space-y-1\\.5').querySelector('input')?.focus())"
                                class="flex-1 py-1.5 rounded-lg text-xs lg:text-sm font-bold border transition-colors disabled:opacity-40"
                                :class="discountType === 'amount' && billDiscount !== ''
                                    ? 'border-orange-500 bg-orange-500 text-white'
                                    : 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 dark:border-slate-600 dark:bg-slate-700 dark:text-orange-300 dark:hover:bg-slate-600'"
                            >Rs</button>
                        </div>
                        <!-- Custom amount input (shown for Rs mode or when custom % needed) -->
                        <div class="flex gap-1">
                            <input
                                v-model="billDiscount"
                                type="number"
                                min="0"
                                step="0.01"
                                :placeholder="discountType === 'percent' ? '% value' : 'Rs. amount'"
                                :disabled="cart.length === 0"
                                class="flex-1 border border-orange-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 dark:placeholder-slate-500 rounded-lg px-2 py-1.5 text-sm lg:text-base text-right focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-orange-800 disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-400"
                            />
                            <button
                                type="button"
                                @click="discountType = discountType === 'percent' ? 'amount' : 'percent'"
                                class="w-10 rounded-lg border text-xs font-bold transition-colors"
                                :class="discountType === 'percent'
                                    ? 'border-orange-400 bg-orange-500 text-white'
                                    : 'border-orange-300 bg-orange-50 text-orange-600 dark:border-slate-600 dark:bg-slate-700 dark:text-orange-300'"
                            >{{ discountType === 'percent' ? '%' : 'Rs' }}</button>
                        </div>
                    </div>

                    <div v-if="lineDiscount > 0" class="flex justify-between text-xs text-orange-400">
                        <span>{{ t('lbl.discount') }}</span>
                        <span>-{{ fmt(lineDiscount) }}</span>
                    </div>
                    <div v-if="tax > 0" class="flex justify-between text-sm text-gray-600">
                        <span>{{ t('lbl.tax') }}</span>
                        <span class="font-medium">{{ fmt(tax) }}</span>
                    </div>
                    <div class="border-t border-gray-100 dark:border-slate-700 pt-2 flex justify-between items-baseline">
                        <span class="billing-total-label font-bold text-gray-800 dark:text-slate-100 text-base lg:text-lg">{{ t('lbl.grand_total') }}</span>
                        <span class="billing-total-amount font-bold text-blue-700 dark:text-blue-400 text-2xl lg:text-3xl">{{ fmt(total) }}</span>
                    </div>
                </div>

                <!-- Payment method buttons -->
                <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4">
                    <p class="text-xs lg:text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">{{ t('lbl.payment_method') }}</p>
                    <div class="grid grid-cols-3 gap-2">
                        <!-- Cash F2 -->
                        <button
                            type="button"
                            @click="setPaymentMethod('cash')"
                            class="flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-3 lg:py-4 min-h-[68px] lg:min-h-[80px] transition-all font-semibold text-sm lg:text-base"
                            :class="paymentMethod === 'cash'
                                ? 'border-green-500 bg-green-500 text-white shadow-md shadow-green-200'
                                : 'border-green-200 bg-green-50 text-green-700 hover:border-green-400 hover:bg-green-100 dark:border-green-900 dark:bg-green-950 dark:text-green-400 dark:hover:bg-green-900'"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span class="text-xs lg:text-sm">{{ t('pos.cash_btn') }}</span>
                        </button>

                        <!-- Card F3 -->
                        <button
                            type="button"
                            @click="setPaymentMethod('card')"
                            class="flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-3 lg:py-4 min-h-[68px] lg:min-h-[80px] transition-all font-semibold text-sm lg:text-base"
                            :class="paymentMethod === 'card'
                                ? 'border-blue-500 bg-blue-500 text-white shadow-md shadow-blue-200'
                                : 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900'"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            <span class="text-xs lg:text-sm">{{ t('pos.card_btn') }}</span>
                        </button>

                        <!-- Credit F4 -->
                        <button
                            type="button"
                            @click="setPaymentMethod('credit')"
                            class="flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-3 lg:py-4 min-h-[68px] lg:min-h-[80px] transition-all font-semibold text-sm lg:text-base"
                            :class="paymentMethod === 'credit'
                                ? 'border-red-500 bg-red-500 text-white shadow-md shadow-red-200'
                                : 'border-red-200 bg-red-50 text-red-700 hover:border-red-400 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900'"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span class="text-xs lg:text-sm">{{ t('pos.credit_btn') }}</span>
                        </button>
                    </div>

                    <!-- Customer selector — shown when Credit is selected -->
                    <div v-if="paymentMethod === 'credit'" class="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                        <div class="flex items-center justify-between mb-1.5">
                            <label class="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{{ t('lbl.customer') }}</label>
                            <button
                                type="button"
                                @click="openQuickCustomer"
                                class="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                {{ t('cust.quick_add') }}
                            </button>
                        </div>
                        <select
                            @change="selectCustomer"
                            class="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-slate-700 dark:text-gray-100"
                        >
                            <option value="">{{ t('lbl.select_customer') }}</option>
                            <option v-for="c in localCustomers" :key="c.id" :value="c.id" :selected="selectedCustomer?.id === c.id">
                                {{ c.name }} {{ c.phone ? `· ${c.phone}` : '' }}
                            </option>
                        </select>
                        <div v-if="selectedCustomer" class="mt-1.5 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span class="font-medium">{{ selectedCustomer.name }}</span>
                            <span v-if="selectedCustomer.phone" class="text-blue-500">{{ selectedCustomer.phone }}</span>
                        </div>
                        <div v-if="!selectedCustomer" class="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {{ t('lbl.credit_warn') }}
                        </div>
                    </div>
                </div>

                <!-- Cash / Credit payment: amount paid + balance -->
                <div v-if="paymentMethod === 'cash' || paymentMethod === 'credit'" class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border p-4 space-y-3" :class="paymentMethod === 'credit' ? 'border-red-200 dark:border-red-900' : 'border-green-200 dark:border-green-900'">
                    <div>
                        <div class="flex items-center gap-1.5 mb-1.5">
                            <label class="text-sm lg:text-base font-semibold text-gray-700 dark:text-slate-300 flex-shrink-0">
                                {{ paymentMethod === 'credit' ? t('lbl.optional') : t('lbl.cash_paid') }}
                            </label>
                            <div class="flex flex-wrap gap-1 flex-1">
                                <button
                                    v-for="amt in [100, 200, 500, 1000, 2000, 5000]"
                                    :key="amt"
                                    type="button"
                                    @click="cashPaid = amt"
                                    class="px-2 py-1 rounded-md text-xs lg:text-sm font-semibold border transition-colors"
                                    :class="Number(cashPaid) === amt
                                        ? 'border-green-500 bg-green-500 text-white'
                                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-green-300 hover:bg-green-50 hover:text-green-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:border-green-700 dark:hover:bg-green-900 dark:hover:text-green-300'"
                                >{{ amt }}</button>
                            </div>
                            <button
                                type="button"
                                @click="cashPaid = total.toFixed(2)"
                                class="text-xs lg:text-sm font-bold px-2.5 py-1 rounded-lg bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 transition-colors flex-shrink-0"
                            >= හරි මුදල</button>
                        </div>
                        <input
                            id="cash-paid-input"
                            v-model="cashPaid"
                            type="number"
                            min="0"
                            step="0.01"
                            :placeholder="paymentMethod === 'credit' ? '0.00' : '0.00'"
                            @keydown.enter.prevent="submitSale"
                            class="w-full border-2 rounded-xl px-4 py-3 text-xl lg:text-2xl font-bold focus:outline-none min-h-[56px] lg:min-h-[68px] dark:bg-slate-700 dark:placeholder-slate-500"
                            :class="[
                                shakePaid ? 'shake-field border-red-500 text-red-700 dark:text-red-400' :
                                    paymentMethod === 'credit'
                                        ? 'border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 focus:ring-2 focus:ring-red-400 focus:border-red-500'
                                        : 'border-green-300 dark:border-green-800 text-green-800 dark:text-green-300 focus:ring-2 focus:ring-green-400 focus:border-green-500'
                            ]"
                        />
                    </div>
                    <div v-if="cashPaid" class="flex items-center justify-between rounded-lg px-4 py-3"
                        :class="balance >= 0 ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900' : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900'"
                    >
                        <span class="font-semibold text-sm" :class="balance >= 0 ? 'text-green-700' : 'text-red-700'">{{ t('lbl.change') }}</span>
                        <span class="text-xl font-bold" :class="balance >= 0 ? 'text-green-700' : 'text-red-600'">
                            {{ fmt(Math.abs(balance)) }}
                            <span class="text-sm font-normal ml-1">{{ balance < 0 ? '(' + t('th.balance') + ')' : '(' + t('lbl.change') + ')' }}</span>
                        </span>
                    </div>
                </div>

                <!-- Action buttons -->
                <div class="flex flex-col gap-2 mt-auto">
                    <!-- Complete Sale -->
                    <button
                        type="button"
                        @click="submitSale"
                        :disabled="cart.length === 0 || submitting || form.processing"
                        class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-lg lg:text-xl py-4 lg:py-5 rounded-xl transition-colors min-h-[64px] lg:min-h-[72px] shadow-lg shadow-blue-100"
                    >
                        <svg v-if="!submitting && !form.processing" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <svg v-else class="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        <span>{{ submitting || form.processing ? t('lbl.loading') : t('pos.complete_sale') }}</span>
                    </button>

                    <!-- Hold Bill row: hold current + view held list -->
                    <div class="flex gap-2">
                        <button
                            type="button"
                            @click="holdBill"
                            :disabled="cart.length === 0"
                            class="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold text-sm lg:text-base py-3.5 lg:py-4 rounded-xl transition-colors min-h-[56px] lg:min-h-[64px]"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{{ t('pos.hold_bill') }}</span>
                        </button>
                        <!-- Held bills list button with badge -->
                        <button
                            v-if="heldBills.length > 0"
                            type="button"
                            @click="showHeldBillsModal = true"
                            class="relative flex items-center justify-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold px-4 rounded-xl transition-colors min-h-[56px] min-w-[60px]"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span class="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                {{ heldBills.length }}
                            </span>
                        </button>
                    </div>

                    <!-- Clear cart -->
                    <button
                        v-if="cart.length > 0"
                        type="button"
                        @click="cart = []; selectedCustomer = null; cashPaid = ''; errorMsg = ''; refocusSearch()"
                        class="w-full text-center text-sm text-gray-400 hover:text-red-500 py-2 transition-colors"
                    >
                        {{ t('btn.clear') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- ══ Quick Customer Modal ══ -->
        <Teleport to="body">
            <div v-if="showQuickCustomer" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
                    <h2 class="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        {{ t('cust.quick_add') }}
                    </h2>

                    <!-- Name -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            {{ t('cust.name') }} <span class="text-red-500">*</span>
                        </label>
                        <input
                            id="qc-name-input"
                            v-model="quickCustomerName"
                            type="text"
                            class="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 dark:placeholder-slate-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px]"
                            :placeholder="t('cust.name')"
                            @keydown.enter.prevent="saveQuickCustomer"
                        />
                    </div>

                    <!-- Phone -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            {{ t('cust.phone') }}
                        </label>
                        <input
                            v-model="quickCustomerPhone"
                            type="tel"
                            class="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 dark:placeholder-slate-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px]"
                            :placeholder="t('cust.phone')"
                            @keydown.enter.prevent="saveQuickCustomer"
                        />
                    </div>

                    <!-- Error -->
                    <p v-if="quickCustomerError" class="text-sm text-red-600 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-2">
                        {{ quickCustomerError }}
                    </p>

                    <!-- Actions -->
                    <div class="flex gap-3 pt-1">
                        <button
                            type="button"
                            @click="saveQuickCustomer"
                            :disabled="quickSaving"
                            class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors min-h-[48px]"
                        >
                            {{ quickSaving ? t('lbl.saving') : t('btn.save') }}
                        </button>
                        <button
                            type="button"
                            @click="showQuickCustomer = false"
                            class="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 font-semibold py-3 rounded-xl transition-colors min-h-[48px]"
                        >
                            {{ t('btn.cancel') }}
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- ══ Size Picker Modal ══ -->
        <Teleport to="body">
            <div v-if="showSizePicker && sizePickerProduct" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showSizePicker = false">
                <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
                    <h2 class="text-base font-bold text-gray-800 dark:text-slate-100 mb-1">{{ sizePickerProduct.name_si || sizePickerProduct.name }}</h2>
                    <p class="text-xs text-gray-400 dark:text-slate-500 mb-4">{{ t('pos.select_size') }}</p>
                    <div class="grid grid-cols-3 gap-2">
                        <button
                            v-for="(size, idx) in sizePickerProduct.sizes"
                            :key="size.id"
                            type="button"
                            @click="selectSize(size)"
                            @mouseover="sizeActiveIndex = idx"
                            class="flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 active:scale-95 transition-all"
                            :class="idx === sizeActiveIndex
                                ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-200'
                                : 'border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600'"
                        >
                            <span class="font-bold text-sm" :class="idx === sizeActiveIndex ? 'text-white' : 'text-gray-800 dark:text-gray-100'">{{ size.label }}</span>
                            <span class="text-xs font-semibold" :class="idx === sizeActiveIndex ? 'text-blue-200' : 'text-blue-600 dark:text-blue-400'">{{ fmt(size.price) }}</span>
                        </button>
                    </div>
                    <button
                        type="button"
                        @click="showSizePicker = false; sizePickerProduct = null"
                        class="w-full mt-4 py-2.5 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    >{{ t('btn.cancel') }}</button>
                </div>
            </div>
        </Teleport>

        <!-- ══ Held Bills List Modal ══ -->
        <Teleport to="body">
            <div v-if="showHeldBillsModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showHeldBillsModal = false">
                <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                    <div class="flex items-center justify-between">
                        <h2 class="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Held Bills
                        </h2>
                        <span class="text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 font-bold px-2 py-1 rounded-full">{{ heldBills.length }}</span>
                    </div>
                    <div class="space-y-2 max-h-80 overflow-y-auto">
                        <div
                            v-for="(bill, index) in heldBills"
                            :key="bill.id"
                            class="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-700 bg-gray-50 dark:bg-slate-700 hover:bg-amber-50 dark:hover:bg-slate-600 transition-colors"
                        >
                            <div class="min-w-0">
                                <p class="text-sm font-semibold text-gray-800 dark:text-slate-100">
                                    Bill #{{ index + 1 }}
                                    <span v-if="bill.note" class="text-gray-500 dark:text-slate-400 font-normal ml-1">— {{ bill.note }}</span>
                                </p>
                                <p class="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                                    {{ bill.cart.length }} items ·
                                    {{ fmt(bill.cart.reduce((s, i) => s + i.qty * i.unit_price, 0)) }}
                                    <span v-if="bill.customer"> · {{ bill.customer.name }}</span>
                                </p>
                            </div>
                            <div class="flex gap-2 ml-3 flex-shrink-0">
                                <button
                                    type="button"
                                    @click="restoreHeldBill(index)"
                                    class="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                                >Restore</button>
                                <button
                                    type="button"
                                    @click="deleteHeldBill(index)"
                                    class="px-2 py-1.5 text-xs font-bold text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        @click="showHeldBillsModal = false"
                        class="w-full py-2.5 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    >Close</button>
                </div>
            </div>
        </Teleport>

        <!-- ══ Hold Bill Modal ══ -->
        <Teleport to="body">
            <div v-if="showHoldModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
                    <h2 class="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {{ t('pos.hold_bill') }}
                    </h2>
                    <p class="text-sm text-gray-500 dark:text-slate-400">{{ cart.length }} {{ t('th.product') }} ({{ fmt(total) }})</p>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{{ t('lbl.note') }} ({{ t('lbl.optional') }})</label>
                        <input
                            v-model="holdNote"
                            type="text"
                            :placeholder="t('pos.hold_note')"
                            class="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 dark:placeholder-slate-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                        />
                    </div>
                    <div class="flex gap-3">
                        <button
                            type="button"
                            @click="confirmHold"
                            class="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition-colors min-h-[48px]"
                        >
                            {{ t('btn.hold') }}
                        </button>
                        <button
                            type="button"
                            @click="showHoldModal = false"
                            class="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 font-semibold py-3 rounded-xl transition-colors min-h-[48px]"
                        >
                            {{ t('btn.cancel') }}
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>
    </AuthenticatedLayout>
</template>

<style scoped>
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    15%       { transform: translateX(-8px); }
    30%       { transform: translateX(8px); }
    45%       { transform: translateX(-6px); }
    60%       { transform: translateX(6px); }
    75%       { transform: translateX(-4px); }
    90%       { transform: translateX(4px); }
}
.shake-field {
    animation: shake 0.55s ease;
}

</style>
