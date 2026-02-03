import type PocketBase from 'pocketbase';
import { logger } from '$lib/utils/logger';
import type { Asset, AssetCategory } from '$lib/types';
import { getUsersList, isAdmin } from './userService';

// =================================================================
// 資產函式 (Server Side)
// =================================================================

/**
 * 獲取資產的分頁列表
 */
export async function getAssets(pb: PocketBase, page = 1, perPage = 20, options?: {
  filter?: string;
  sort?: string;
  expand?: string;
}) {
  try {
    const records = await pb.collection('assets').getList(
      page,
      perPage,
      {
        filter: options?.filter || '',
        sort: options?.sort || '-created',
        expand: options?.expand || 'category,assigned_to'
      }
    );
    return records;
  } catch (error) {
    logger.error('獲取資產列表失敗:', error);
    throw error;
  }
}

/**
 * 透過 ID 獲取單個資產
 */
export async function getAsset(pb: PocketBase, id: string) {
  try {
    const record = await pb.collection('assets').getOne(id, {
        expand: 'category,assigned_to'
    });
    return record as unknown as Asset;
  } catch (error) {
    logger.error(`獲取資產 ${id} 失敗:`, error);
    throw error;
  }
}

/**
 * 創建一個新資產 (基本版)
 * 注意：此函式不處理資產 ID 生成
 * 請使用 `createAssetWithIdGeneration`
 */
export async function createAsset(pb: PocketBase, data: Omit<Asset, 'id' | 'created' | 'updated'>) {
  try {
    const record = await pb.collection('assets').create(data);
    logger.log('資產創建成功:', record);
    return record as unknown as Asset;
  } catch (error) {
    logger.error('創建資產失敗:', error);
    throw error;
  }
}

/**
 * 更新現有資產
 */
export async function updateAsset(pb: PocketBase, id: string, data: Partial<Omit<Asset, 'id' | 'created' | 'updated'>>) {
  try {
    const record = await pb.collection('assets').update(id, data);
    logger.log(`資產 ${id} 更新成功:`, record);
    return record as unknown as Asset;
  } catch (error) {
    logger.error(`更新資產 ${id} 失敗:`, error);
    throw error;
  }
}

/**
 * 透過 ID 刪除資產
 */
export async function deleteAsset(pb: PocketBase, id: string) {
  try {
    await pb.collection('assets').delete(id);
    logger.log(`資產 ${id} 刪除成功`);
  } catch (error) {
    logger.error(`刪除資產 ${id} 失敗:`, error);
    throw error;
  }
}

/**
 * 根據查詢字串搜尋資產
 */
export async function searchAssets(pb: PocketBase, query: string, page = 1) {
  try {
    // 保留原始碼中的搜尋邏輯，包含 notes
    const filter = `name ~ "${query}" || notes ~ "${query}" || serial_number ~ "${query}" || asset_id ~ "${query}"`;

    // 重用 getAssets 邏輯
    return await getAssets(pb, page, 20, {
        filter,
        sort: '-created'
    });
  } catch (error) {
    logger.error('搜尋資產失敗:', error);
    throw error;
  }
}

// =================================================================
// 資產 ID 生成
// =================================================================

/**
 * 創建資產並自動生成 asset_id，處理並發重試
 */
export async function createAssetWithIdGeneration(
  pb: PocketBase, // 注入 pb
  formDataObj: FormData,
  categoryId: string,
  categories: AssetCategory[]
) {
    let retries = 3;
    let lastError: any = null;

    while (retries > 0) {
        try {
            // 傳遞 pb 給內部函式
            const { assetId, newSequence } = await calculateNextAssetIdAndSequence(pb, categoryId, categories);
            formDataObj.set('asset_id', assetId);

            const createdAsset = await pb.collection('assets').create(formDataObj);

            // 修改點：只有當新的序號大於目前的序號時，才更新資料庫
            const currentCategory = categories.find(c => c.id === categoryId);
            if (currentCategory && newSequence > currentCategory.next_sequence) {
                try {
                    await pb.collection('asset_categories').update(categoryId, {
                        next_sequence: newSequence
                    });
                } catch (updateError) {
                    logger.warn('更新資產類別序號失敗 (但資產已成功創建):', updateError);
                }
            }

            return createdAsset; // 成功
        } catch (error: any) {
            lastError = error;
            // 檢查是否為唯一性衝突 (asset_id 重複)
            if (error?.data?.data?.asset_id?.code === 'validation_not_unique') {
                retries--;
                if (retries > 0) {
                    logger.warn(`創建資產時 asset_id 發生衝突，正在重試... (${3 - retries}/3)`);
                    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
                }
            } else {
                throw error; // 立即重新拋出其他錯誤
            }
        }
    }

    throw lastError || new Error('多次重試後創建資產失敗');
}

/**
 * 計算下一個可用的資產 ID 和建議的下一個序號
 */
