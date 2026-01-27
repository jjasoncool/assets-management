<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { pb } from '$lib/pocketbase';
    import { Swal } from '$lib/stores';

    // Props
    export let mode: 'create' | 'edit' = 'create';
    export let assetData: any = null;
    export let onSubmit: (data: any) => Promise<void>;
    export let onCancel: () => void;

    // 表單狀態
    let loading = false;
    let error: string | null = null;
    let success: string | null = null;

    // 表單數據
    let formData = {
        name: '',
        brand: '',
        model: '',
        serial_number: '',
        purchase_date: '',
        purchase_price: undefined as number | undefined,
        warranty_years: undefined as number | undefined,
        location: '',
        department: '',
        category: '',
        assigned_to: '',
        confidentiality_score: undefined as number | undefined,
        integrity_score: undefined as number | undefined,
        availability_score: undefined as number | undefined,
        status: 'active',
        notes: ''
    };

    // 選項數據
    let categories: any[] = [];
    let users: any[] = [];

    // 狀態選項
    const statusOptions = [
        { value: 'active', label: '正常' },
        { value: 'inactive', label: '停用' },
        { value: 'maintenance', label: '維護中' },
        { value: 'retired', label: '已報廢' },
        { value: 'lost', label: '遺失' },
        { value: 'stolen', label: '失竊' },
        { value: 'borrowed', label: '借出中' }
    ];

    // 圖片上傳
    let imageFiles: File[] = [];
    let imagePreviews: string[] = [];
    let existingImages: string[] = [];

    // 初始化
    onMount(async () => {
        try {
            // 獲取類別列表
            const categoryResult = await pb.collection('asset_categories').getList(1, 50, {
                sort: 'name'
            });
            categories = categoryResult.items;

            // 獲取用戶列表
            const userResult = await pb.collection('users').getList(1, 100, {
                sort: 'name'
            });
            users = userResult.items;

            // 如果是編輯模式，初始化表單數據
            if (mode === 'edit' && assetData) {
                await initializeEditForm();
            }
        } catch (err) {
            error = err instanceof Error ? err.message : '載入選項失敗';
        }
    });

    // 初始化編輯表單
    async function initializeEditForm() {
        // 格式化日期為 YYYY-MM-DD 格式，以便 date input 可以正確顯示
        let formattedPurchaseDate = '';
        if (assetData.purchase_date) {
            try {
                const date = new Date(assetData.purchase_date);
                if (!isNaN(date.getTime())) {
                    formattedPurchaseDate = date.toISOString().split('T')[0];
                }
            } catch (e) {
                console.error('日期格式化錯誤:', e);
            }
        }

        formData = {
            name: assetData.name || '',
            brand: assetData.brand || '',
            model: assetData.model || '',
            serial_number: assetData.serial_number || '',
            purchase_date: formattedPurchaseDate,
            purchase_price: assetData.purchase_price !== undefined ? assetData.purchase_price : undefined,
            warranty_years: assetData.warranty_years !== undefined ? assetData.warranty_years : undefined,
            location: assetData.location || '',
            department: assetData.department || '',
            category: assetData.category?.id || assetData.category || '',
            assigned_to: assetData.assigned_to?.id || assetData.assigned_to || '',
            confidentiality_score: assetData.confidentiality_score !== undefined ? assetData.confidentiality_score : undefined,
            integrity_score: assetData.integrity_score !== undefined ? assetData.integrity_score : undefined,
            availability_score: assetData.availability_score !== undefined ? assetData.availability_score : undefined,
            status: assetData.status || 'active',
            notes: assetData.notes || ''
        };

    // 初始化現有圖片 - 確保圖片 URL 是完整的
    if (assetData.images && Array.isArray(assetData.images)) {
        try {
            // 獲取文件訪問令牌（用於受保護的文件）
            const fileToken = await pb.files.getToken();

            existingImages = assetData.images.map((img: string) => {
                // 如果圖片 URL 是相對路徑，轉換為完整 URL
                if (img && !img.startsWith('http') && !img.startsWith('https')) {
                    try {
                        // 獲取 PocketBase 的基礎 URL
                        const pbBaseUrl = pb.baseUrl;
                        // PocketBase 圖片 URL 格式：/api/files/collectionId/recordId/filename
                        // 如果圖片路徑已經包含 collectionId 和 recordId，直接使用
                        if (img.includes('/')) {
                            // 如果路徑不以 / 开頭，添加 /
                            const imagePath = img.startsWith('/') ? img : `/${img}`;
                            // 使用 PocketBase 的縮圖功能（200x200）來減少流量
                            // 由於 images 字段是受保護的，需要使用文件令牌
                            return `${pbBaseUrl}/api/files${imagePath}?token=${fileToken}&thumb=200x200`;
                        } else {
                            // 如果只有文件名，需要構建完整路徑
                            // 使用 assets collectionId 和 recordId
                            const collectionId = 'pbc_1321337024'; // assets collection ID
                            const recordId = assetData.id || '';
                            if (collectionId && recordId) {
                                // 使用 PocketBase 的縮圖功能（200x200）來減少流量
                                // 由於 images 字段是受保護的，需要使用文件令牌
                                return `${pbBaseUrl}/api/files/${collectionId}/${recordId}/${img}?token=${fileToken}&thumb=200x200`;
                            } else {
                                console.warn('無法構建圖片 URL，缺少 collectionId 或 recordId');
                                return '';
                            }
                        }
                    } catch (e) {
                        console.error('構建圖片 URL 時發生錯誤:', e);
                        return '';
                    }
                }
                return img;
            }).filter((img: string) => img && img.trim() !== '');
        } catch (tokenError) {
            console.error('獲取文件訪問令牌失敗:', tokenError);
            // 如果無法獲取令牌，回退到使用 auth token
            existingImages = assetData.images.map((img: string) => {
                if (img && !img.startsWith('http') && !img.startsWith('https')) {
                    try {
                        const pbBaseUrl = pb.baseUrl;
                        if (img.includes('/')) {
                            const imagePath = img.startsWith('/') ? img : `/${img}`;
                            // 使用 PocketBase 的縮圖功能（200x200）來減少流量
                            return `${pbBaseUrl}/api/files${imagePath}?token=${pb.authStore.token}&thumb=200x200`;
                        } else {
                            const collectionId = 'pbc_1321337024';
                            const recordId = assetData.id || '';
                            if (collectionId && recordId) {
                                // 使用 PocketBase 的縮圖功能（200x200）來減少流量
                                return `${pbBaseUrl}/api/files/${collectionId}/${recordId}/${img}?token=${pb.authStore.token}&thumb=200x200`;
                            } else {
                                console.warn('無法構建圖片 URL，缺少 collectionId 或 recordId');
                                return '';
                            }
                        }
                    } catch (e) {
                        console.error('構建圖片 URL 時發生錯誤:', e);
                        return '';
                    }
                }
                return img;
            }).filter((img: string) => img && img.trim() !== '');
        }
    }
    }

    // 處理圖片上傳
    function handleImageUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files) {
            const files = Array.from(input.files);
            const validFiles = files.filter(file => {
                const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                return validTypes.includes(file.type) && file.size <= 5 * 1024 * 1024; // 5MB
            });

            if (validFiles.length !== files.length) {
                alert('部分檔案不符合要求：僅支援 JPG、PNG、GIF、WebP 格式，且單檔不得超過 5MB');
            }

            // 添加新圖片到現有圖片列表
            imageFiles = [...imageFiles, ...validFiles];

            // 生成預覽
            validFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (e.target?.result) {
                        // 添加新預覽到現有預覽列表
                        imagePreviews = [...imagePreviews, e.target.result as string];
                    }
                };
                reader.readAsDataURL(file);
            });

            // 清空 input，允許重複選擇相同檔案
            input.value = '';
        }
    }

    // 刪除新上傳的圖片
    function removeNewImage(index: number) {
        imageFiles = imageFiles.filter((_, i) => i !== index);
        imagePreviews = imagePreviews.filter((_, i) => i !== index);
    }

    // 刪除現有圖片
    function removeExistingImage(index: number) {
        existingImages = existingImages.filter((_, i) => i !== index);
    }

    // 圖片瀏覽模態框狀態
    let modalImageUrl: string | null = null;

    // 開啟圖片瀏覽模態框
    function openImageModal(imageUrl: string) {
        // 如果是縮圖 URL，轉換回原始圖片 URL
        let originalUrl = imageUrl;
        if (imageUrl.includes('&thumb=')) {
            originalUrl = imageUrl.replace(/&thumb=[^&]*/, '');
        }
        modalImageUrl = originalUrl;
    }

    // 清理 modal backdrop
    import { onDestroy } from 'svelte';

    onDestroy(() => {
        // 確保組件銷毀時，如果 Modal 還開著，要把背景清掉
        if (typeof document !== 'undefined') {
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) backdrop.remove();
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
    });

    // 響應式風險分數計算
    $: totalRiskScore = () => {
        const c = formData.confidentiality_score || 0;
        const i = formData.integrity_score || 0;
        const a = formData.availability_score || 0;
        return Math.round(c + i + a);
    };

    // 響應式進度條寬度計算
    $: progressWidth = () => {
        const score = totalRiskScore();
        return Math.round((score / 21) * 100);
    };

    // 響應式進度條顏色計算
    $: progressBarClass = () => {
        const score = totalRiskScore();
        if (score <= 7) {
            return 'bg-primary'; // 藍色
        } else if (score <= 14) {
            return 'bg-warning'; // 黃色
        } else {
            return 'bg-danger'; // 紅色
        }
    };

    // 處理分數輸入，確保只能輸入 0-7 的數字
    function handleScoreInput(event: Event, field: 'confidentiality_score' | 'integrity_score' | 'availability_score') {
        const input = event.target as HTMLInputElement;
        let value = parseInt(input.value) || 0;

        // 限制範圍在 0-7 之間
        if (value < 0) value = 0;
        if (value > 7) value = 7;

        // 更新 formData
        formData[field] = value;

        // 更新 input 值
        input.value = value.toString();
    }

    // 驗證表單
    function validateForm(): string[] {
        const errors: string[] = [];

        if (!formData.name.trim()) {
            errors.push('請輸入資產名稱');
        }

        if (!formData.category) {
            errors.push('請選擇資產類別。如果沒有適當的類別，請聯繫管理員新增所需類別。');
        }

        if (formData.purchase_price !== undefined && formData.purchase_price < 0) {
            errors.push('購買價格不能為負數');
        }

        if (formData.warranty_years !== undefined && formData.warranty_years < 0) {
            errors.push('保固年數不能為負數');
        }

        if (formData.confidentiality_score !== undefined && (formData.confidentiality_score < 0 || formData.confidentiality_score > 7)) {
            errors.push('機密性分數必須在 0-7 之間');
        }

        if (formData.integrity_score !== undefined && (formData.integrity_score < 0 || formData.integrity_score > 7)) {
            errors.push('完整性分數必須在 0-7 之間');
        }

        if (formData.availability_score !== undefined && (formData.availability_score < 0 || formData.availability_score > 7)) {
            errors.push('可用性分數必須在 0-7 之間');
        }

        if (imageFiles.length + existingImages.length > 10) {
            errors.push('最多只能上傳 10 張圖片');
        }

        return errors;
    }

    // 提交表單
    async function handleSubmit() {
        try {
            loading = true;
            error = null;
            success = null;

            const validationErrors = validateForm();
            if (validationErrors.length > 0) {
                error = validationErrors.join('；');
                return;
            }

            // 準備表單數據
            const submitData: any = {
                name: formData.name.trim(),
                brand: formData.brand.trim(),
                model: formData.model.trim(),
                serial_number: formData.serial_number.trim(),
                purchase_date: formData.purchase_date || undefined,
                purchase_price: formData.purchase_price,
                warranty_years: formData.warranty_years,
                location: formData.location.trim(),
                department: formData.department.trim(),
                category: formData.category,
                assigned_to: formData.assigned_to || undefined,
                confidentiality_score: formData.confidentiality_score,
                integrity_score: formData.integrity_score,
                availability_score: formData.availability_score,
                total_risk_score: totalRiskScore(),
                status: formData.status,
                notes: formData.notes.trim()
            };

            // 如果是編輯模式，保留 asset_id 不變
            if (mode === 'edit' && assetData?.asset_id) {
                submitData.asset_id = assetData.asset_id;
            }

            // --- 修改開始：統一使用 FormData 處理所有資料 (包含文字、新增圖片、刪除圖片) ---
            const formDataObj = new FormData();

            // 1. 加入一般文字欄位
            Object.entries(submitData).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    formDataObj.append(key, String(value));
                }
            });

            // 2. 加入新上傳的圖片 (Append)
            // PocketBase 會自動將這些圖片「附加」到現有圖片列表後，而不是覆蓋
            if (imageFiles.length > 0) {
                imageFiles.forEach(file => {
                    console.log(`加入新圖片: ${file.name}`);
                    formDataObj.append('images', file);
                });
            }

    // 3. 處理要刪除的舊圖片 (只在編輯模式)
    if (mode === 'edit' && assetData?.images && Array.isArray(assetData.images)) {
        const originalImages = assetData.images;

        // 除錯：印出原始圖片數據和現有圖片 URL
        console.log('=== 圖片處理除錯資訊 ===');
        console.log('原始圖片數據 (assetData.images):', originalImages);
        console.log('現有圖片 URL (existingImages):', existingImages);

        // 修正比對邏輯：
        // 檢查原始檔名 (filename) 是否存在於現有的 URL (existingImages) 中
        const deletedImages = originalImages.filter((originalItem: string) => {
            // 提取原始項目的純檔案名稱（去除路徑部分）
            const parts = originalItem ? originalItem.split('/') : [];
            const lastPart = parts.length > 0 ? parts[parts.length - 1] : '';
            const filename = lastPart ? lastPart.split('?')[0] : '';

            // 除錯：印出每個檔案的比對結果
            console.log(`檢查檔案: ${originalItem} -> 提取檔名: ${filename}`);
            const isDeleted = filename && !existingImages.some(url => url.includes(filename));
            console.log(`  是否要刪除: ${isDeleted} (${existingImages.some(url => url.includes(filename)) ? '找到匹配' : '未找到匹配'})`);

            return isDeleted;
        });

        // 除錯：印出要刪除的圖片列表
        console.log('要刪除的圖片:', deletedImages);

        // 在 FormData 中加入 `images-` 欄位，PocketBase 收到後會刪除指定的檔案
        // 使用純檔案名稱（不包含路徑）
        deletedImages.forEach((originalItem: string) => {
            const parts = originalItem ? originalItem.split('/') : [];
            const lastPart = parts.length > 0 ? parts[parts.length - 1] : '';
            const filename = lastPart ? lastPart.split('?')[0] : '';
            if (filename) {
                console.log(`加入刪除請求: ${filename}`);
                formDataObj.append('images-', filename);
            }
        });

        // 除錯：顯示最終的 FormData 內容
        console.log('=== FormData 內容 ===');
        for (let [key, value] of formDataObj.entries()) {
            console.log(`${key}:`, value);
        }

        // 安全機制：如果沒有要刪除的圖片，且有現有圖片，則明確保留現有圖片
        // 這是為了防止 PocketBase 在某些版本中可能清除現有圖片的問題
        // 當有新圖片時，PocketBase 应該自動保留現有圖片，但某些版本可能有 bug
        if (deletedImages.length === 0 && existingImages.length > 0) {
            console.log('安全機制：明確保留現有圖片');
            // 使用 images+ 來明確附加空陣列，表示保留現有圖片
            formDataObj.append('images+', '');
        }
    } else if (mode === 'edit') {
        // 如果沒有原始圖片數據，但有現有圖片，也需要處理
        console.log('編輯模式但沒有原始圖片數據，檢查是否有現有圖片需要保留');
        if (existingImages.length > 0) {
            console.log('安全機制：明確保留現有圖片（無原始數據情況）');
            formDataObj.append('images+', '');
        }
    }

            // 4. 發送請求 (單次請求完成更新與刪除)
            let result;
            if (mode === 'create') {
                result = await pb.collection('assets').create(formDataObj);
            } else if (mode === 'edit' && assetData?.id) {
                result = await pb.collection('assets').update(assetData.id, formDataObj);
            }
            // --- 修改結束 ---

            // 使用 SweetAlert 顯示成功訊息
            $Swal.fire({
                title: '成功！',
                text: mode === 'create' ? '資產新增成功！' : '資產更新成功！',
                icon: 'success',
                confirmButtonText: '確定'
            });

            // 調用 onSubmit 回調
            if (onSubmit) {
                await onSubmit(result);
            }

        } catch (err) {
            console.error('提交錯誤:', err); // 建議加入 console log 以便除錯
            error = err instanceof Error ?
                err.message : mode === 'create' ? '新增資產失敗' : '更新資產失敗';
        } finally {
            loading = false;
        }
    }
