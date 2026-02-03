<script lang="ts">
    import { onMount } from 'svelte';
    // 移除錯誤的 service 引用
    import Navbar from '$lib/components/Navbar.svelte';
    import Footer from '$lib/components/Footer.svelte';

    // FullCalendar 相關
    import { Calendar } from '@fullcalendar/core';
    import dayGridPlugin from '@fullcalendar/daygrid';
    import timeGridPlugin from '@fullcalendar/timegrid';
    import interactionPlugin from '@fullcalendar/interaction';

    // 1. 接收 Server 資料 (Svelte 5)
    let { data } = $props();

    // 2. 建立響應式變數
    let currentUser = $derived(data?.currentUser);

    // 3. 資料轉換：將 Server 的 snake_case 轉回您原本 UI 用的 camelCase
    // 這樣下方的 HTML 結構完全不用改
    let borrowRecords = $derived((data?.borrowRecords || []).map((r: any) => ({
        id: r.id,
        assetId: r.asset, // Server 是 asset (ID)
        userId: r.user,   // Server 是 user (ID)
        borrowDate: r.borrow_date,
        expectedReturnDate: r.expected_return_date,
        actualReturnDate: r.actual_return_date,
        status: r.status,
        notes: r.notes, // 假設後端有這欄位
        created: r.created,
        updated: r.updated,
        // 處理 expand 關聯資料
        asset: {
            name: r.expand?.asset?.name || '未知物品',
            asset_id: r.expand?.asset?.asset_id,
            brand: r.expand?.asset?.brand,
            model: r.expand?.asset?.model
        },
        user: {
            name: r.expand?.user?.name,
            email: r.expand?.user?.email
        }
    })));

    let calendar: Calendar;

    onMount(() => {
        // 等待 DOM 渲染
        setTimeout(() => {
            const calendarEl = document.getElementById('calendar');
            if (calendarEl) {
                calendar = new Calendar(calendarEl, {
                    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
                    initialView: 'dayGridMonth',
                    headerToolbar: {
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    },
                    height: 'auto',
                    events: borrowRecords.map((record: any) => ({
                        title: `${record.asset?.name || '未知物品'} (${record.user?.email || '未知用戶'})`,
                        start: record.borrowDate,
                        end: record.actualReturnDate || record.expectedReturnDate,
                        color: record.status === 'borrowed' ? '#dc3545' : '#28a745',
                        textColor: '#ffffff'
                    }))
                });
                calendar.render();
            }
        }, 100);
    });

</script>

<svelte:head>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,600">
</svelte:head>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-4">
        <Navbar />

        <!-- 登入狀態指示器 -->
        <div class="alert alert-info mb-4">
            <strong>登入狀態:</strong>
            {#if currentUser}
                <span class="text-success">已登入</span>
                - 用戶: {currentUser.email || '未知'}
            {:else}
                <span class="text-danger">未登入</span>
            {/if}
            <br>
            <small>API URL: {typeof window !== 'undefined' ? window.location.origin : 'SSR'}</small>
        </div>

        <div class="row g-4">
            <!-- 借用記錄區域 -->
            <div class="col-12 col-xl-4">
                <div class="card shadow-sm bg-white bg-opacity-90 h-100">
                    <div class="card-header bg-white bg-opacity-90">
                        <h5 class="card-title mb-0 fw-bold">借用記錄</h5>
                    </div>
                    <div class="card-body">
                        {#each borrowRecords.slice(0, 10) as record}
                            <div class="d-flex justify-content-between align-items-start mb-3 pb-3 border-bottom">
                                <div class="flex-grow-1">
                                    <div class="fw-semibold">{record.asset?.name || '未知物品'}</div>
                                    <div class="small text-muted">
                                        借出: {new Date(record.borrowDate).toLocaleDateString('zh-TW')}
                                        {#if record.actualReturnDate}
                                            <br>歸還: {new Date(record.actualReturnDate).toLocaleDateString('zh-TW')}
                                        {:else if record.expectedReturnDate}
                                            <br>預計歸還: {new Date(record.expectedReturnDate).toLocaleDateString('zh-TW')}
                                        {/if}
                                    </div>
                                    <span class="badge {record.status === 'borrowed' ? 'text-bg-danger' : 'text-bg-success'} rounded-pill mt-1">
                                        {record.status === 'borrowed' ? '借出中' : '已歸還'}
                                    </span>
                                </div>
                            </div>
                        {/each}
                        {#if borrowRecords.length === 0}
                            <div class="text-center text-muted py-4">
                                目前沒有借用記錄
                            </div>
                        {/if}
                    </div>
                </div>
            </div>

            <!-- 行事曆區域 -->
            <div class="col-12 col-xl-8">
                <div class="card shadow-sm bg-white bg-opacity-90 h-100">
                    <div class="card-header bg-white bg-opacity-90">
                        <h5 class="card-title mb-0 fw-bold">資產管理行事曆</h5>
                    </div>
                    <div class="card-body">
                        <div id="calendar"></div>
                        <div class="mt-3">
                            <small class="text-muted">
                                <span class="badge text-bg-danger me-2">紅色</span>借出中
                                <span class="badge text-bg-success ms-3">綠色</span>已歸還
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>