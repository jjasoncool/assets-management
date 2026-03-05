<script lang="ts">
    import { onMount, untrack } from 'svelte';
    import Navbar from '$lib/components/Navbar.svelte';
    import Footer from '$lib/components/Footer.svelte';
    import type { RecordModel } from 'pocketbase';
    import { getBorrowStatusInfo, getMaintenanceTypeInfo } from '$lib/utils/helpers';
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
            const recordStart = new Date(record.borrow_date);
            const recordEnd = new Date(record.actual_return_date || record.expected_return_date);
            return recordStart < currentViewRange.end && recordEnd > currentViewRange.start;
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

    onMount(() => {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) return;

        calendar = new Calendar(calendarEl, {
            plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            height: 'auto',

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

                    const borrowEvents = borrowRecords.map((record: any) => {
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

        <div class="row g-4">
            <div class="col-12 col-xl-4">
                <div class="card shadow-sm bg-white bg-opacity-90 h-100 mt-4">
                    <div class="card-header bg-white bg-opacity-90 d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0 fw-bold">清單檢視 (借還)</h5>
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
                    <div class="card-body overflow-auto" style="max-height: 600px;">
                        {#each filteredSideList as record}
                            {@const statusInfo = getBorrowStatusInfo(record.status)}
                            <div class="d-flex justify-content-between align-items-start mb-3 pb-3 border-bottom">
                                <div class="flex-grow-1">
                                    <div class="fw-semibold">{record.expand?.asset?.name || '未知物品'}</div>
                                    <div class="small text-muted">
                                        借出: {formatDate(record.borrow_date)}
                                        {#if record.actual_return_date}
                                            <br>歸還: {formatDate(record.actual_return_date)}
                                        {:else if record.expected_return_date}
                                            <br>預計歸還: {formatDate(record.expected_return_date)}
                                        {/if}
                                    </div>
                                    <span class="badge {statusInfo.className} rounded-pill mt-1">
                                        {statusInfo.label}
                                    </span>
                                </div>
                            </div>
                        {:else}
                            <div class="text-center text-muted py-4">
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

            <div class="col-12 col-xl-8">
                <div class="card shadow-sm bg-white bg-opacity-90 h-100 mt-4">
                    <div class="card-body">
                        <div class="overflow-auto">
                            <div id="calendar"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
