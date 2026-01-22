<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { logout, isAuthenticated, getCurrentUser } from '$lib/services/userService';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { Calendar } from '@fullcalendar/core';
	import dayGridPlugin from '@fullcalendar/daygrid';
	import timeGridPlugin from '@fullcalendar/timegrid';
	import interactionPlugin from '@fullcalendar/interaction';
	import { getBorrowRecords, type BorrowRecord } from '$lib/services/assetService';

	// currentUser 由 layout 提供
	export let data: any;
	let currentUser = data?.currentUser || getCurrentUser();
	let calendar: Calendar;
	let borrowRecords: BorrowRecord[] = [];

	onMount(async () => {
		// 使用假數據替代 API 調用 (2026年數據)
		borrowRecords = [
			{
				id: '1',
				assetId: 'asset1',
				userId: 'user1',
				borrowDate: '2026-01-10T10:00:00.000Z',
				expectedReturnDate: '2026-01-15T17:00:00.000Z',
				actualReturnDate: '2026-01-13T16:30:00.000Z',
				status: 'returned',
				notes: '順利歸還',
				created: '2026-01-10T10:00:00.000Z',
				updated: '2026-01-13T16:30:00.000Z',
				asset: {
					id: 'asset1',
					name: 'MacBook Pro 16"',
					description: '開發用筆電',
					category: '電子設備',
					status: 'active',
					location: '辦公室 A101',
					serialNumber: 'MBP2026001',
					created: '2026-01-01T00:00:00.000Z',
					updated: '2026-01-10T10:00:00.000Z'
				},
				user: {
					id: 'user1',
					name: '張小明',
					email: 'zhang@example.com'
				}
			},
			{
				id: '2',
				assetId: 'asset2',
				userId: 'user2',
				borrowDate: '2026-01-15T09:00:00.000Z',
				expectedReturnDate: '2026-01-20T17:00:00.000Z',
				status: 'borrowed',
				notes: '專案開發使用',
				created: '2026-01-15T09:00:00.000Z',
				updated: '2026-01-15T09:00:00.000Z',
				asset: {
					id: 'asset2',
					name: 'iPad Pro 12.9"',
					description: '設計用平板',
					category: '電子設備',
					status: 'borrowed',
					location: '辦公室 A102',
					serialNumber: 'IPAD2026002',
					created: '2026-01-01T00:00:00.000Z',
					updated: '2026-01-15T09:00:00.000Z'
				},
				user: {
					id: 'user2',
					name: '李小華',
					email: 'li@example.com'
				}
			},
			{
				id: '3',
				assetId: 'asset3',
				userId: 'user1',
				borrowDate: '2026-01-16T14:00:00.000Z',
				expectedReturnDate: '2026-01-18T17:00:00.000Z',
				status: 'borrowed',
				notes: '會議演示',
				created: '2026-01-16T14:00:00.000Z',
				updated: '2026-01-16T14:00:00.000Z',
				asset: {
					id: 'asset3',
					name: '投影機 Epson EB-1780W',
					description: '會議室投影機',
					category: '視聽設備',
					status: 'borrowed',
					location: '會議室 B201',
					serialNumber: 'PROJ2026003',
					created: '2026-01-01T00:00:00.000Z',
					updated: '2026-01-16T14:00:00.000Z'
				},
				user: {
					id: 'user1',
					name: '張小明',
					email: 'zhang@example.com'
				}
			},
			{
				id: '4',
				assetId: 'asset4',
				userId: 'user3',
				borrowDate: '2026-01-05T11:00:00.000Z',
				expectedReturnDate: '2026-01-10T17:00:00.000Z',
				actualReturnDate: '2026-01-09T15:45:00.000Z',
				status: 'returned',
				notes: '順利完成',
				created: '2026-01-05T11:00:00.000Z',
				updated: '2026-01-09T15:45:00.000Z',
				asset: {
					id: 'asset4',
					name: '無線麥克風系統',
					description: '會議用麥克風',
					category: '視聽設備',
					status: 'active',
					location: '會議室 B201',
					serialNumber: 'MIC2026004',
					created: '2026-01-01T00:00:00.000Z',
					updated: '2026-01-09T15:45:00.000Z'
				},
				user: {
					id: 'user3',
					name: '王小美',
					email: 'wang@example.com'
				}
			},
			{
				id: '5',
				assetId: 'asset5',
				userId: 'user2',
				borrowDate: '2026-01-20T08:30:00.000Z',
				expectedReturnDate: '2026-01-25T17:00:00.000Z',
				status: 'borrowed',
				notes: '長期專案使用',
				created: '2026-01-20T08:30:00.000Z',
				updated: '2026-01-20T08:30:00.000Z',
				asset: {
					id: 'asset5',
					name: '數位相機 Canon EOS R5',
					description: '專業攝影設備',
					category: '攝影設備',
					status: 'borrowed',
					location: '攝影工作室',
					serialNumber: 'CAM2026005',
					created: '2026-01-01T00:00:00.000Z',
					updated: '2026-01-20T08:30:00.000Z'
				},
				user: {
					id: 'user2',
					name: '李小華',
					email: 'li@example.com'
				}
			}
		];

		// Initialize calendar after DOM is ready
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
					events: borrowRecords.map(record => ({
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

	function handleLogout() {
		logout();
		goto('/login');
	}
</script>

<svelte:head>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,600">
</svelte:head>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-4">
        <Navbar {handleLogout} {currentUser} />

        <!-- 登入狀態指示器 -->
        <div class="alert alert-info mb-4">
            <strong>登入狀態:</strong>
            {#if isAuthenticated()}
                <span class="text-success">已登入</span>
                {#if currentUser}
                    - 用戶: {currentUser.email || '未知'}
                {/if}
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
