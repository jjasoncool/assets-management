import 'flatpickr/dist/flatpickr.min.css';
import type { Options } from 'flatpickr/dist/types/options';
import type { Instance } from 'flatpickr/dist/types/instance';

/**
 * Svelte Action to integrate Flatpickr with a text input.
 * This avoids SSR issues by dynamically importing flatpickr.
 * It also dispatches a 'change' event to support `bind:value`.
 *
 * @param node The input element to apply Flatpickr to.
 * @param options Optional Flatpickr configuration options.
 *
 * @example
 * <input type="text" use:flatpickr={{ dateFormat: 'Y-m-d' }} bind:value={myDate} />
 */
export const flatpickr = (node: HTMLInputElement, options: Options = {}) => {
    let instance: Instance | null = null;

    // 動態載入 flatpickr，避免 SSR 問題
    import('flatpickr').then(({ default: fp }) => {
        // 確保節點仍然存在
        if (node) {
            instance = fp(node, {
                ...options, // 允許外部傳入的選項
                // 覆寫 onChange 以整合 Svelte 的數據綁定
                onChange: (selectedDates, dateStr, inst) => {
                    // 處理使用者傳入的 onChange，可能是單一函式或函式陣列
                    if (options.onChange) {
                        if (Array.isArray(options.onChange)) {
                            for (const hook of options.onChange) {
                                hook(selectedDates, dateStr, inst);
                            }
                        } else {
                            options.onChange(selectedDates, dateStr, inst);
                        }
                    }

                    // 手動更新 input 的值
                    // Note: This is important for bind:value to get the correct string
                    node.value = dateStr;

                    // 派發一個 'change' 事件，這樣 Svelte 的 on:change 和 bind:value 才能監聽到變更
                    node.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }
    });

    return {
        // 當 DOM 節點被移除時，銷毀 flatpickr 實例以釋放記憶體
        destroy() {
            instance?.destroy();
        }
    };
};
