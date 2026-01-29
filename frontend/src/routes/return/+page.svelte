<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { returnAsset, getCurrentBorrowedAssets, getActiveBorrowRecordForAsset, type BorrowRecord } from '$lib/services/borrowService';

  let { data } = $props();
  let currentUser = $derived(data.currentUser);

  let borrowedAssets = $state<BorrowRecord[]>([]);
  let selectedRecordId = $state<string | null>(null);
  let returnImages = $state<FileList | null>(null);
  let loading = $state(true);
  let submitting = $state(false);
  let error = $state<string | null>(null);

  const assetIdFromQuery = $derived($page.url.searchParams.get('assetId'));
  let isFromQuery = $derived(!!assetIdFromQuery);

  $effect(() => {
    if (!currentUser) {
      goto('/login');
      return;
    }

    async function loadData() {
        try {
          loading = true;
          if (assetIdFromQuery) {
            const record = await getActiveBorrowRecordForAsset(assetIdFromQuery);
            borrowedAssets = [record];
            selectedRecordId = record.id;
          } else {
            const result = await getCurrentBorrowedAssets();
            borrowedAssets = result.items as unknown as BorrowRecord[];
          }

          if (borrowedAssets.length === 0) {
            error = '找不到可歸還的資產。';
          }

        } catch (err: any) {
          error = err.message || '無法載入借用資料';
        } finally {
          loading = false;
        }
    }

    loadData();
  });

  async function handleSubmit() {
    if (!selectedRecordId) {
      alert('請選擇要歸還的資產');
      return;
    }

    submitting = true;
    try {
      await returnAsset(selectedRecordId, returnImages || undefined);
      alert('資產歸還成功！');
      goto('/borrow/list');
    } catch (err: any) {
      error = err.message || '歸還資產失敗';
      alert('歸還失敗: ' + error);
    } finally {
      submitting = false;
    }
  }
</script>

<div class="container mt-4">
    <div class="row justify-content-center">
        <div class="col-md-8 col-lg-6">
            <div class="card shadow-sm">
                <div class="card-header bg-white py-3">
                    <h4 class="mb-0 card-title"><i class="mdi mdi-undo-variant me-2"></i>歸還資產</h4>
                </div>
                <div class="card-body">
                    {#if loading}
                        <div class="text-center py-5">
                            <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
                        </div>
                    {:else if error}
                        <div class="alert alert-danger">{error}</div>
                        <a href="/borrow/list" class="btn btn-secondary">返回列表</a>
                    {:else}
                        <form onsubmit={handleSubmit}>
                            <div class="mb-3">
                                <label for="assetSelect" class="form-label fw-bold">要歸還的資產</label>
                                <select id="assetSelect" class="form-select" bind:value={selectedRecordId} required disabled={isFromQuery}>
                                    {#if !isFromQuery}
                                      <option value={null} disabled>請選擇...</option>
                                    {/if}
                                    {#each borrowedAssets as record}
                                        <option value={record.id}>
                                            {record.expand?.asset?.name} (應於 {new Date(record.expected_return_date).toLocaleDateString()} 歸還)
                                        </option>
                                    {/each}
                                </select>
                                {#if isFromQuery && borrowedAssets[0]}
                                  <div class="form-text">
                                    由 {borrowedAssets[0].expand?.user?.name || borrowedAssets[0].expand?.user?.email} 借用
                                  </div>
                                {/if}
                            </div>

                            <div class="mb-4">
                                <label for="images" class="form-label fw-bold">歸還時照片 (建議)</label>
                                <input type="file" class="form-control" id="images" accept="image/*" multiple onchange={(e) => returnImages = e.currentTarget.files}>
                                <div class="form-text">建議拍攝資產歸還時的狀況，以保障雙方權益。</div>
                            </div>

                            <div class="d-flex justify-content-end gap-2">
                                <a href="/borrow/list" class="btn btn-secondary">取消</a>
                                <button type="submit" class="btn btn-primary" disabled={submitting}>
                                    {#if submitting}
                                        <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                        處理中...
                                    {:else}
                                        <i class="mdi mdi-check me-1"></i>確認歸還
                                    {/if}
                                </button>
                            </div>
                        </form>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>
