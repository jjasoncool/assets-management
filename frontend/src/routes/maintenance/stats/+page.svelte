<script lang="ts">
    import Navbar from '$lib/components/Navbar.svelte';
    import { Chart, registerables } from 'chart.js/auto';
    import { goto } from '$app/navigation';
    // [修正 1] 引入 untrack
    import { untrack } from 'svelte';
    import type { PageData } from './$types';

    let { data } = $props<{ data: PageData }>();

    let barChartCanvas = $state<HTMLCanvasElement | undefined>(undefined);

    // [修正 2] 使用 untrack 包裹初始值
    // 這會告訴 Svelte 檢查器："我知道這只是初始值，不要警告我，我會在下面處理更新"
    let categoryFilter = $state(untrack(() => data.selectedCategoryId));
    let startDateFilter = $state(untrack(() => data.startDate));
    let endDateFilter = $state(untrack(() => data.endDate));

    // [保持] 當 data 變更時同步更新
    $effect(() => {
        categoryFilter = data.selectedCategoryId;
        startDateFilter = data.startDate;
        endDateFilter = data.endDate;
    });

    function applyFilters() {
        const params = new URLSearchParams();
        if (categoryFilter) {
            params.set('category', categoryFilter);
        }
        if (startDateFilter) {
            params.set('startDate', startDateFilter);
        }
        if (endDateFilter) {
            params.set('endDate', endDateFilter);
        }
        goto(`?${params.toString()}`, { keepFocus: true, replaceState: true, noScroll: true });
    }

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
                                type="date"
                                id="startDate"
                                class="form-control shadow-none"
                                bind:value={startDateFilter}
                                onchange={applyFilters}
                            />
                        </div>
                        <div class="col-md-3">
                            <label for="endDate" class="form-label small fw-bold text-secondary">結束日期</label>
                            <input
                                type="date"
                                id="endDate"
                                class="form-control shadow-none"
                                bind:value={endDateFilter}
                                onchange={applyFilters}
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
