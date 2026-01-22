import { pb } from '../pocketbase';
import { logger } from '../utils/logger';

// 資產相關操作
export interface Asset {
  id: string;
  asset_id: string;
  name: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_price?: number;
  warranty_years?: number;
  location?: string;
  department?: string;
  category?: {
    id: string;
    name: string;
    prefix: string;
  };
  assigned_to?: {
    id: string;
    name?: string;
    email: string;
  };
  images?: string[];
  confidentiality_score?: number;
  integrity_score?: number;
  availability_score?: number;
  total_risk_score?: number;
  status: 'active' | 'inactive' | 'maintenance' | 'retired' | 'lost' | 'stolen' | 'borrowed';
  notes?: string;
  created: string;
  updated: string;
}

// 借還記錄
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
  // 展開的關聯數據
  asset?: Asset;
  user?: {
    id: string;
    name?: string;
    email: string;
  };
}

// 獲取所有資產
export async function getAssets(options?: {
  filter?: string;
  sort?: string;
  page?: number;
  perPage?: number;
  expand?: string;
}) {
  try {
    const records = await pb.collection('assets').getList(
      options?.page || 1,
      options?.perPage || 50,
      {
        filter: options?.filter,
        sort: options?.sort,
        expand: options?.expand || 'category,assigned_to'
      }
    );
    return records;
  } catch (error) {
    logger.error('獲取資產列表失敗:', error);
    throw error;
  }
}

// 獲取單個資產
export async function getAsset(id: string) {
  try {
    const record = await pb.collection('assets').getOne(id);
    return record as unknown as Asset;
  } catch (error) {
    logger.error('獲取資產失敗:', error);
    throw error;
  }
}

// 創建資產
export async function createAsset(data: Omit<Asset, 'id' | 'created' | 'updated'>) {
  try {
    const record = await pb.collection('assets').create(data);
    logger.log('資產創建成功:', record);
    return record as unknown as Asset;
  } catch (error) {
    logger.error('創建資產失敗:', error);
    throw error;
  }
}

// 更新資產
export async function updateAsset(id: string, data: Partial<Omit<Asset, 'id' | 'created' | 'updated'>>) {
  try {
    const record = await pb.collection('assets').update(id, data);
    logger.log('資產更新成功:', record);
    return record as unknown as Asset;
  } catch (error) {
    logger.error('更新資產失敗:', error);
    throw error;
  }
}

// 刪除資產
export async function deleteAsset(id: string) {
  try {
    await pb.collection('assets').delete(id);
    logger.log('資產刪除成功:', id);
  } catch (error) {
    logger.error('刪除資產失敗:', error);
    throw error;
  }
}

// 搜索資產
export async function searchAssets(query: string, options?: {
  filter?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}) {
  try {
    const filter = `name ~ "${query}" || notes ~ "${query}" || serial_number ~ "${query}" || asset_id ~ "${query}"`;
    const records = await pb.collection('assets').getList(
      options?.page || 1,
      options?.perPage || 50,
      {
        filter: options?.filter ? `${filter} && ${options.filter}` : filter,
        sort: options?.sort,
      }
    );
    return records;
  } catch (error) {
    logger.error('搜索資產失敗:', error);
    throw error;
  }
}

// ============ 借還功能 ============

// 借出資產
export async function borrowAsset(assetId: string, expectedReturnDate?: string, notes?: string) {
  try {
    const user = pb.authStore.model;
    if (!user) throw new Error('未登入');

    // 檢查資產狀態
    const asset = await getAsset(assetId);
    if (asset.status !== 'active') {
      throw new Error('資產目前不可借用');
    }

    // 創建借還記錄
    const borrowRecord = await pb.collection('borrowRecords').create({
      assetId: assetId,
      userId: user.id,
      borrowDate: new Date().toISOString(),
      expectedReturnDate: expectedReturnDate,
      status: 'borrowed',
      notes: notes
    });

    // 更新資產狀態
    await updateAsset(assetId, { status: 'borrowed' });

    logger.log('資產借出成功:', borrowRecord);
    return borrowRecord as unknown as BorrowRecord;
  } catch (error) {
    logger.error('借出資產失敗:', error);
    throw error;
  }
}

// 歸還資產
export async function returnAsset(borrowRecordId: string, notes?: string) {
  try {
    const user = pb.authStore.model;
    if (!user) throw new Error('未登入');

    // 獲取借還記錄
    const borrowRecord = await pb.collection('borrowRecords').getOne(borrowRecordId);
    if (borrowRecord.userId !== user.id) {
      throw new Error('只能歸還自己借出的資產');
    }

    // 更新借還記錄
    const updatedRecord = await pb.collection('borrowRecords').update(borrowRecordId, {
      actualReturnDate: new Date().toISOString(),
      status: 'returned',
      notes: notes || borrowRecord.notes
    });

    // 更新資產狀態
    await updateAsset(borrowRecord.assetId, { status: 'active' });

    logger.log('資產歸還成功:', updatedRecord);
    return updatedRecord as unknown as BorrowRecord;
  } catch (error) {
    logger.error('歸還資產失敗:', error);
    throw error;
  }
}

// 獲取借還記錄
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
        sort: options?.sort,
        expand: options?.expand || 'asset,user'
      }
    );
    return records;
  } catch (error) {
    logger.error('獲取借還記錄失敗:', error);
    throw error;
  }
}

// 獲取我的借還記錄
export async function getMyBorrowRecords(options?: {
  status?: string;
  page?: number;
  perPage?: number;
}) {
  try {
    const user = pb.authStore.model;
    if (!user) throw new Error('未登入');

    let filter = `userId = "${user.id}"`;
    if (options?.status) {
      filter += ` && status = "${options.status}"`;
    }

    const records = await getBorrowRecords({
      filter: filter,
      sort: '-created',
      page: options?.page,
      perPage: options?.perPage,
      expand: 'asset,user'
    });

    return records;
  } catch (error) {
    logger.error('獲取我的借還記錄失敗:', error);
    throw error;
  }
}

// 獲取當前借出的資產
export async function getCurrentBorrowedAssets() {
  try {
    const user = pb.authStore.model;
    if (!user) throw new Error('未登入');

    const records = await getBorrowRecords({
      filter: `userId = "${user.id}" && status = "borrowed"`,
      expand: 'asset,user'
    });

    return records;
  } catch (error) {
    logger.error('獲取當前借出資產失敗:', error);
    throw error;
  }
}

// 檢查資產是否可借
export async function checkAssetAvailability(assetId: string) {
  try {
    const asset = await getAsset(assetId);
    return asset.status === 'active';
  } catch (error) {
    logger.error('檢查資產可用性失敗:', error);
    throw error;
  }
}
