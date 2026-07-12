<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head, Link, useForm, usePage } from '@inertiajs/vue3';
import { ref, computed, inject, onMounted, onUnmounted, nextTick } from 'vue';
import { showNumpad } from '@/composables/useNumpad.js';
import axios from 'axios';
import { getProducts, invalidateProducts } from '@/stores/productCache';

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
    if (document.fullscreenElement) {
        exitFullscreen();
    } else {
        if (posFullscreen) posFullscreen.value = true;
        document.documentElement.requestFullscreen?.().catch(() => {});
    }
}

function exitFullscreen() {
    if (posFullscreen) posFullscreen.value = false;
    if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
    }
}

function onFullscreenChange() {
    if (posFullscreen) posFullscreen.value = !!document.fullscreenElement;
}

// ─── Auth / Permissions ───────────────────────────────────────────────────────
const page        = usePage();
const authUser    = computed(() => page.props.auth?.user);
const canDiscount = computed(() =>
    ['admin', 'manager', 'cashier'].includes(authUser.value?.role)
);

// ─── Refs ─────────────────────────────────────────────────────────────────────
const searchInput     = ref(null);
const dropdownList    = ref(null);
const searchContainer = ref(null);
const searchQuery    = ref('');
const searchResults  = ref([]);
const showDropdown   = ref(false);
const activeIndex    = ref(-1);   // highlighted row in dropdown (-1 = none)

const allProducts    = ref([]);   // full catalogue, loaded on mount
const productsReady  = ref(false);

const cart             = ref([]);
const selectedCustomer = ref(null);
const priceMode        = ref('retail'); // 'retail' | 'wholesale'
const paymentMethod      = ref('cash');
const cashPaid           = ref('');
const cardReceiptNo      = ref('');
const splitCashAmt       = ref('');
const splitCardReceiptNo = ref('');
const shakePaid          = ref(false);
const billDiscount     = ref('');   // bill-level discount (Rs.)
const discountType     = ref('amount'); // 'amount' | 'percent'
const showCustomForm   = ref(false);
const customName       = ref('');
const customPrice      = ref('');
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
    items:           [],
    customer_id:     null,
    payment_method:  'cash',
    card_receipt_no: '',
    split_cash:      0,
    split_card:      0,
    paid:            0,
    subtotal:        0,
    discount:        0,
    tax:             0,
    total:           0,
    extra_charges:   null,
    skip_print:      false,
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
        const capped = Math.min(v, 70);
        return Math.min((subtotal.value - lineDiscount.value) * capped / 100, subtotal.value - lineDiscount.value);
    }
    return Math.min(v, subtotal.value - lineDiscount.value);
});
const totalDiscount = computed(() => lineDiscount.value + billDiscountAmt.value);
const tax     = computed(() => 0);
const total   = computed(() => Math.max(0, subtotal.value - totalDiscount.value + tax.value));
const balance       = computed(() => (parseFloat(cashPaid.value) || 0) - total.value);
const splitCardAmt  = computed(() => Math.max(0, total.value - (parseFloat(splitCashAmt.value) || 0)));

// ─── Dropdown items: popular when query empty, search results otherwise ───────
const dropdownItems = computed(() =>
    searchQuery.value.trim() === '' ? [] : searchResults.value
);

// ─── Size picker ─────────────────────────────────────────────────────────────
const sizePickerProduct = ref(null);
const showSizePicker    = ref(false);
const sizeActiveIndex   = ref(0);
const sizePickerQty     = ref('');
const sizeQtyInput      = ref(null);
const customWeightInput = ref(null);

let blockNextDropdownOpen = false; // prevents dropdown reopening after outside click

function selectSize(size) {
    const p   = sizePickerProduct.value;
    const qty = parseFloat(sizePickerQty.value) || null;
    showSizePicker.value    = false;
    sizePickerProduct.value = null;
    sizeActiveIndex.value   = 0;
    sizePickerQty.value     = '';
    refocusSearch();
    addToCart({
        ...p,
        variant_id:      size.id,
        name:            p.name + ' - ' + size.label,
        name_si:         p.name_si ? p.name_si + ' - ' + size.label : null,
        selling_price:   size.price,
        wholesale_price: size.price,
        unit:            'pcs',
        sizes:           [],
    }, qty, false);
}

function addCustomWeight() {
    const p    = sizePickerProduct.value;
    const unit = (p?.unit || 'kg').toLowerCase();
    const raw  = parseFloat(sizePickerQty.value);
    if (!raw || raw <= 0 || !p) return;

    const unitPrice = parseFloat(p.selling_price) || 0;

    // kg → enter grams, l → enter ml; both divide by 1000
    let qty, label;
    if (unit === 'kg') {
        qty   = parseFloat((raw / 1000).toFixed(4));
        label = raw + 'g';
    } else if (unit === 'l' || unit === 'ml') {
        qty   = parseFloat((raw / 1000).toFixed(4));
        label = raw + 'ml';
    } else {
        qty   = parseFloat(raw.toFixed(2));
        label = qty + unit;
    }

    showSizePicker.value    = false;
    sizePickerProduct.value = null;
    sizeActiveIndex.value   = 0;
    sizePickerQty.value     = '';
    refocusSearch();

    addToCart({
        ...p,
        variant_id:      null,
        name:            p.name + ' - ' + label,
        name_si:         p.name_si ? p.name_si + ' - ' + label : null,
        selling_price:   unitPrice,
        wholesale_price: parseFloat(p.wholesale_price) || unitPrice,
        unit:            unit,
        sizes:           [],
    }, qty);
}

// ─── Barcode scan detection (search field) ────────────────────────────────────
const lastKeyTime    = ref(0);
const keyIntervals   = ref([]);
const isScanMode     = ref(false);

// ─── Barcode scan guard — discount / price fields ────────────────────────────
// Same timing-based detection as qty: intercept digits, buffer them, confirm scan
// on Enter if chars arrived fast (< 60ms apart). Otherwise treat as manual input.
let fldBuffer      = '';
let fldLastKeyTime = 0;
let fldIsScanning  = false;
let fldSavedValue  = null;
let fldScanTimer   = null;

function resetFldState() {
    fldBuffer      = '';
    fldLastKeyTime = 0;
    fldIsScanning  = false;
    fldSavedValue  = null;
    if (fldScanTimer) { clearTimeout(fldScanTimer); fldScanTimer = null; }
}

function onFieldKeydown(e, item, field) {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (fldScanTimer) { clearTimeout(fldScanTimer); fldScanTimer = null; }

        if (fldIsScanning && fldBuffer.length >= 4) {
            const barcode = fldBuffer;
            // Restore original field value
            e.target.value = fldSavedValue ?? '';
            if (field === 'discount') updateDiscount(item, fldSavedValue ?? 0);
            else                      updatePrice(item, fldSavedValue ?? item.unit_price);
            resetFldState();
            const hit = allProducts.value.find(p => p.barcode === barcode);
            if (hit) addToCart(hit, null, false);
            refocusSearch();
        } else if (fldBuffer.length > 0) {
            // Manual value typed — apply it
            const val = fldBuffer;
            resetFldState();
            if (field === 'discount') updateDiscount(item, val);
            else                      updatePrice(item, val);
            e.target.value = val;
            refocusSearch();
        } else {
            resetFldState();
        }
        return;
    }

    if (e.key === 'Backspace') {
        if (!fldIsScanning && fldBuffer.length > 0) {
            e.preventDefault();
            fldBuffer      = fldBuffer.slice(0, -1);
            e.target.value = fldBuffer || '';
        } else {
            resetFldState();
        }
        return;
    }

    if (e.key.length !== 1 || !/[0-9.]/.test(e.key)) return;

    e.preventDefault();

    const now      = Date.now();
    const interval = fldLastKeyTime > 0 ? now - fldLastKeyTime : 9999;
    fldLastKeyTime = now;

    if (fldScanTimer) { clearTimeout(fldScanTimer); fldScanTimer = null; }

    if (fldBuffer.length === 0) fldSavedValue = e.target.value; // save before first char

    if (interval < 60 && fldBuffer.length > 0) {
        fldIsScanning = true;
        fldBuffer    += e.key;
    } else {
        fldIsScanning = false;
        fldBuffer    += e.key;
        const el   = e.target;
        const snap = fldBuffer;
        fldScanTimer = setTimeout(() => {
            fldScanTimer = null;
            if (!fldIsScanning && fldBuffer === snap) el.value = fldBuffer;
        }, 80);
    }
}

