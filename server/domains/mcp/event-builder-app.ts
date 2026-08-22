export const eventBuilderAppResourceUri = 'ui://codex-events/event-builder-analysis-v1.html'

export const eventBuilderAppHtml = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, sans-serif; }
      body { margin: 0; padding: 16px; background: transparent; color: CanvasText; }
      main { display: grid; gap: 14px; }
      header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
      h1 { margin: 0; font-size: 16px; font-weight: 650; }
      #score { font-size: 28px; font-weight: 720; font-variant-numeric: tabular-nums; }
      #band { color: color-mix(in srgb, CanvasText 65%, transparent); font-size: 13px; }
      .meters { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .meter { display: grid; gap: 5px; }
      .label { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; }
      progress { width: 100%; height: 7px; accent-color: #10b981; }
      ul { margin: 0; padding-left: 18px; display: grid; gap: 6px; font-size: 13px; line-height: 1.4; }
      .empty { color: color-mix(in srgb, CanvasText 60%, transparent); font-size: 13px; }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <h1>Event balance</h1>
          <div id="band">Waiting for analysis</div>
        </div>
        <div id="score">—</div>
      </header>
      <section class="meters" id="meters"></section>
      <section>
        <ul id="tips"></ul>
        <div id="empty" class="empty">Run the builder analysis to preview recommendations.</div>
      </section>
    </main>
    <script>
      const meterLabels = {
        focusBudget: 'Focus budget',
        energyCurve: 'Energy curve',
        boredomRisk: 'Boredom risk',
        returnIntent: 'Return intent'
      };

      function render(payload) {
        const analysis = payload?.data?.analysis;
        if (!analysis) return;

        document.getElementById('score').textContent = String(analysis.score);
        document.getElementById('band').textContent = analysis.band?.label ?? '';
        document.getElementById('meters').replaceChildren(...Object.entries(meterLabels).map(([key, label]) => {
          const value = Number(analysis.breakdown?.[key] ?? 0);
          const wrapper = document.createElement('div');
          wrapper.className = 'meter';
          const caption = document.createElement('div');
          caption.className = 'label';
          const name = document.createElement('span');
          name.textContent = label;
          const amount = document.createElement('span');
          amount.textContent = String(value);
          caption.append(name, amount);
          const progress = document.createElement('progress');
          progress.max = 100;
          progress.value = Math.max(0, Math.min(100, value));
          wrapper.append(caption, progress);
          return wrapper;
        }));

        const tips = Array.isArray(analysis.tips) ? analysis.tips : [];
        document.getElementById('tips').replaceChildren(...tips.map((tip) => {
          const item = document.createElement('li');
          item.textContent = String(tip?.message ?? '');
          return item;
        }));
        document.getElementById('empty').hidden = tips.length > 0;
      }

      window.addEventListener('message', (event) => {
        if (event.source !== window.parent) return;
        const message = event.data;
        if (!message || message.jsonrpc !== '2.0') return;
        if (message.method === 'ui/notifications/tool-result') {
          render(message.params?.structuredContent);
        }
      }, { passive: true });
    </script>
  </body>
</html>
`.trim()
