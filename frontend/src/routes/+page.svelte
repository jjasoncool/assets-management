<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import type { RecordModel } from 'pocketbase';

	// FullCalendar 相關
	import { Calendar } from '@fullcalendar/core';
	import dayGridPlugin from '@fullcalendar/daygrid';
	import timeGridPlugin from '@fullcalendar/timegrid';
	import interactionPlugin from '@fullcalendar/interaction';
	import { formatDate } from '$lib/utils/datetime';

	let { data } = $props();

	// ==========================================
	// 1. 狀態管理 (Svelte 5)
	// ==========================================

	// (A) 原始資料倉儲：儲存從 API 抓回來的所有資料 (可能包含整個月)
	// 這裡只負責存，不負責過濾顯示
	let rawRecords = $state<RecordModel[]>(
		untrack(() => (data as any)?.borrowRecords || [])
	);

	// (B) 目前檢視的時間範圍：預設為當天，會被 datesSet 更新
	let currentViewRange = $state({
		start: new Date(),
		end: new Date()
	});

	// (C) 過濾後的清單：側邊欄真正要顯示的資料 ($derived 自動計算)
	// 邏輯：當 rawRecords 更新 或 currentViewRange 改變時，這裡會自動重算
	let filteredSideList = $derived(
		rawRecords.filter(record => {
			const recordStart = new Date(record.borrow_date);
			// 如果有實際歸還日用實際的，沒有則用預計的
			const recordEnd = new Date(record.actual_return_date || record.expected_return_date);

			// **核心過濾邏輯：判斷時間重疊 (Overlap)**
			// 借用時段 與 檢視時段 是否有交集？
			// 公式：(活動開始 < 檢視結束) && (活動結束 > 檢視開始)
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
			initialView: 'dayGridMonth', // 預設月檢視
			headerToolbar: {
				left: 'prev,next today',
				center: 'title',
				right: 'dayGridMonth,timeGridWeek,timeGridDay' // 允許切換 月/週/日
			},
			height: 'auto',

			// ==========================================
			// 2. datesSet: 監聽視圖切換與日期變更
			// ==========================================
			// 當你切換到「日檢視」或按「下一週」時，這裡會告訴你當前看到的精確時間範圍
			datesSet: (dateInfo) => {
				console.log('👀 View changed:', dateInfo.view.type);
				console.log('📅 Visible Range:', dateInfo.start, dateInfo.end);

				// 更新狀態，觸發 $derived 重新過濾側邊欄
				currentViewRange = {
					start: dateInfo.start,
					end: dateInfo.end
				};
			},

			// ==========================================
			// 3. events: 負責跟後端要資料
			// ==========================================
			events: (fetchInfo, successCallback, failureCallback) => {
				const start = fetchInfo.startStr;
				const end = fetchInfo.endStr;

				// 注意：FullCalendar 為了快取，這裡的 fetchInfo 範圍通常比 datesSet 的範圍大
				// 例如在日檢視下，這裡可能還是會抓整個月的資料
				fetch(`/app-api/borrow-records?start=${start}&end=${end}`)
					.then(r => r.ok ? r.json() : Promise.reject(r.statusText))
					.then(records => {
						// (A) 將抓回來的「大範圍」資料存入 rawRecords
						rawRecords = records;

						// (B) 轉換給行事曆顯示的小圓點
						const calendarEvents = records.map((record: any) => ({
							title: `${record.expand?.asset?.name || '未知'}`,
							start: record.borrow_date,
							end: record.actual_return_date || record.expected_return_date,
							color: record.status === 'borrowed' ? '#dc3545' : '#28a745',
							textColor: '#ffffff',
							extendedProps: { user: record.expand?.user?.name }
						}));

						successCallback(calendarEvents);
					})
					.catch(error => {
						console.error(error);
						failureCallback(error);
					});
			}
		});

		calendar.render();
	});
</script>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-4">
        <Navbar />

        <div class="row g-4">
            <div class="col-12 col-xl-4">
                <div class="card shadow-sm bg-white bg-opacity-90 h-100">
                    <div class="card-header bg-white bg-opacity-90 d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0 fw-bold">清單檢視</h5>
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
                                    <span class="badge {record.status === 'borrowed' ? 'text-bg-danger' : 'text-bg-success'} rounded-pill mt-1">
                                        {record.status === 'borrowed' ? '借出中' : '已歸還'}
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
                <div class="card shadow-sm bg-white bg-opacity-90 h-100">
                    <div class="card-body">
                        <div id="calendar"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>