// ─── Barcode scan detection (qty field) ───────────────────────────────────────
// All digit keys are intercepted so @input never fires during a scan.
// A 80ms timer reveals the char if no second fast char arrives (manual typing).
let qtyBuffer      = '';
let qtyLastKeyTime = 0;
let qtyIsScanning  = false;
let qtySavedQty    = null;
let qtyScanTimer   = null;

function resetQtyState() {
    qtyBuffer      = '';
    qtyLastKeyTime = 0;
    qtyIsScanning  = false;
    qtySavedQty    = null;
    if (qtyScanTimer) { clearTimeout(qtyScanTimer); qtyScanTimer = null; }
}

function onQtyKeydown(e, item) {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (qtyScanTimer) { clearTimeout(qtyScanTimer); qtyScanTimer = null; }

        if (qtyIsScanning && qtyBuffer.length >= 4) {
            // Scanner confirmed — restore qty and add the scanned product
            const barcode  = qtyBuffer;
            const savedQty = qtySavedQty;
            resetQtyState();
            if (savedQty !== null) { item.qty = savedQty; e.target.value = savedQty; recalcLine(item); }
            const hit = allProducts.value.find(p => p.barcode === barcode);
            if (hit) addToCart(hit, null, false);
            refocusSearch();
        } else if (!qtyIsScanning && qtyBuffer.length > 0) {
            // Manual qty typed — apply the buffered value as the new qty
            const newQty = parseFloat(qtyBuffer);
            resetQtyState();
            if (!isNaN(newQty) && newQty > 0) updateQty(item, newQty, e.target);
            refocusSearch();
        } else {
            resetQtyState();
            refocusSearch();
        }
        return;
    }

    if (e.key === 'Backspace') {
        if (!qtyIsScanning && qtyBuffer.length > 0) {
            e.preventDefault();
            qtyBuffer      = qtyBuffer.slice(0, -1);
            e.target.value = qtyBuffer || '';
        } else {
            resetQtyState(); // discard scan buffer on backspace
        }
        return;
    }

    // Only intercept printable digit / decimal chars
    if (e.key.length !== 1 || !/[0-9.]/.test(e.key)) return;

    e.preventDefault(); // always intercept — prevents @input from corrupting item.qty

    const now      = Date.now();
    const interval = qtyLastKeyTime > 0 ? now - qtyLastKeyTime : 9999;
    qtyLastKeyTime = now;

    if (qtyScanTimer) { clearTimeout(qtyScanTimer); qtyScanTimer = null; }

    if (interval < 60 && qtyBuffer.length > 0) {
        // Fast char after buffered content → scanner confirmed
        qtyIsScanning = true;
        qtyBuffer    += e.key;
    } else {
        // First char, or slow manual char
        if (qtyBuffer.length === 0) qtySavedQty = item.qty; // save original on first char
        qtyIsScanning = false;
        qtyBuffer    += e.key;

        // Show the typed char(s) after 80ms if no fast second char arrives (manual typing)
        // Also update item.qty live so the total recalculates without needing Enter.
        const el   = e.target;
        const snap = qtyBuffer;
        qtyScanTimer = setTimeout(() => {
            qtyScanTimer = null;
            if (!qtyIsScanning && qtyBuffer === snap) {
                el.value = qtyBuffer;
                const n = parseFloat(qtyBuffer);
                if (!isNaN(n) && n > 0) updateQty(item, n, el);
            }
        }, 80);
    }
}

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
    activeIndex.value = -1;
    if (blockNextDropdownOpen) { blockNextDropdownOpen = false; return; }
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
        showDropdown.value  = false;
        resetScanState();
        return;
    }
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
        if (hit) addToCart(hit, null, false); // false = don't move focus to qty after scan
        refocusSearch();
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

