<script lang="ts">
  import { borrowAsset } from '$lib/services/borrowService';
  import { pb } from '$lib/pocketbase';

  let { asset, onsuccess, oncancel } = $props();

  const currentUser = pb.authStore.model;
  let submitting = $state(false);
  let expectedReturnDate = $state('');
  let borrowImages = $state<FileList | null>(null);
  let error = $state<string | null>(null);

  async function handleSubmit() {
    if (!expectedReturnDate) {
      alert('請選擇預計歸還日期');
      return;
    }

    submitting = true;
    error = null;
    try {
      const newRecord = await borrowAsset(asset.id, expectedReturnDate, borrowImages || undefined);
      if (onsuccess) onsuccess(newRecord);
    } catch (err: any) {
      console.error(err);
      error = err.message || '借用申請失敗';
      alert('借用失敗: ' + error);
    } finally {
      submitting = false;
    }
  }

  function handleCancel() {
    if (oncancel) oncancel();
  }
</script>

<form onsubmit={handleSubmit}>
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
            <label for="borrower" class="form-label fw-bold">借用人</label>
            <input id="borrower" type="text" class="form-control" value="{currentUser?.name || currentUser?.email || '未知使用者'}" disabled readonly />
        </div>

        <div class="mb-3">
            <label for="returnDate" class="form-label fw-bold">預計歸還日期 <span class="text-danger">*</span></label>
            <input
                type="date"
                class="form-control"
                id="returnDate"
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
                accept="image/*"
                multiple
                onchange={(e) => borrowImages = e.currentTarget.files}
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
