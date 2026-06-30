import fs from 'node:fs/promises';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';
import type PocketBase from 'pocketbase';
import type { Asset } from '$lib/types';
import { logger } from '$lib/utils/logger';

const LABELS_PER_TEMPLATE = 40;

const TEMPLATE_PATH = process.env.ASSET_LABEL_TEMPLATE_PATH || path.join(
    process.cwd(),
    'templates',
    'asset-labels',
    '財產標籤列印樣板-40.docx'
);

type ZipEntry = {
    name: string;
    method: number;
    flags: number;
    crc32: number;
    compressedSize: number;
    uncompressedSize: number;
    localHeaderOffset: number;
    data: Buffer;
};

export type AssetLabelSlot = {
    assetId: string;
    computerNo: string;
    brand: string;
    model: string;
    buyDate: string;
    qrString: string;
};

const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
        let c = i;
        for (let k = 0; k < 8; k += 1) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c >>> 0;
    }
    return table;
})();

function crc32(buffer: Buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) {
        crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function findEndOfCentralDirectory(buffer: Buffer) {
    const minOffset = Math.max(0, buffer.length - 0xffff - 22);
    for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
        if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
    }
    throw new Error('找不到 docx zip 中央目錄結尾');
}

function readZipEntries(buffer: Buffer): ZipEntry[] {
    const eocdOffset = findEndOfCentralDirectory(buffer);
    const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
    const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
    const entries: ZipEntry[] = [];

    let offset = centralDirectoryOffset;
    for (let i = 0; i < totalEntries; i += 1) {
        if (buffer.readUInt32LE(offset) !== 0x02014b50) {
            throw new Error('docx zip 中央目錄格式不正確');
        }

        const flags = buffer.readUInt16LE(offset + 8);
        const method = buffer.readUInt16LE(offset + 10);
        const entryCrc32 = buffer.readUInt32LE(offset + 16);
        const compressedSize = buffer.readUInt32LE(offset + 20);
        const uncompressedSize = buffer.readUInt32LE(offset + 24);
        const fileNameLength = buffer.readUInt16LE(offset + 28);
        const extraLength = buffer.readUInt16LE(offset + 30);
        const commentLength = buffer.readUInt16LE(offset + 32);
        const localHeaderOffset = buffer.readUInt32LE(offset + 42);
        const name = buffer.subarray(offset + 46, offset + 46 + fileNameLength).toString('utf8');

        if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
            throw new Error(`docx zip local header 格式不正確: ${name}`);
        }

        const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
        const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
        const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
        const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);
        let data: Buffer;

        if (method === 0) {
            data = Buffer.from(compressedData);
        } else if (method === 8) {
            data = inflateRawSync(compressedData);
        } else {
            throw new Error(`不支援的 docx zip 壓縮方式 (${method}): ${name}`);
        }

        entries.push({
            name,
            method,
            flags,
            crc32: entryCrc32,
            compressedSize,
            uncompressedSize,
            localHeaderOffset,
            data
        });

        offset += 46 + fileNameLength + extraLength + commentLength;
    }

    return entries;
}

