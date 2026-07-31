<script>
  import { t } from "../../lib/i18n.svelte.js";
  import { buildVisualizerDocument } from "../../lib/utils/html-utils.js";

  /** @type {{content: string, onopenpanel?: (srcdoc: string) => void}} */
  let { content, onopenpanel = () => {} } = $props();

  let iframeSrcDoc = $derived(buildVisualizerDocument(content));

  function openInPanel() {
    onopenpanel(iframeSrcDoc);
  }
</script>

<div class="bds-visualizer-card">
  <header class="bds-visualizer-header">
    <div class="bds-visualizer-header-left">
      <h4>{t('visualizerCard.title')}</h4>
      <p>{t('visualizerCard.subtitle')}</p>
    </div>
    <button class="bds-visualizer-panel-btn" onclick={openInPanel} title={t('visualizerCard.openInPanel')}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 3 21 3 21 9"></polyline>
        <line x1="10" y1="14" x2="21" y2="3"></line>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path>
      </svg>
      {t('visualizerCard.openInPanel')}
    </button>
  </header>

  <div class="bds-visualizer-body">
    <iframe
      class="bds-visualizer-frame"
      title={t('visualizerCard.title')}
      sandbox="allow-scripts allow-forms"
      srcdoc={iframeSrcDoc}
    ></iframe>
  </div>
</div>

<style>
  .bds-visualizer-card {
    border: 1px solid #000;
    border-radius: 4px;
    background: #fff;
    padding: 12px;
    margin: 10px 0;
    font-family: inherit;
    color: #000;
    height: 600px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .bds-visualizer-header {
    margin-bottom: 8px;
    border-bottom: 1px solid #000;
    padding-bottom: 4px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .bds-visualizer-header-left {
    min-width: 0;
  }

  .bds-visualizer-header-left h4 {
    margin: 0;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    color: #1e3a8a;
    letter-spacing: 0.05em;
  }

  .bds-visualizer-header-left p {
    margin: 0;
    font-size: 10px;
    color: #666;
  }

  .bds-visualizer-panel-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border: 1px solid var(--bds-border, #d1d5db);
    border-radius: 6px;
    background: transparent;
    color: var(--bds-text-primary, #000);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: all 0.15s;
  }

  .bds-visualizer-panel-btn:hover {
    background: var(--bds-bg-hover, rgba(0,0,0,0.05));
    border-color: var(--bds-accent, #1e3a8a);
    color: var(--bds-accent, #1e3a8a);
  }

  .bds-visualizer-body {
    flex-grow: 1;
    overflow: hidden;
  }

  .bds-visualizer-frame {
    width: 100%;
    height: 100%;
    border: 1px solid #000;
    background: #fff;
    display: block;
    overflow: hidden;
  }

  .bds-visualizer-frame::-webkit-scrollbar {
    display: none;
  }

  :global(.dark) .bds-visualizer-card {
    background: #111;
    border-color: #444;
  }

  :global(.dark) .bds-visualizer-panel-btn {
    border-color: #444;
    color: var(--bds-text-primary, #ececec);
  }

  :global(.dark) .bds-visualizer-panel-btn:hover {
    background: rgba(255,255,255,0.08);
  }
</style>