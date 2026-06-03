<script lang="ts">
    import { browser } from '$app/environment';
    import { onMount } from 'svelte';

    let {
        value = $bindable(''),
        syncKey = 0,
        placeholder = '請輸入內容...'
    } = $props<{
        value?: string;
        syncKey?: number;
        placeholder?: string;
    }>();

    let editorElement: HTMLDivElement;
    let quill = $state<any>(null);
    let isSyncingFromEditor = $state(false);
    let lastSyncedValue = '';
    let lastSyncKey = 0;
    let isMounted = false;

    const toolbarOptions = [
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link'],
        ['clean']
    ];

    function normalizeEditorValue(nextValue?: string) {
        return nextValue || '';
    }

    function syncEditorFromValue(force = false) {
        if (!quill || isSyncingFromEditor) return;

        const nextValue = normalizeEditorValue(value);
        if (!force && lastSyncedValue === nextValue && lastSyncKey === syncKey) return;

        lastSyncedValue = nextValue;
        lastSyncKey = syncKey;

        quill.setText('', 'silent');
        if (nextValue) {
            quill.clipboard.dangerouslyPasteHTML(0, nextValue, 'silent');
        }
    }

    onMount(() => {
        if (!browser) return;
        isMounted = true;

        (async () => {
            await import('quill/dist/quill.snow.css');
            const { default: Quill } = await import('quill');

            if (!isMounted || !editorElement) return;

            quill = new Quill(editorElement, {
                theme: 'snow',
                placeholder,
                modules: {
                    toolbar: toolbarOptions
                }
            });

            lastSyncedValue = normalizeEditorValue(value);
            lastSyncKey = syncKey;
            syncEditorFromValue(true);
            quill.on('text-change', () => {
                isSyncingFromEditor = true;
                value = quill.root.innerHTML;
                lastSyncedValue = value;
                isSyncingFromEditor = false;
            });
        })();

        return () => {
            isMounted = false;
            quill = null;
        };
    });

    $effect(() => {
        value;
        syncKey;
        quill;
        syncEditorFromValue();
    });
</script>

<div class="rich-text-editor">
    <div bind:this={editorElement}></div>
</div>

<style>
    .rich-text-editor :global(.ql-editor) {
        min-height: 180px;
        font-size: 1rem;
    }

    .rich-text-editor :global(.ql-toolbar),
    .rich-text-editor :global(.ql-container) {
        border-color: #dee2e6;
    }
</style>
