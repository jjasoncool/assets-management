<script lang="ts">
    import { goto } from "$app/navigation";
    import { untrack } from "svelte";
    import Navbar from "$lib/components/Navbar.svelte";
    import type { PageData } from "./$types";

    type LabelAsset = PageData["assets"][number];
    type PreviewSlot = LabelAsset | null;

    let { data } = $props<{ data: PageData }>();

    let searchQuery = $state("");
    let statusFilter = $state("active");
    let categoryFilter = $state("");
    let selectedAssetIds = $state<string[]>([]);
    let startSlot = $state(1);
    let isGenerating = $state(false);
    let errorMessage = $state("");

    const labelsPerTemplate = 40;

    const statusOptions = [
        { value: "", label: "全部狀態" },
        { value: "active", label: "正常" },
        { value: "inactive", label: "停用" },
        { value: "maintenance", label: "維護中" },
        { value: "retired", label: "已報廢" },
        { value: "lost", label: "遺失" },
        { value: "stolen", label: "失竊" },
        { value: "borrowed", label: "借出中" },
    ];

    const assets = $derived(data.assets || []);
    const selectedAssets = $derived(
        selectedAssetIds
            .map((id) => assets.find((asset: LabelAsset) => asset.id === id))
            .filter(Boolean) as LabelAsset[],
    );
    const availableSlots = $derived(
        labelsPerTemplate - Number(startSlot || 1) + 1,
    );
    const previewSlots = $derived(
        buildPreviewSlots(selectedAssets, Number(startSlot || 1)),
    );
    const isOverLimit = $derived(selectedAssets.length > availableSlots);
    const remainingSlots = $derived(Math.max(availableSlots - selectedAssets.length, 0));

    function formatDate(value?: string) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime()))
            return String(value).split("T")[0]?.split(" ")[0] || "";

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function buildPreviewSlots(
        items: LabelAsset[],
        slot: number,
    ): PreviewSlot[] {
        const normalizedStartSlot = Math.min(
            Math.max(Number(slot || 1), 1),
            labelsPerTemplate,
        );
        const slots: PreviewSlot[] = Array.from(
            { length: labelsPerTemplate },
            () => null,
        );

        items.forEach((asset, index) => {
            const slotIndex = normalizedStartSlot - 1 + index;
            if (slotIndex < labelsPerTemplate) slots[slotIndex] = asset;
        });

        return slots;
    }

    function updateParams() {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("search", searchQuery.trim());
        if (statusFilter) params.set("status", statusFilter);
        if (categoryFilter) params.set("category", categoryFilter);
        goto(`/asset-labels?${params.toString()}`);
    }

    function resetFilters() {
        searchQuery = "";
        statusFilter = "active";
        categoryFilter = "";
        goto("/asset-labels?status=active");
    }

    function toggleAssetSelection(assetId: string) {
        errorMessage = "";
        selectedAssetIds = selectedAssetIds.includes(assetId)
            ? selectedAssetIds.filter((id) => id !== assetId)
            : [...selectedAssetIds, assetId];
    }

    function toggleSelectAll() {
        errorMessage = "";
        if (
            assets.length > 0 &&
            assets.every((asset: LabelAsset) =>
                selectedAssetIds.includes(asset.id),
            )
        ) {
            selectedAssetIds = selectedAssetIds.filter(
                (id) => !assets.some((asset: LabelAsset) => asset.id === id),
            );
            return;
        }

        selectedAssetIds = Array.from(
            new Set([
                ...selectedAssetIds,
                ...assets.map((asset: LabelAsset) => asset.id),
            ]),
        );
    }

    function selectAllAssets() {
        errorMessage = "";
        selectedAssetIds = Array.from(
            new Set([
                ...selectedAssetIds,
                ...assets.map((asset: LabelAsset) => asset.id),
            ]),
        );
    }

    function clearSelection() {
        errorMessage = "";
        selectedAssetIds = [];
    }

    function getFileNameFromDisposition(disposition: string | null) {
        if (!disposition) return "";
        const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
        const asciiMatch = disposition.match(/filename="?([^";]+)"?/i);
        return asciiMatch?.[1] || "";
    }

    async function generateDocx() {
        errorMessage = "";

        if (selectedAssets.length === 0) {
            errorMessage = "請先選擇至少一筆資產";
            return;
        }

        if (isOverLimit) {
            errorMessage = `從第 ${startSlot} 格開始最多只能放 ${availableSlots} 筆資產，請減少選取數量或調整起始格。`;
            return;
        }

        isGenerating = true;
        try {
            const response = await fetch("/app-api/asset-labels/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    assetIds: selectedAssetIds,
                    startSlot: Number(startSlot || 1),
                }),
            });

            if (!response.ok) {
                const result = await response
                    .json()
                    .catch(() => ({ error: "產生失敗" }));
                throw new Error(result.error || "產生失敗");
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download =
                getFileNameFromDisposition(
                    response.headers.get("Content-Disposition"),
                ) || "資產標籤.docx";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            errorMessage =
                err instanceof Error ? err.message : "產生資產標籤 Word 失敗";
        } finally {
            isGenerating = false;
        }
    }

    $effect(() => {
        searchQuery = data.filters.search || "";
        statusFilter = data.filters.status || "";
        categoryFilter = data.filters.category || "";
    });

    $effect(() => {
        const currentAssetIds = new Set(
            assets.map((asset: LabelAsset) => asset.id),
        );
        const currentSelectedAssetIds = untrack(() => selectedAssetIds);
        const availableSelectedAssetIds = currentSelectedAssetIds.filter((id) =>
            currentAssetIds.has(id),
        );

        if (
            availableSelectedAssetIds.length !== currentSelectedAssetIds.length
        ) {
            selectedAssetIds = availableSelectedAssetIds;
        }
    });
