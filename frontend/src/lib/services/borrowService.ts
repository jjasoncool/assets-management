import { pb } from '../pocketbase';
import { logger } from '../utils/logger';
import { getAsset, updateAsset, type Asset } from './assetService';

// =================================================================
// 介面
// =================================================================

export interface BorrowRecord {
  id: string;
  assetId: string;
  userId: string;
  borrowDate: string;
  expectedReturnDate?: string;
  actualReturnDate?: string;
  status: 'borrowed' | 'returned' | 'overdue';
  notes?: string;
  created: string;
  updated: string;
  asset?: Asset; // 展開的關聯數據
  user?: { // 展開的關聯數據
    id: string;
    name?: string;
    email: string;
  };
}

// =================================================================
// 借還函式
// =================================================================

/**
 * 獲取借還記錄的分頁列表
 */
export async function getBorrowRecords(options?: {
  filter?: string;
  sort?: string;
  page?: number;
  perPage?: number;
  expand?: string;
}) {
  try {
    const records = await pb.collection('borrowRecords').getList(
      options?.page || 1,
      options?.perPage || 50,
      {
        filter: options?.filter,
        sort: options?.sort || '-created',
        expand: options?.expand || 'asset,user'
      }
    );
    return records;
  } catch (error) {
    logger.error('獲取借還記錄失敗:', error);
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

    let filter = `userId = "${user.id}"`;
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
      filter: `userId = "${user.id}" && status = "borrowed"`,
      expand: 'asset,user'
    });
  } catch (error) {
    logger.error('獲取當前借出資產失敗:', error);
    throw error;
  }
}


/**
 * 借出資產
 */
export async function borrowAsset(assetId: string, expectedReturnDate?: string, notes?: string) {
  try {
    const user = pb.authStore.model;
    if (!user) throw new Error('用戶未登入');

    const asset = await getAsset(assetId);
    if (asset.status !== 'active') {
      throw new Error('資產目前不可借用');
    }

    const borrowRecord = await pb.collection('borrowRecords').create({
      asset: assetId,
      user: user.id,
      borrowDate: new Date().toISOString(),
      expectedReturnDate: expectedReturnDate,
      status: 'borrowed',
      notes: notes
    });

    await updateAsset(assetId, { status: 'borrowed' });

    logger.log('資產借出成功:', borrowRecord);
    return borrowRecord as unknown as BorrowRecord;
  } catch (error) {
    logger.error('借出資產失敗:', error);
    throw error;
  }
}

/**
 * 歸還借出的資產
 */
export async function returnAsset(borrowRecordId: string, notes?: string) {
  try {
    const user = pb.authStore.model;
    if (!user) throw new Error('用戶未登入');

    const borrowRecord = await pb.collection('borrowRecords').getOne(borrowRecordId);
    if (borrowRecord.user !== user.id) {
      throw new Error('您只能歸還您自己借用的資產');
    }

    const updatedRecord = await pb.collection('borrowRecords').update(borrowRecordId, {
      actualReturnDate: new Date().toISOString(),
      status: 'returned',
      notes: notes || borrowRecord.notes
    });

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