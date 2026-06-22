import { ref, readonly } from 'vue';

export const SIDEBAR_PRESETS = [
    { id: 'slate',  label: 'Slate',  bg: '#1e293b', header: '#0f172a', active: '#2563eb', text: '#cbd5e1', hover: '#334155' },
    { id: 'zinc',   label: 'Zinc',   bg: '#27272a', header: '#18181b', active: '#6366f1', text: '#d4d4d8', hover: '#3f3f46' },
    { id: 'forest', label: 'Forest', bg: '#14532d', header: '#052e16', active: '#16a34a', text: '#bbf7d0', hover: '#166534' },
    { id: 'navy',   label: 'Navy',   bg: '#1e3a5f', header: '#0f2542', active: '#0ea5e9', text: '#bae6fd', hover: '#1e4976' },
    { id: 'purple', label: 'Royal',  bg: '#3b0764', header: '#1e0342', active: '#a855f7', text: '#e9d5ff', hover: '#4c0885' },
    { id: 'coffee', label: 'Coffee', bg: '#292524', header: '#1c1917', active: '#d97706', text: '#d6d3d1', hover: '#44403c' },
];

export const PRIMARY_PRESETS = [
    { id: 'blue',   label: 'Blue',   color: '#2563eb', hover: '#1d4ed8', light: '#eff6ff' },
    { id: 'green',  label: 'Green',  color: '#16a34a', hover: '#15803d', light: '#f0fdf4' },
    { id: 'purple', label: 'Purple', color: '#9333ea', hover: '#7e22ce', light: '#faf5ff' },
    { id: 'orange', label: 'Orange', color: '#ea580c', hover: '#c2410c', light: '#fff7ed' },
    { id: 'red',    label: 'Red',    color: '#dc2626', hover: '#b91c1c', light: '#fef2f2' },
    { id: 'teal',   label: 'Teal',   color: '#0d9488', hover: '#0f766e', light: '#f0fdfa' },
];

const sidebarPreset = ref(localStorage.getItem('sidebarPreset') || 'slate');
const primaryPreset = ref(localStorage.getItem('primaryPreset') || 'blue');

function applyTheme() {
    const s = SIDEBAR_PRESETS.find(p => p.id === sidebarPreset.value) || SIDEBAR_PRESETS[0];
    const p = PRIMARY_PRESETS.find(p => p.id === primaryPreset.value) || PRIMARY_PRESETS[0];
    const r = document.documentElement;
    r.style.setProperty('--sidebar-bg',     s.bg);
    r.style.setProperty('--sidebar-header', s.header);
    r.style.setProperty('--sidebar-active', s.active);
    r.style.setProperty('--sidebar-text',   s.text);
    r.style.setProperty('--sidebar-hover',  s.hover);
    r.style.setProperty('--primary',        p.color);
    r.style.setProperty('--primary-hover',  p.hover);
    r.style.setProperty('--primary-light',  p.light);
}

function setSidebarPreset(id) {
    if (!SIDEBAR_PRESETS.find(p => p.id === id)) return;
    sidebarPreset.value = id;
    localStorage.setItem('sidebarPreset', id);
    applyTheme();
}

function setPrimaryPreset(id) {
    if (!PRIMARY_PRESETS.find(p => p.id === id)) return;
    primaryPreset.value = id;
    localStorage.setItem('primaryPreset', id);
    applyTheme();
}

export function initTheme(dbSettings) {
    if (dbSettings?.sidebar_theme && SIDEBAR_PRESETS.find(p => p.id === dbSettings.sidebar_theme)) {
        sidebarPreset.value = dbSettings.sidebar_theme;
        localStorage.setItem('sidebarPreset', dbSettings.sidebar_theme);
    }
    if (dbSettings?.primary_color && PRIMARY_PRESETS.find(p => p.id === dbSettings.primary_color)) {
        primaryPreset.value = dbSettings.primary_color;
        localStorage.setItem('primaryPreset', dbSettings.primary_color);
    }
    applyTheme();
}

export function useTheme() {
    return {
        sidebarPreset: readonly(sidebarPreset),
        primaryPreset: readonly(primaryPreset),
        setSidebarPreset,
        setPrimaryPreset,
        applyTheme,
        SIDEBAR_PRESETS,
        PRIMARY_PRESETS,
    };
}