function writeZipEntries(entries: ZipEntry[]) {
    const localParts: Buffer[] = [];
    const centralParts: Buffer[] = [];
    let offset = 0;

    for (const entry of entries) {
        const nameBuffer = Buffer.from(entry.name, 'utf8');
        const data = entry.data;
        const entryCrc32 = crc32(data);

        const localHeader = Buffer.alloc(30);
        localHeader.writeUInt32LE(0x04034b50, 0);
        localHeader.writeUInt16LE(20, 4);
        localHeader.writeUInt16LE(0x0800, 6);
        localHeader.writeUInt16LE(0, 8);
        localHeader.writeUInt16LE(0, 10);
        localHeader.writeUInt16LE(0, 12);
        localHeader.writeUInt32LE(entryCrc32, 14);
        localHeader.writeUInt32LE(data.length, 18);
        localHeader.writeUInt32LE(data.length, 22);
        localHeader.writeUInt16LE(nameBuffer.length, 26);
        localHeader.writeUInt16LE(0, 28);

        localParts.push(localHeader, nameBuffer, data);

        const centralHeader = Buffer.alloc(46);
        centralHeader.writeUInt32LE(0x02014b50, 0);
        centralHeader.writeUInt16LE(20, 4);
        centralHeader.writeUInt16LE(20, 6);
        centralHeader.writeUInt16LE(0x0800, 8);
        centralHeader.writeUInt16LE(0, 10);
        centralHeader.writeUInt16LE(0, 12);
        centralHeader.writeUInt16LE(0, 14);
        centralHeader.writeUInt32LE(entryCrc32, 16);
        centralHeader.writeUInt32LE(data.length, 20);
        centralHeader.writeUInt32LE(data.length, 24);
        centralHeader.writeUInt16LE(nameBuffer.length, 28);
        centralHeader.writeUInt16LE(0, 30);
        centralHeader.writeUInt16LE(0, 32);
        centralHeader.writeUInt16LE(0, 34);
        centralHeader.writeUInt16LE(0, 36);
        centralHeader.writeUInt32LE(0, 38);
        centralHeader.writeUInt32LE(offset, 42);

        centralParts.push(centralHeader, nameBuffer);
        offset += localHeader.length + nameBuffer.length + data.length;
    }

    const centralDirectoryOffset = offset;
    const centralDirectory = Buffer.concat(centralParts);
    const centralDirectorySize = centralDirectory.length;

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(entries.length, 8);
    eocd.writeUInt16LE(entries.length, 10);
    eocd.writeUInt32LE(centralDirectorySize, 12);
    eocd.writeUInt32LE(centralDirectoryOffset, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([...localParts, centralDirectory, eocd]);
}

function escapeXml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function formatDate(value?: string) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.split('T')[0]?.split(' ')[0] || '';

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
    ].join('-');
}

function sanitizeBrandForLabel(value?: string) {
    return (value || '').replace(/[^a-zA-Z0-9]/g, '');
}

function normalizeAssetRecord(asset: Asset): AssetLabelSlot {
    const computerNo = asset.asset_id || '';
    const brand = sanitizeBrandForLabel(asset.brand);

    return {
        assetId: asset.id,
        computerNo,
        brand,
        model: asset.model || '',
        buyDate: formatDate(asset.purchase_date),
        qrString: computerNo === '' && brand === '' ? '' : `${computerNo}|${brand}`
    };
}

function setQrFieldCode(fieldXml: string, value: string) {
    const escaped = escapeXml(value);

    let replaced = false;
    return fieldXml.replace(
        /<w:instrText(?:\s+xml:space="preserve")?>[\s\S]*?<\/w:instrText>/g,
        (instrText) => {
            if (replaced) return instrText.replace(/(<w:instrText(?:\s+xml:space="preserve")?>)[\s\S]*?(<\/w:instrText>)/, '$1$2');
            replaced = true;
            return instrText.replace(
                /(<w:instrText(?:\s+xml:space="preserve")?>)[\s\S]*?(<\/w:instrText>)/,
                `$1 DISPLAYBARCODE "${escaped}" QR \\s 55 \\h 1 $2`
            );
        }
    );
}

function getFieldType(fieldXml: string): keyof AssetLabelSlot | 'next' | null {
    if (fieldXml.includes(' NEXT ')) return 'next';
    if (fieldXml.includes('MERGEBARCODE') && fieldXml.includes('QRString')) return 'qrString';
    if (fieldXml.includes('MERGEFIELD') && fieldXml.includes('電腦編號')) return 'computerNo';
    if (fieldXml.includes('MERGEFIELD') && fieldXml.includes('BuyDate')) return 'buyDate';
    if (fieldXml.includes('MERGEFIELD') && fieldXml.includes('品牌')) return 'brand';
    if (fieldXml.includes('MERGEFIELD') && fieldXml.includes('型號')) return 'model';
    return null;
}