export async function calculateNextAssetIdAndSequence(
    pb: PocketBase, // 注入 pb
    categoryId: string,
    categories: AssetCategory[]
): Promise<{ assetId: string, newSequence: number }> {
    try {
        const category = categories.find(cat => cat.id === categoryId);
        if (!category) {
            throw new Error('未找到指定的資產類別');
        }

        // 使用注入的 pb
        const existingAssets = await pb.collection('assets').getList(1, 1000, {
            filter: `category = "${categoryId}"`,
            sort: 'asset_id'
        });

        const usedNumbers = new Set<number>();
        existingAssets.items.forEach(asset => {
            const match = asset.asset_id.match(/^([A-Z0-9]{2})-(\d{3})$/);
            if (match) {
                usedNumbers.add(parseInt(match[2], 10));
            }
        });

        const sortedUsedNumbers = Array.from(usedNumbers).sort((a, b) => a - b);
        let nextNumber = 1;
        for (const num of sortedUsedNumbers) {
            if (num === nextNumber) {
                nextNumber++;
            } else if (num > nextNumber) {
                break;
            }
        }

        const assetId = `${category.prefix}-${nextNumber.toString().padStart(3, '0')}`;

        // 修正邏輯：Math.max(curr, next + 1)
        const newSequence = Math.max(category.next_sequence, nextNumber + 1);

        return { assetId, newSequence };
    } catch (error) {
        logger.error('計算資產 ID 和序號失敗:', error);
        throw error;
    }
}


/**
 * 一個更簡單的工具，僅生成下一個資產 ID
 */
export async function generateAssetId(pb: PocketBase, categoryId: string, categories: AssetCategory[]): Promise<string> {
  try {
    const { assetId } = await calculateNextAssetIdAndSequence(pb, categoryId, categories);
    return assetId;
  } catch (error) {
    logger.error('生成資產 ID 失敗:', error);
    throw error;
  }
}


// =================================================================
// 資產類別函式
// =================================================================

/**
 * 獲取資產類別的分頁列表
 */
export async function getAssetCategories(pb: PocketBase, options?: {
  filter?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}) {
  try {
    const records = await pb.collection('asset_categories').getList(
      options?.page || 1,
      options?.perPage || 50,
      {
        filter: options?.filter || '',
        sort: options?.sort || 'name'
      }
    );
    return records;
  } catch (error) {
    logger.error('獲取資產類別列表失敗:', error);
    throw error;
  }
}

/**
 * 獲取資產頁面所需的options
 */
export async function getAssetFormOptions(pb: PocketBase, currentUser: any) {
    const categoriesResult = await getAssetCategories(pb, { sort: 'name' });

    let borrowableUsers = [];
    if (isAdmin(currentUser)) {
        borrowableUsers = await getUsersList(pb);
    } else if (currentUser) {
        borrowableUsers = [currentUser];
    }

    return {
        categories: JSON.parse(JSON.stringify(categoriesResult.items)),
        borrowableUsers: JSON.parse(JSON.stringify(borrowableUsers))
    };
}

/**
 * 透過 ID 獲取單個資產類別
 */
export async function getAssetCategory(pb: PocketBase, id: string) {
  try {
    const record = await pb.collection('asset_categories').getOne(id);
    return record as unknown as AssetCategory;
  } catch (error) {
    logger.error(`獲取資產類別 ${id} 失敗:`, error);
    throw error;
  }
}

/**
 * 創建一個新的資產類別 (僅限管理員)
 */
export async function createAssetCategory(pb: PocketBase, data: Omit<AssetCategory, 'id' | 'created' | 'updated'>) {
    try {
        // 使用注入的 pb 檢查權限
        const user = pb.authStore.record;
        if (!isAdmin(user)) {
            throw new Error('需要管理員權限才能創建資產類別');
        }

        if (!data.name || typeof data.name !== 'string') throw new Error('類別名稱是必要的，且必須是字串');
        if (!data.prefix || typeof data.prefix !== 'string' || data.prefix.length !== 2) throw new Error('類別前綴是必要的，且必須是 2 個字元的字串');
        if (typeof data.next_sequence !== 'number' || data.next_sequence < 1) throw new Error('next_sequence 是必要的，且必須是數字 >= 1');

        const submitData = {
            name: data.name.trim(),
            prefix: data.prefix.trim().toUpperCase(),
            next_sequence: data.next_sequence,
            description: data.description ? data.description.trim() : ''
        };

        const record = await pb.collection('asset_categories').create(submitData);
        logger.log('資產類別創建成功:', record);
        return record as unknown as AssetCategory;
    } catch (error: any) {
        logger.error('創建資產類別失敗:', error);
        if (error.message.includes('Failed to create record')) {
            const cause = error.cause as any;
            throw new Error('創建資產類別失敗: ' + (cause?.message || '數據驗證失敗'));
        }
        throw error;
    }
}


/**
 * 更新資產類別 (僅限管理員)
 */
export async function updateAssetCategory(pb: PocketBase, id: string, data: Partial<Omit<AssetCategory, 'id' | 'created' | 'updated'>>) {
  try {
    const user = pb.authStore.record;
    if (!isAdmin(user)) {
      throw new Error('需要管理員權限才能更新資產類別');
    }

    const record = await pb.collection('asset_categories').update(id, data);
    logger.log(`資產類別 ${id} 更新成功:`, record);
    return record as unknown as AssetCategory;
  } catch (error) {
    logger.error(`更新資產類別 ${id} 失敗:`, error);
    throw error;
  }
}

/**
 * 刪除資產類別 (僅限管理員)
 */
export async function deleteAssetCategory(pb: PocketBase, id: string) {
  try {
    const user = pb.authStore.record;
    if (!isAdmin(user)) {
        throw new Error('需要管理員權限才能刪除資產類別');
    }

    await pb.collection('asset_categories').delete(id);
    logger.log(`資產類別 ${id} 刪除成功`);
  } catch (error) {
    logger.error(`刪除資產類別 ${id} 失敗:`, error);
    throw error;
  }
}