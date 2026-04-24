<script lang="ts">
    import type { PageData, ActionData } from './$types';
    import * as XLSX from 'xlsx';
    import { enhance } from '$app/forms';
    import Navbar from '$lib/components/Navbar.svelte';

    // 從 page.server.ts 取得預載的資料 (用於匯出) 和 form action 的結果
    let { data, form }: { data: PageData; form?: ActionData } = $props();

    // ------------------------------
    // 通用狀態 (General State)
    // ------------------------------
    let activeTab = $state<'import' | 'export'>('export');
    let isLoading = $state(false);

    // ------------------------------
    // 匯出功能 (Export Logic)
    // ------------------------------
    const handleExport = () => {
        isLoading = true;

        // 使用 setTimeout 確保 UI 有時間更新
        setTimeout(() => {
            try {
                console.log('開始匯出...');
                console.log('資產數量:', data.assets?.length || 0);
                console.log('類別數量:', data.categories?.length || 0);

                if (!data.assets || !data.categories) {
                    throw new Error('缺少必要資料：assets 或 categories');
                }

                const wb = XLSX.utils.book_new();

                // 取得所有 category 的 id -> name 對應
                const categoryNameMap = new Map(data.categories.map(c => [c.id, c.name]));
                console.log('類別對應表:', categoryNameMap);

                // 將資產按類別分組
                const assetsByCategory = new Map<string, any[]>();
                for (const asset of data.assets) {
                    const categoryId = typeof asset.category === 'string' ? asset.category : asset.category?.id;
                    const categoryName = (categoryId ? categoryNameMap.get(categoryId) : undefined) || '未分類';

                    if (!assetsByCategory.has(categoryName)) {
                        assetsByCategory.set(categoryName, []);
                    }

                    // @ts-ignore - expand is not strongly typed here
                    const assignedToName = asset.expand?.assigned_to?.name || '';

                    assetsByCategory.get(categoryName)?.push({
                        '財產編號': asset.asset_id || '',
                        '資產名稱': asset.name || '',
                        '狀態': asset.status || '',
                        '品牌': asset.brand || '',
                        '型號': asset.model || '',
                        '序號': asset.serial_number || '',
                        '購買日期': asset.purchase_date ? asset.purchase_date.split('T')[0] : '',
                        '原廠維護年限': asset.warranty_years || '',
                        '部門': asset.department || '',
                        '保管人': assignedToName,
                        '備註': asset.notes || '',
                        '機密性': asset.confidentiality_score || '',
                        '完整性': asset.integrity_score || '',
                        '可用性': asset.availability_score || '',
                        '風險總分': asset.total_risk_score || ''
                    });
                }

                console.log('資產分組完成，類別數量:', assetsByCategory.size);

                // 為每個類別創建一個 sheet
                for (const category of data.categories) {
                    const assets = assetsByCategory.get(category.name);
                    // Excel 工作表名稱不能包含特殊字符: : \ / ? * [ ]
                    // 將這些字符替換為底線
                    const safeSheetName = category.name.replace(/[:\\/\?\*\[\]]/g, '_');
                    console.log(`處理類別: ${category.name} -> ${safeSheetName}, 資產數量: ${assets?.length || 0}`);

                    if (assets && assets.length > 0) {
                        // 按照財產編號 ASC 排序
                        const sortedAssets = assets.sort((a, b) => {
                            const idA = a['財產編號'] || '';
                            const idB = b['財產編號'] || '';
                            return idA.localeCompare(idB);
                        });
                        const ws = XLSX.utils.json_to_sheet(sortedAssets);
                        XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
                    } else {
                        // 即使該類別沒有資產，也產生一個空表與表頭，方便使用者當作「匯入範本」
                        const emptyHeader = [{
                            '財產編號': '', '資產名稱': '', '狀態': '', '品牌': '', '型號': '', '序號': '',
                            '購買日期': '', '原廠維護年限': '', '部門': '', '保管人': '', '備註': '',
                            '機密性': '', '完整性': '', '可用性': ''
                        }];
                        const ws = XLSX.utils.json_to_sheet(emptyHeader);
                        // 清除第一行(因為是假資料)
                        XLSX.utils.sheet_add_aoa(ws, [[]], { origin: "A2" });
                        XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
                    }
                }

                console.log('工作表創建完成，準備下載...');

                // 下載檔案
                const filename = `assets_export_${new Date().toISOString().split('T')[0]}.xlsx`;
                XLSX.writeFile(wb, filename);

                console.log('匯出成功！檔案名稱:', filename);

            } catch (err) {
                console.error('匯出過程發生錯誤:', err);
                const errorMessage = err instanceof Error ? err.message : String(err);
                const errorStack = err instanceof Error ? err.stack : '';
                console.error('錯誤堆疊:', errorStack);
                alert(`匯出失敗: ${errorMessage}\n\n請檢查瀏覽器控制台 (F12) 以獲取詳細錯誤資訊。`);
            } finally {
                isLoading = false;
            }
        }, 100);
    };