function replaceFieldDisplay(fieldXml: string, value: string) {
    const escaped = escapeXml(value);
    const textRegex = /<w:t(?:\s+xml:space="preserve")?>[\s\S]*?<\/w:t>/g;
    const textMatches = fieldXml.match(textRegex) || [];
    if (textMatches.length === 0) return fieldXml;

    let replaced = false;
    return fieldXml.replace(textRegex, (match) => {
        if (replaced) return match.replace(/(<w:t(?:\s+xml:space="preserve")?>)[\s\S]*?(<\/w:t>)/, '$1$2');
        replaced = true;
        return match.replace(/(<w:t(?:\s+xml:space="preserve")?>)[\s\S]*?(<\/w:t>)/, `$1${escaped}$2`);
    });
}

function getRunProperties(fieldXml: string) {
    const match = fieldXml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
    return match?.[0] || '';
}

function createTextRun(fieldXml: string, value: string) {
    const escaped = escapeXml(value);
    const runProperties = getRunProperties(fieldXml);
    const preserveSpace = /^\s|\s$/.test(value) ? ' xml:space="preserve"' : '';
    return `<w:r>${runProperties}<w:t${preserveSpace}>${escaped}</w:t></w:r>`;
}

function findFieldEnd(documentXml: string, beginOffset: number) {
    const endMarker = '<w:fldChar w:fldCharType="end"/>';
    const endMarkerOffset = documentXml.indexOf(endMarker, beginOffset);
    if (endMarkerOffset === -1) return -1;

    const runEndOffset = documentXml.indexOf('</w:r>', endMarkerOffset);
    if (runEndOffset === -1) return -1;

    return runEndOffset + '</w:r>'.length;
}

function findFieldStart(documentXml: string, beginOffset: number) {
    let offset = beginOffset;

    while (offset >= 0) {
        const runStartOffset = documentXml.lastIndexOf('<w:r', offset);
        if (runStartOffset === -1) return -1;

        const nextCharacter = documentXml[runStartOffset + '<w:r'.length];
        if (nextCharacter === '>' || nextCharacter === ' ') {
            return runStartOffset;
        }

        offset = runStartOffset - 1;
    }

    return -1;
}

function buildReplacementField(fieldXml: string, fieldKey: keyof AssetLabelSlot, value: string) {
    if (fieldKey !== 'qrString' || value === '') {
        const displayValue = fieldKey === 'model' && value ? `(${value})` : value;
        return createTextRun(fieldXml, displayValue);
    }

    return replaceFieldDisplay(setQrFieldCode(fieldXml, value), value);
}

function replaceComplexFields(documentXml: string, slots: AssetLabelSlot[]) {
    let slotIndex = 0;
    let cursor = 0;
    let output = '';

    while (cursor < documentXml.length) {
        const beginMarkerOffset = documentXml.indexOf('<w:fldChar w:fldCharType="begin"/>', cursor);
        if (beginMarkerOffset === -1) {
            output += documentXml.slice(cursor);
            break;
        }

        const fieldStartOffset = findFieldStart(documentXml, beginMarkerOffset);
        const fieldEndOffset = findFieldEnd(documentXml, beginMarkerOffset);

        if (fieldStartOffset === -1 || fieldEndOffset === -1 || fieldStartOffset < cursor) {
            output += documentXml.slice(cursor, beginMarkerOffset + 1);
            cursor = beginMarkerOffset + 1;
            continue;
        }

        const fieldXml = documentXml.slice(fieldStartOffset, fieldEndOffset);
        output += documentXml.slice(cursor, fieldStartOffset);
        const fieldType = getFieldType(fieldXml);

        if (fieldType === 'next') {
            slotIndex += 1;
        } else if (fieldType) {
            const slot = slots[slotIndex] || createBlankSlot();
            const value = String(slot[fieldType] || '');

            output += buildReplacementField(fieldXml, fieldType, value);
        } else {
            output += fieldXml;
        }

        cursor = fieldEndOffset;
    }

    return output;
}

