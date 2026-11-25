/* ==================================================================
   Rich text for lesson content.
   - RichText.editor(host, html, { onChange }) → toolbar + editable area
     (undo/redo · bold/italic · image/video/audio · link/unlink ·
     full screen · align · text direction · indent · lists · table).
     Returns { getHtml(), setHtml(html), focus() }.
   - RichText.sanitize(html) → the only HTML allowed into the page.
   - RichText.fromMarkdown(text) → converts older **bold** / # / - content.
   - RichText.toPlain(html) → plain-text copy (search, summaries).
   ================================================================== */
const RichText = (() => {
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ALLOWED = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'A', 'IMG', 'VIDEO', 'AUDIO', 'SOURCE', 'IFRAME', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'BLOCKQUOTE', 'DIV', 'SPAN', 'FIGURE', 'FIGCAPTION', 'HR', 'CODE', 'PRE', 'SUB', 'SUP']);
  const safeUrl = (url, media) => { const u = String(url || '').trim(); if (/^https?:\/\//i.test(u)) return u; if (media && /^data:(image|audio|video)\/[a-z0-9.+-]+;base64,/i.test(u)) return u; if (!media && /^mailto:/i.test(u)) return u; return ''; };
  const youTube = url => { const m = String(url || '').match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i); return m ? m[1] : ''; };

  function sanitize(html) {
    if (typeof DOMParser === 'undefined') return esc(html);
    const doc = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html');
    const clean = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === 3) return;
        if (child.nodeType !== 1) { child.remove(); return; }
        if (!ALLOWED.has(child.tagName)) { if (['SCRIPT', 'STYLE', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'LINK', 'META'].includes(child.tagName)) child.remove(); else { clean(child); child.replaceWith(...child.childNodes); } return; }
        const keep = {};
        const align = (child.getAttribute('style') || '').match(/text-align:\s*(left|right|center|justify)/i);
        if (align) keep.style = `text-align:${align[1].toLowerCase()}`;
        const dir = child.getAttribute('dir'); if (dir === 'rtl' || dir === 'ltr') keep.dir = dir;
        if (child.tagName === 'A') { const href = safeUrl(child.getAttribute('href')); if (href) { keep.href = href; keep.target = '_blank'; keep.rel = 'noopener'; } }
        if (['IMG', 'SOURCE', 'VIDEO', 'AUDIO'].includes(child.tagName)) { const src = safeUrl(child.getAttribute('src'), true); if (src) keep.src = src; if (child.tagName === 'IMG') keep.alt = (child.getAttribute('alt') || '').slice(0, 200); if (child.tagName !== 'IMG' && child.tagName !== 'SOURCE') keep.controls = ''; }
        if (child.tagName === 'IFRAME') { const id = youTube(child.getAttribute('src')); if (!id) { child.remove(); return; } keep.src = `https://www.youtube-nocookie.com/embed/${id}`; keep.allowfullscreen = ''; keep.loading = 'lazy'; keep.title = 'Video'; }
        if (['TD', 'TH'].includes(child.tagName)) ['colspan', 'rowspan'].forEach(a => { const n = Number(child.getAttribute(a)); if (n > 1 && n < 20) keep[a] = String(n); });
        [...child.attributes].forEach(a => child.removeAttribute(a.name));
        Object.entries(keep).forEach(([k, v]) => child.setAttribute(k, v));
        if (child.tagName === 'IMG' && !keep.src) { child.remove(); return; }
        clean(child);
      });
    };
    clean(doc.body);
    return doc.body.innerHTML;
  }
  function fromMarkdown(text) {
    const inline = line => esc(line).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
    const out = []; let list = null, kind = '', para = [];
    const flushPara = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; } };
    const flushList = () => { if (list) { out.push(`<${kind}>${list.map(i => `<li>${inline(i)}</li>`).join('')}</${kind}>`); list = null; } };
    String(text || '').split('\n').forEach(raw => {
      const line = raw.trim(), h = line.match(/^(#{1,3})\s+(.*)$/), ul = line.match(/^[-*•]\s+(.*)$/), ol = line.match(/^\d+[.)]\s+(.*)$/);
      if (!line) { flushPara(); flushList(); return; }
      if (h) { flushPara(); flushList(); out.push(`<h${h[1].length === 3 ? 3 : 2}>${inline(h[2])}</h${h[1].length === 3 ? 3 : 2}>`); return; }
      if (ul || ol) { flushPara(); const k = ul ? 'ul' : 'ol'; if (list && kind !== k) flushList(); kind = k; (list = list || []).push((ul || ol)[1]); return; }
      flushList(); para.push(line);
    });
    flushPara(); flushList();
    return out.join('');
  }
  function toPlain(html) {
    if (typeof DOMParser === 'undefined') return String(html || '').replace(/<[^>]+>/g, ' ');
    const doc = new DOMParser().parseFromString(`<body>${String(html || '').replace(/<\/(p|h\d|li|tr|div)>/gi, '$&\n').replace(/<br\s*\/?>/gi, '\n')}</body>`, 'text/html');
    return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  }
  /* What a content item renders as: its formatted HTML when it has some, otherwise its older text. */
  function itemHtml(item) { return item?.bodyHtml ? sanitize(item.bodyHtml) : fromMarkdown(item?.body || ''); }

  /* ---------- editor ---------- */
  const I = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  const ICON = {
    undo: I('M12.5 8c-2.65 0-5.05 1-6.9 2.6L2 7v9h9l-3.62-3.62A7.95 7.95 0 0 1 12.5 10c3.54 0 6.55 2.31 7.6 5.5l2.37-.78A10.02 10.02 0 0 0 12.5 8Z'),
    redo: I('M18.4 10.6A10.02 10.02 0 0 0 11.5 8C6.85 8 2.92 11.03 1.53 15.22l2.36.78A8 8 0 0 1 11.5 10c1.95 0 3.73.72 5.12 1.88L13 15.5h9v-9l-3.6 4.1Z'),
    bold: I('M15.6 10.8c.97-.67 1.65-1.77 1.65-2.8 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.41ZM10 6.5h3a1.5 1.5 0 0 1 0 3h-3v-3Zm3.5 9H10v-3h3.5a1.5 1.5 0 0 1 0 3Z'),
    italic: I('M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4h-8Z'),
    image: I('M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5Z'),
    video: I('M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm6 4v8l6-4-6-4Z'),
    audio: I('M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5.3-3a5.3 5.3 0 0 1-10.6 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-1.7Z'),
    link: I('M3.9 12a3.1 3.1 0 0 1 3.1-3.1h4V7H7a5 5 0 0 0 0 10h4v-1.9H7A3.1 3.1 0 0 1 3.9 12ZM8 13h8v-2H8v2Zm9-6h-4v1.9h4a3.1 3.1 0 0 1 0 6.2h-4V17h4a5 5 0 0 0 0-10Z'),
    unlink: I('M17 7h-4v1.9h4a3.1 3.1 0 0 1 2.6 4.78l1.46 1.46A5 5 0 0 0 17 7Zm-1 4h-2.19l2 2H16v-2ZM2 4.27l3.11 3.11A4.99 4.99 0 0 0 7 17h4v-1.9H7a3.1 3.1 0 0 1-1.27-5.93L7.73 11H8v2h2.27L13 15.73V17h1.27l4.01 4L19.55 19.73 3.27 3 2 4.27Z'),
    full: I('M7 14H5v5h5v-2H7v-3Zm-2-4h2V7h3V5H5v5Zm12 7h-3v2h5v-5h-2v3ZM14 5v2h3v3h2V5h-5Z'),
    left: I('M15 15H3v2h12v-2Zm0-8H3v2h12V7ZM3 13h18v-2H3v2Zm0 8h18v-2H3v2ZM3 3v2h18V3H3Z'),
    center: I('M7 15v2h10v-2H7Zm-4 6h18v-2H3v2Zm0-8h18v-2H3v2Zm4-6v2h10V7H7ZM3 3v2h18V3H3Z'),
    right: I('M3 21h18v-2H3v2Zm6-4h12v-2H9v2Zm-6-4h18v-2H3v2Zm6-4h12V7H9v2ZM3 3v2h18V3H3Z'),
    ltr: I('M9 10v5h2V4h2v11h2V4h2V2H9a4 4 0 0 0 0 8Zm12 8-4-4v3H5v2h12v3l4-4Z'),
    rtl: I('M10 10v5h2V4h2v11h2V4h2V2h-8a4 4 0 0 0 0 8Zm-2 7v-3l-4 4 4 4v-3h12v-2H8Z'),
    outdent: I('M11 17h10v-2H11v2Zm-8-5 4 4V8l-4 4Zm0 9h18v-2H3v2ZM3 3v2h18V3H3Zm8 6h10V7H11v2Zm0 4h10v-2H11v2Z'),
    indent: I('M3 21h18v-2H3v2ZM3 8v8l4-4-4-4Zm8 9h10v-2H11v2ZM3 3v2h18V3H3Zm8 6h10V7H11v2Zm0 4h10v-2H11v2Z'),
    ul: I('M4 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm0-6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm0 12a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM7 19h14v-2H7v2Zm0-6h14v-2H7v2Zm0-8v2h14V5H7Z'),
    ol: I('M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1Zm1-9h1V4H2v1h1v3Zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1Zm5-6v2h14V5H7Zm0 14h14v-2H7v2Zm0-6h14v-2H7v2Z'),
    table: I('M3 3h18v18H3V3Zm2 2v4h6V5H5Zm8 0v4h6V5h-6Zm-8 6v4h6v-4H5Zm8 0v4h6v-4h-6Zm-8 6v2h6v-2H5Zm8 0v2h6v-2h-6Z')
  };
  const GROUPS = [
    [['undo', 'Undo'], ['redo', 'Redo']],
    [['bold', 'Bold'], ['italic', 'Italic']],
    [['image', 'Insert image'], ['video', 'Insert video'], ['audio', 'Insert audio'], ['link', 'Insert link'], ['unlink', 'Remove link']],
    [['full', 'Full screen']],
    [['left', 'Align left'], ['center', 'Align centre'], ['right', 'Align right']],
    [['ltr', 'Left to right'], ['rtl', 'Right to left']],
    [['outdent', 'Decrease indent'], ['indent', 'Increase indent']],
    [['ul', 'Bulleted list'], ['ol', 'Numbered list']],
    [['table', 'Insert table']]
  ];
  const MAX_MEDIA = 1.5 * 1024 * 1024;
  const pickFile = accept => new Promise(resolve => { const input = document.createElement('input'); input.type = 'file'; input.accept = accept; input.onchange = () => resolve(input.files[0] || null); input.click(); });
  const readData = file => new Promise((resolve, reject) => { if (file.size > MAX_MEDIA) return reject(new Error('Files must be 1.5 MB or smaller.')); const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(new Error('That file could not be read.')); r.readAsDataURL(file); });
  /* Pictures are stored inside the page, so large ones are scaled down (longest side 1600px,
     then smaller if needed) and re-encoded until they fit, instead of being refused.
     Animated GIFs can't be re-encoded without losing the animation, so they keep the plain limit. */
  const IMAGE_TARGET = 900 * 1024;
  const dataBytes = url => Math.ceil((url.length - url.indexOf(',') - 1) * 3 / 4);
  async function readImage(file) {
    if (!/^image\//.test(file.type)) throw new Error('Choose an image file.');
    if (file.type === 'image/gif' || file.type === 'image/svg+xml' || file.size <= IMAGE_TARGET) {
      if (file.type === 'image/gif' && file.size > MAX_MEDIA) throw new Error('GIFs must be 1.5 MB or smaller. Use a PNG or JPG for larger pictures.');
      return readData(file);
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error('That image could not be opened.')); i.src = url; });
      let side = Math.min(1600, Math.max(img.naturalWidth, img.naturalHeight)), best = '';
      const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
      const webp = canvas.toDataURL && document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');
      for (let round = 0; round < 6; round++) {
        const scale = side / Math.max(img.naturalWidth, img.naturalHeight);
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        if (!webp) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); } // JPEG has no transparency
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        for (const q of [0.86, 0.74, 0.62]) { best = canvas.toDataURL(webp ? 'image/webp' : 'image/jpeg', q); if (dataBytes(best) <= IMAGE_TARGET) return best; }
        side = Math.round(side * 0.75);
      }
      if (best && dataBytes(best) <= MAX_MEDIA) return best;
      throw new Error('That image is too large even after shrinking it.');
    } finally { URL.revokeObjectURL(url); }
  }
  const ask = async (title, label, placeholder = '') => { if (typeof textInputDialog === 'function') return (await textInputDialog({ title, label, placeholder, confirmLabel: 'Insert' })) || ''; return prompt(label, '') || ''; };

  function editor(host, html, options = {}) {
    host.classList.add('rt');
    host.innerHTML = `<div class="rt-toolbar" role="toolbar" aria-label="Text formatting">${GROUPS.map(g => `<span class="rt-group">${g.map(([k, label]) => `<button type="button" class="rt-btn" data-rt="${k}" aria-label="${label}" title="${label}">${ICON[k]}</button>`).join('')}</span>`).join('')}</div><div class="rt-area" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true"></div><div class="rt-status"><span class="rt-path">p</span><span class="rt-count">0 words</span></div>`;
    const area = host.querySelector('.rt-area'), bar = host.querySelector('.rt-toolbar');
    area.innerHTML = sanitize(html || '') || '<p><br></p>';
    let saved = null;
    const keep = () => { const sel = getSelection(); if (sel.rangeCount && area.contains(sel.anchorNode)) saved = sel.getRangeAt(0).cloneRange(); };
    const restore = () => { area.focus(); if (saved) { const sel = getSelection(); sel.removeAllRanges(); sel.addRange(saved); } };
    const exec = (cmd, value = null) => { restore(); document.execCommand(cmd, false, value); changed(); };
    const insert = markup => { restore(); document.execCommand('insertHTML', false, markup); changed(); };
    const blockOf = () => { let n = getSelection().anchorNode; if (n?.nodeType === 3) n = n.parentElement; while (n && n !== area && !/^(P|H\d|LI|DIV|BLOCKQUOTE|TD|TH)$/.test(n.tagName)) n = n.parentElement; return n && n !== area ? n : null; };
    const status = () => { const words = (area.textContent || '').trim().split(/\s+/).filter(Boolean).length; host.querySelector('.rt-count').textContent = `${words} word${words === 1 ? '' : 's'}`; const b = blockOf(); host.querySelector('.rt-path').textContent = b ? b.tagName.toLowerCase() : 'p'; bar.querySelectorAll('[data-rt="bold"],[data-rt="italic"],[data-rt="ul"],[data-rt="ol"]').forEach(btn => { const map = { bold: 'bold', italic: 'italic', ul: 'insertUnorderedList', ol: 'insertOrderedList' }; let on = false; try { on = area.contains(getSelection().anchorNode) && document.queryCommandState(map[btn.dataset.rt]); } catch (_) {} btn.classList.toggle('on', on); }); };
    const changed = () => { status(); options.onChange?.(); };
    area.addEventListener('input', changed); area.addEventListener('keyup', () => { keep(); status(); }); area.addEventListener('mouseup', () => { keep(); status(); }); area.addEventListener('blur', keep);
    // Pasted or dropped pictures (e.g. a screenshot) go through the same shrinking as the image button.
    const insertImages = async files => { for (const file of files) { try { insert(`<img src="${await readImage(file)}" alt="${esc(file.name || 'Pasted image')}">`); } catch (error) { if (typeof notify === 'function') notify(error.message, 'error'); } } };
    area.addEventListener('paste', e => { const pics = [...(e.clipboardData?.files || [])].filter(f => /^image\//.test(f.type)); const html = e.clipboardData?.getData('text/html'); if (pics.length && !html) { e.preventDefault(); keep(); insertImages(pics); return; } if (!html) return; e.preventDefault(); insert(sanitize(html)); });
    area.addEventListener('drop', e => { const pics = [...(e.dataTransfer?.files || [])].filter(f => /^image\//.test(f.type)); if (!pics.length) return; e.preventDefault(); const pos = document.caretRangeFromPoint?.(e.clientX, e.clientY); if (pos) saved = pos; insertImages(pics); });
    bar.addEventListener('mousedown', e => { if (e.target.closest('.rt-btn')) e.preventDefault(); });
    bar.addEventListener('click', async e => {
      const k = e.target.closest('[data-rt]')?.dataset.rt; if (!k) return;
      try {
        if (k === 'undo' || k === 'redo') return exec(k);
        if (k === 'bold' || k === 'italic') return exec(k);
        if (k === 'left' || k === 'center' || k === 'right') return exec({ left: 'justifyLeft', center: 'justifyCenter', right: 'justifyRight' }[k]);
        if (k === 'ltr' || k === 'rtl') { restore(); const b = blockOf() || area; b.setAttribute('dir', k); changed(); return; }
        if (k === 'indent' || k === 'outdent') return exec(k);
        if (k === 'ul') return exec('insertUnorderedList');
        if (k === 'ol') return exec('insertOrderedList');
        if (k === 'unlink') return exec('unlink');
        if (k === 'link') { keep(); const url = (await ask('Insert link', 'Web address', 'https://')).trim(); if (!url) return; if (!safeUrl(url)) throw new Error('Use a web address starting with https://'); const sel = saved?.toString(); return sel ? exec('createLink', url) : insert(`<a href="${esc(url)}">${esc(url)}</a>`); }
        if (k === 'image') { keep(); const file = await pickFile('image/*'); if (!file) return; return insert(`<img src="${await readImage(file)}" alt="${esc(file.name)}">`); }
        if (k === 'audio') { keep(); const file = await pickFile('audio/*'); if (!file) return; return insert(`<audio controls src="${await readData(file)}"></audio><p><br></p>`); }
        if (k === 'video') { keep(); const url = (await ask('Insert video', 'YouTube link or video address', 'https://www.youtube.com/watch?v=…')).trim(); if (!url) return; const id = youTube(url); if (id) return insert(`<iframe src="https://www.youtube-nocookie.com/embed/${id}"></iframe><p><br></p>`); if (!safeUrl(url)) throw new Error('Use a YouTube link or a web address starting with https://'); return insert(`<video controls src="${esc(url)}"></video><p><br></p>`); }
        if (k === 'table') return insert(`<table><tbody>${'<tr><td><br></td><td><br></td><td><br></td></tr>'.repeat(3)}</tbody></table><p><br></p>`);
        if (k === 'full') { host.classList.toggle('rt-full'); host.querySelector('[data-rt="full"]').classList.toggle('on', host.classList.contains('rt-full')); area.focus(); }
      } catch (error) { if (typeof notify === 'function') notify(error.message, 'error'); }
    });
    host.addEventListener('keydown', e => { if (e.key === 'Escape' && host.classList.contains('rt-full')) { e.stopPropagation(); host.classList.remove('rt-full'); } });
    status();
    return { getHtml: () => sanitize(area.innerHTML).replace(/^<p><br><\/p>$/, ''), setHtml: h => { area.innerHTML = sanitize(h) || '<p><br></p>'; status(); }, focus: () => area.focus(), area };
  }
  return { editor, sanitize, fromMarkdown, toPlain, itemHtml };
})();
if (typeof window !== 'undefined') window.RichText = RichText;
