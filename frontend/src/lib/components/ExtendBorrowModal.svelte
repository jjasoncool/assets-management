<script lang="ts">
    import { enhance } from '$app/forms';
    import { flatpickr } from '$lib/actions/flatpickr';
    import type { Modal } from 'bootstrap';
    import { bs, swal } from '$lib/stores';

    // 內部狀態控制
    let modalElement: HTMLDivElement;
    let modal: Modal | null = $state(null);
    let bsInstance: any = null;
    let SwalInstance: any = null;

    // 表單資料
    let selectedRecord: any = $state(null);
    let newExpectedReturnDate = $state('');
    let extensionReason = $state('');
    let isSubmitting = $state(false);

    // Flatpickr 配置
    let flatpickrOptions = $derived.by(() => {
        if (!selectedRecord) return {};

        const currentExpectedDate = new Date(selectedRecord.expected_return_date);
        const minDate = new Date(currentExpectedDate);
        minDate.setDate(minDate.getDate() + 1); // 最小日期為當前日期的隔天

        return {
            dateFormat: 'Y-m-d',
            minDate: minDate,
            locale: {
                firstDayOfWeek: 1,
                weekdays: {
                    shorthand: ['日', '一', '二', '三', '四', '五', '六'] as [string, string, string, string, string, string, string],
                    longhand: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] as [string, string, string, string, string, string, string]
                },
                months: {
                    shorthand: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'] as [string, string, string, string, string, string, string, string, string, string, string, string],
                    longhand: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'] as [string, string, string, string, string, string, string, string, string, string, string, string]
                }
            }
        };
    });

    bs.subscribe((value) => (bsInstance = value));
    swal.subscribe((value) => (SwalInstance = value));

    $effect(() => {
        if (modalElement && bsInstance) {
            modal = new bsInstance.Modal(modalElement, { keyboard: true, backdrop: 'static' });
        }
        return () => modal?.dispose();
    });

    /**
     * 暴露給外部元件呼叫的方法：開啟 Modal 並載入資料
     */
    export function showModal(record: any) {
        selectedRecord = record;
        newExpectedReturnDate = '';
        extensionReason = '';
        isSubmitting = false;
        modal?.show();
    }

    /**
     * 關閉 Modal
     */
    function closeModal() {
        modal?.hide();
    }

    /**
     * 處理表單提交結果
     */
function handleResult({ result }: any) {
        isSubmitting = false;
        if (result.type === 'success') {
            // 【修正】使用 SwalInstance?.fire 來觸發彈窗
            SwalInstance?.fire({
                icon: 'success',
                title: '延期成功',
                text: '借用記錄已成功延期，系統已發送通知給管理員',
                confirmButtonText: '確定'
            }).then(() => {
                closeModal();
                // 重新載入頁面以更新資料
                window.location.reload();
            });
        } else if (result.type === 'failure') {
            // 【修正】使用 SwalInstance?.fire 來觸發彈窗
            SwalInstance?.fire({
                icon: 'error',
                title: '延期失敗',
                text: result.data?.message || '發生未知錯誤，請稍後再試',
                confirmButtonText: '確定'
            });
        }
    }
</script>

<div class="modal fade" id="extendBorrowModal" bind:this={modalElement} tabindex="-1" aria-labelledby="extendBorrowModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow border-0">
            {#if selectedRecord}
                <div class="modal-header bg-light">
                    <h5 class="modal-title fw-bold" id="extendBorrowModalLabel">
                        <i class="mdi mdi-calendar-clock me-2 text-warning"></i>延期借用
                    </h5>
                    <button type="button" class="btn-close" onclick={closeModal} aria-label="Close" disabled={isSubmitting}></button>
                </div>

                <form
                    method="POST"
                    action="?/extend"
                    use:enhance={() => {
                        isSubmitting = true;
                        return handleResult;
                    }}
                >
                    <input type="hidden" name="borrowRecordId" value={selectedRecord.id} />

                    <div class="modal-body p-4">
                        <div class="mb-3">
                            <span class="text-muted small d-block">資產資訊</span>
                            <span class="fw-bold fs-5">{selectedRecord.expand?.asset?.name || 'Unknown'}</span>
                            <br>
                            <small class="font-monospace text-muted">{selectedRecord.expand?.asset?.asset_id}</small>
                        </div>

                        <div class="mb-3">
                            <label for="currentReturnDate" class="form-label fw-medium">
                                當前預計歸還日期
                            </label>
                            <input
                                type="text"
                                id="currentReturnDate"
                                class="form-control"
                                value={selectedRecord.expected_return_date.split(' ')[0]}
                                readonly
                                disabled
                            />
                        </div>

                        <div class="mb-3">
                            <label for="newExpectedReturnDate" class="form-label fw-medium">
                                新的歸還日期 <span class="text-danger">*</span>
                            </label>
                            <input
                                type="text"
                                id="newExpectedReturnDate"
                                name="newExpectedReturnDate"
                                class="form-control"
                                placeholder="請選擇新的歸還日期"
                                bind:value={newExpectedReturnDate}
                                use:flatpickr={flatpickrOptions}
                                required
                                disabled={isSubmitting}
                            />
                            <small class="text-muted">新日期必須晚於當前預計歸還日期</small>
                        </div>

                        <div class="mb-3">
                            <label for="extensionReason" class="form-label fw-medium">
                                延期理由 <span class="text-muted">(選填)</span>
                            </label>
                            <textarea
                                id="extensionReason"
                                name="extensionReason"
                                class="form-control"
                                rows="3"
                                maxlength="500"
                                placeholder="請說明延期原因（最多 500 字）"
                                bind:value={extensionReason}
                                disabled={isSubmitting}
                            ></textarea>
                            <small class="text-muted">{extensionReason.length} / 500</small>
                        </div>

                        <div class="alert alert-warning d-flex align-items-start mb-0">
                            <i class="mdi mdi-information-outline me-2 mt-1"></i>
                            <div>
                                <strong>提醒：</strong>延期後系統將自動發送 Email 通知給所有管理員
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer bg-light border-0">
                        <button type="button" class="btn btn-secondary px-4" onclick={closeModal} disabled={isSubmitting}>
                            取消
                        </button>
                        <button type="submit" class="btn btn-warning px-4" disabled={isSubmitting || !newExpectedReturnDate}>
                            {#if isSubmitting}
                                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                處理中...
                            {:else}
                                <i class="mdi mdi-check me-1"></i>確認延期
                            {/if}
                        </button>
                    </div>
                </form>
            {/if}
        </div>
    </div>
</div>

<style>
    .modal-body {
        max-height: 70vh;
        overflow-y: auto;
    }
</style>