function addToCart(product, initialQty = null, focusQty = true) {
    // Show size picker first — stock lives on variants, not the parent
    if (product.sizes?.length > 0) {
        sizePickerProduct.value = product;
        showSizePicker.value    = true;
        sizeActiveIndex.value   = 0;
        sizePickerQty.value     = '';
        nextTick(() => sizeQtyInput.value?.focus());
        searchQuery.value       = '';
        searchResults.value     = [];
        showDropdown.value      = false;
        activeIndex.value       = -1;
        return;
    }

    // Block out-of-stock items (variants already handled above)
    if ((product.stock_qty ?? 0) <= 0) {
        errorMsg.value = t('err.out_of_stock');
        refocusSearch();
        return;
    }

    const isWeightUnit = ['kg', 'g'].includes((product.unit || '').toLowerCase());
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
            const maxQty = existing.stock_qty > 0 ? existing.stock_qty : Infinity;
            existing.qty = Math.min(existing.qty + 1, maxQty);
            recalcLine(existing);
        }
        if (focusQty) {
            nextTick(() => {
                const idx = cart.value.indexOf(existing);
                const inputs = document.querySelectorAll('.cart-qty-input');
                if (inputs[idx]) { inputs[idx].focus(); inputs[idx].select(); }
            });
        }
    } else {
        const wsPrice    = parseFloat(product.wholesale_price) || 0;
        const promoPrice = product.promo_price ? parseFloat(product.promo_price) : null;
        const basePrice  = promoPrice ?? (parseFloat(product.selling_price) || 0);
        const unitPrice  = priceMode.value === 'wholesale' && wsPrice > 0 ? wsPrice : basePrice;

        const startQty = initialQty !== null ? initialQty : (isWeightUnit ? null : 1);
        cart.value.push({
            product_id:      product.id,
            variant_id:      variantId,
            name:            product.name_si ? `${product.name} / ${product.name_si}` : product.name,
            barcode:         product.barcode || '',
            image:           product.image || '',
            qty:             startQty,
            unit_price:      unitPrice,
            selling_price:   parseFloat(product.selling_price) || 0,
            promo_price:     promoPrice,
            wholesale_price: wsPrice,
            discount:        0,
            total:           0,
            unit:            product.unit || 'pcs',
            stock_qty:       product.stock_qty || 0,
            alert_qty:       product.alert_qty || 5,
        });
        if (startQty !== null) recalcLine(cart.value[cart.value.length - 1]);
        if (focusQty) nextTick(() => {
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

function updateQty(item, val, inputEl = null) {
    const n = parseFloat(val);
    if (isNaN(n)) return;

    const max = item.stock_qty > 0 ? item.stock_qty : Infinity;
    const clamped = Math.max(1, Math.min(n, max));

    if (n > max) {
        errorMsg.value = `"${item.name}" — only ${fmtQty(item.stock_qty)} in stock.`;
    }

    item.qty = clamped;
    recalcLine(item);

    // If the reactive value didn't change (already at max), Vue won't re-render
    // the uncontrolled input, so we force it manually.
    if (inputEl) {
        nextTick(() => { inputEl.value = clamped; });
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
    if (method === 'card') {
        cardReceiptNo.value = '';
        nextTick(() => document.getElementById('card-receipt-input')?.focus());
    }
    if (method === 'cash') {
        nextTick(() => document.getElementById('cash-paid-input')?.focus());
    }
    if (method === 'split') {
        splitCashAmt.value       = '';
        splitCardReceiptNo.value = '';
        nextTick(() => document.getElementById('split-cash-input')?.focus());
    }
}

// ─── Custom item ──────────────────────────────────────────────────────────────
function addCustomItem() {
    const price = parseFloat(customPrice.value);
    if (!customName.value.trim() || !price || price <= 0) return;
    cart.value.push({
        product_id:      null,
        variant_id:      null,
        name:            customName.value.trim(),
        barcode:         '',
        qty:             1,
        unit_price:      price,
        selling_price:   price,
        promo_price:     null,
        wholesale_price: 0,
        discount:        0,
        total:           price,
        unit:            'pcs',
        stock_qty:       9999999,
        alert_qty:       0,
        is_custom:       true,
    });
    customName.value     = '';
    customPrice.value    = '';
    showCustomForm.value = false;
    refocusSearch();
}

// ─── Submit sale ──────────────────────────────────────────────────────────────
function submitSale(skipPrint = false) {
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
    if (paymentMethod.value === 'split') {
        const sc = parseFloat(splitCashAmt.value) || 0;
        if (sc <= 0) {
            nextTick(() => {
                const el = document.getElementById('split-cash-input');
                if (el) { el.focus(); el.select(); }
            });
            errorMsg.value = 'කරුණාකර බෙදීමේ මුදල් ප්‍රමාණය ඇතුළු කරන්න.';
            return;
        }
        if (sc >= total.value) {
            errorMsg.value = 'Split cash must be less than total. Use Cash payment instead.';
            return;
        }
    }
    submitting.value = true;
    form.items          = cart.value.map(i => ({
        product_id:     i.product_id,
        variant_id:     i.variant_id || null,
        name:           i.name,
        qty:            i.qty,
        unit_price:     i.unit_price,
        original_price: i.promo_price ? i.selling_price : null,
        discount:       i.discount,
        total:          i.total,
    }));
    form.customer_id     = selectedCustomer.value?.id || null;
    form.payment_method  = paymentMethod.value;
    form.card_receipt_no = paymentMethod.value === 'card'
        ? cardReceiptNo.value
        : paymentMethod.value === 'split'
            ? splitCardReceiptNo.value
            : '';
    form.split_cash      = paymentMethod.value === 'split' ? (parseFloat(splitCashAmt.value) || 0) : 0;
    form.split_card      = paymentMethod.value === 'split' ? splitCardAmt.value : 0;
    form.paid           = paymentMethod.value === 'cash'
        ? parseFloat(cashPaid.value) || 0
        : paymentMethod.value === 'credit'
            ? parseFloat(cashPaid.value) || 0
            : total.value;
    form.subtotal       = subtotal.value;
    form.discount       = totalDiscount.value;
    form.tax            = tax.value;
    form.total          = total.value;
    form.extra_charges  = null;
    form.skip_print     = skipPrint;

    form.post(route('sales.store'), {
        onSuccess: () => {
            // Bust the cache so the next POS session loads fresh stock_qty from server
            invalidateProducts();
            // Optimistically deduct sold quantities from in-memory list for current session
            cart.value.forEach(item => {
                const p = allProducts.value.find(p => p.id === item.product_id);
                if (p) p.stock_qty = Math.max(0, (p.stock_qty || 0) - item.qty);
            });
        },
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
        id:        Date.now(),
        note:      holdNote.value,
        cart:      cart.value,
        customer:  selectedCustomer.value,
        createdAt: new Date().toISOString(),
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
    // Barcode scanner input when numpad mode is on (search input is readonly/blurred)
    if (numpadEnabled.value && !showNumpad.value) {
        const tag = document.activeElement?.tagName?.toUpperCase();
        const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
        if (!isEditable && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            const now = Date.now();
            if (now - barcodeLastTime > 80) barcodeBuffer = '';
            barcodeBuffer  += e.key;
            barcodeLastTime = now;
            e.preventDefault();
            return;
        }
        if (!isEditable && e.key === 'Enter' && barcodeBuffer.length >= 4) {
            e.preventDefault();
            const code = barcodeBuffer;
            barcodeBuffer   = '';
            barcodeLastTime = 0;
            const hit = allProducts.value.find(p => p.barcode === code);
            if (hit) {
                addToCartTouched(hit);
            } else {
                browserQuery.value = code;
                showProductBrowser.value = true;
            }
            return;
        }
    }

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
        case 'F5':     e.preventDefault(); setPaymentMethod('split'); break;
        case 'F5':     e.preventDefault(); holdBill();               break;
        case 'F10':    e.preventDefault(); submitSale(false);         break;
        case 'F11':    e.preventDefault(); submitSale(true);          break;
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

async function loadAllProducts() {
    try {
        allProducts.value   = await getProducts();
        productsReady.value = true;
    } catch {
        productsReady.value = true;
    }
}

function handleOutsideClick(e) {
    if (searchContainer.value && !searchContainer.value.contains(e.target)) {
        showDropdown.value    = false;
        activeIndex.value     = -1;
        blockNextDropdownOpen = true;
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
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}

function fmtNum(val) {
    return Number(val || 0).toLocaleString('en-LK', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}

function fmtQty(val) {
    const n = parseFloat(val) || 0;
    return n % 1 === 0 ? n.toString() : n.toString();
}

const focusedPriceIdx = ref(null);

// ─── Touch Numpad (global — injected from AuthenticatedLayout) ───────────────
const numpadEnabled = inject('numpadEnabled', computed(() => false));
const openNumpad    = inject('openNumpad', () => {});

// Global barcode buffer for numpad mode (barcode scanner bypasses readonly inputs)
let barcodeBuffer   = '';
let barcodeLastTime = 0;

function openCartNumpad(item, field) {
    const currentVal = field === 'qty' ? item.qty
        : field === 'unit_price' ? item.unit_price
        : item.discount;
    openNumpad(currentVal, item.name, (val) => {
        if (field === 'qty') {
            const n = parseFloat(val);
            if (!isNaN(n) && n > 0) updateQty(item, n);
        } else if (field === 'unit_price') {
            updatePrice(item, val);
        } else if (field === 'discount') {
            updateDiscount(item, val);
        }
        refocusSearch();
    }, { max: field === 'qty' && item.stock_qty > 0 ? item.stock_qty : null });
}

// ─── Product Browser (touch mode search) ─────────────────────────────────────
const showProductBrowser = ref(false);
const browserQuery       = ref('');
const browserSearchInput = ref(null);

const browserProducts = computed(() => {
    const q = browserQuery.value.trim().toLowerCase();
    const list = allProducts.value;
    if (!q) return list.slice(0, 80);
    return list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.name_si && p.name_si.includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
    ).slice(0, 80);
});

function openProductBrowser() {
    if (!productsReady.value) return;
    browserQuery.value = '';
    showProductBrowser.value = true;
    nextTick(() => browserSearchInput.value?.focus());
}

function selectFromBrowser(product) {
    showProductBrowser.value = false;
    browserQuery.value = '';
    addToCartTouched(product);
}

// When touch numpad is on, intercept product tap to ask qty before adding
function addToCartTouched(product) {
    if (!numpadEnabled.value || product.sizes?.length > 0) { addToCart(product); return; }
    if ((product.stock_qty ?? 0) <= 0) { errorMsg.value = t('err.out_of_stock'); return; }
    const label = product.name_si ? product.name_si + ' / ' + product.name : product.name;
    openNumpad('1', label, (val) => {
        const qty = parseFloat(val);
        if (!isNaN(qty) && qty > 0) addToCart(product, qty);
    }, { max: product.stock_qty > 0 ? product.stock_qty : null });
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

                <div class="hidden sm:flex items-center gap-1.5 ml-auto flex-wrap">
                    <template v-for="hint in [
                        { key: 'F1', label: 'Search' },
                        { key: 'F2', label: 'Cash' },
                        { key: 'F3', label: 'Card' },
                        { key: 'F4', label: 'Credit' },
                        { key: 'F5', label: 'Split' },
                        { key: 'F10', label: 'Complete' },
                    ]" :key="hint.key">
                        <span class="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-2 py-0.5">
                            <kbd class="text-[10px] font-bold text-blue-600 dark:text-blue-400">{{ hint.key }}</kbd>
                            <span class="text-[10px] text-gray-500 dark:text-slate-400">{{ hint.label }}</span>
                        </span>
                    </template>
                </div>

                <!-- Day End Report -->
                <Link
                    :href="route('reports.day-end')"
                    class="btn-3d btn-primary-3d flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm"
                    title="Day End Report"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Day End
                </Link>

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
                    :title="posFullscreen?.value ? 'Exit Fullscreen (Esc)' : 'Fullscreen'"
                >
                    <!-- Enter fullscreen icon -->
                    <svg v-if="!posFullscreen?.value" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <div class="flex-1 lg:w-[60%] flex flex-col gap-1 min-w-0">

                <!-- Barcode / Product Search -->
                <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-3">
                    <p class="text-xs font-bold text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold leading-none">1</span>
                        Add Products
                    </p>
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
                            :readonly="numpadEnabled"
                            class="w-full pl-12 pr-28 py-2.5 text-base lg:text-lg border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 min-h-[44px] lg:min-h-[50px] font-medium bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-900"
                            :class="numpadEnabled ? 'cursor-pointer' : ''"
                            @focus="numpadEnabled ? $event.target.blur() : onSearchFocus()"
                            @click="numpadEnabled && openProductBrowser()"
                            @blur="numpadEnabled ? null : onSearchBlur($event)"
                            @input="numpadEnabled ? null : onSearchInput()"
                            @keypress="numpadEnabled ? null : onSearchKeypress($event)"
                            @keydown.enter="numpadEnabled ? null : onSearchEnter($event)"
                            @keydown.arrow-down="numpadEnabled ? null : onArrowDown($event)"
                            @keydown.arrow-up="numpadEnabled ? null : onArrowUp($event)"
                            @keydown.escape="numpadEnabled ? null : (showDropdown = false, searchQuery = '', activeIndex = -1)"
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
                                class="w-full text-left px-3 py-2.5 flex items-center gap-3 border-b border-gray-50 dark:border-slate-700 last:border-b-0 transition-colors"
                                :class="idx === activeIndex
                                    ? 'bg-blue-600 text-white'
                                    : 'hover:bg-blue-50 dark:hover:bg-slate-700'"
                                @mousedown.prevent="addToCartTouched(product)"
                                @mouseover="activeIndex = idx"
                            >
                                <!-- Thumbnail -->
                                <img
                                    v-if="product.image"
                                    :src="product.image"
                                    :alt="product.name"
                                    class="w-10 h-10 rounded-lg object-cover flex-shrink-0 border"
                                    :class="idx === activeIndex ? 'border-blue-400' : 'border-gray-100'"
                                />
                                <div v-else class="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
                                    :class="idx === activeIndex ? 'bg-blue-500' : 'bg-gray-100 dark:bg-slate-700'">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" :class="idx === activeIndex ? 'text-blue-200' : 'text-gray-300'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="font-medium text-sm truncate" :class="idx === activeIndex ? 'text-white' : 'text-gray-800 dark:text-gray-200'">{{ product.name }}</p>
                                    <p v-if="product.name_si" class="text-xs truncate" :class="idx === activeIndex ? 'text-blue-200' : 'text-gray-500 dark:text-slate-400'">{{ product.name_si }}</p>
                                    <p class="text-xs font-mono" :class="idx === activeIndex ? 'text-blue-300' : 'text-gray-400 dark:text-slate-500'">{{ product.barcode }}</p>
                                </div>
                                <div class="text-right flex-shrink-0">
                                    <p class="font-bold" :class="idx === activeIndex ? 'text-white' : 'text-blue-700 dark:text-blue-400'">{{ fmt(product.selling_price) }}</p>
                                    <p class="text-xs" :class="idx === activeIndex ? 'text-blue-200' : (product.stock_qty > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500')">
                                        {{ t('th.stock') }}: {{ fmtQty(product.stock_qty) }} {{ product.unit }}
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
                            class="h-full px-4 text-sm font-semibold transition-colors flex items-center gap-1.5"
                            :class="priceMode === 'retail'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            {{ t('lbl.retail') }}
                        </button>
                        <button
                            type="button"
                            @click="setPriceMode('wholesale')"
                            class="h-full px-4 text-sm font-semibold transition-colors border-l border-gray-200 dark:border-slate-600 flex items-center gap-1.5"
                            :class="priceMode === 'wholesale'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-50 text-gray-500 hover:bg-green-50 hover:text-green-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            {{ t('lbl.wholesale') }}
                        </button>
                        <button
                            type="button"
                            @click="showCustomForm = !showCustomForm"
                            class="h-full px-4 text-sm font-semibold transition-colors border-l border-gray-200 dark:border-slate-600 flex items-center gap-1.5"
                            :class="showCustomForm
                                ? 'bg-amber-500 text-white'
                                : 'bg-gray-50 text-gray-500 hover:bg-amber-50 hover:text-amber-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Custom
                        </button>
                    </div>
                    </div>

                <!-- Custom item inline form -->
                <div v-if="showCustomForm" class="flex items-center gap-2 mt-2">
                    <input
                        v-model="customName"
                        type="text"
                        placeholder="Item name / description"
                        class="flex-1 border border-amber-300 dark:border-amber-700 dark:bg-slate-700 dark:text-gray-100 dark:placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                        @keydown.enter.prevent="addCustomItem"
                    />
                    <input
                        v-model="customPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Price (Rs)"
                        class="w-28 border border-amber-300 dark:border-amber-700 dark:bg-slate-700 dark:text-gray-100 dark:placeholder-slate-500 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-amber-300"
                        @keydown.enter.prevent="addCustomItem"
                    />
                    <button
                        type="button"
                        @click="addCustomItem"
                        class="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors"
                    >Add</button>
                    <button
                        type="button"
                        @click="showCustomForm = false; customName = ''; customPrice = ''"
                        class="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-500 dark:text-slate-400 text-sm font-medium transition-colors"
                    >✕</button>
                </div>
                </div>

                <!-- Cart Table -->
                <div class="bg-gray-50 dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex-1 flex flex-col overflow-hidden">

                    <!-- Empty state -->
                    <div v-if="cart.length === 0" class="flex-1 flex flex-col items-center justify-center py-10 gap-5">
                        <div class="flex flex-col items-center text-gray-300 dark:text-slate-600">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            <p class="text-base font-semibold text-gray-400 dark:text-slate-500">No items added yet</p>
                            <p class="text-sm text-gray-300 dark:text-slate-600 mt-1">Scan barcode or search product to start sale</p>
                        </div>
                    </div>

                    <!-- Cart items table (desktop) -->
                    <div v-else class="overflow-auto flex-1">
                        <table class="w-full text-sm lg:text-base">
                            <thead class="bg-gray-50 dark:bg-slate-900 sticky top-0 z-10">
                                <tr class="text-xs lg:text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    <th class="px-4 py-2.5 text-left">{{ t('th.product') }}</th>
                                    <th class="px-3 py-2.5 text-center w-28 lg:w-36">{{ t('th.qty') }}</th>
                                    <th class="px-3 py-2.5 text-right w-20 lg:w-24">{{ t('th.price') }}</th>
                                    <th v-if="canDiscount" class="px-3 py-2.5 text-right w-20 lg:w-24">{{ t('lbl.discount') }}</th>
                                    <th class="px-3 py-2.5 text-right w-28 lg:w-36">{{ t('lbl.total') }}</th>
                                    <th class="px-3 py-2.5 w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="(item, idx) in cart"
                                    :key="item.product_id != null ? item.product_id : 'c' + idx"
                                    class="border-b border-gray-50 dark:border-slate-700 transition-colors"
                                    :class="idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-100/60 dark:bg-slate-800/60'"
                                >
                                    <td class="px-4 py-1.5">
                                        <div class="flex items-center gap-3">
                                        <img
                                            v-if="item.image"
                                            :src="item.image"
                                            :alt="item.name"
                                            class="w-9 h-9 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                                        />
                                        <div>
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <p class="font-medium text-gray-800 dark:text-gray-100 leading-tight text-sm lg:text-base">{{ item.name }}</p>
                                            <span
                                                v-if="item.promo_price"
                                                class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700"
                                            >
                                                🏷 PROMO
                                                <span class="line-through text-gray-400 font-normal">{{ fmt(item.selling_price) }}</span>
                                            </span>
                                        </div>
                                        <div class="flex items-center gap-2 mt-0.5">
                                            <p class="text-xs text-gray-400 dark:text-slate-500 font-mono">{{ item.barcode }}</p>
                                            <span
                                                v-if="item.stock_qty <= item.alert_qty"
                                                class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600"
                                            >{{ fmtQty(item.stock_qty) }}</span>
                                        </div>
                                        </div>
                                        </div>
                                    </td>
                                    <td class="px-3 py-1.5">
                                        <div class="flex items-center gap-1">
                                            <button
                                                type="button"
                                                :disabled="item.qty <= 1"
                                                @click="updateQty(item, (parseFloat(item.qty)||1) - 1)"
                                                class="w-8 h-8 lg:w-9 lg:h-9 flex items-center justify-center rounded-md border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors text-base lg:text-lg font-bold flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-gray-300 disabled:hover:text-gray-600"
                                            >−</button>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                :value="item.qty ?? ''"
                                                :placeholder="['kg','g'].includes(item.unit) ? '0' : '1'"
                                                :readonly="numpadEnabled"
                                                @input="numpadEnabled ? null : e => updateQty(item, e.target.value, e.target)"
                                                @keydown="numpadEnabled ? null : onQtyKeydown($event, item)"
                                                @focus="numpadEnabled ? $event.target.blur() : (resetQtyState(), $event.target.select())"
                                                @click="numpadEnabled && openCartNumpad(item, 'qty')"
                                                class="cart-qty-input w-14 lg:w-18 text-center border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg py-1.5 px-1 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-800 text-sm lg:text-base font-medium"
                                                :class="numpadEnabled ? 'cursor-pointer select-none' : ''"
                                            />
                                            <button
                                                type="button"
                                                :disabled="item.stock_qty > 0 && item.qty >= item.stock_qty"
                                                @click="updateQty(item, (parseFloat(item.qty)||0) + 1)"
                                                class="w-8 h-8 lg:w-9 lg:h-9 flex items-center justify-center rounded-md border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-green-50 hover:border-green-300 hover:text-green-600 transition-colors text-base lg:text-lg font-bold flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-gray-300 disabled:hover:text-gray-600"
                                            >+</button>
                                        </div>
                                    </td>
                                    <td class="px-3 py-1.5">
                                        <input
                                            type="text"
                                            inputmode="decimal"
                                            :value="focusedPriceIdx === idx ? item.unit_price : fmtNum(item.unit_price)"
                                            :readonly="numpadEnabled"
                                            @focus="numpadEnabled ? $event.target.blur() : (focusedPriceIdx = idx, $event.target.value = item.unit_price, $event.target.select(), resetFldState())"
                                            @blur="numpadEnabled ? null : (focusedPriceIdx = null, resetFldState())"
                                            @keydown="numpadEnabled ? null : e => onFieldKeydown(e, item, 'unit_price')"
                                            @change="numpadEnabled ? null : e => updatePrice(item, e.target.value)"
                                            @click="numpadEnabled && openCartNumpad(item, 'unit_price')"
                                            class="w-16 lg:w-20 text-right border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-800 text-sm lg:text-base font-medium text-gray-700"
                                            :class="numpadEnabled ? 'cursor-pointer select-none' : ''"
                                        />
                                    </td>
                                    <td v-if="canDiscount" class="px-3 py-2.5">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            :value="item.discount"
                                            :readonly="numpadEnabled"
                                            @focus="numpadEnabled ? $event.target.blur() : ($event.target.select(), resetFldState())"
                                            @blur="numpadEnabled ? null : resetFldState()"
                                            @keydown="numpadEnabled ? null : e => onFieldKeydown(e, item, 'discount')"
                                            @change="numpadEnabled ? null : e => updateDiscount(item, e.target.value)"
                                            @click="numpadEnabled && openCartNumpad(item, 'discount')"
                                            class="w-16 lg:w-20 text-right border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-orange-800 text-sm lg:text-base"
                                            :class="numpadEnabled ? 'cursor-pointer select-none' : ''"
                                        />
                                    </td>
                                    <td class="px-3 py-1.5 text-right">
                                        <span class="text-base lg:text-lg font-extrabold" :class="item.total < 0 ? 'text-red-600' : 'text-blue-700'">
                                            {{ fmt(item.total) }}
                                        </span>
                                    </td>
                                    <td class="px-2 py-1.5 text-center">
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
                    <div v-if="cart.length > 0"
                        class="border-t border-gray-200 dark:border-slate-700 px-4 py-3 bg-gray-100 dark:bg-slate-900 grid grid-cols-3 gap-2"
                    >
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
                        <div class="flex items-center justify-between bg-[#EFF6FF] dark:bg-blue-900 rounded-xl border border-[#BFDBFE] dark:border-blue-700 px-3 py-2.5 gap-2">
                            <span class="text-xs lg:text-sm font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide whitespace-nowrap">{{ t('lbl.grand_total') }}</span>
                            <span class="text-sm lg:text-base font-extrabold text-[#1D4ED8] dark:text-blue-300 whitespace-nowrap">{{ fmt(total) }}</span>
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
                            @click="addToCartTouched(product)"
                            class="flex flex-col items-center text-center p-2 rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 dark:hover:bg-purple-900 hover:border-purple-300 active:scale-95 transition-all"
                        >
                            <!-- Image -->
                            <div class="w-full aspect-square rounded-md overflow-hidden mb-1.5 flex-shrink-0 flex items-center justify-center"
                                :class="product.image ? '' : 'bg-purple-100 dark:bg-purple-900'">
                                <img v-if="product.image" :src="product.image" :alt="product.name_si || product.name" class="w-full h-full object-cover" />
                                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-purple-300 dark:text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
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
                    <!-- Bill-level discount row -->
                    <div class="flex items-center gap-2">
                        <span class="text-lg font-bold text-orange-600 dark:text-orange-400 flex-shrink-0">{{ t('lbl.discount') }}</span>
                        <!-- Input + type toggle -->
                        <div class="flex gap-1">
                            <input
                                v-model="billDiscount"
                                type="number"
                                min="0"
                                :max="discountType === 'percent' ? 70 : undefined"
                                step="0.01"
                                :placeholder="discountType === 'percent' ? '%' : 'Rs'"
                                :disabled="cart.length === 0"
                                :readonly="numpadEnabled"
                                @input="numpadEnabled ? null : () => { if (discountType === 'percent' && parseFloat(billDiscount) > 70) billDiscount = '70' }"
                                @click="numpadEnabled && cart.length > 0 && openNumpad(billDiscount, 'Bill Discount (' + (discountType === 'percent' ? '%' : 'Rs') + ')', v => { billDiscount = v; if (discountType === 'percent' && parseFloat(v) > 70) billDiscount = '70' })"
                                class="w-32 border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 dark:placeholder-slate-500 rounded-lg px-2 py-1.5 text-sm text-right text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-gray-400"
                                :class="numpadEnabled && cart.length > 0 ? 'cursor-pointer' : ''"
                            />
                            <button
                                type="button"
                                @click="discountType = discountType === 'percent' ? 'amount' : 'percent'"
                                class="w-9 rounded-lg border text-xs font-bold transition-colors flex-shrink-0"
                                :class="discountType === 'percent'
                                    ? 'border-orange-400 bg-orange-500 text-white'
                                    : 'border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300'"
                            >{{ discountType === 'percent' ? '%' : 'Rs' }}</button>
                        </div>
                        <!-- Quick % presets -->
                        <div class="flex gap-1 flex-1">
                            <button
                                v-for="pct in [5, 10, 15, 20]"
                                :key="pct"
                                type="button"
                                :disabled="cart.length === 0"
                                @click="discountType = 'percent'; billDiscount = String(pct)"
                                class="flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:opacity-40 whitespace-nowrap"
                                :class="discountType === 'percent' && Number(billDiscount) === pct
                                    ? 'border-orange-500 bg-orange-500 text-white'
                                    : 'border-[#FDBA74] bg-[#FFF7ED] text-[#C2410C] hover:bg-orange-100 dark:border-slate-600 dark:bg-slate-700 dark:text-orange-300 dark:hover:bg-slate-600'"
                            >{{ pct }}%</button>
                        </div>
                        <span v-if="billDiscountAmt > 0" class="text-xs font-semibold text-orange-600 flex-shrink-0">-{{ fmt(billDiscountAmt) }}</span>
                    </div>

                    <div v-if="lineDiscount > 0" class="flex justify-between text-xs text-orange-400">
                        <span>{{ t('lbl.discount') }}</span>
                        <span>-{{ fmt(lineDiscount) }}</span>
                    </div>
                    <div v-if="tax > 0" class="flex justify-between text-sm text-gray-600">
                        <span>{{ t('lbl.tax') }}</span>
                        <span class="font-medium">{{ fmt(tax) }}</span>
                    </div>

                    <div class="mt-1 bg-[#EFF6FF] dark:bg-blue-900 rounded-xl border border-[#BFDBFE] dark:border-blue-700 px-3 py-2.5 flex justify-between items-baseline">
                        <span class="billing-total-label font-bold text-blue-700 dark:text-blue-300 text-base lg:text-lg">{{ t('lbl.grand_total') }}</span>
                        <span class="billing-total-amount font-extrabold text-[#1D4ED8] dark:text-blue-300 text-2xl lg:text-3xl">{{ fmt(total) }}</span>
                    </div>
                </div>

                <!-- Payment method buttons -->
                <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4">
                    <p class="text-xs font-bold text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold leading-none">2</span>
                        Select Payment Method
                    </p>
                    <div class="grid grid-cols-2 gap-2">
                        <!-- Cash F2 -->
                        <button
                            type="button"
                            @click="setPaymentMethod('cash')"
                            class="payment-btn flex items-center justify-center gap-2 min-h-[48px] text-sm"
                            :class="paymentMethod === 'cash' ? 'active cash' : ''"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {{ t('pos.cash_btn') }}
                        </button>

                        <!-- Card F3 -->
                        <button
                            type="button"
                            @click="setPaymentMethod('card')"
                            class="payment-btn flex items-center justify-center gap-2 min-h-[48px] text-sm"
                            :class="paymentMethod === 'card' ? 'active card' : ''"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            {{ t('pos.card_btn') }}
                        </button>

                        <!-- Credit F4 -->
                        <button
                            type="button"
                            @click="setPaymentMethod('credit')"
                            class="payment-btn flex items-center justify-center gap-2 min-h-[48px] text-sm"
                            :class="paymentMethod === 'credit' ? 'active credit' : ''"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            {{ t('pos.credit_btn') }}
                        </button>

                        <!-- Split F5 -->
                        <button
                            type="button"
                            @click="setPaymentMethod('split')"
                            class="payment-btn flex items-center justify-center gap-2 min-h-[48px] text-sm"
                            :class="paymentMethod === 'split' ? 'active split' : ''"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            Split (F5)
                        </button>
                    </div>

                </div>

                <!-- Card receipt number -->
                <div v-if="paymentMethod === 'card'" class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-blue-200 dark:border-blue-900 p-4">
                    <label class="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Card Receipt / Reference No.
                    </label>
                    <div class="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <input
                            id="card-receipt-input"
                            v-model="cardReceiptNo"
                            type="text"
                            placeholder="e.g. TXN123456"
                            :readonly="numpadEnabled"
                            @click="numpadEnabled && openNumpad(cardReceiptNo, 'Card Reference No.', v => cardReceiptNo = v)"
                            class="w-full pl-9 pr-4 py-2.5 border border-blue-300 dark:border-blue-700 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100"
                            :class="numpadEnabled ? 'cursor-pointer' : ''"
                        />
                    </div>
                </div>

                <!-- Split payment section (cash + card) -->
                <div v-if="paymentMethod === 'split'" class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-indigo-200 dark:border-indigo-900 p-4 space-y-3">
                    <p class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Split: Cash + Card</p>

                    <!-- Cash portion -->
                    <div>
                        <div class="flex items-center justify-between mb-1.5">
                            <label class="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">මුදල් (Cash)</label>
                            <button
                                type="button"
                                @click="splitCashAmt = (total / 2).toFixed(2)"
                                class="text-xs font-bold px-2 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                            >½ බෙදන්න</button>
                        </div>
                        <input
                            id="split-cash-input"
                            v-model="splitCashAmt"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            :readonly="numpadEnabled"
                            @click="numpadEnabled && openNumpad(splitCashAmt, 'Split — ගෙවු මුදල (Cash)', v => splitCashAmt = v)"
                            class="w-full border-2 border-indigo-300 dark:border-indigo-700 rounded-xl px-3 py-2 text-lg lg:text-xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:placeholder-slate-500 text-indigo-800 dark:text-indigo-200"
                            :class="numpadEnabled ? 'cursor-pointer' : ''"
                        />
                        <div class="flex flex-wrap gap-1 mt-1.5">
                            <button
                                v-for="amt in [100, 500, 1000, 2000, 5000]"
                                :key="amt"
                                type="button"
                                @click="splitCashAmt = amt"
                                class="px-2 py-0.5 rounded text-xs font-semibold border transition-colors"
                                :class="Number(splitCashAmt) === amt
                                    ? 'border-indigo-500 bg-indigo-500 text-white'
                                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300'"
                            >{{ amt }}</button>
                        </div>
                    </div>

                    <!-- Card portion (auto-computed) -->
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">කාඩ් (Card)</label>
                        <div class="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-2.5">
                            <span class="text-sm text-indigo-600 dark:text-indigo-400 font-medium">Auto</span>
                            <span class="text-xl font-bold text-indigo-700 dark:text-indigo-300">{{ fmt(splitCardAmt) }}</span>
                        </div>
                    </div>

                    <!-- Card receipt for split -->
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Card Receipt / Reference No.</label>
                        <div class="relative">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            <input
                                v-model="splitCardReceiptNo"
                                type="text"
                                placeholder="e.g. TXN123456"
                                :readonly="numpadEnabled"
                                @click="numpadEnabled && openNumpad(splitCardReceiptNo, 'Split Card Reference No.', v => splitCardReceiptNo = v)"
                                class="w-full pl-9 pr-4 py-2.5 border border-indigo-300 dark:border-indigo-700 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100"
                                :class="numpadEnabled ? 'cursor-pointer' : ''"
                            />
                        </div>
                    </div>

                    <!-- Summary row -->
                    <div v-if="splitCashAmt" class="flex items-center justify-between rounded-lg px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800">
                        <span class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Cash + Card</span>
                        <span class="text-base font-bold text-indigo-700 dark:text-indigo-300">
                            {{ fmt(parseFloat(splitCashAmt) || 0) }} + {{ fmt(splitCardAmt) }}
                        </span>
                    </div>
                </div>

                <!-- Customer + Cash paid inline (cash/credit) -->
                <div v-if="paymentMethod === 'cash' || paymentMethod === 'credit'" class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border p-4" :class="paymentMethod === 'credit' ? 'border-red-200 dark:border-red-900' : 'border-green-200 dark:border-green-900'">
                    <p class="text-xs font-bold text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold leading-none">3</span>
                        Enter Cash Paid
                    </p>
                    <div class="flex gap-3">
                        <!-- Customer selector -->
                        <div class="flex-1 min-w-0">
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
                                class="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-slate-700 dark:text-gray-100"
                            >
                                <option value="">{{ t('lbl.select_customer') }}</option>
                                <option v-for="c in localCustomers" :key="c.id" :value="c.id" :selected="selectedCustomer?.id === c.id">
                                    {{ c.name }} {{ c.phone ? `· ${c.phone}` : '' }}
                                </option>
                            </select>
                            <div v-if="selectedCustomer" class="mt-1 flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 rounded-lg px-2 py-1">
                                <span class="font-medium truncate">{{ selectedCustomer.name }}</span>
                                <span v-if="selectedCustomer.phone" class="text-blue-400 flex-shrink-0">{{ selectedCustomer.phone }}</span>
                            </div>
                            <div v-if="!selectedCustomer && paymentMethod === 'credit'" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                {{ t('lbl.credit_warn') }}
                            </div>
                        </div>

                        <!-- Divider -->
                        <div class="w-px bg-gray-100 dark:bg-slate-700 self-stretch"></div>

                        <!-- Cash paid -->
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between mb-1.5">
                                <label class="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    {{ paymentMethod === 'credit' ? t('lbl.optional') : t('lbl.cash_paid') }}
                                </label>
                                <button
                                    type="button"
                                    @click="cashPaid = total.toFixed(2)"
                                    class="text-xs font-bold px-2 py-1 rounded-lg bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                                >= හරි මුදල</button>
                            </div>
                            <input
                                id="cash-paid-input"
                                v-model="cashPaid"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                :readonly="numpadEnabled"
                                @keydown.enter.prevent="numpadEnabled ? null : submitSale()"
                                @click="numpadEnabled && openNumpad(cashPaid, 'ගෙවු මුදල (Cash Paid)', v => cashPaid = v)"
                                class="w-full border-2 rounded-xl px-3 py-2 text-lg lg:text-xl font-bold focus:outline-none dark:bg-slate-700 dark:placeholder-slate-500"
                                :class="[
                                    numpadEnabled ? 'cursor-pointer' : '',
                                    shakePaid ? 'shake-field border-red-500 text-red-700 dark:text-red-400' :
                                        paymentMethod === 'credit'
                                            ? 'border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 focus:ring-2 focus:ring-red-400 focus:border-red-500'
                                            : 'border-green-300 dark:border-green-800 text-green-800 dark:text-green-300 focus:ring-2 focus:ring-green-400 focus:border-green-500'
                                ]"
                            />
                            <div class="flex flex-wrap gap-1 mt-1.5">
                                <button
                                    v-for="amt in [100, 500, 1000, 2000, 5000]"
                                    :key="amt"
                                    type="button"
                                    @click="cashPaid = amt"
                                    class="px-2 py-0.5 rounded text-xs font-semibold border transition-colors"
                                    :class="Number(cashPaid) === amt
                                        ? 'border-green-500 bg-green-500 text-white'
                                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-green-300 hover:bg-green-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300'"
                                >{{ amt }}</button>
                            </div>
                            <div v-if="cashPaid" class="flex items-center justify-between rounded-lg px-3 py-1.5 mt-1.5"
                                :class="balance >= 0 ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900' : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900'"
                            >
                                <span class="font-semibold text-xs" :class="balance >= 0 ? 'text-green-700' : 'text-red-700'">{{ t('lbl.change') }}</span>
                                <span class="text-base font-bold" :class="balance >= 0 ? 'text-green-700' : 'text-red-600'">
                                    {{ fmt(Math.abs(balance)) }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Action buttons -->
                <div class="flex flex-col gap-2 mt-auto">
                    <p class="text-xs font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1.5">
                        <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold leading-none">4</span>
                        Complete Sale
                    </p>
                    <!-- Save & Print + Save Only inline -->
                    <div class="flex gap-2">
                        <!-- Save & Print (F10) -->
                        <button
                            type="button"
                            @click="submitSale(false)"
                            :disabled="cart.length === 0 || submitting || form.processing"
                            class="btn-3d btn-primary-3d flex-1 flex items-center justify-center gap-2 text-base lg:text-lg px-4 py-4 lg:py-5 min-h-[64px] lg:min-h-[72px]"
                        >
                            <svg v-if="!submitting && !form.processing" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            <svg v-else class="animate-spin h-5 w-5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                            <span class="leading-tight text-center">{{ submitting || form.processing ? t('lbl.loading') : t('pos.complete_sale') }}</span>
                            <span class="shrink-0 text-xs font-mono bg-white/20 px-1.5 py-0.5 rounded">F10</span>
                        </button>

                        <!-- Save Only (F11) -->
                        <button
                            type="button"
                            @click="submitSale(true)"
                            :disabled="cart.length === 0 || submitting || form.processing"
                            class="flex flex-col items-center justify-center gap-1 px-4 py-3 min-h-[64px] lg:min-h-[72px] bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-semibold rounded-xl border border-slate-300 transition-colors shrink-0"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                            </svg>
                            <span class="text-xs leading-tight">Save Only</span>
                            <span class="text-xs font-mono bg-slate-300/70 px-1.5 py-0.5 rounded">F11</span>
                        </button>
                    </div>

                    <!-- Hold Bill row: hold current + view held list -->
                    <div class="flex gap-2">
                        <button
                            type="button"
                            @click="holdBill"
                            :disabled="cart.length === 0"
                            class="btn-3d btn-warning-3d flex-1 flex items-center justify-center gap-2 text-sm lg:text-base py-3.5 lg:py-4 min-h-[56px] lg:min-h-[64px]"
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

                    <!-- Pre-defined size buttons -->
                    <div class="grid grid-cols-3 gap-2 mb-4">
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

                    <!-- Custom size entry — for kg/g/l/ml products -->
                    <div v-if="['kg','g','l','ml'].includes((sizePickerProduct?.unit||'').toLowerCase())" class="border-t border-gray-100 dark:border-slate-700 pt-4">
                        <p class="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">
                            Custom size ({{ sizePickerProduct?.unit?.toLowerCase() === 'kg' ? 'g' : sizePickerProduct?.unit?.toLowerCase() === 'l' ? 'ml' : sizePickerProduct?.unit }})
                        </p>
                        <div class="flex gap-2 items-center">
                            <div class="relative flex-1">
                                <input
                                    ref="sizeQtyInput"
                                    v-model="sizePickerQty"
                                    type="number"
                                    min="1"
                                    step="1"
                                    placeholder="e.g. 250"
                                    @keydown.enter.prevent="addCustomWeight"
                                    @keydown.escape.stop="showSizePicker = false; sizePickerProduct = null"
                                    class="w-full text-center text-xl font-bold bg-gray-50 dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-slate-600 placeholder:text-sm placeholder:font-normal"
                                />
                                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                                    {{ sizePickerProduct?.unit?.toLowerCase() === 'kg' ? 'g' : sizePickerProduct?.unit?.toLowerCase() === 'l' ? 'ml' : sizePickerProduct?.unit }}
                                </span>
                            </div>
                            <!-- Calculated price preview -->
                            <div class="text-center min-w-[80px]">
                                <p v-if="Number(sizePickerQty) > 0" class="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                    {{
                                        ['kg','l','ml'].includes(sizePickerProduct?.unit?.toLowerCase())
                                            ? fmt(parseFloat(((Number(sizePickerQty) / 1000) * (parseFloat(sizePickerProduct.selling_price) || 0)).toFixed(2)))
                                            : fmt(parseFloat((Number(sizePickerQty) * (parseFloat(sizePickerProduct.selling_price) || 0)).toFixed(2)))
                                    }}
                                </p>
                                <p v-else class="text-xs text-gray-400">price</p>
                            </div>
                            <button
                                type="button"
                                @click="addCustomWeight"
                                :disabled="!sizePickerQty || Number(sizePickerQty) <= 0"
                                class="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-40"
                                style="background:#16A34A;"
                            >Add</button>
                        </div>
                    </div>

                    <button
                        type="button"
                        @click="showSizePicker = false; sizePickerProduct = null"
                        class="w-full mt-4 py-2.5 text-sm font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 rounded-xl transition-colors"
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

        <!-- ══ Product Browser Modal (touch mode) ══ -->
        <Teleport to="body">
            <Transition name="browser-fade">
                <div v-if="showProductBrowser && numpadEnabled" class="fixed inset-0 z-[55] flex flex-col bg-white dark:bg-slate-900">
                    <!-- Header -->
                    <div class="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
                        <!-- Search box inside modal (receives keyboard/scanner) -->
                        <div class="relative flex-1">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                ref="browserSearchInput"
                                v-model="browserQuery"
                                type="text"
                                :placeholder="t('pos.search_product')"
                                autocomplete="off"
                                class="w-full pl-10 pr-4 py-3 text-base border-2 border-blue-300 dark:border-slate-600 rounded-xl focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                                :class="numpadEnabled ? 'cursor-pointer' : ''"
                                :readonly="numpadEnabled"
                                @click="numpadEnabled && openNumpad(browserQuery, t('pos.search_product'), v => { browserQuery = v; browserProducts.length === 1 && selectFromBrowser(browserProducts[0]); }, { onInput: v => browserQuery = v, raw: true })"
                                @keydown.enter.prevent="!numpadEnabled && browserProducts.length === 1 && selectFromBrowser(browserProducts[0])"
                            />
                        </div>
                        <button
                            type="button"
                            @click="showProductBrowser = false; browserQuery = ''"
                            class="flex-shrink-0 px-4 py-3 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 font-semibold text-sm hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                        >Cancel</button>
                    </div>

                    <!-- Product count hint -->
                    <div class="px-4 py-2 flex-shrink-0">
                        <p class="text-xs text-gray-400 dark:text-slate-500">
                            {{ browserProducts.length }} product{{ browserProducts.length !== 1 ? 's' : '' }}
                            <span v-if="browserQuery"> for "{{ browserQuery }}"</span>
                        </p>
                    </div>

                    <!-- Product grid -->
                    <div class="flex-1 overflow-y-auto px-4 pb-6">
                        <div v-if="browserProducts.length === 0" class="flex flex-col items-center justify-center py-20 text-gray-300 dark:text-slate-600">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <p class="text-sm font-medium">No products found</p>
                        </div>
                        <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            <button
                                v-for="product in browserProducts"
                                :key="product.id"
                                type="button"
                                @click="selectFromBrowser(product)"
                                class="flex flex-col items-center text-center rounded-2xl border p-3 transition-all active:scale-95 hover:shadow-md"
                                :class="(product.stock_qty ?? 0) <= 0
                                    ? 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 opacity-50'
                                    : 'border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-slate-700'"
                            >
                                <!-- Image or placeholder -->
                                <div class="w-full aspect-square rounded-xl overflow-hidden mb-2 bg-gray-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                    <img v-if="product.image" :src="product.image" :alt="product.name" class="w-full h-full object-cover" />
                                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <p class="text-xs font-semibold text-gray-800 dark:text-slate-100 leading-tight line-clamp-2 w-full mb-1">{{ product.name_si || product.name }}</p>
                                <p class="text-sm font-extrabold text-blue-700 dark:text-blue-400">{{ fmt(product.selling_price) }}</p>
                                <p class="text-[10px] mt-0.5" :class="(product.stock_qty ?? 0) <= 0 ? 'text-red-400' : 'text-gray-400 dark:text-slate-500'">
                                    {{ (product.stock_qty ?? 0) <= 0 ? 'Out of stock' : fmtQty(product.stock_qty) + ' ' + (product.unit || 'pcs') }}
                                </p>
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- ══ Touch Numpad Modal ══ -->
    </AuthenticatedLayout>
</template>

<style scoped>
.browser-fade-enter-active,
.browser-fade-leave-active { transition: opacity 0.18s ease; }
.browser-fade-enter-from,
.browser-fade-leave-to    { opacity: 0; }

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
