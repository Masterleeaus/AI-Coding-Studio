<script>
  import { onMount, onDestroy } from "svelte";
  import { t } from "../../lib/i18n.svelte.js";
  import { triggerTextDownload } from "../../lib/utils/download.js";

  let { visible = false, title = "", content = "", onclose } = $props();

  let panelWidth = $state(520);
  let isDragging = $state(false);

  let dragCleanup = null;

  function handleMouseDown(e) {
    e.preventDefault();
    isDragging = true;
    const startX = e.clientX;
    const startWidth = panelWidth;

    function onMove(e) {
      const delta = e.clientX - startX;
      panelWidth = Math.min(Math.max(startWidth - delta, 300), window.innerWidth * 0.8);
    }

    function onUp() {
      isDragging = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mouseleave', onUp);
    }

    dragCleanup = onUp;

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mouseleave', onUp);
  }

  function handleDownload() {
    const name = (title || "preview").replace(/[<>:"|?*]/g, "_");
    triggerTextDownload(content, `${name}.html`);
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') close();
  }

  function close() {
    if (onclose) onclose();
  }

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) close();
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
    if (dragCleanup) dragCleanup();
  });
</script>

{#if visible}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="bds-preview-backdrop" onclick={onBackdropClick} role="presentation">
    <div class="bds-preview-panel" style="width: {panelWidth}px" role="dialog" class:bds-dragging={isDragging}>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="bds-preview-resize-handle" onmousedown={handleMouseDown}></div>
      <div class="bds-preview-header">
        <h3 class="bds-preview-title">{title}</h3>
        <div class="bds-preview-header-actions">
          <button class="bds-preview-btn" onclick={handleDownload} aria-label={t('previewPanel.download')} title={t('previewPanel.download')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
          <button class="bds-preview-close" onclick={close} aria-label={t('previewPanel.close')}>✕</button>
        </div>
      </div>
      <div class="bds-preview-body">
        <iframe
          class="bds-preview-frame"
          sandbox="allow-scripts allow-forms"
          srcdoc={content}
          title={title}
        ></iframe>
      </div>
    </div>
  </div>
{/if}

<style>
  .bds-preview-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2147483645;
    background: transparent;
    pointer-events: auto;
  }

  .bds-preview-panel {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    max-height: 100vh;
    background: var(--bds-bg-panel);
    border-left: 1px solid var(--bds-border);
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    z-index: 2147483646;
    animation: bdsPreviewSlideIn 0.2s ease-out;
  }

  @keyframes bdsPreviewSlideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  .bds-preview-resize-handle {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 8px;
    margin-left: -4px;
    cursor: ew-resize;
    background: transparent;
    transition: background 0.15s;
    z-index: 1;
    user-select: none;
    -webkit-user-select: none;
  }

  .bds-preview-resize-handle:hover,
  .bds-preview-resize-handle:active {
    background: var(--bds-accent);
  }

  .bds-dragging {
    user-select: none !important;
    -webkit-user-select: none !important;
    pointer-events: none;
  }

  .bds-dragging .bds-preview-resize-handle {
    pointer-events: auto;
  }

  .bds-dragging .bds-preview-btn,
  .bds-dragging .bds-preview-close {
    pointer-events: auto;
  }

  .bds-preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--bds-border);
    flex-shrink: 0;
  }

  .bds-preview-title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--bds-text-primary);
  }

  .bds-preview-header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .bds-preview-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--bds-text-tertiary);
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .bds-preview-btn:hover {
    background: var(--bds-bg-hover);
    color: var(--bds-accent);
  }

  .bds-preview-close {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--bds-text-tertiary);
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .bds-preview-close:hover {
    background: var(--bds-bg-hover);
    color: var(--bds-text-primary);
  }

  .bds-preview-body {
    flex-grow: 1;
    overflow: hidden;
  }

  .bds-preview-frame {
    width: 100%;
    height: 100%;
    border: none;
    background: #fff;
  }

  :global(.dark) .bds-preview-panel {
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.4);
  }
</style>