</script>

<svelte:head>
    <title>資產大量作業 | Asset Management</title>
</svelte:head>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-sm-4">
        <Navbar />

        <div class="card shadow-sm bg-white bg-opacity-90 mt-4">
            <div class="card-header bg-white bg-opacity-90 py-3 d-flex justify-content-between align-items-center">
                <h5 class="card-title mb-0 fw-bold">
                    <i class="mdi mdi-file-excel-box me-2"></i>資產大量作業
                </h5>
                <a href="/assets" class="btn btn-outline-secondary btn-sm bg-white">
                    <i class="mdi mdi-arrow-left me-1"></i> 返回資產清單
                </a>
            </div>

            <ul class="nav nav-tabs px-4 pt-2 border-bottom-0 bg-light bg-opacity-50" role="tablist">
                <li class="nav-item" role="presentation">
                    <button
                        class="nav-link"
                        class:active={activeTab === 'export'}
                        onclick={() => (activeTab = 'export')}
                        type="button"
                    >
                        <i class="mdi mdi-application-export me-1"></i>
                        匯出資產
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button
                        class="nav-link"
                        class:active={activeTab === 'import'}
                        onclick={() => (activeTab = 'import')}
                        type="button"
                    >
                        <i class="mdi mdi-application-import me-1"></i>
                        匯入資產
                    </button>
                </li>
            </ul>

            {#if isLoading}
                <div class="card-body bg-white">
                    <div class="d-flex justify-content-center align-items-center py-5">
                        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                            <span class="visually-hidden">處理中...</span>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- 匯入分頁 -->
            {#if activeTab === 'import' && !isLoading}
                <div class="card-body p-4 bg-white">
                    <form method="POST" action="?/upload" enctype="multipart/form-data" use:enhance={() => {
                        isLoading = true;
                        return async ({ update }) => {
                            await update();
                            isLoading = false;
                        };
                    }}>
                        <div class="alert alert-info border-0">
                            <h6 class="alert-heading fw-bold mb-3">
                                <i class="mdi mdi-information-outline me-2"></i>使用說明
                            </h6>
                            <ul class="mb-0 small">
                                <li>建議先至「匯出資產」下載範本。系統會根據 <strong>工作表 (Sheet) 名稱</strong> 對應「資產類別」。</li>
                                <li><strong>新增資產：</strong> 保持「財產編號」欄位為空白，系統會自動分配新編號。</li>
                                <li><strong>更新資產：</strong> 填寫既有的「財產編號」(如 PC0001)，系統會更新該筆資產的其他欄位。</li>
                                <li>日期格式建議設定為 <code>YYYY-MM-DD</code>。</li>
                            </ul>
                        </div>

                        <div class="mb-4">
                            <label for="asset-file" class="form-label fw-bold">
                                選擇 Excel 檔案 <span class="text-danger">*</span>
                            </label>
                            <input
                                type="file"
                                name="asset-file"
                                id="asset-file"
                                class="form-control"
                                accept=".xlsx"
                                required
                            />
                            <div class="form-text">僅支援 .xlsx 格式檔案</div>
                        </div>

                        <hr class="my-4" />

                        <div class="d-flex justify-content-end gap-2">
                            <button type="button" class="btn btn-light border" onclick={() => (activeTab = 'export')}>
                                <i class="mdi mdi-arrow-left me-1"></i> 返回
                            </button>
                            <button type="submit" class="btn btn-primary px-4">
                                <i class="mdi mdi-upload me-1"></i>
                                上傳並處理
                            </button>
                        </div>
                    </form>
                </div>

                {#if form?.results}
                    <div class="border-top">
                        <div class="card-body p-4 bg-light">
                            <h6 class="fw-bold mb-3">
                                <i class="mdi mdi-clipboard-check-outline me-2"></i>處理結果
                            </h6>

                            <div class="alert {form.failedCount > 0 ? 'alert-warning' : 'alert-success'} border-0 mb-3">
                                <div class="d-flex align-items-center">
                                    <i class="mdi {form.failedCount > 0 ? 'mdi-alert-circle-outline' : 'mdi-check-circle-outline'} fs-4 me-3"></i>
                                    <div>
                                        <strong>處理完成！</strong>
                                        新增 <span class="badge bg-success">{form.createdCount || 0}</span> 筆，
                                        更新 <span class="badge bg-info">{form.updatedCount || 0}</span> 筆。
                                        {#if form.failedCount > 0}
                                            失敗 <span class="badge bg-danger">{form.failedCount}</span> 筆。
                                        {/if}
                                    </div>
                                </div>
                            </div>

                            {#if form.failedCount > 0}
                                <h6 class="fw-bold text-danger mb-3">失敗與略過詳情</h6>
                                <div class="table-responsive" style="max-height: 400px;">
                                    <table class="table table-sm table-bordered bg-white small mb-0">
                                        <thead class="table-light sticky-top">
                                            <tr>
                                                <th style="width: 5%;">#</th>
                                                <th style="width: 50%;">訊息</th>
                                                <th>原始資料</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {#each form.results.filter(r => !r.success) as res, i}
                                                <tr class="table-danger">
                                                    <td class="text-center">{i + 1}</td>
                                                    <td>{res.message}</td>
                                                    <td>
                                                        {#if res.data}
                                                            <pre class="small bg-light p-2 rounded mb-0" style="white-space: pre-wrap; word-break: break-all;"><code>{JSON.stringify(res.data, null, 2)}</code></pre>
                                                        {:else}
                                                            <span class="text-muted">---</span>
                                                        {/if}
                                                    </td>
                                                </tr>
                                            {/each}
                                        </tbody>
                                    </table>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}
            {/if}

            <!-- 匯出分頁 -->
            {#if activeTab === 'export' && !isLoading}
                <div class="card-body p-5 bg-white">
                    <div class="text-center">
                        <div class="mb-4">
                            <i class="mdi mdi-file-excel-box text-success" style="font-size: 5rem; opacity: 0.8;"></i>
                        </div>
                        <h5 class="card-title mb-3">匯出所有資產或下載範本</h5>
                        <p class="card-text text-muted mb-4">
                            點擊下方按鈕，將系統中所有資產匯出為 Excel 檔案。<br>
                            各資產類別會獨立為一個工作表 (Sheet)。<br>
                            您可直接修改此檔案並重新上傳以更新資料，或在空白列新增資料。
                        </p>
                        <button class="btn btn-success btn-lg px-5" onclick={handleExport}>
                            <i class="mdi mdi-download me-2"></i>
                            下載 Excel 檔案
                        </button>
                    </div>
                </div>
            {/if}

            {#if !isLoading}
                <div class="card-footer bg-white py-2 text-end">
                    <small class="text-muted">
                        <i class="mdi mdi-information-outline me-1"></i>
                        {activeTab === 'import' ? '支援批次新增與更新資產' : `目前系統共有 ${data.assets.length} 筆資產`}
                    </small>
                </div>
            {/if}
        </div>
    </div>
</div>
