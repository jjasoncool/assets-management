<script lang="ts">
    import Navbar from '$lib/components/Navbar.svelte';
    import { Chart, registerables } from 'chart.js/auto';
    import { goto } from '$app/navigation';
    import { onMount, untrack } from 'svelte';
    import type { PageData } from './$types';
    import flatpickr from 'flatpickr';
    import type { Instance as FlatpickrInstance } from 'flatpickr/dist/types/instance';
    import 'flatpickr/dist/flatpickr.min.css';

    let { data } = $props<{ data: PageData }>();

    let barChartCanvas = $state<HTMLCanvasElement | undefined>(undefined);

    // --- 篩選條件的狀態 ---
    let categoryFilter = $state(untrack(() => data.selectedCategoryId));
    let startDateFilter = $state(untrack(() => data.startDate));
    let endDateFilter = $state(untrack(() => data.endDate));

    // --- DOM 元素綁定 ---
    let startDateInput = $state<HTMLInputElement | undefined>(undefined);
    let endDateInput = $state<HTMLInputElement | undefined>(undefined);

    // [保持] 當 data 變更時同步更新篩選條件的顯示值
    // 主要用於處理瀏覽器前進/後退操作
    $effect(() => {
        categoryFilter = data.selectedCategoryId;
        startDateFilter = data.startDate;
        endDateFilter = data.endDate;
    });

    /**
     * 套用篩選條件並導航，強制重新撈取資料
     */
    function applyFilters() {
        // 【優化】使用 URL 物件，確保參數能正確附加在當前網址上，並保留其他可能的參數
        const currentUrl = new URL(window.location.href);

        if (categoryFilter) {
            currentUrl.searchParams.set('category', categoryFilter);
        } else {
            currentUrl.searchParams.delete('category');
        }

        if (startDateFilter) {
            currentUrl.searchParams.set('startDate', startDateFilter);
        } else {
            currentUrl.searchParams.delete('startDate');
        }

        if (endDateFilter) {
            currentUrl.searchParams.set('endDate', endDateFilter);
        } else {
            currentUrl.searchParams.delete('endDate');
        }

        // 【修正】加入 invalidateAll: true，強制 SvelteKit 重新執行 +page.server.ts 以撈取最新資料
        goto(currentUrl.pathname + currentUrl.search, {
            keepFocus: true,
            replaceState: true,
            noScroll: true,
            invalidateAll: true
        });
    }

    /**
     * 初始化並關聯兩個 flatpickr 日期選擇器
     * 【重構】改用 onMount 確保只初始化一次，避免 Svelte 5 的 $effect 重複觸發造成事件遺失
     */
    onMount(() => {
        if (!startDateInput || !endDateInput) return;

        let fp_start: FlatpickrInstance;
        let fp_end: FlatpickrInstance;

        fp_start = flatpickr(startDateInput, {
            dateFormat: 'Y-m-d',
            defaultDate: startDateFilter,
            maxDate: endDateFilter || undefined,
            onChange: (selectedDates, dateStr) => {
                startDateFilter = dateStr;
                // 當開始日期改變，設定結束日期的「最小可選日」
                if (fp_end) {
                    fp_end.set('minDate', dateStr || undefined);
                }
                applyFilters(); // 觸發資料更新
            }
        });

        fp_end = flatpickr(endDateInput, {
            dateFormat: 'Y-m-d',
            defaultDate: endDateFilter,
            minDate: startDateFilter || undefined,
            onChange: (selectedDates, dateStr) => {
                endDateFilter = dateStr;
                // 當結束日期改變，設定開始日期的「最大可選日」
                if (fp_start) {
                    fp_start.set('maxDate', dateStr || undefined);
                }
                applyFilters(); // 觸發資料更新
            }
        });

        // 返回清理函式 (當元件被卸載時執行)
        return () => {
            if (fp_start) fp_start.destroy();
            if (fp_end) fp_end.destroy();
        };
    });


    /**
     * 初始化 Chart.js 圖表
     */
    $effect(() => {
        if (!data.chartData || !barChartCanvas) {
            return;
        }

        Chart.register(...registerables);

        const existingChart = Chart.getChart(barChartCanvas);
        if (existingChart) {
            existingChart.destroy();
        }

        new Chart(barChartCanvas, {
            type: 'bar',
            data: {
                labels: data.chartData.labels,
                datasets: [
                    {
                        label: '總成本',
                        data: data.chartData.totalCostData,
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: '平均成本',
                        data: data.chartData.averageCostData,
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                scales: {
                    y: {
                        type: 'linear',
                        position: 'left',
                        beginAtZero: true
                    }
                },
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: data.selectedCategoryName
                            ? `${data.selectedCategoryName} 成本分析`
                            : '各類別成本分佈'
                    }
                }
            }
        });
    });
