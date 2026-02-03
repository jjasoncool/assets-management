import type { PageServerLoad } from './$types';

// 暫時註解掉真實服務引用
// import { getMyBorrowRecords } from '$lib/server/services/borrowService';

export const load: PageServerLoad = async ({ locals }) => {
    // 模擬當前使用者
    const currentUser = locals.user || {
        id: 'user_123',
        name: '測試使用者',
        email: 'test@example.com'
    };

    // 模擬 PocketBase 回傳的資料結構 (注意是 snake_case)
    const mockBorrowRecords = [
        {
            id: 'rec_001',
            borrow_date: '2026-02-01T09:00:00.000Z',
            expected_return_date: '2026-02-05T18:00:00.000Z',
            actual_return_date: '',
            status: 'borrowed',
            expand: {
                asset: {
                    name: 'MacBook Pro M3 Max',
                    asset_id: 'NB-2026-001'
                },
                user: currentUser
            }
        },
        {
            id: 'rec_002',
            borrow_date: '2026-01-28T10:00:00.000Z',
            expected_return_date: '2026-02-01T10:00:00.000Z',
            actual_return_date: '2026-01-31T15:30:00.000Z',
            status: 'returned',
            expand: {
                asset: {
                    name: 'Sony A7M4 相機',
                    asset_id: 'CAM-2025-088'
                },
                user: currentUser
            }
        },
        {
            id: 'rec_003',
            borrow_date: '2026-02-03T14:00:00.000Z',
            expected_return_date: '2026-02-10T14:00:00.000Z',
            actual_return_date: '',
            status: 'borrowed',
            expand: {
                asset: {
                    name: 'Keychron Q1 Pro 鍵盤',
                    asset_id: 'PER-2026-012'
                },
                user: currentUser
            }
        }
    ];

    // 回傳資料
    return {
        borrowRecords: mockBorrowRecords,
        currentUser: currentUser
    };
};