function isBlankSlot(slot?: AssetLabelSlot) {
    if (!slot) return true;
    return [slot.assetId, slot.computerNo, slot.brand, slot.model, slot.buyDate, slot.qrString].every((value) => value === '');
}

function createBlankTableCell(cellXml: string) {
    const tableCellProperties = cellXml.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/)?.[0] || '';
    return `<w:tc>${tableCellProperties}<w:p/></w:tc>`;
}

function clearBlankLabelCells(documentXml: string, slots: AssetLabelSlot[]) {
    let labelCellIndex = 0;

    return documentXml.replace(/<w:tc>[\s\S]*?<\/w:tc>/g, (cellXml) => {
        if (!cellXml.includes('<w:drawing>') || labelCellIndex >= LABELS_PER_TEMPLATE) {
            return cellXml;
        }

        const slot = slots[labelCellIndex];
        labelCellIndex += 1;

        return isBlankSlot(slot) ? createBlankTableCell(cellXml) : cellXml;
    });
}

function ensureUpdateFields(settingsXml: string) {
    if (settingsXml.includes('<w:updateFields')) return settingsXml;

    return settingsXml.replace(
        '</w:settings>',
        '<w:updateFields w:val="true"/></w:settings>'
    );
}

function createBlankSlot(): AssetLabelSlot {
    return {
        assetId: '',
        computerNo: '',
        brand: '',
        model: '',
        buyDate: '',
        qrString: ''
    };
}

export function createAssetLabelSlots(assets: Asset[], startSlot: number) {
    const normalizedStartSlot = Math.min(Math.max(startSlot, 1), LABELS_PER_TEMPLATE);
    const blankCount = normalizedStartSlot - 1;
    const slots = [
        ...Array.from({ length: blankCount }, createBlankSlot),
        ...assets.map(normalizeAssetRecord)
    ];

    return slots.slice(0, LABELS_PER_TEMPLATE);
}

export async function getAssetsForLabels(pb: PocketBase, assetIds: string[]) {
    if (assetIds.length === 0) return [];

    const filter = assetIds.map((id) => `id = "${id.replace(/"/g, '\\"')}"`).join(' || ');
    const records = await pb.collection('assets').getFullList<Asset>({
        filter: `(${filter})`,
        batch: 500,
        expand: 'category,assigned_to'
    });

    const recordMap = new Map(records.map((asset) => [asset.id, asset]));
    return assetIds.map((id) => recordMap.get(id)).filter(Boolean) as Asset[];
}

export async function generateAssetLabelDocx(assets: Asset[], startSlot: number) {
    const slots = createAssetLabelSlots(assets, startSlot);
    const templateBuffer = await fs.readFile(TEMPLATE_PATH);
    const entries = readZipEntries(templateBuffer);

    for (const entry of entries) {
        if (entry.name === 'word/document.xml') {
            const documentXml = entry.data.toString('utf8');
            const replacedDocumentXml = replaceComplexFields(documentXml, slots);
            entry.data = Buffer.from(clearBlankLabelCells(replacedDocumentXml, slots), 'utf8');
        }

        if (entry.name === 'word/settings.xml') {
            const settingsXml = entry.data.toString('utf8');
            entry.data = Buffer.from(ensureUpdateFields(settingsXml), 'utf8');
        }
    }

    logger.info(`[AssetLabel] Generated docx with ${assets.length} assets from slot ${startSlot}.`);
    return writeZipEntries(entries);
}

export const assetLabelTemplateInfo = {
    labelsPerTemplate: LABELS_PER_TEMPLATE,
    templatePath: TEMPLATE_PATH
};
