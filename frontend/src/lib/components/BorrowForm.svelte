<script lang="ts">
    import { enhance } from '$app/forms';
    import type { Asset } from '$lib/types';

    // 定義 Props
    let { asset, currentUser, borrowableUsers = [], onsuccess, oncancel } = $props<{
        asset: Asset,
        currentUser?: any,
        borrowableUsers?: any[],
        onsuccess?: (record?: any) => void,
        oncancel?: () => void
    }>();

    let submitting = $state(false);
    let error = $state<string | null>(null);
    let expectedReturnDate = $state('');

    // 計算預設歸還日期 (例如預設 7 天後)
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    expectedReturnDate = defaultDate.toISOString().split('T')[0];

    function handleCancel() {
        if (oncancel) oncancel();
    }
</script>

<form
    method="POST"
    action="?/borrow"
    enctype="multipart/form-data"
    use:enhance={() => {
        submitting = true;
        error = null;

        return async ({ result, update }) => {
            submitting = false;

            if (result.type === 'success') {
                if (onsuccess) onsuccess(result.data);
                await update();

            } else if (result.type === 'failure') {
                const data = result.data as Record<string, any>;
                error = data?.error || '借用申請失敗';

            } else if (result.type === 'error') {
                error = '發生系統錯誤，請稍後再試';
            }
        };
    }}
>
    <input type="hidden" name="asset" value={asset.id} />

    <div class="modal-body">
        {#if error}
            <div class="alert alert-danger">{error}</div>
        {/if}

        <div class="mb-4">
            <h5 class="fw-bold">{asset.name}</h5>
            <div class="text-muted small">
                資產編號: {asset.asset_id}
            </div>
            <div class="text-muted small">
                品牌: {asset.brand || '無'} / 型號: {asset.model || '無'}
            </div>
        </div>

        <div class="mb-3">
            <label for="user" class="form-label fw-bold">借用人</label>
            {#if borrowableUsers && borrowableUsers.length > 1}
                <select name="user" id="user" class="form-select">
                    {#each borrowableUsers as user}
                        <option value={user.id} selected={user.id === currentUser?.id}>
                            {user.name || user.email}
                        </option>
                    {/each}
                </select>
            {:else}
                <input type="hidden" name="user" value={currentUser?.id} />
                <input type="text" class="form-control" value="{currentUser?.name || currentUser?.email || '未知使用者'}" disabled readonly />
            {/if}
        </div>

        <div class="mb-3">
            <label for="returnDate" class="form-label fw-bold">預計歸還日期 <span class="text-danger">*</span></label>
            <input
                type="date"
                class="form-control"
                id="returnDate"
                name="expected_return_date"
                bind:value={expectedReturnDate}
                min={new Date().toISOString().split('T')[0]}
                required
            />
        </div>

        <div class="mb-3">
            <label for="images" class="form-label fw-bold">借用時照片 (選填)</label>
            <input
                type="file"
                class="form-control"
                id="images"
                name="borrow_images"
                accept="image/*"
                multiple
            />
            <div class="form-text">建議拍攝資產現況，以保障雙方權益。</div>
        </div>
    </div>
    <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick={handleCancel} disabled={submitting}>取消</button>
        <button type="submit" class="btn btn-primary" disabled={submitting}>
            {#if submitting}
                <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                處理中...
            {:else}
                <i class="mdi mdi-check me-1"></i>確認借用
            {/if}
        </button>
    </div>
</form>