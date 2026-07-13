import { ref, computed } from 'vue';

// Numpad is permanently disabled — numpadEnabled always returns false
const _enabled       = ref(false);
const showNumpad     = ref(false);
const numpadValue    = ref('');
const numpadLabel    = ref('');
const numpadMax      = ref(null);
const numpadCallback = ref(null);
const numpadOnInput  = ref(null);
const numpadRaw      = ref(false);

export const numpadEnabled = computed(() => false);

export const NUMPAD_KEYS = [
    ['7','8','9'],
    ['4','5','6'],
    ['1','2','3'],
    ['.','0','⌫'],
];

export function setNumpadEnabled(_val) {
    // no-op — numpad is permanently disabled
}

export function openNumpad(currentVal, label, callback, { max = null, onInput = null, raw = false } = {}) {
    numpadLabel.value    = String(label || '');
    numpadMax.value      = max ?? null;
    numpadCallback.value = callback;
    numpadOnInput.value  = onInput;
    numpadRaw.value      = raw;
    numpadValue.value    = String(currentVal ?? '');
    showNumpad.value     = true;
}

export function numpadKeyPress(key) {
    if (key === 'C')  { numpadValue.value = ''; numpadOnInput.value?.(numpadValue.value); return; }
    if (key === '⌫') { numpadValue.value = numpadValue.value.slice(0, -1); numpadOnInput.value?.(numpadValue.value); return; }
    if (!numpadRaw.value && key === '.' && numpadValue.value.includes('.')) return;
    if (!numpadRaw.value && numpadValue.value === '0' && key !== '.') { numpadValue.value = key; numpadOnInput.value?.(numpadValue.value); return; }
    numpadValue.value += key;
    numpadOnInput.value?.(numpadValue.value);
}

export function numpadConfirm() {
    numpadCallback.value?.(numpadValue.value);
    numpadCallback.value = null;
    numpadOnInput.value  = null;
    showNumpad.value     = false;
}

export function closeNumpad() {
    numpadCallback.value = null;
    numpadOnInput.value  = null;
    showNumpad.value     = false;
}

export { showNumpad, numpadValue, numpadLabel, numpadMax };
