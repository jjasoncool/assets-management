<script lang="ts">
    import type { ActionData } from '../../routes/users/add/$types';
    import TomSelect from 'tom-select';
    import 'tom-select/dist/css/tom-select.bootstrap5.css';

    let {
        form,
        initialData,
        isEditing = false,
        onCancel
    } = $props<{
        form?: ActionData;
        initialData?: Record<string, any>; // 接收來自編輯頁面的資料庫初始值
        isEditing?: boolean;
        onCancel: () => void;
    }>();

    // 統一處理 Role 轉陣列的邏輯
    function parseRole(rawRole: any): string[] {
        if (!rawRole) return ['user'];
        if (Array.isArray(rawRole)) return rawRole;
        if (typeof rawRole === 'string') return rawRole.split(',').map((r: string) => r.trim());
        return [String(rawRole)];
    }

    // 透過閉包 (Closure) 提取初始值，完美解決 Svelte 5 的 state_referenced_locally 警告
    // 這樣能明確告訴編譯器：「我們只需要在元件掛載時讀取一次快照」
    const getInitialValues = () => ({
        name: form?.data?.name ?? initialData?.name ?? '',
        email: form?.data?.email ?? initialData?.email ?? '',
        department: form?.data?.department ?? initialData?.department ?? '',
        role: parseRole(form?.data?.role ?? initialData?.role)
    });

    const initVals = getInitialValues();

    // 使用 $state 初始化表單資料
    let name = $state(initVals.name);
    let email = $state(initVals.email);
    let department = $state(initVals.department);
    let role = $state<string[]>(initVals.role);

    // 從 form prop 派生出錯誤訊息
    const formError = $derived(form?.error);
    const formErrors = $derived(form?.errors);

    let tomselect: TomSelect | null = null;
    let roleSelectEl: HTMLSelectElement;

    // 當表單送出驗證失敗，SvelteKit 更新 form prop 時，同步更新 state 讓畫面顯示退回的值
    $effect(() => {
        if (form?.data) {
            name = form.data.name ?? name;
            email = form.data.email ?? email;
            department = form.data.department ?? department;

            const newRole = parseRole(form.data.role);
            role = newRole;
            if (tomselect) {
                tomselect.setValue(newRole, true);
            }
        }
    });

    // 初始化 TomSelect
    $effect(() => {
        if (roleSelectEl && !tomselect) {
            tomselect = new TomSelect(roleSelectEl, {
                plugins: ['remove_button'],
                onChange: (value: string | string[]) => {
                    // 當使用者在 UI 上操作時，同步回 Svelte 的 state
                    role = Array.isArray(value) ? value : [value];
                }
            });

            // 初始化時賦予當前 state 的值
            tomselect.setValue(role, true);

            // 返回一個清理函式，當元件銷毀時，銷毀 TomSelect 實例
            return () => {
                if (tomselect) {
                    tomselect.destroy();
                    tomselect = null;
                }
            };
        }
    });
</script>

<form method="POST" class="mt-4">
    {#if formError}
        <div class="alert alert-danger" role="alert">
            {formError}
        </div>
    {/if}

    <div class="mb-3">
        <label for="name" class="form-label">姓名 (Name)</label>
        <input
            type="text"
            id="name"
            name="name"
            class="form-control"
            bind:value={name}
            required
            placeholder="請輸入使用者姓名"
        />
        {#if formErrors?.name}
            <div class="text-danger mt-1">
                <small>{formErrors.name}</small>
            </div>
        {/if}
    </div>

    <div class="mb-3">
        <label for="email" class="form-label">電子郵件 (Email)</label>
        <input
            type="email"
            id="email"
            name="email"
            class="form-control"
            bind:value={email}
            required
            placeholder="user@example.com"
        />
        {#if formErrors?.email}
            <div class="text-danger mt-1">
                <small>{formErrors.email}</small>
            </div>
        {/if}
    </div>

    <div class="mb-3">
        <label for="department" class="form-label">部門 (Department)</label>
        <input
            type="text"
            id="department"
            name="department"
            class="form-control"
            bind:value={department}
            placeholder="請輸入部門名稱"
        />
        {#if formErrors?.department}
            <div class="text-danger mt-1">
                <small>{formErrors.department}</small>
            </div>
        {/if}
    </div>

    <div class="mb-3">
        <label for="role" class="form-label">角色 (Role)</label>
        <select id="role" name="role" bind:this={roleSelectEl} multiple>
            <option value="user">一般使用者 (User)</option>
            <option value="admin">管理員 (Admin)</option>
        </select>
        {#if formErrors?.role}
            <div class="text-danger mt-1">
                <small>{formErrors.role}</small>
            </div>
        {/if}
    </div>

    {#if !isEditing}
        <div class="mb-3">
            <label for="password" class="form-label">密碼 (Password)</label>
            <input
                type="password"
                id="password"
                name="password"
                class="form-control"
                required
            />
            {#if formErrors?.password}
                <div class="text-danger mt-1">
                    <small>{formErrors.password}</small>
                </div>
            {/if}
        </div>

        <div class="mb-3">
            <label for="passwordConfirm" class="form-label">確認密碼 (Confirm Password)</label>
            <input
                type="password"
                id="passwordConfirm"
                name="passwordConfirm"
                class="form-control"
                required
            />
            {#if formErrors?.passwordConfirm}
                <div class="text-danger mt-1">
                    <small>{formErrors.passwordConfirm}</small>
                </div>
            {/if}
        </div>
    {/if}

    <hr />

    <div class="d-flex justify-content-end">
        <button type="button" class="btn btn-secondary me-2" onclick={onCancel}>
            <i class="mdi mdi-close me-2"></i>
            取消
        </button>
        <button type="submit" class="btn btn-primary">
            <i class="mdi mdi-check me-2"></i>
            {isEditing ? '更新使用者' : '建立使用者'}
        </button>
    </div>
</form>
