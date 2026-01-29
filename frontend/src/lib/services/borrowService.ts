import { pb } from '../pocketbase';
import { logger } from '../utils/logger';
import { getAsset, updateAsset, type Asset } from './assetService';

// =================================================================
// 介面
// =================================================================

export interface BorrowRecord {
  id: string;
  asset: string;
  user: string;
  borrow_date: string;
  expected_return_date: string;
  status: 'pending' | 'borrowed' | 'returned' | 'overdue';
  borrow_images?: string[];
  return_images?: string[];
  created: string;
  updated: string;
  expand?: {
    asset?: Asset;
    user?: {
      id: string;
      name?: string;
      email: string;
    };
  };
}

// =================================================================
// 借還函式
// =================================================================

/**
 * 獲取借還記錄的分頁列表
 */
export async function getBorrowRecords(
  listOptions?: {
    filter?: string;
    sort?: string;
    page?: number;
    perPage?: number;
    expand?: string;
  },
  requestOptions?: {
    signal?: AbortSignal;
  }
) {
  try {
    const records = await pb.collection('borrow_records').getList(
      listOptions?.page || 1,
      listOptions?.perPage || 50,
      {
        filter: listOptions?.filter,
        sort: listOptions?.sort || '-created',
        expand: listOptions?.expand || 'asset,user',
        ...requestOptions // Pass along the signal and other request options
      }
    );
    return records;
  } catch (error) {
    // Don't log abort errors as actual errors
    if (error instanceof Error && error.name === 'AbortError') {
      logger.log('Request aborted in getBorrowRecords');
    } else {
      logger.error('獲取借還記錄失敗:', error);
    }
    throw error;
  }
}

/**
 * 獲取當前認證用戶的借還記錄
 */
export async function getMyBorrowRecords(options?: {
  status?: string;
  page?: number;
  perPage?: number;
}) {
  try {
    const user = pb.authStore.model;
    if (!user) throw new Error('用戶未登入');

    let filter = `user = "${user.id}"`;
    if (options?.status) {
      filter += ` && status = "${options.status}"`;
    }

    return await getBorrowRecords({
      filter: filter,
      sort: '-created',
      page: options?.page,
      perPage: options?.perPage,
      expand: 'asset,user'
    });
  } catch (error) {
    logger.error('獲取我的借還記錄失敗:', error);
    throw error;
  }
}


/**
 * 獲取認證用戶當前借出的資產
 */
export async function getCurrentBorrowedAssets() {
  try {
    const user = pb.authStore.model;
    if (!user) throw new Error('用戶未登入');

    return await getBorrowRecords({
      filter: `user = "${user.id}" && status = "borrowed"`,
      expand: 'asset,user'
    });
  } catch (error) {
    logger.error('獲取當前借出資產失敗:', error);
    throw error;
  }
}


/**
 * 借出資產
 * 借用資產 (整合登記制與審核制)
 * 根據資產的 requires_approval 屬性決定直接借出或進入待審核狀態
 */
export async function borrowAsset(assetId: string, expectedReturnDate: string, borrowImages?: FileList | File[]) {
  try {
    const user = pb.authStore.model;
    if (!user) throw new Error('用戶未登入');

    const asset = await getAsset(assetId);
    if (asset.status !== 'active') {
      throw new Error('資產目前不可借用');
    }

    // 判斷邏輯：如果欄位不存在 (undefined) 或為 false，則視為不需要審核 (登記制)
    const needsApproval = !!asset.requires_approval;
    const targetStatus = needsApproval ? 'pending' : 'borrowed';

    const formData = new FormData();
    formData.append('asset', assetId);
    formData.append('user', user.id);
    formData.append('borrow_date', new Date().toISOString());
    formData.append('expected_return_date', expectedReturnDate);
    formData.append('status', targetStatus);

    if (borrowImages) {
      for (let i = 0; i < borrowImages.length; i++) {
        formData.append('borrow_images', borrowImages[i]);
      }
    }

    const borrowRecord = await pb.collection('borrow_records').create(formData);

    if (targetStatus === 'borrowed') {
      // 只有在直接借出時才更新資產狀態
      await updateAsset(assetId, { status: 'borrowed' });
      logger.log('資產借出成功 (登記制):', borrowRecord);
    } else {
      logger.log('借用申請已送出 (審核制):', borrowRecord);
    }

    return borrowRecord as unknown as BorrowRecord;
  } catch (error) {
    logger.error('借出資產失敗:', error);
    throw error;
  }
}

/**
 * 獲取所有待處理的借用請求 (供管理員使用)
 */
