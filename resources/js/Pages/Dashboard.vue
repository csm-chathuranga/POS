<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head, Link, usePage } from '@inertiajs/vue3';
import { inject, computed, ref } from 'vue';

const t = inject('t');
const page = usePage();
const userRole = computed(() => page.props.auth?.user?.role || 'cashier');
const isCashier = computed(() => userRole.value === 'cashier');

const props = defineProps({
    todaySales:     { type: Number, default: 0 },
    todayBills:     { type: Number, default: 0 },
    monthSales:     { type: Number, default: 0 },
    monthBills:     { type: Number, default: 0 },
    totalProducts:  { type: Number, default: 0 },
    lowStockCount:  { type: Number, default: 0 },
    todayByPayment: { type: Array,  default: () => [] },
    last3Days:      { type: Array,  default: () => [] },
    heatmap:        { type: Array,  default: () => [] },
    fastMoving:     { type: Array,  default: () => [] },
    recentSales:    { type: Array,  default: () => [] },
    expiringSoon:   { type: Array,  default: () => [] },
});

// ── Bar chart helpers ──
const hoveredBar = ref(null);  // { dayIdx, hourIdx }

function chartMax(day) {
    return Math.max(...day.hourly.map(h => h.total), 1);
}

function barHeight(total, max) {
    return Math.round((total / max) * 100);
}

