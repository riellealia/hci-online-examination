/* ==================================================================
   Lesson viewer: opens one week's lesson pages as a slideshow.
   Used by the Student subject page (pages are marked done as they are
   shown) and the Professor subject page (preview only).

   LessonViewer.open({
     course: 'CCS2101 · Discrete Structures 1', weekNumber: 1, weekTitle: 'Logic',
     slides: [{ id, title, kind, icon, html, done, quiz:{examId,label,meta},
                lockedReason, requiresPrevious }],
     start: 0,
     markDone: true,               // auto-mark pages done when shown
     onView(slide), onQuiz(slide), onClose(lastSlide)
   })
   ================================================================== */
const LessonViewer = (() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  let cfg = null, index = 0, host = null, lastFocus = null;

  /* Shared lesson content renderer (same output on Student and Professor):
     text, embedded videos, visual guides with notes, and downloads. */
  const VIDEO_IDS = { CCS2101: 'Vts-lQzIyB4', CCS2102: 'pTB0EiLXUC8', CDS1101: 'Nqrq0yB96gY', CIM1101: 'HXV3zeQKqGY', CMA1102: 'WUvTyaaNkzM', CHC1101: '5UXxl7RTUt0', PPE1103: 'UItWltVZZmE', ZGE1102: 'JJ0nFD19eT8' };
  function renderContent(item) {
    if (!item) return '';
    const title = esc(item.title || 'Lesson'), text = String(item.body || '');
    const rich = item.bodyHtml && typeof RichText !== 'undefined' ? RichText.sanitize(item.bodyHtml) : '';
    const paras = rich || text.split(/\n{2,}/).map(part => part.trim()).filter(Boolean).map(part => `<p>${esc(part).replace(/\n/g, '<br>')}</p>`).join('');
    if (item.type === 'link') {
      const id = item.videoId || VIDEO_IDS[item.subjectCode] || '';
      if (!id) return `<a href="${esc(item.url || '#')}" target="_blank" rel="noopener">&#9654; ${title}</a>${paras}`;
      return `<div class="learning-video"><div class="learning-video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${title}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>${paras}<a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">Open on YouTube &#8599;</a></div>`;
    }
    if (item.type === 'visual') {
      const topic = esc(item.weekTitle || item.title || 'this concept');
      return `<figure class="learning-visual">${item.imageUrl ? `<img src="${item.imageUrl}" alt="${esc(item.imageAlt || item.title)}">` : ''}<figcaption>${esc(text)}</figcaption></figure><section class="visual-lesson-notes"><strong>How to use this visual</strong><ol><li><b>Define:</b> State what ${topic} means in your own words.</li><li><b>Connect:</b> Identify how its key terms relate to one another.</li><li><b>Apply:</b> Use the guided example, then create one new case and explain the result.</li></ol></section>`;
    }
    if (item.type === 'file') return `<a class="lv-file" href="${item.dataUrl || '#'}" download="${esc(item.fileName || item.title)}">&#128206; ${esc(item.title || item.fileName || 'Download')}</a>${paras}`;
    return rich || markdown(text);
  }
  /* Simple formatting professors can type: # / ## / ### headings, **bold**, - lists. */
  function markdown(text) {
    const inline = line => esc(line).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    const out = []; let list = null, para = [];
    const flushPara = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; } };
    const flushList = () => { if (list) { out.push(`<ul>${list.map(item => `<li>${inline(item)}</li>`).join('')}</ul>`); list = null; } };
    String(text || '').split('\n').forEach(raw => {
      const line = raw.trim(), heading = line.match(/^(#{1,3})\s+(.*)$/), bullet = line.match(/^[-*]\s+(.*)$/);
      if (!line) { flushPara(); flushList(); return; }
      if (heading) { flushPara(); flushList(); const level = heading[1].length === 3 ? 3 : 2; out.push(`<h${level}>${inline(heading[2])}</h${level}>`); return; }
      if (bullet) { flushPara(); (list = list || []).push(bullet[1]); return; }
      flushList(); para.push(line);
    });
    flushPara(); flushList();
    return out.join('');
  }


  function ensure() {
    if (host) return host;
    host = document.createElement('div');
    host.id = 'lessonViewer'; host.className = 'lesson-viewer'; host.hidden = true;
    host.setAttribute('role', 'dialog'); host.setAttribute('aria-modal', 'true'); host.setAttribute('aria-labelledby', 'lessonViewerTitle');
    host.addEventListener('click', event => {
      if (event.target === host) return close();
      const go = event.target.closest('[data-lv-go]'); if (go) return show(Number(go.dataset.lvGo));
      if (event.target.closest('[data-lv-toc-toggle]')) { tocCollapsed = !tocCollapsed; try { localStorage.setItem('lessonTocCollapsed', tocCollapsed ? '1' : '0'); } catch (_) {} return render(); }
      const weekToggle = event.target.closest('[data-lv-toc-week]');
      if (weekToggle) { const w = weekToggle.dataset.lvTocWeek; openWeeks.has(w) ? openWeeks.delete(w) : openWeeks.add(w); return render(); }
      const jump = event.target.closest('[data-lv-jump]');
      if (jump) { const id = jump.dataset.lvJump, here = cfg.slides.findIndex(s => s.id === id); if (here >= 0) return show(here); return cfg.onJump?.(id); }
      if (event.target.closest('[data-lv-prev]')) return show(index - 1);
      if (event.target.closest('[data-lv-next]')) return index >= cfg.slides.length - 1 ? close() : show(index + 1);
      if (event.target.closest('[data-lv-close]')) return close();
      if (event.target.closest('[data-lv-quiz]')) { const current = cfg, slide = current.slides[index]; close(); current.onQuiz?.(slide); }
    });
    document.addEventListener('keydown', event => {
      if (!host || host.hidden) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      else if (event.key === 'ArrowRight' && !event.target.closest?.('input,textarea,select')) { event.preventDefault(); if (index < cfg.slides.length - 1) show(index + 1); }
      else if (event.key === 'ArrowLeft' && !event.target.closest?.('input,textarea,select')) { event.preventDefault(); if (index > 0) show(index - 1); }
    });
    document.body.appendChild(host);
    return host;
  }

  /* A page that needs the previous page done can be entered once that page is done. */
  /* Quiz pages are always reachable: the quiz's own prompt explains any prerequisite. */
  const canEnter = i => { const s = cfg.slides[i]; return !!s && !s.lockedReason && (!!s.quiz || !(s.requiresPrevious && i > 0 && !cfg.slides[i - 1].done)); };

  /* Right-side table of contents: every week of the subject. cfg.toc() returns
     [{ week, title, items:[{ id, title, kind, done, locked, quiz }] }]. */
  let tocCollapsed = (() => { try { return localStorage.getItem('lessonTocCollapsed') === '1'; } catch (_) { return false; } })();
  const openWeeks = new Set();
  function tocMarkup() {
    const groups = cfg.toc?.() || []; if (!groups.length) return '';
    const currentId = cfg.slides[index]?.id;
    openWeeks.add(String(cfg.weekNumber));
    const allItems = groups.flatMap(g => g.items), done = allItems.filter(i => i.done).length, lessons = allItems.filter(i => !i.quiz).length;
    const weeks = groups.map(group => {
      const w = String(group.week), open = openWeeks.has(w), gDone = group.items.filter(i => i.done).length, gLessons = group.items.filter(i => !i.quiz).length;
      const items = group.items.map(item => {
        const current = item.id === currentId, state = current ? 'current' : item.done ? 'done' : item.locked ? 'locked' : 'open';
        const mark = item.done ? '&#10003;' : item.locked ? '&#128274;' : item.quiz ? '&#9998;' : '&#8226;';
        return `<li><button type="button" class="lv-toc-item ${state}${item.quiz ? ' quiz' : ''}" data-lv-jump="${esc(item.id)}" ${item.locked && !current ? 'disabled title="Locked: finish the earlier lessons first"' : ''} ${current ? 'aria-current="page"' : ''}><span class="lv-toc-mark">${mark}</span><span>${esc(item.title)}</span></button></li>`;
      }).join('');
      return `<section class="lv-toc-week${w === String(cfg.weekNumber) ? ' active' : ''}"><button type="button" class="lv-toc-week-head" data-lv-toc-week="${esc(w)}" aria-expanded="${open}"><span class="lv-toc-badge">W${esc(String(group.week).padStart(2, '0'))}</span><span class="lv-toc-week-title"><strong>${esc(group.title)}</strong><small>${cfg.markDone ? `${gDone}/${gLessons} done` : `${group.items.length} pages`}</small></span><span class="lv-toc-chevron" aria-hidden="true">&#8250;</span></button>${open ? `<ol>${items}</ol>` : ''}</section>`;
    }).join('');
    return `<aside class="lv-toc${tocCollapsed ? ' collapsed' : ''}" aria-label="Course contents"><header><button type="button" class="lv-toc-toggle" data-lv-toc-toggle aria-expanded="${!tocCollapsed}" aria-label="${tocCollapsed ? 'Show contents' : 'Hide contents'}" title="${tocCollapsed ? 'Show contents' : 'Hide contents'}">${tocCollapsed ? '&#8249;' : '&#8250;'}</button>${tocCollapsed ? '' : `<div><strong>Contents</strong><small>${cfg.markDone ? `${done} of ${lessons} lessons done` : `${groups.length} weeks`}</small></div>`}</header>${tocCollapsed ? `<span class="lv-toc-vertical">Contents</span>` : `<div class="lv-toc-list">${weeks}</div>`}</aside>`;
  }

  function render() {
    const slides = cfg.slides, slide = slides[index], total = slides.length;
    const doneCount = slides.filter(s => s.done).length;
    const rail = slides.map((s, i) => {
      const state = i === index ? 'current' : s.done ? 'done' : canEnter(i) ? 'open' : 'locked';
      const mark = s.done ? '&#10003;' : state === 'locked' ? '&#128274;' : String(i + 1);
      return `<li><button type="button" class="lv-step ${state}${s.quiz ? ' quiz' : ''}" data-lv-go="${i}" ${state === 'locked' ? 'disabled' : ''} aria-current="${i === index ? 'step' : 'false'}"><span class="lv-step-mark">${mark}</span><span class="lv-step-copy"><strong>${esc(s.title)}</strong><small>${esc(s.kind)}</small></span></button></li>`;
    }).join('');
    let body;
    if (slide.lockedReason) body = `<div class="lv-locked"><span aria-hidden="true">&#128274;</span><strong>This page is not available yet</strong><p>${esc(slide.lockedReason)}</p></div>`;
    else if (slide.quiz) body = `${slide.html ? `<div class="lv-content lv-quiz-desc">${slide.html}</div>` : ''}<div class="lv-quiz"><span class="lv-quiz-icon" aria-hidden="true">&#9998;</span><div><strong>${esc(slide.title)}</strong>${slide.quiz.meta ? `<p>${esc(slide.quiz.meta)}</p>` : ''}</div><button type="button" class="lv-primary" data-lv-quiz>${esc(slide.quiz.label || 'Open quiz')} &#8594;</button></div>`;
    else body = `<div class="lv-content">${slide.html || '<p class="lv-muted">This page has no content yet.</p>'}</div>`;
    const next = slides[index + 1], nextLabel = !next ? 'Finish week' : `Next: ${next.title}`;
    host.innerHTML = `<article class="lv-sheet">
      <header class="lv-head"><div><p class="lv-eyebrow">${esc(cfg.course || '')}${cfg.weekNumber ? ` · Week ${esc(cfg.weekNumber)}` : ''}</p><h2 id="lessonViewerTitle">${esc(cfg.weekTitle || 'Lesson')}</h2></div><div class="lv-head-meta">${cfg.markDone ? `<span>${doneCount} of ${total} done</span>` : '<span>Preview</span>'}<button type="button" class="lv-close" data-lv-close aria-label="Close lesson">&times;</button></div></header>
      <div class="lv-body">
        <nav class="lv-rail" aria-label="Pages in this week"><ol>${rail}</ol></nav>
        <section class="lv-main" tabindex="-1">
          <div class="lv-slide-head"><span class="lv-slide-icon" aria-hidden="true">${slide.icon || '&#9776;'}</span><div><small>${esc(/^Page \d+$/.test(slide.kind) ? 'Lesson' : slide.kind)} · Page ${index + 1} of ${total}</small><h3>${esc(slide.title)}</h3></div>${cfg.markDone && slide.done ? '<span class="lv-done-pill">&#10003; Done</span>' : ''}</div>
          ${body}
        </section>
        ${tocMarkup()}
      </div>
      <footer class="lv-foot"><button type="button" class="lv-secondary" data-lv-prev ${index === 0 ? 'disabled' : ''}>&#8592; Previous</button><div class="lv-progress" aria-hidden="true"><i style="width:${((index + 1) / total) * 100}%"></i></div><button type="button" class="lv-primary" data-lv-next ${next && !canEnter(index + 1) ? 'disabled' : ''}>${esc(nextLabel)} ${next ? '&#8594;' : ''}</button></footer>
    </article>`;
    host.querySelector('.lv-main')?.focus({ preventScroll: true });
    host.querySelector('.lv-step.current')?.scrollIntoView?.({ block: 'nearest' });
    host.querySelector('.lv-toc-item.current')?.scrollIntoView?.({ block: 'nearest' });
    host.querySelector('.lv-body')?.classList.toggle('has-toc', !!host.querySelector('.lv-toc'));
    host.querySelector('.lv-body')?.classList.toggle('toc-collapsed', tocCollapsed);
  }

  function show(i) {
    if (!cfg || i < 0 || i >= cfg.slides.length) return;
    if (!canEnter(i) && i !== index) { if (typeof notify === 'function') notify('Finish the previous page first.', 'info'); return; }
    index = i;
    const slide = cfg.slides[i];
    if (cfg.markDone && !slide.done && !slide.quiz && !slide.lockedReason && canEnter(i)) { slide.done = true; try { cfg.onView?.(slide); } catch (error) { console.error(error); } }
    render();
  }

  function open(options) {
    if (!options?.slides?.length) return;
    const wasOpen = !!host && !host.hidden;
    if (!wasOpen) openWeeks.clear();
    // Jumping to another week keeps the original page focus target and close callback.
    if (wasOpen && cfg && !options.onClose) options.onClose = cfg.onClose;
    cfg = options; ensure(); if (!wasOpen) lastFocus = document.activeElement;
    host.hidden = false; document.body.classList.add('lesson-viewer-open');
    let start = Math.max(0, Math.min(options.start || 0, options.slides.length - 1));
    while (start > 0 && !canEnter(start) && !cfg.slides[start].lockedReason) start--;
    index = start; show(start);
  }

  function close() {
    if (!host || host.hidden) return;
    host.hidden = true; document.body.classList.remove('lesson-viewer-open');
    const last = cfg?.slides?.[index], done = cfg?.onClose; cfg = null;
    try { done?.(last); } catch (error) { console.error(error); }
    lastFocus?.focus?.({ preventScroll: true });
  }

  return { open, close, renderContent, isOpen: () => !!host && !host.hidden };
})();