export async function getPendingRequests(page = 1, perPage = 50) {
  try {
    return await getBorrowRecords({
      filter: 'status = "pending"',
      sort: '-created',
      page,
      perPage,
      expand: 'asset,user'
    });
  } catch (error) {
    logger.error('獲取待處理請求失敗:', error);
    throw error;
  }
}

/**
 * 核准借用請求 (管理員使用)
 */
export async function approveBorrow(borrowRecordId: string) {
  try {
    const record = await pb.collection('borrow_records').getOne(borrowRecordId);
    if (record.status !== 'pending') throw new Error('此記錄非待處理狀態');

    // 更新借用記錄狀態
    const updatedRecord = await pb.collection('borrow_records').update(borrowRecordId, {
      status: 'borrowed',
      borrow_date: new Date().toISOString() // 以核准時間為準
    });

    // 同步更新資產狀態
    if (record.asset) {
      await updateAsset(record.asset, { status: 'borrowed' });
    }

    logger.log('借用請求已核准:', updatedRecord);
    return updatedRecord;
  } catch (error) {
    logger.error('核准借用失敗:', error);
    throw error;
  }
}

/**
 * 獲取特定資產的當前有效借用記錄 (供歸還使用)
 */
export async function getActiveBorrowRecordForAsset(assetId: string) {
  try {
    const user = pb.authStore.model;
    if (!user) throw new Error('用戶未登入');

    const records = await pb.collection('borrow_records').getFullList({
      filter: `user = "${user.id}" && asset = "${assetId}" && (status = "borrowed" || status = "overdue")`,
      sort: '-created',
      expand: 'asset,user'
    });

    if (records.length === 0) {
      // It's possible an admin is returning on behalf of a user.
      // Let's check for any active borrow record for this asset if the current user is an admin.
      if (user.role?.includes('admin')) {
        const adminRecords = await pb.collection('borrow_records').getFullList({
          filter: `asset = "${assetId}" && (status = "borrowed" || status = "overdue")`,
          sort: '-created',
          expand: 'asset,user'
        });
        if (adminRecords.length > 0) return adminRecords[0] as unknown as BorrowRecord;
      }
      throw new Error('找不到此資產的有效借用記錄');
    }

    return records[0] as unknown as BorrowRecord;
  } catch (error) {
    logger.error('獲取資產的有效借用記錄失敗:', error);
    throw error;
  }
}


/**
 * 歸還借出的資產
 */
export async function returnAsset(borrowRecordId: string, returnImages?: FileList | File[]) {
  try {
    const user = pb.authStore.model;
    if (!user) throw new Error('用戶未登入');

    const borrowRecord = await pb.collection('borrow_records').getOne(borrowRecordId);
    if (borrowRecord.user !== user.id) {
      throw new Error('您只能歸還您自己借用的資產');
    }
    const formData = new FormData();
    formData.append('status', 'returned');

    if (returnImages) {
      for (let i = 0; i < returnImages.length; i++) {
        formData.append('return_images', returnImages[i]);
      }
    }

    const updatedRecord = await pb.collection('borrow_records').update(borrowRecordId, formData);

    const assetId = (borrowRecord as any).asset;
    if (assetId) {
        await updateAsset(assetId, { status: 'active' });
    } else {
        logger.warn(`無法更新借還記錄 ${borrowRecordId} 的資產狀態，因為找不到資產 ID`);
    }

    logger.log('資產歸還成功:', updatedRecord);
    return updatedRecord as unknown as BorrowRecord;
  } catch (error) {
    logger.error('歸還資產失敗:', error);
    throw error;
  }
}

/**
 * 檢查資產是否可供借用
 */
export async function checkAssetAvailability(assetId: string) {
  try {
    const asset = await getAsset(assetId);
    return asset.status === 'active';
  } catch (error) {
    logger.error('檢查資產可用性失敗:', error);
    // 如果無法獲取資產，則視為不可用
    return false;
  }
}

/**
 * 檢查並更新逾期狀態
 * 建議在管理員面板或定時任務中執行
 */
export async function updateOverdueRecords() {
  try {
    const today = new Date().toISOString();
    // 找出所有已過期但狀態仍為 borrowed 的記錄
    const overdueRecords = await pb.collection('borrow_records').getFullList({
      filter: `status = "borrowed" && expected_return_date < "${today}"`
    });

    for (const record of overdueRecords) {
      await pb.collection('borrow_records').update(record.id, { status: 'overdue' });
    }
    return overdueRecords.length;
  } catch (error) {
    logger.error('更新逾期記錄失敗:', error);
    throw error;
  }
}