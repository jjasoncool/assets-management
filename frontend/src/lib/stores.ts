import { writable } from 'svelte/store';
import type Swal from 'sweetalert2';
import type { SweetAlertResult } from 'sweetalert2';

// 動態載入的 Bootstrap
export const bs = writable<any>(null);

// SweetAlert2
export const swal = writable<typeof Swal | null>(null);

// Re-exporting types for convenience
export type { SweetAlertResult };
