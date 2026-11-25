/* ==================================================================
   Professor weekly learning content: Student-style week cards and
   lesson rows, plus the LessonViewer slideshow as a preview (no
   "done" tracking). Editing controls (week menu, cell settings and
   remove) are kept. Called after every FacultySubjectWorkspace render.
   ================================================================== */
const FacultyLessons = (() => {
  const TONES = ['var(--accent)', '#c76125', '#367b86', '#7460a8'];
  let currentCode = null;

  const records = code => DB.read('subjectWorkspaceContent', []).filter(item => item.subjectCode === code).sort((a, b) => a.week - b.week || (a.order ?? 1e9) - (b.order ?? 1e9) || new Date(a.createdAt) - new Date(b.createdAt));
  function meta(item) {
    if (item.type === 'exam') return { label: 'Quiz', icon: '&#9998;', tone: 'quiz' };
    if (item.type === 'link') return { label: 'Video resource', icon: '&#9654;', tone: 'media' };
    if (item.type === 'visual') return { label: 'Visual guide', icon: '&#9672;', tone: 'visual' };
    if (item.type === 'file') return { label: 'Download', icon: '&#8682;', tone: 'file' };
    const title = String(item.title || '').toLowerCase();
    if (title.includes('practice') || title.includes('example')) return { label: 'Practice', icon: '&#10003;', tone: 'practice' };
    return { label: item.pageNumber ? `Page ${item.pageNumber}` : 'Lesson', icon: '&#9776;', tone: 'lesson' };
  }

  function decorate(host, code) {
    currentCode = code;
    const all = records(code);
    host.querySelectorAll('.faculty-week-card[data-week]').forEach(card => {
      const week = Number(card.dataset.week);
      card.style.setProperty('--week-tone', TONES[(week - 1) % TONES.length]);
      const items = all.filter(item => item.week === week);
      const summary = card.querySelector(':scope>summary');
      if (summary && !summary.querySelector('.fl-week-count')) {
        const lessons = items.filter(item => item.type !== 'exam').length, quizzes = items.length - lessons;
        summary.querySelector('strong')?.insertAdjacentHTML('afterend', `<span class="fl-week-count">${lessons} lesson${lessons === 1 ? '' : 's'}${quizzes ? ` · ${quizzes} quiz${quizzes === 1 ? '' : 'zes'}` : ''}</span>`);
      }
      card.querySelectorAll('.student-content-block[data-block-id]').forEach(block => {
        const item = items.find(entry => entry.id === block.dataset.blockId); if (!item) return;
        const row = block.querySelector(':scope>summary'); if (!row || row.querySelector('.fl-row-icon')) return;
        const m = meta(item);
        block.classList.add('fl-row');
        row.insertAdjacentHTML('afterbegin', `<span class="fl-row-icon ${m.tone}" aria-hidden="true">${m.icon}</span>`);
        const title = row.querySelector('b');
        if (title) title.outerHTML = `<span class="fl-row-copy"><b>${title.innerHTML}</b><small>${m.label} · Week ${week}</small></span>`;
        row.insertAdjacentHTML('beforeend', `<span class="fl-row-open" aria-hidden="true">${item.type === 'exam' ? 'Open quiz' : 'Preview'} &#8250;</span>`);
        const body = block.querySelector('.content-block-body');
        if (body && item.type !== 'exam' && typeof LessonViewer !== 'undefined') body.innerHTML = `<div class="lv-content">${LessonViewer.renderContent(item)}</div>`;
      });
    });
    bind(host);
    renderCoursePath(host, all);
    const heading = host.querySelector('.faculty-learning-section .student-section-heading h3');
    if (typeof LessonViewMode !== 'undefined') LessonViewMode.mount(host, heading);
  }

  /* Shared Course path card in the right rail (replaces the old week list). */
  function renderCoursePath(host, all) {
    if (typeof CoursePath === 'undefined') return;
    let card = host.querySelector('.rail-card.cp-card');
    const old = host.querySelector('.rail-lessons');
    if (!card && old) { card = document.createElement('section'); card.className = 'rail-card cp-card'; old.replaceWith(card); }
    if (!card) return;
    const weeks = [...new Set(all.map(item => item.week))].map(week => {
      const items = all.filter(item => item.week === week);
      return { week, title: items[0]?.weekTitle || `Week ${week}`, lessons: items.map(item => ({ id: item.id, title: item.title || 'Lesson page', quiz: item.type === 'exam', done: false })) };
    });
    const draw = selected => CoursePath.render(card, {
      subjectCode: currentCode, mode: 'faculty', weeks, selected,
      onSelect: week => {
        draw(week);
        const weekCard = host.querySelector(`.faculty-week-card[data-week="${week}"]`);
        if (weekCard) { weekCard.open = true; weekCard.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      },
      onOpen: id => open(id, host.querySelector(`.faculty-week-card[data-week="${all.find(item => item.id === id)?.week}"]`))
    });
    draw();
  }

  function open(blockId, card) {
    const all = records(currentCode), item = all.find(entry => entry.id === blockId); if (!item) return;
    const items = all.filter(entry => entry.week === item.week), subject = subjects.find(entry => entry.code === currentCode);
    const slides = items.map(entry => {
      const m = meta(entry), block = card?.querySelector(`.student-content-block[data-block-id="${CSS.escape(entry.id)}"]`);
      const exam = entry.type === 'exam' ? exams.find(x => x.id === entry.examId) : null;
      return {
        id: entry.id, title: entry.title || 'Lesson page', kind: m.label, icon: m.icon, done: false,
        html: entry.type === 'exam' ? (entry.bodyHtml || entry.body ? LessonViewer.renderContent({ ...entry, type: 'text' }) : '') : LessonViewer.renderContent(entry),
        quiz: entry.type === 'exam' ? { examId: entry.examId, label: 'Open questions', meta: exam ? `${exam.date ? `Due ${exam.date}` : 'Always open'}${exam.durationMinutes ? ` · ${exam.durationMinutes} min` : ''}` : '' } : null,
        lockedReason: ''
      };
    });
    LessonViewer.open({
      course: `${currentCode}${subject ? ` · ${subject.name}` : ''}`, weekNumber: item.week, weekTitle: item.weekTitle || `Week ${item.week}`,
      slides, start: Math.max(0, slides.findIndex(slide => slide.id === blockId)), markDone: false,
      onQuiz: slide => manageQuestions(slide.quiz.examId),
      // Preview: every lesson of every week is reachable from the contents panel.
      toc: () => [...new Set(all.map(entry => entry.week))].map(week => {
        const weekItems = all.filter(entry => entry.week === week);
        return { week, title: weekItems[0]?.weekTitle || `Week ${week}`, items: weekItems.map(entry => ({ id: entry.id, title: entry.title || 'Lesson page', done: false, locked: false, quiz: entry.type === 'exam' })) };
      }),
      onJump: id => open(id, null)
    });
  }

  function bind(host) {
    if (host.dataset.lessonViewerBound) return; host.dataset.lessonViewerBound = '1';
    host.addEventListener('click', event => {
      const summary = event.target.closest('.student-content-block.fl-row>summary'); if (!summary) return;
      if (event.target.closest('button,a')) return;
      event.preventDefault(); event.stopPropagation();
      const block = summary.parentElement;
      open(block.dataset.blockId, block.closest('.faculty-week-card'));
    }, true);
  }

  return { decorate, open };
})();