function hourLabel(h) {
    return h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`;
}

// ── Heatmap helpers ──
const hoveredCell = ref(null);

const heatmapMax = computed(() => Math.max(...props.heatmap.map(c => c.total), 1));

function heatColor(total) {
    if (!total) return '#F1F5F9';
    const intensity = total / heatmapMax.value;
    if (intensity < 0.2)  return '#DCFCE7';
    if (intensity < 0.4)  return '#86EFAC';
    if (intensity < 0.6)  return '#22C55E';
    if (intensity < 0.8)  return '#16A34A';
    return '#15803D';
}

function heatTextColor(total) {
    if (!total) return '#CBD5E1';
    const intensity = total / heatmapMax.value;
    return intensity >= 0.6 ? '#fff' : '#166534';
}

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const heatmapWeeks = computed(() => {
    const weeks = {};
    props.heatmap.forEach(cell => {
        if (!weeks[cell.week]) weeks[cell.week] = {};
        weeks[cell.week][cell.dow] = cell;
    });
    return Object.values(weeks);
});

function fmt(v) {
    return 'Rs. ' + Number(v || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTime(d) {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
}

function daysUntilExpiry(dateStr) {
    return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function expiryLabel(days) {
    if (days < 0)   return { text: `Expired ${Math.abs(days)}d ago`, cls: 'bg-red-100 text-red-700' };
    if (days === 0) return { text: 'Expires today',                  cls: 'bg-red-100 text-red-700' };
    if (days <= 7)  return { text: `${days}d left`,                  cls: 'bg-red-100 text-red-700' };
    return               { text: `${days}d left`,                    cls: 'bg-amber-100 text-amber-700' };
}

const methodMeta = {
    cash:   { label: 'Cash',   color: '#16A34A', bg: '#F0FDF4', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>` },
    card:   { label: 'Card',   color: '#2563EB', bg: '#EFF6FF', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>` },
    credit: { label: 'Credit', color: '#DC2626', bg: '#FEF2F2', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>` },
    qr:     { label: 'QR',    color: '#7C3AED', bg: '#F5F3FF', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 4h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>` },
};
</script>

<template>
    <Head :title="t('page.dashboard')" />
    <AuthenticatedLayout>
        <template #header>
            <h1 class="text-xl font-bold text-gray-800">{{ t('page.dashboard') }}</h1>
        </template>

        <!-- ── TOP STAT TILES ── -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">

            <!-- Today Revenue -->
            <div class="bg-white rounded-xl shadow-sm overflow-hidden" style="border:1px solid #E2E8F0;">
                <div class="flex items-center gap-3 px-4 pt-4 pb-2">
                    <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style="background:#DCFCE7;">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="#16A34A"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs text-slate-500 leading-tight">{{ t('dash.today_sales') }}</p>
                        <p class="font-bold text-lg leading-tight truncate" style="color:#15803D;">{{ fmt(todaySales) }}</p>
                    </div>
                </div>
                <div class="px-4 pb-3">
                    <span class="text-xs text-slate-400">{{ todayBills }} {{ todayBills === 1 ? 'bill' : 'bills' }} today</span>
                </div>
            </div>

            <!-- Month Revenue -->
            <div class="bg-white rounded-xl shadow-sm overflow-hidden" style="border:1px solid #E2E8F0;">
                <div class="flex items-center gap-3 px-4 pt-4 pb-2">
                    <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style="background:#DBEAFE;">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="#2563EB"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs text-slate-500 leading-tight">{{ t('dash.month_sales') }}</p>
                        <p class="font-bold text-lg leading-tight truncate" style="color:#1D4ED8;">{{ fmt(monthSales) }}</p>
                    </div>
                </div>
                <div class="px-4 pb-3">
                    <span class="text-xs text-slate-400">{{ monthBills }} bills this month</span>
                </div>
            </div>

            <!-- Total Products -->
            <Link :href="route('products.index')" class="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow" style="border:1px solid #E2E8F0;">
                <div class="flex items-center gap-3 px-4 pt-4 pb-2">
                    <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style="background:#F3E8FF;">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="#7C3AED"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs text-slate-500 leading-tight">{{ t('dash.total_products') }}</p>
                        <p class="font-bold text-lg leading-tight" style="color:#6D28D9;">{{ totalProducts }}</p>
                    </div>
                </div>
                <div class="px-4 pb-3">
                    <span class="text-xs text-slate-400">active products</span>
                </div>
            </Link>

            <!-- Low Stock -->
            <Link :href="route('reports.low-stock')" class="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow" style="border:1px solid #E2E8F0;">
                <div class="flex items-center gap-3 px-4 pt-4 pb-2">
                    <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" :style="lowStockCount > 0 ? 'background:#FEE2E2;' : 'background:#F1F5F9;'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" :stroke="lowStockCount > 0 ? '#DC2626' : '#94A3B8'"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs text-slate-500 leading-tight">{{ t('dash.low_stock') }}</p>
                        <p class="font-bold text-lg leading-tight" :style="lowStockCount > 0 ? 'color:#DC2626;' : 'color:#64748B;'">{{ lowStockCount }}</p>
                    </div>
                </div>
                <div class="px-4 pb-3">
                    <span class="text-xs" :class="lowStockCount > 0 ? 'text-red-400' : 'text-slate-400'">
                        {{ lowStockCount > 0 ? 'needs attention' : 'all good' }}
                    </span>
                </div>
            </Link>
        </div>

        <!-- ── QUICK ACTIONS ── -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Link :href="route('sales.create')" class="quick-action-card group" style="--from:#2563EB;--to:#1d4ed8;">
                <div class="quick-action-glow" style="background:radial-gradient(circle at 70% 30%, rgba(255,255,255,0.18) 0%, transparent 70%);"></div>
                <div class="quick-action-icon-wrap">
                    <svg xmlns="http://www.w3.org/2000/svg" class="quick-action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6h13M10 19a1 1 0 100 2 1 1 0 000-2zm7 0a1 1 0 100 2 1 1 0 000-2z" /></svg>
                </div>
                <span class="quick-action-plus">+</span>
                <span class="quick-action-label">{{ t('btn.new_sale') }}</span>
                <div class="quick-action-arrow"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg></div>
            </Link>

            <Link :href="isCashier ? route('products.index') : route('products.create')" class="quick-action-card group" style="--from:#7C3AED;--to:#6D28D9;">
                <div class="quick-action-glow" style="background:radial-gradient(circle at 70% 30%, rgba(255,255,255,0.18) 0%, transparent 70%);"></div>
                <div class="quick-action-icon-wrap">
                    <svg xmlns="http://www.w3.org/2000/svg" class="quick-action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                <span v-if="!isCashier" class="quick-action-plus">+</span>
                <span class="quick-action-label">{{ isCashier ? t('nav.products') : t('btn.new_product') }}</span>
                <div class="quick-action-arrow"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg></div>
            </Link>

            <Link :href="isCashier ? route('purchases.index') : route('purchases.create')" class="quick-action-card group" style="--from:#059669;--to:#047857;">
                <div class="quick-action-glow" style="background:radial-gradient(circle at 70% 30%, rgba(255,255,255,0.18) 0%, transparent 70%);"></div>
                <div class="quick-action-icon-wrap">
                    <svg xmlns="http://www.w3.org/2000/svg" class="quick-action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                </div>
                <span v-if="!isCashier" class="quick-action-plus">+</span>
                <span class="quick-action-label">{{ isCashier ? t('nav.purchases') : t('btn.new_purchase') }}</span>
                <div class="quick-action-arrow"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg></div>
            </Link>

            <Link :href="route('reports.index')" class="quick-action-card group" style="--from:#D97706;--to:#B45309;">
                <div class="quick-action-glow" style="background:radial-gradient(circle at 70% 30%, rgba(255,255,255,0.18) 0%, transparent 70%);"></div>
                <div class="quick-action-icon-wrap">
                    <svg xmlns="http://www.w3.org/2000/svg" class="quick-action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <span class="quick-action-label">{{ t('btn.report') }}</span>
                <div class="quick-action-arrow"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg></div>
            </Link>
        </div>

        <!-- ── TODAY PAYMENT SUMMARY ── -->
        <div v-if="todayByPayment.length > 0" class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div
                v-for="p in todayByPayment"
                :key="p.method"
                class="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3"
                style="border:1px solid #E2E8F0;"
            >
                <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    :style="`background:${(methodMeta[p.method] || methodMeta.cash).bg}; color:${(methodMeta[p.method] || methodMeta.cash).color};`"
                    v-html="(methodMeta[p.method] || methodMeta.cash).icon">
                </div>
                <div class="min-w-0">
                    <p class="text-xs text-slate-400">{{ (methodMeta[p.method] || { label: p.method }).label }}</p>
                    <p class="font-bold text-sm truncate" :style="`color:${(methodMeta[p.method] || methodMeta.cash).color};`">{{ fmt(p.total) }}</p>
                    <p class="text-xs text-slate-400">{{ p.bills }} {{ p.bills == 1 ? 'bill' : 'bills' }}</p>
                </div>
            </div>
        </div>

        <!-- ── LAST 3 DAYS BAR CHART + HEATMAP ── -->
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">

            <!-- Bar chart: last 3 days hourly -->
            <div class="lg:col-span-3 bg-white rounded-xl shadow-sm" style="border:1px solid #E2E8F0;">
                <div class="px-4 py-3 border-b flex items-center justify-between" style="border-color:#F1F5F9;">
                    <div>
                        <p class="text-sm font-semibold text-gray-800">Sales — Last 3 Days</p>
                        <p class="text-xs text-slate-400">Hourly breakdown (6am – 10pm)</p>
                    </div>
                    <div class="flex gap-3">
                        <span v-for="(day, di) in last3Days" :key="di"
                            class="text-xs font-semibold px-2 py-0.5 rounded-full"
                            :style="di === 2 ? 'background:#DBEAFE;color:#1D4ED8;' : 'background:#F1F5F9;color:#64748B;'">
                            {{ day.label }}
                        </span>
                    </div>
                </div>
                <div class="px-4 pt-4 pb-2">
                    <!-- One bar group per day -->
                    <div class="flex gap-4">
                        <div v-for="(day, di) in last3Days" :key="di" class="flex-1">
                            <p class="text-xs font-bold mb-2 truncate"
                                :style="di === 2 ? 'color:#1D4ED8;' : 'color:#94A3B8;'">
                                {{ day.label }}
                                <span class="font-normal ml-1">{{ fmt(day.total) }}</span>
                            </p>
                            <!-- SVG bar chart -->
                            <div class="relative" style="height:110px;">
                                <svg width="100%" height="110" class="overflow-visible">
                                    <g v-for="(h, hi) in day.hourly" :key="hi">
                                        <rect
                                            :x="`${(hi / day.hourly.length) * 100}%`"
                                            :y="110 - barHeight(h.total, chartMax(day)) * 1.0"
                                            :width="`${(1 / day.hourly.length) * 100 - 1}%`"
                                            :height="barHeight(h.total, chartMax(day))"
                                            :fill="h.total === 0 ? '#F1F5F9' : di === 2 ? '#3B82F6' : '#CBD5E1'"
                                            :opacity="hoveredBar && hoveredBar.dayIdx === di && hoveredBar.hourIdx === hi ? 1 : 0.85"
                                            rx="2"
                                            class="cursor-pointer transition-opacity"
                                            @mouseenter="hoveredBar = { dayIdx: di, hourIdx: hi, day, h }"
                                            @mouseleave="hoveredBar = null"
                                        />
                                    </g>
                                </svg>
                                <!-- Hour axis labels -->
                                <div class="flex justify-between mt-1">
                                    <span v-for="(h, hi) in day.hourly" :key="hi"
                                        class="text-center flex-1 text-slate-300"
                                        style="font-size:8px; line-height:1;">
                                        {{ hi % 4 === 0 ? hourLabel(h.hour) : '' }}
                                    </span>
                                </div>
                            </div>
                            <div class="mt-1 text-xs text-slate-400 text-center">{{ day.bills }} bills</div>
                        </div>
                    </div>

                    <!-- Tooltip -->
                    <div v-if="hoveredBar" class="mt-2 px-3 py-2 rounded-lg text-xs" style="background:#F8FAFC; border:1px solid #E2E8F0;">
                        <span class="font-semibold text-gray-700">{{ hoveredBar.day.label }} {{ hourLabel(hoveredBar.h.hour) }}:00</span>
                        —
                        <span style="color:#2563EB;">{{ fmt(hoveredBar.h.total) }}</span>
                        <span class="text-slate-400 ml-2">{{ hoveredBar.h.bills }} bill{{ hoveredBar.h.bills !== 1 ? 's' : '' }}</span>
                    </div>
                </div>
            </div>

            <!-- Heatmap: peak days last 10 weeks -->
            <div class="lg:col-span-2 bg-white rounded-xl shadow-sm" style="border:1px solid #E2E8F0;">
                <div class="px-4 py-3 border-b" style="border-color:#F1F5F9;">
                    <p class="text-sm font-semibold text-gray-800">Peak Days</p>
                    <p class="text-xs text-slate-400">Sales heatmap — last 10 weeks</p>
                </div>
                <div class="px-4 py-3 overflow-x-auto">
                    <div class="flex gap-1 min-w-0">
                        <!-- Day-of-week labels -->
                        <div class="flex flex-col gap-1 mr-1 flex-shrink-0">
                            <div style="height:16px;"></div>
                            <div v-for="label in DOW_LABELS" :key="label"
                                class="flex items-center justify-end"
                                style="height:16px; font-size:9px; color:#94A3B8; width:22px;">
                                {{ label }}
                            </div>
                        </div>
                        <!-- Week columns -->
                        <div class="flex gap-1 flex-1 min-w-0">
                            <div v-for="(week, wi) in heatmapWeeks" :key="wi" class="flex flex-col gap-1 flex-1 min-w-0">
                                <!-- Month label on first day of month -->
                                <div style="height:16px; font-size:8px; color:#94A3B8; text-align:center; overflow:hidden;">
                                    {{ week[1]?.date?.slice(5,7) === '01' || wi === 0 ? week[1]?.date?.slice(5,7) : '' }}
                                </div>
                                <div
                                    v-for="dow in [1,2,3,4,5,6,7]"
                                    :key="dow"
                                    class="rounded-sm cursor-default relative"
                                    style="height:16px;"
                                    :style="`background:${week[dow] ? heatColor(week[dow].total) : '#F8FAFC'};`"
                                    @mouseenter="week[dow] && (hoveredCell = week[dow])"
                                    @mouseleave="hoveredCell = null"
                                >
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Legend -->
                    <div class="flex items-center gap-1 mt-3">
                        <span class="text-slate-400" style="font-size:9px;">Less</span>
                        <div v-for="c in ['#F1F5F9','#DCFCE7','#86EFAC','#22C55E','#16A34A','#15803D']" :key="c"
                            class="w-3 h-3 rounded-sm flex-shrink-0" :style="`background:${c};`"></div>
                        <span class="text-slate-400" style="font-size:9px;">More</span>
                    </div>

                    <!-- Heatmap tooltip -->
                    <div v-if="hoveredCell" class="mt-2 px-3 py-2 rounded-lg text-xs" style="background:#F8FAFC; border:1px solid #E2E8F0;">
                        <span class="font-semibold text-gray-700">{{ new Date(hoveredCell.date).toLocaleDateString('en-LK', { weekday:'short', month:'short', day:'numeric' }) }}</span>
                        —
                        <span style="color:#16A34A;">{{ fmt(hoveredCell.total) }}</span>
                        <span class="text-slate-400 ml-2">{{ hoveredCell.bills }} bill{{ hoveredCell.bills !== 1 ? 's' : '' }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── MAIN CONTENT GRID ── -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

            <!-- Recent Sales (2/3 width) -->
            <div class="lg:col-span-2 bg-white rounded-xl shadow-sm" style="border:1px solid #E2E8F0;">
                <div class="flex items-center justify-between px-4 py-3 border-b" style="border-color:#F1F5F9;">
                    <h2 class="font-semibold text-gray-800 text-sm">{{ t('dash.recent_sales') }}</h2>
                    <Link :href="route('sales.index')" class="text-xs hover:underline" style="color:#2563EB;">{{ t('dash.view_all') }}</Link>
                </div>
                <div class="divide-y" style="border-color:#F8FAFC;">
                    <div v-if="recentSales.length === 0" class="px-4 py-8 text-center text-slate-400 text-sm">{{ t('dash.no_sales') }}</div>
                    <div v-for="sale in recentSales" :key="sale.id" class="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style="background:#2563EB;">
                            {{ sale.user?.name?.charAt(0)?.toUpperCase() || '?' }}
                        </div>
                        <div class="flex-1 min-w-0">
                            <Link :href="route('sales.show', sale.id)" class="text-sm font-semibold hover:underline" style="color:#1E40AF;">{{ sale.invoice_no }}</Link>
                            <p class="text-xs text-slate-400">{{ sale.user?.name }}</p>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <p class="text-sm font-bold" style="color:#16A34A;">{{ fmt(sale.total) }}</p>
                            <p class="text-xs text-slate-400">{{ formatTime(sale.created_at) }}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right column: Expiring Soon -->
            <div class="flex flex-col gap-4">

                <!-- Expiring Soon -->
                <div v-if="expiringSoon.length > 0" class="bg-white rounded-xl shadow-sm" style="border:1px solid #FCD34D;">
                    <div class="flex items-center justify-between px-4 py-3 border-b" style="border-color:#FEF3C7; background:#FFFBEB;">
                        <div class="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <h2 class="font-semibold text-amber-800 text-sm">Expiring Soon</h2>
                        </div>
                        <span class="text-xs font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">{{ expiringSoon.length }}</span>
                    </div>
                    <div class="divide-y" style="border-color:#FEF9C3;">
                        <div v-for="product in expiringSoon" :key="product.id" class="flex items-center gap-2 px-3 py-2 hover:bg-amber-50 transition-colors">
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-gray-800 truncate">{{ product.name }}</p>
                                <p class="text-xs text-slate-400">{{ product.stock_qty }}{{ product.unit ? ' ' + product.unit : '' }} · {{ product.expiry_date ? new Date(product.expiry_date).toLocaleDateString('en-LK') : '' }}</p>
                            </div>
                            <span class="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                                :class="expiryLabel(daysUntilExpiry(product.expiry_date)).cls">
                                {{ expiryLabel(daysUntilExpiry(product.expiry_date)).text }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Fast Moving Items -->
                <div v-if="fastMoving.length > 0" class="bg-white rounded-xl shadow-sm" style="border:1px solid #E2E8F0;">
                    <div class="flex items-center justify-between px-4 py-3 border-b" style="border-color:#F1F5F9; background:#F8FAFC;">
                        <div class="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="#F59E0B"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            <p class="text-sm font-semibold text-gray-800">Fast Moving</p>
                        </div>
                        <span class="text-xs text-slate-400">last 30 days</span>
                    </div>
                    <div class="divide-y" style="border-color:#F8FAFC;">
                        <div v-for="(item, idx) in fastMoving" :key="item.product_id"
                            class="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors">
                            <!-- Rank badge -->
                            <div class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                                :style="idx === 0 ? 'background:#FEF3C7;color:#D97706;' : idx === 1 ? 'background:#F1F5F9;color:#94A3B8;' : idx === 2 ? 'background:#FEF3C7;color:#B45309;' : 'background:#F1F5F9;color:#CBD5E1;'">
                                {{ idx + 1 }}
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-gray-800 truncate">{{ item.product_name }}</p>
                                <p class="text-xs text-slate-400">{{ item.bill_count }} bills</p>
                            </div>
                            <!-- Qty bar + count -->
                            <div class="text-right flex-shrink-0">
                                <p class="text-sm font-bold" style="color:#D97706;">{{ Number(item.total_qty).toFixed(0) }}<span class="text-xs font-normal text-slate-400"> sold</span></p>
                                <div class="h-1 rounded-full mt-0.5" style="background:#F1F5F9; width:60px;">
                                    <div class="h-1 rounded-full"
                                        :style="`width:${Math.round((item.total_qty / fastMoving[0].total_qty) * 100)}%; background:#F59E0B;`">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </AuthenticatedLayout>
</template>

<style scoped>
.quick-action-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 1.25rem 1rem;
    min-height: 100px;
    border-radius: 1rem;
    background: linear-gradient(135deg, var(--from), var(--to));
    color: #fff;
    text-decoration: none;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(0,0,0,0.12);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.quick-action-card:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 8px 25px rgba(0,0,0,0.2);
}
.quick-action-card:active { transform: translateY(0) scale(0.98); }
.quick-action-glow { position: absolute; inset: 0; pointer-events: none; }
.quick-action-icon-wrap {
    width: 44px; height: 44px; border-radius: 50%;
    background: rgba(255,255,255,0.2);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255,255,255,0.3);
    transition: background 0.2s;
}
.quick-action-card:hover .quick-action-icon-wrap { background: rgba(255,255,255,0.3); }
.quick-action-icon { width: 22px; height: 22px; color: #fff; }
.quick-action-plus { position: absolute; top: 10px; right: 14px; font-size: 1.4rem; font-weight: 300; opacity: 0.7; line-height: 1; }
.quick-action-label { font-size: 0.78rem; font-weight: 600; letter-spacing: 0.01em; text-align: center; line-height: 1.3; }
.quick-action-arrow { position: absolute; bottom: 10px; right: 12px; opacity: 0; transform: translateX(-4px); transition: opacity 0.2s, transform 0.2s; }
.quick-action-card:hover .quick-action-arrow { opacity: 0.7; transform: translateX(0); }
</style>