</script>

<svelte:head>
    <title>維護成本分析</title>
</svelte:head>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-sm-4">
        <Navbar />

        {#if data.error}
            <div class="alert alert-danger mt-4" role="alert">
                {data.error}
            </div>
        {:else}
            <div class="card shadow-sm bg-white bg-opacity-90 mb-4 mt-4">
                <div class="card-body p-4">
                    <div class="row g-3 align-items-end">
                        <div class="col-md-4">
                            <label for="category" class="form-label small fw-bold text-secondary"
                                >篩選資產類別</label
                            >
                            <select
                                id="category"
                                class="form-select shadow-none"
                                bind:value={categoryFilter}
                                onchange={applyFilters}
                            >
                                <option value="">全部分類</option>
                                {#if data.categories}
                                    {#each data.categories as category}
                                        <option value={category.id}>{category.name}</option>
                                    {/each}
                                {/if}
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label for="startDate" class="form-label small fw-bold text-secondary"
                                >開始日期</label
                            >
                            <input
                                type="text"
                                id="startDate"
                                placeholder="選擇開始日期..."
                                class="form-control shadow-none"
                                bind:this={startDateInput}
                            />
                        </div>
                        <div class="col-md-3">
                            <label for="endDate" class="form-label small fw-bold text-secondary">結束日期</label>
                            <input
                                type="text"
                                id="endDate"
                                placeholder="選擇結束日期..."
                                class="form-control shadow-none"
                                bind:this={endDateInput}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6 col-xl-4 mb-4">
                    <div class="card shadow-sm bg-white bg-opacity-90">
                        <div class="card-body">
                            <div class="d-flex align-items-center">
                                <div class="flex-grow-1">
                                    <h5 class="text-muted fw-normal mt-0" title="Total Cost">總維護成本</h5>
                                    <h3 class="mt-3 mb-3">${data.totalCost?.toLocaleString() || 0}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 col-xl-4 mb-4">
                    <div class="card shadow-sm bg-white bg-opacity-90">
                        <div class="card-body">
                            <div class="d-flex align-items-center">
                                <div class="flex-grow-1">
                                    <h5 class="text-muted fw-normal mt-0" title="Total Records">總維護次數</h5>
                                    <h3 class="mt-3 mb-3">{data.totalRecords || 0}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 col-xl-4 mb-4">
                    <div class="card shadow-sm bg-white bg-opacity-90">
                        <div class="card-body">
                            <div class="d-flex align-items-center">
                                <div class="flex-grow-1">
                                    <h5 class="text-muted fw-normal mt-0" title="Average Cost">平均維護成本</h5>
                                    <h3 class="mt-3 mb-3">
                                        ${data.averageCost?.toLocaleString('en-US', {
                                            maximumFractionDigits: 2
                                        }) || 0}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-xl-12">
                    <div class="card shadow-sm bg-white bg-opacity-90">
                        <div class="card-header bg-white bg-opacity-90 py-3">
                            <h5 class="card-title mb-0 fw-bold">成本分佈</h5>
                        </div>
                        <div class="card-body">
                            <canvas bind:this={barChartCanvas} style="min-height: 300px;"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>