</script>

<svelte:head>
    <title>資產管理 - 資產標籤</title>
</svelte:head>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-sm-4">
        <Navbar />

        {#if errorMessage}
            <div class="alert alert-danger border-0 shadow-sm">
                <i class="mdi mdi-alert-circle-outline me-2"></i>{errorMessage}
            </div>
        {/if}

        <div class="row mt-4">
            <div class="col-12 col-xl-7">
                <div class="card shadow-sm bg-white bg-opacity-90 mb-4">
                    <div class="card-body">
                        <div class="row g-3 align-items-end">
                            <div class="col-12 col-lg-4">
                                <label
                                    class="form-label fw-semibold"
                                    for="label-search">搜尋</label
                                >
                                <input
                                    id="label-search"
                                    class="form-control"
                                    type="search"
                                    bind:value={searchQuery}
                                    placeholder="資產編號、名稱、品牌、型號"
                                    onkeydown={(event) => {
                                        if (event.key === "Enter")
                                            updateParams();
                                    }}
                                />
                            </div>
                            <div class="col-6 col-lg-3">
                                <label
                                    class="form-label fw-semibold"
                                    for="label-status">狀態</label
                                >
                                <select
                                    id="label-status"
                                    class="form-select"
                                    bind:value={statusFilter}
                                >
                                    {#each statusOptions as option}
                                        <option value={option.value}
                                            >{option.label}</option
                                        >
                                    {/each}
                                </select>
                            </div>
                            <div class="col-6 col-lg-3">
                                <label
                                    class="form-label fw-semibold"
                                    for="label-category">類別</label
                                >
                                <select
                                    id="label-category"
                                    class="form-select"
                                    bind:value={categoryFilter}
                                >
                                    <option value="">全部類別</option>
                                    {#each data.categories as category}
                                        <option value={category.id}
                                            >{category.name}</option
                                        >
                                    {/each}
                                </select>
                            </div>
                            <div class="col-12 col-lg-2 d-grid">
                                <button
                                    class="btn btn-outline-primary"
                                    type="button"
                                    onclick={updateParams}
                                >
                                    <i class="mdi mdi-magnify me-1"></i>查詢
                                </button>
                            </div>
                        </div>
                        <div
                            class="d-flex justify-content-between align-items-center mt-3"
                        >
                            <button
                                class="btn btn-link p-0 text-decoration-none"
                                type="button"
                                onclick={resetFilters}
                            >
                                清除篩選
                            </button>
                            <span class="text-muted small"
                                >目前清單共 {assets.length} 筆</span
                            >
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm bg-white bg-opacity-90">
                    <div
                        class="card-header bg-white bg-opacity-90 py-3 d-flex flex-wrap justify-content-between align-items-center gap-2"
                    >
                        <div>
                            <h5 class="card-title fw-bold mb-0">挑選資產</h5>
                            <div class="text-muted small mt-1">
                                已選擇 {selectedAssets.length} 筆
                            </div>
                        </div>
                        <div class="d-flex flex-wrap gap-2">
                            <button
                                class="btn btn-sm btn-outline-secondary"
                                type="button"
                                onclick={selectAllAssets}
                                disabled={assets.length === 0}
                            >
                                <i
                                    class="mdi mdi-checkbox-multiple-marked-outline me-1"
                                ></i>
                                全選
                            </button>
                            <button
                                class="btn btn-sm btn-outline-danger"
                                type="button"
                                onclick={clearSelection}
                                disabled={selectedAssets.length === 0}
                            >
                                <i class="mdi mdi-close-circle-outline me-1"></i>
                                清除選擇
                            </button>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light text-muted">
                                <tr>
                                    <th style="width: 44px;">
                                        <input
                                            class="form-check-input"
                                            type="checkbox"
                                            checked={assets.length > 0 &&
                                                assets.every(
                                                    (asset: LabelAsset) =>
                                                        selectedAssetIds.includes(
                                                            asset.id,
                                                        ),
                                                )}
                                            onchange={toggleSelectAll}
                                            aria-label="全選資產"
                                        />
                                    </th>
                                    <th>資產編號</th>
                                    <th>名稱</th>
                                    <th>品牌 / 型號</th>
                                    <th class="d-none d-lg-table-cell"
                                        >購買日期</th
                                    >
                                </tr>
                            </thead>
                            <tbody>
                                {#if assets.length === 0}
                                    <tr>
                                        <td
                                            colspan="5"
                                            class="text-center text-muted py-5"
                                            >找不到符合條件的資產</td
                                        >
                                    </tr>
                                {:else}
                                    {#each assets as asset}
                                        <tr
                                            class:table-primary={selectedAssetIds.includes(
                                                asset.id,
                                            )}
                                            style="cursor: pointer;"
                                            onclick={() =>
                                                toggleAssetSelection(asset.id)}
                                        >
                                            <td>
                                                <input
                                                    class="form-check-input"
                                                    type="checkbox"
                                                    checked={selectedAssetIds.includes(
                                                        asset.id,
                                                    )}
                                                    onclick={(event) =>
                                                        event.stopPropagation()}
                                                    onchange={() =>
                                                        toggleAssetSelection(
                                                            asset.id,
                                                        )}
                                                    aria-label={`選擇 ${asset.asset_id}`}
                                                />
                                            </td>
                                            <td class="fw-semibold"
                                                >{asset.asset_id}</td
                                            >
                                            <td>
                                                <div>{asset.name || "-"}</div>
                                                <div class="text-muted small">
                                                    {asset.expand?.category
                                                        ?.name || "未分類"}
                                                </div>
                                            </td>
                                            <td
                                                >{asset.brand || ""}
                                                {asset.model || ""}</td
                                            >
                                            <td
                                                class="d-none d-lg-table-cell text-muted small"
                                                >{formatDate(
                                                    asset.purchase_date,
                                                ) || "-"}</td
                                            >
                                        </tr>
                                    {/each}
                                {/if}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="col-12 col-xl-5">
                <div
                    class="card shadow-sm bg-white bg-opacity-90 sticky-xl-top"
                >
                    <div
                        class="card-header bg-white bg-opacity-90 py-3 d-flex flex-wrap justify-content-between align-items-start gap-2"
                    >
                        <div>
                            <h5 class="card-title fw-bold mb-1">
                                填寫設定與 40 格預覽
                            </h5>
                            <div class="text-muted small">
                                樣板固定一頁 40 格。起始格之前會保留空白，模擬 Word
                                郵件合併從指定格開始。
                            </div>
                        </div>
                        <button
                            class="btn btn-primary"
                            type="button"
                            onclick={generateDocx}
                            disabled={selectedAssets.length === 0 ||
                                isGenerating ||
                                isOverLimit}
                        >
                            {#if isGenerating}
                                <span
                                    class="spinner-border spinner-border-sm me-1"
                                    aria-hidden="true"
                                ></span>
                                產生中...
                            {:else}
                                <i class="mdi mdi-file-word-outline me-1"></i>
                                匯出 Word
                            {/if}
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="row g-3 align-items-end mb-3">
                            <div class="col-6">
                                <label
                                    class="form-label fw-semibold"
                                    for="start-slot">起始格</label
                                >
                                <input
                                    id="start-slot"
                                    class="form-control"
                                    class:is-invalid={startSlot < 1 ||
                                        startSlot > labelsPerTemplate}
                                    type="number"
                                    min="1"
                                    max={labelsPerTemplate}
                                    bind:value={startSlot}
                                />
                                <div class="form-text">可輸入 1～40。</div>
                            </div>
                            <div class="col-6">
                                <div class="border rounded p-3 bg-light">
                                    <div class="small text-muted">剩餘可填格數</div>
                                    <div
                                        class="fw-bold {isOverLimit
                                            ? 'text-danger'
                                            : 'text-success'}"
                                    >
                                        {remainingSlots} 格
                                    </div>
                                </div>
                            </div>
                        </div>

                        {#if isOverLimit}
                            <div class="alert alert-warning border-0 small">
                                從第 {startSlot} 格開始最多只能放 {availableSlots}
                                筆，目前已選 {selectedAssets.length} 筆。
                            </div>
                        {/if}

                        <div class="alert alert-info border-0 small">
                            <div class="fw-bold mb-1">
                                <i class="mdi mdi-information-outline me-1"
                                ></i>Word 欄位對應
                            </div>
                            <div>
                                <code>電腦編號</code> → 資產編號、<code
                                    >BuyDate</code
                                >
                                → 購買日期、<code>品牌</code>、<code>型號</code
                                >、<code>QRString</code> → 資產編號｜品牌。
                            </div>
                            <div class="mt-1">
                                產出的 Word 若 QR 未顯示，請在 Word 內使用 <kbd
                                    >Ctrl</kbd
                                >
                                + <kbd>A</kbd> 後按 <kbd>F9</kbd> 更新欄位。
                            </div>
                        </div>

                        <div class="row row-cols-2 row-cols-sm-4 g-2">
                            {#each previewSlots as asset, index}
                                <div class="col">
                                    <div
                                        class="card h-100 {asset
                                            ? 'border-primary bg-primary-subtle'
                                            : 'border-secondary border-opacity-25 bg-light'}"
                                    >
                                        <div class="card-body p-2">
                                            <div
                                                class="d-flex justify-content-between align-items-start gap-1 mb-1"
                                            >
                                                <span
                                                    class="badge text-bg-secondary"
                                                    >{index + 1}</span
                                                >
                                                {#if asset}
                                                    <i
                                                        class="mdi mdi-check-circle text-primary"
                                                    ></i>
                                                {/if}
                                            </div>
                                            {#if asset}
                                                <div
                                                    class="fw-bold small text-break"
                                                >
                                                    {asset.asset_id}
                                                </div>
                                                <div
                                                    class="text-muted small text-break"
                                                >
                                                    {asset.brand || "—"}
                                                </div>
                                                <div
                                                    class="text-muted small text-break"
                                                >
                                                    {asset.model || "—"}
                                                </div>
                                            {:else}
                                                <div class="text-muted small">
                                                    空白
                                                </div>
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
