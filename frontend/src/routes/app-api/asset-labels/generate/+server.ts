import { json, type RequestHandler } from '@sveltejs/kit';
import {
    assetLabelTemplateInfo,
    generateAssetLabelDocx,
    getAssetsForLabels,
    markAssetLabelsPrinted
} from '$lib/server/services/assetLabelService';
import { logger } from '$lib/utils/logger';

type GenerateAssetLabelsPayload = {
    assetIds?: unknown;
    startSlot?: unknown;
};

const getDownloadFileName = () => {
    const now = new Date();
    const timestamp = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0')
    ].join('');

    return `資產標籤_${timestamp}.docx`;
};

const encodeContentDispositionFileName = (fileName: string) => {
    return `attachment; filename="asset-labels.docx"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
};

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: GenerateAssetLabelsPayload;
    try {
        payload = await request.json();
    } catch {
        return json({ error: '請求格式錯誤' }, { status: 400 });
    }

    const assetIds = Array.isArray(payload.assetIds)
        ? payload.assetIds.map((id) => String(id)).filter(Boolean)
        : [];
    const startSlot = Number(payload.startSlot || 1);
    const labelsPerTemplate = assetLabelTemplateInfo.labelsPerTemplate;

    if (assetIds.length === 0) {
        return json({ error: '請先選擇至少一筆資產' }, { status: 400 });
    }

    if (!Number.isInteger(startSlot) || startSlot < 1 || startSlot > labelsPerTemplate) {
        return json({ error: `起始格必須是 1 到 ${labelsPerTemplate} 的整數` }, { status: 400 });
    }

    const availableSlots = labelsPerTemplate - startSlot + 1;
    if (assetIds.length > availableSlots) {
        return json(
            { error: `從第 ${startSlot} 格開始，這份樣板最多只能放 ${availableSlots} 筆資產。請減少選取數量或改成第 1 格開始。` },
            { status: 400 }
        );
    }

    try {
        const assets = await getAssetsForLabels(locals.pb, assetIds);
        if (assets.length !== assetIds.length) {
            return json({ error: '部分資產不存在或無權限讀取，請重新整理後再試' }, { status: 400 });
        }

        const docxBuffer = await generateAssetLabelDocx(assets, startSlot);
        await markAssetLabelsPrinted(locals.pb, assetIds);
        const fileName = getDownloadFileName();

        return new Response(docxBuffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': encodeContentDispositionFileName(fileName),
                'Cache-Control': 'no-store'
            }
        });
    } catch (err) {
        logger.error('[API/AssetLabels] Generate docx failed.', err);
        return json({ error: '產生資產標籤 Word 失敗，請稍後再試' }, { status: 500 });
    }
};
