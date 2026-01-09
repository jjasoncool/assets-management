import { writable } from 'svelte/store';

// 動態載入的 Bootstrap
export const bs = writable<any>(null);

// SweetAlert2
export const Swal = writable<any>(null);
