<script lang="ts">
    import { onMount, untrack } from 'svelte';
    import Navbar from '$lib/components/Navbar.svelte';
    import Footer from '$lib/components/Footer.svelte';
    import type { RecordModel } from 'pocketbase';
    import BorrowDetail from '$lib/components/BorrowDetail.svelte';
    import { getBorrowStatusInfo, getMaintenanceTypeInfo, getFileToken } from '$lib/utils/helpers';
    import { logger } from '$lib/utils/logger';
    // FullCalendar 相關
    import { Calendar } from '@fullcalendar/core';
    import dayGridPlugin from '@fullcalendar/daygrid';
    import timeGridPlugin from '@fullcalendar/timegrid';
    import interactionPlugin from '@fullcalendar/interaction';
    import { formatDate, getCalendarEndDate } from '$lib/utils/datetime';

    let { data } = $props();

    // ==========================================
    // 1. 狀態管理 (Svelte 5)
    // ==========================================

    // (A) 原始資料倉儲：儲存從 API 抓回來的所有資料 (可能包含整個月)
    let rawRecords = $state<RecordModel[]>(
        untrack(() => (data as any)?.borrowRecords || [])
    );

    // (B) 目前檢視的時間範圍：預設為當天，會被 datesSet 更新
    let currentViewRange = $state({
        start: new Date(),
        end: new Date()
    });

    // (C) 過濾後的清單：側邊欄真正要顯示的資料 ($derived 自動計算)
    let filteredSideList = $derived(
        rawRecords.filter(record => {
            if (record.status === 'returned') return false;
            const recordStart = new Date(record.borrow_date);
            const recordEnd = new Date(record.actual_return_date || record.expected_return_date);
            return recordStart < currentViewRange.end && recordEnd > currentViewRange.start;
        }).sort((a, b) => {
            const endA = new Date(a.actual_return_date || a.expected_return_date).getTime();
            const endB = new Date(b.actual_return_date || b.expected_return_date).getTime();
            if (endA !== endB) {
                return endA - endB;
            }
            const startA = new Date(a.borrow_date).getTime();
            const startB = new Date(b.borrow_date).getTime();
            return startA - startB;
        })
    );

    // 使用 $effect 監聽 server data (SSR/導航回來時同步)
    $effect(() => {
        const serverRecords = (data as any)?.borrowRecords;
        if (serverRecords) {
            rawRecords = serverRecords;
        }
    });

    let currentUser = $derived(data?.currentUser);
    let calendar: Calendar;
    let detailModal: ReturnType<typeof BorrowDetail>;

    async function openRecordModal(record: RecordModel) {
        const fileToken = await getFileToken();
        detailModal?.showModal(record, fileToken);
    }

    onMount(() => {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) return;

        calendar = new Calendar(calendarEl, {
            plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next',
                center: 'title',
                right: 'today'
            },
            height: 'auto',
            fixedWeekCount: false,
            dayMaxEvents: 2,

            datesSet: (dateInfo) => {
                currentViewRange = {
                    start: dateInfo.start,
                    end: dateInfo.end
                };
            },

            // 使用 Promise.all 統一處理多個事件來源
            events: async (fetchInfo, successCallback, failureCallback) => {
                try {
                    const [borrowRes, maintenanceRes] = await Promise.all([
                        fetch(`/app-api/borrow-records?start=${fetchInfo.startStr}&end=${fetchInfo.endStr}`),
                        fetch(`/app-api/maintenance-events?start=${fetchInfo.startStr}&end=${fetchInfo.endStr}`)
                    ]);

                    if (!borrowRes.ok || !maintenanceRes.ok) {
                        throw new Error('無法獲取部分或全部事件資料');
                    }

                    const borrowRecords = await borrowRes.json();
                    const maintenanceRecords = await maintenanceRes.json();

                    // 更新側邊欄用的 state (只用借還紀錄)
                    rawRecords = borrowRecords;

                    const borrowEvents = borrowRecords
                        .filter((record: any) => record.status !== 'returned')
                        .map((record: any) => {
                        const statusInfo = getBorrowStatusInfo(record.status);
                        let title = record.expand?.asset?.name || '未知';
                        if (record.status === 'overdue') {
                            title = `[逾期] ${title}`;
                        }

                        return {
                            title: title,
                            start: formatDate(record.borrow_date),
                            end: getCalendarEndDate(record.actual_return_date) || getCalendarEndDate(record.expected_return_date),
                            allDay: true,
                            display: 'block', // 確保跨日事件以區塊顯示
                            color: statusInfo.color,
                            textColor: '#ffffff',
                            extendedProps: { user: record.expand?.user?.name, type: 'borrow' }
                        };
                    });

                    const maintenanceEvents = maintenanceRecords.map((record: any) => {
                        // 【修正】對應 JSON 中的維護類型欄位名稱
                        const typeInfo = getMaintenanceTypeInfo(record.maintenance_type);

                        return {
                            title: `[維護] ${record.expand?.asset?.name || '未知'}`,
                            start: formatDate(record.maintenance_date),
                            // 【修正】對應 JSON 中的完工日期欄位名稱
                            end: getCalendarEndDate(record.complete_date),
                            allDay: true,
                            display: 'block', // 強制以區塊顯示，避免被 Bootstrap 的 display 屬性覆蓋
                            classNames: typeInfo.className.replace('badge', '').trim().split(' '),
                            textColor: '#212529',
                            extendedProps: { type: 'maintenance' }
                        };
                    });

                    // 合併兩種事件並回傳
                    successCallback([...borrowEvents, ...maintenanceEvents]);

                } catch (err) {
                    logger.error('獲取日曆事件失敗:', err);
                    const error = err instanceof Error ? err : new Error(String(err));
                    failureCallback(error);
                }
            }
        });

        calendar.render();
    });
