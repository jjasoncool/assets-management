import 'viewerjs/dist/viewer.css';

/**
 * 圖片檢視器 Svelte Action (整合 Viewer.js)
 * 用法: <div use:imageViewer={{ 參數選項 }}> <img src="..." /> </div>
 */
export const imageViewer = (node: HTMLElement, options?: any) => {
    let viewer: any;

    // 動態載入 Viewer.js，避免 SvelteKit 在 Server 端渲染 (SSR) 時發生 window is not defined 錯誤
    import('viewerjs').then(({ default: Viewer }) => {
        viewer = new Viewer(node, {
            zIndex: 1060, // 確保高於 Bootstrap Modal 的 1055
            navbar: true, // 顯示下方縮圖導覽
            title: false, // 隱藏預設的圖片標題
            tooltip: true, // 顯示縮放比例提示

            // --- 拖曳與縮放設定 ---
            movable: true, // 確保允許拖曳
            zoomable: true, // 允許縮放
            rotatable: true, // 允許旋轉

            // --- 關閉翻轉功能 ---
            scalable: false, // 停用水平/垂直翻轉的核心邏輯

            // --- 自訂下方工具列 ---
            // 數字代表按鈕大小 (1: 顯示, 0: 隱藏)
            toolbar: {
                zoomIn: 1,       // 放大
                zoomOut: 1,      // 縮小
                oneToOne: 1,     // 1:1 實際大小
                reset: 1,        // 重置
                prev: 1,         // 上一張
                play: 0,         // (隱藏) 自動播放
                next: 1,         // 下一張
                rotateLeft: 1,   // 向左旋轉
                rotateRight: 1,  // 向右旋轉
                flipHorizontal: 0, // (隱藏) 水平翻轉
                flipVertical: 0,   // (隱藏) 垂直翻轉
            },

            ...options // 允許外部傳入設定覆蓋預設值
        });
    });

    return {
        // 當 DOM 被銷毀時，同時銷毀 Viewer 實例釋放記憶體
        destroy() {
            if (viewer) {
                viewer.destroy();
            }
        }
    };
};