</script>

<div class="card-body p-4">
    {#if error}
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <i class="mdi mdi-alert-circle me-2"></i>
            {error}
            <button type="button" class="btn-close" on:click={() => error = null}></button>
        </div>
    {/if}

    {#if success}
        <div class="alert alert-success alert-dismissible fade show" role="alert">
            <i class="mdi mdi-check-circle me-2"></i>
            {success}
            <button type="button" class="btn-close" on:click={() => success = null}></button>
        </div>
    {/if}

    <form on:submit|preventDefault={handleSubmit}>
        <!-- 基本資訊 -->
        <div class="row g-3 mb-4">
            <div class="col-md-6">
                <label for="name" class="form-label small fw-bold text-secondary">資產名稱 *</label>
                <input
                    type="text"
                    id="name"
                    class="form-control shadow-none"
                    bind:value={formData.name}
                    placeholder="請輸入資產名稱"
                />
            </div>
            <div class="col-md-6">
                <label for="category" class="form-label small fw-bold text-secondary">資產類別 *</label>
                <select
                    id="category"
                    class="form-select shadow-none"
                    bind:value={formData.category}
                >
                    <option value="">請選擇資產類別</option>
                    {#each categories as cat}
                        <option value={cat.id}>{cat.name} ({cat.prefix})</option>
                    {/each}
                </select>
            </div>
            <div class="col-md-4">
                <label for="brand" class="form-label small fw-bold text-secondary">品牌</label>
                <input
                    type="text"
                    id="brand"
                    class="form-control shadow-none"
                    bind:value={formData.brand}
                    placeholder="例如：Dell、HP、Apple"
                />
            </div>
            <div class="col-md-4">
                <label for="model" class="form-label small fw-bold text-secondary">型號</label>
                <input
                    type="text"
                    id="model"
                    class="form-control shadow-none"
                    bind:value={formData.model}
                    placeholder="例如：Latitude 7420"
                />
            </div>
            <div class="col-md-4">
                <label for="serial_number" class="form-label small fw-bold text-secondary">序號</label>
                <input
                    type="text"
                    id="serial_number"
                    class="form-control shadow-none"
                    bind:value={formData.serial_number}
                    placeholder="設備序列號碼"
                />
            </div>
        </div>

        <!-- 購買資訊 -->
        <div class="row g-3 mb-4">
            <div class="col-md-4">
                <label for="purchase_date" class="form-label small fw-bold text-secondary">購買日期</label>
                <input
                    type="date"
                    id="purchase_date"
                    class="form-control shadow-none"
                    bind:value={formData.purchase_date}
                />
            </div>
            <div class="col-md-4">
                <label for="purchase_price" class="form-label small fw-bold text-secondary">購買價格</label>
                <input
                    type="number"
                    id="purchase_price"
                    class="form-control shadow-none"
                    bind:value={formData.purchase_price}
                    placeholder="0"
                    min="0"
                    step="0.01"
                />
            </div>
            <div class="col-md-4">
                <label for="warranty_years" class="form-label small fw-bold text-secondary">保固年數</label>
                <input
                    type="number"
                    id="warranty_years"
                    class="form-control shadow-none"
                    bind:value={formData.warranty_years}
                    placeholder="0"
                    min="0"
                    step="0.1"
                />
            </div>
        </div>

        <!-- 位置與部門 -->
        <div class="row g-3 mb-4">
            <div class="col-md-6">
                <label for="location" class="form-label small fw-bold text-secondary">位置</label>
                <input
                    type="text"
                    id="location"
                    class="form-control shadow-none"
                    bind:value={formData.location}
                    placeholder="例如：辦公室 A、倉庫 B"
                />
            </div>
            <div class="col-md-6">
                <label for="department" class="form-label small fw-bold text-secondary">部門</label>
                <input
                    type="text"
                    id="department"
                    class="form-control shadow-none"
                    bind:value={formData.department}
                    placeholder="例如：IT 部、業務部"
                />
            </div>
        </div>

        <!-- 負責人 -->
        <div class="row g-3 mb-4">
            <div class="col-md-6">
                <label for="assigned_to" class="form-label small fw-bold text-secondary">負責人</label>
                <select
                    id="assigned_to"
                    class="form-select shadow-none"
                    bind:value={formData.assigned_to}
                >
                    <option value="">請選擇負責人</option>
                    {#each users as user}
                        <option value={user.id}>{user.name || user.email}</option>
                    {/each}
                </select>
            </div>
            <div class="col-md-6">
                <label for="status" class="form-label small fw-bold text-secondary">狀態</label>
                <select
                    id="status"
                    class="form-select shadow-none"
                    bind:value={formData.status}
                >
                    {#each statusOptions as opt}
                        <option value={opt.value}>{opt.label}</option>
                    {/each}
                </select>
            </div>
        </div>

        <!-- 風險評估 -->
        <div class="row g-3 mb-4">
            <div class="col-md-12 mb-2">
                <div class="alert alert-info small p-2 mb-0">
                    <i class="mdi mdi-information-outline me-1"></i>
                    分數說明：0 不適用 | 1 普通 | 3 內部使用 | 5-7 機密
                </div>
            </div>
            <div class="col-md-4">
                <label for="confidentiality_score" class="form-label small fw-bold text-secondary">機密性分數 (0-7)</label>
                <input
                    type="number"
                    id="confidentiality_score"
                    class="form-control shadow-none"
                    bind:value={formData.confidentiality_score}
                    placeholder="0-7"
                    min="0"
                    max="7"
                    step="1"
                    on:input={(e) => handleScoreInput(e, 'confidentiality_score')}
                />
            </div>
            <div class="col-md-4">
                <label for="integrity_score" class="form-label small fw-bold text-secondary">完整性分數 (0-7)</label>
                <input
                    type="number"
                    id="integrity_score"
                    class="form-control shadow-none"
                    bind:value={formData.integrity_score}
                    placeholder="0-7"
                    min="0"
                    max="7"
                    step="1"
                    on:input={(e) => handleScoreInput(e, 'integrity_score')}
                />
            </div>
            <div class="col-md-4">
                <label for="availability_score" class="form-label small fw-bold text-secondary">可用性分數 (0-7)</label>
                <input
                    type="number"
                    id="availability_score"
                    class="form-control shadow-none"
                    bind:value={formData.availability_score}
                    placeholder="0-7"
                    min="0"
                    max="7"
                    step="1"
                    on:input={(e) => handleScoreInput(e, 'availability_score')}
                />
            </div>
            <div class="col-md-12">
                    <div class="alert alert-light small">
                        風險總分：{totalRiskScore()} / 21
                        <div class="progress mt-2" style="height: 8px">
                            <div
                                class="progress-bar {progressBarClass()}"
                                style="width: {progressWidth()}%"
                                role="progressbar"
                                aria-valuenow={progressWidth()}
                                aria-valuemin="0"
                                aria-valuemax="100"
                            ></div>
                        </div>
                    </div>
            </div>
        </div>

        <!-- 圖片上傳 -->
        <div class="row mb-4">
            <div class="col-12">
                <label for="assetImages" class="form-label small fw-bold text-secondary">資產圖片</label>
                <div class="input-group">
                    <input
                        type="file"
                        id="assetImages"
                        class="form-control shadow-none"
                        accept="image/*"
                        multiple
                        on:change={handleImageUpload}
                    />
                </div>
                <div class="form-text">
                    支援 JPG、PNG、GIF、WebP 格式，單檔最大 5MB，最多 10 張
                </div>
            </div>

            <div class="col-12">
                <div class="row g-2 mt-2">
                    <!-- 現有圖片 -->
                    {#each existingImages as image, index}
                        <div class="col-md-2 col-3">
                            <div class="position-relative">
                                <div class="ratio ratio-1x1 w-100">
                                <button
                                    type="button"
                                    class="img-button"
                                    style="border: none; background: none; padding: 0; cursor: pointer;"
                                    aria-label="查看現有圖片"
                                    data-bs-toggle="modal"
                                    data-bs-target="#imagePreviewModal"
                                    on:click={() => openImageModal(image)}
                                >
                                    <img
                                        src={image}
                                        class="img-thumbnail w-100 h-100 object-fit-cover"
                                        alt="現有圖片"
                                    />
                                </button>
                                </div>
                                <button
                                    type="button"
                                    class="btn btn-danger btn-sm position-absolute top-0 end-0"
                                    style="transform: translate(25%, -25%);"
                                    on:click|stopPropagation={() => removeExistingImage(index)}
                                    aria-label="刪除現有圖片"
                                    title="刪除現有圖片"
                                >
                                    <span class="visually-hidden">刪除現有圖片</span>
                                    &times;
                                </button>
                            </div>
                        </div>
                    {/each}

                    <!-- 新上傳的圖片 -->
                    {#each imagePreviews as preview, index}
                        <div class="col-md-2 col-3">
                            <div class="position-relative">
                                <div class="ratio ratio-1x1 w-100">
                                <button
                                    type="button"
                                    class="img-button"
                                    style="border: none; background: none; padding: 0; cursor: pointer;"
                                    aria-label="查看新上傳的圖片"
                                    data-bs-toggle="modal"
                                    data-bs-target="#imagePreviewModal"
                                    on:click={() => openImageModal(preview)}
                                >
                                    <img
                                        src={preview}
                                        class="img-thumbnail w-100 h-100 object-fit-cover"
                                        alt="預覽"
                                    />
                                </button>
                                </div>
                                <button
                                    type="button"
                                    class="btn btn-danger btn-sm position-absolute top-0 end-0"
                                    style="transform: translate(25%, -25%);"
                                    on:click|stopPropagation={() => removeNewImage(index)}
                                    aria-label="刪除新上傳的圖片"
                                    title="刪除新上傳的圖片"
                                >
                                    <span class="visually-hidden">刪除新上傳的圖片</span>
                                    &times;
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </div>

        <!-- 備註 -->
        <div class="row mb-4">
            <div class="col-12">
                <label for="notes" class="form-label small fw-bold text-secondary">備註</label>
                <textarea
                    id="notes"
                    class="form-control shadow-none"
                    bind:value={formData.notes}
                    rows="3"
                    placeholder="其他補充說明..."
                ></textarea>
            </div>
        </div>

        <!-- 操作按鈕 -->
        <div class="row">
            <div class="col-12">
                <div class="d-flex justify-content-between">
                    <button
                        type="button"
                        class="btn btn-outline-secondary"
                        on:click={onCancel}
                    >
                        <i class="mdi mdi-arrow-left me-2"></i>
                        返回列表
                    </button>

                    <button
                        type="submit"
                        class="btn btn-primary"
                        disabled={loading}
                    >
                        {#if loading}
                            <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                            {mode === 'create' ? '新增中...' : '更新中...'}
                        {:else}
                            {#if mode === 'create'}
                                <i class="mdi mdi-plus me-2"></i>
                                新增資產
                            {:else}
                                <i class="mdi mdi-content-save me-2"></i>
                                更新資產
                            {/if}
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    </form>
</div>

<!-- 圖片瀏覽模態框 -->
<div
    class="modal fade"
    id="imagePreviewModal"
    tabindex="-1"
    aria-labelledby="imagePreviewModalLabel"
    aria-hidden="true"
>
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="imagePreviewModalLabel">圖片預覽</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" style="overflow-y: auto; max-height: 85vh;">
                <div class="text-center">
                    {#if modalImageUrl}
                        <img src={modalImageUrl} class="img-fluid" style="max-width: 100%; height: auto;" alt="圖片預覽" />
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>