</script>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-sm-4">
        <Navbar />

        <div class="row g-4 align-items-start home-dashboard">
            <div class="col-12 col-xl-8">
                <div class="card shadow bg-white bg-opacity-90 h-100 mt-4 border-0 rounded-4">
                    <div class="card-header bg-white bg-opacity-90 d-flex justify-content-between align-items-center py-3 px-4">
                        <div>
                            <h4 class="card-title mb-1 fw-bold">借用清單</h4>
                            <div class="small text-muted">依目前月曆範圍顯示尚未歸還的借用紀錄</div>
                        </div>
                        <span class="badge bg-secondary">
                            {#if Math.abs(currentViewRange.end.getTime() - currentViewRange.start.getTime()) <= 86400000}
                                當日
                            {:else if Math.abs(currentViewRange.end.getTime() - currentViewRange.start.getTime()) <= 604800000}
                                本週
                            {:else}
                                本月範圍
                            {/if}
                        </span>
                    </div>
                    <div class="card-body overflow-auto p-3 borrow-list-body">
                        <div class="row row-cols-1 row-cols-lg-2 g-2">
                            {#each filteredSideList as record}
                                {@const statusInfo = getBorrowStatusInfo(record.status)}
                                {@const assetId = record.expand?.asset?.asset_id}
                                <div class="col">
                                    <article class="h-100 border rounded-3 bg-white bg-opacity-75 p-2 position-relative borrow-record-card">
                                        <button
                                            type="button"
                                            class="position-absolute top-0 start-0 w-100 h-100 border-0 bg-transparent p-0 borrow-record-card-action"
                                            title="查看借用詳情"
                                            onclick={() => openRecordModal(record)}
                                        >
                                            <span class="visually-hidden">查看借用詳情</span>
                                        </button>

                                        <div class="position-relative borrow-record-card-content">
                                            <div class="d-flex justify-content-between align-items-start gap-2">
                                                <div class="flex-grow-1 overflow-hidden">
                                                    {#if assetId}
                                                        <a
                                                            href={`/assets?search=${assetId}`}
                                                            class="font-monospace fw-bold text-decoration-none text-truncate d-block"
                                                            title={`搜尋資產 ${assetId}`}
                                                            onclick={(e) => e.stopPropagation()}
                                                        >
                                                            {assetId}
                                                        </a>
                                                    {:else}
                                                        <div class="fw-bold text-truncate" title={record.expand?.asset?.name || '未知物品'}>
                                                            {record.expand?.asset?.name || '未知物品'}
                                                        </div>
                                                    {/if}
                                                    <div class="small text-muted text-truncate">
                                                        {#if assetId}{record.expand?.asset?.name || '未知物品'} · {/if}
                                                        {record.expand?.user?.name || '未知借用人'}
                                                    </div>
                                                </div>
                                                <span class="badge {statusInfo.className} rounded-pill flex-shrink-0">
                                                    {statusInfo.label}
                                                </span>
                                            </div>
                                            <div class="small text-muted d-flex flex-wrap gap-2 mt-1">
                                                <span>借出 {formatDate(record.borrow_date)}</span>
                                                {#if record.actual_return_date}
                                                    <span>歸還 {formatDate(record.actual_return_date)}</span>
                                                {:else if record.expected_return_date}
                                                    <span>預計歸還 {formatDate(record.expected_return_date)}</span>
                                                {/if}
                                            </div>
                                        </div>
                                    </article>
                                </div>
                            {:else}
                                <div class="col-12 text-center text-muted py-4">
                                    {#if rawRecords.length > 0}
                                        此檢視範圍內無借用記錄
                                    {:else}
                                        載入中或無資料...
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-12 col-xl-4">
                <div class="card shadow-sm bg-white bg-opacity-90 mt-4 border-0 rounded-4 calendar-card">
                    <div class="card-header bg-white bg-opacity-90">
                        <h6 class="card-title mb-0 fw-semibold text-muted">月曆參考</h6>
                    </div>
                    <div class="card-body p-2">
                        <div class="overflow-auto pb-1">
                            <div id="calendar"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<BorrowDetail bind:this={detailModal} />
