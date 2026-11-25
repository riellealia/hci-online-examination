/* ==================================================================
   Student weekly lessons → LessonViewer slideshow.
   Clicking a lesson row opens that week as slides, starting at the row.
   Pages are marked done when shown; quiz pages open the quiz directly.
   Uses the Student page helpers (learningCellState, learningTypeMeta,
   learningCellCompleted, renderStudentLearningVideo, renderStudentVisualLesson,
   openExamDetails, openStudentSubject, captureStudentLearningViewState,
   selectedStudentSubjectCode, currentStudent, exams, subjects) at call time.
   ================================================================== */
const StudentLessons = (() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const ordered = code => typeof studentCourseContent === 'function' ? studentCourseContent(code) : DB.read('subjectWorkspaceContent', []).filter(item => item.subjectCode === code).sort((a, b) => a.week - b.week || (a.order ?? 1e9) - (b.order ?? 1e9));

  function body(item) {
    // Same renderer as the Professor side, so both show identical pages.
    return LessonViewer.renderContent(item);
  }

  function slidesFor(code, week) {
    const content = ordered(code);
    return content.filter(item => item.week === week).map(item => {
      const position = content.indexOf(item), state = learningCellState(item, position, content), meta = learningTypeMeta(item);
      const sequentialLock = state.locked && /previous page/i.test(state.label);
      const firstOfWeek = content.filter(entry => entry.week === week)[0] === item;
      const exam = item.type === 'exam' ? exams.find(entry => entry.id === item.examId) : null;
      return {
        id: item.id, title: item.title || 'Lesson page', kind: meta.label, icon: meta.icon,
        done: item.type === 'exam' ? false : learningCellCompleted(item.id),
        requiresPrevious: !!item.requiresPrevious,
        // Hard locks (locked/scheduled), or a sequential lock that depends on an earlier week.
        lockedReason: state.locked && (!sequentialLock || firstOfWeek) ? state.label : '',
        html: item.type === 'exam' ? (item.bodyHtml || item.body ? body({ ...item, type: 'text' }) : '') : body(item),
        quiz: item.type === 'exam' ? { examId: item.examId, label: 'Open quiz', meta: exam ? `${exam.date ? `Due ${exam.date}` : 'Always open'}${exam.durationMinutes ? ` · ${exam.durationMinutes} min` : ''}` : '' } : null
      };
    });
  }

  function markDone(blockId) {
    const views = DB.read('subjectContentViews', []), now = new Date().toISOString();
    const record = views.find(view => view.studentId === currentStudent.id && view.blockId === blockId);
    if (record) { if (record.completedAt) return; record.completedAt = now; record.viewedAt = record.viewedAt || now; }
    else views.push({ studentId: currentStudent.id, blockId, viewedAt: now, completedAt: now });
    DB.write('subjectContentViews', views);
  }

  function open(blockId) {
    const code = selectedStudentSubjectCode; if (!code) return;
    const item = ordered(code).find(entry => entry.id === blockId); if (!item) return;
    const subject = subjects.find(entry => entry.code === code), slides = slidesFor(code, item.week);
    LessonViewer.open({
      course: `${code}${subject ? ` · ${subject.name}` : ''}`, weekNumber: item.week, weekTitle: item.weekTitle || `Week ${item.week}`,
      slides, start: Math.max(0, slides.findIndex(slide => slide.id === blockId)), markDone: true,
      onView: slide => markDone(slide.id),
      onQuiz: slide => setTimeout(() => openExamDetails(slide.quiz.examId), 0),
      onClose: last => refresh(last?.id),
      toc: () => toc(code),
      onJump: id => open(id)
    });
  }

  /* Class tab: shared members table in place of the classmate list. */
  function renderClassMembers() {
    const code = selectedStudentSubjectCode, panel = document.querySelector('#studentSubjectDetail [data-subject-tab-panel="class"]');
    if (!code || !panel || typeof ClassMembers === 'undefined') return;
    const enrollment = SectionService.enrollmentsForStudent(currentStudent.id).find(item => item.subjectCode === code);
    if (!enrollment) return;
    ClassMembers.mountStudent(panel, code, enrollment.sectionId, currentStudent.id);
  }

  /* Course path card (calendar of weeks) in place of the old week list. */
  function pathWeeks(code) {
    const content = ordered(code);
    return [...new Set(content.map(item => item.week))].map(week => {
      const items = content.filter(item => item.week === week);
      return { week, title: items[0]?.weekTitle || `Week ${week}`, lessons: items.map(item => ({ id: item.id, title: item.title || 'Lesson page', quiz: item.type === 'exam', done: item.type !== 'exam' && learningCellCompleted(item.id) })) };
    });
  }
  function renderCoursePath() {
    const code = selectedStudentSubjectCode, rail = document.querySelector('#studentSubjectDetail .student-week-rail');
    if (!code || !rail || typeof CoursePath === 'undefined') return;
    // Selecting a week anywhere (arrows, pills, keyboard) also refreshes this card.
    if (!window.__coursePathWrapped && typeof window.focusStudentSubjectWeek === 'function') {
      const original = window.focusStudentSubjectWeek;
      window.__focusWeekOriginal = original;
      window.focusStudentSubjectWeek = (week, options = {}) => { original(week, options); CoursePath.select(selectedStudentSubjectCode, week); renderCoursePath(); };
      window.__coursePathWrapped = true;
    }
    const weeks = pathWeeks(code), firstVisit = CoursePath.selected(code) === undefined;
    const active = Number(document.querySelector('#studentSubjectDetail .learning-week[open]')?.id?.replace('student-subject-week-', '')) || undefined;
    rail.classList.add('cp-card');
    CoursePath.render(rail, {
      subjectCode: code, mode: 'student', weeks, selected: firstVisit ? undefined : (active ?? CoursePath.selected(code)),
      onSelect: week => window.focusStudentSubjectWeek(week),
      onOpen: id => open(id)
    });
    // First time on this subject: open the current week in the lesson list too.
    if (firstVisit) { const week = CoursePath.selected(code); if (week && week !== active) (window.__focusWeekOriginal || window.focusStudentSubjectWeek)(week, { scroll: false }); }
  }

  /* All weeks for the right-side contents panel, with live done/locked state. */
  function toc(code) {
    const content = ordered(code), weeks = [...new Set(content.map(item => item.week))];
    return weeks.map(week => {
      const items = content.filter(item => item.week === week);
      return {
        week, title: items[0]?.weekTitle || `Week ${week}`,
        items: items.map(item => {
          const state = learningCellState(item, content.indexOf(item), content), quiz = item.type === 'exam';
          // Quizzes stay reachable; their prompt explains any prerequisite.
          const locked = quiz ? state.locked && !/previous page/i.test(state.label) : state.locked;
          return { id: item.id, title: item.title || 'Lesson page', done: !quiz && learningCellCompleted(item.id), locked, quiz };
        })
      };
    });
  }

  /* Re-render the subject page so statuses update, keeping the same week in view. */
  function refresh(blockId) {
    if (!selectedStudentSubjectCode) return;
    pendingStudentLearningViewState = captureStudentLearningViewState(blockId || null);
    openStudentSubject(selectedStudentSubjectCode);
  }

  /* One delegated listener on the subject page: rows open the viewer. */
  function bind() {
    const root = document.getElementById('studentSubjectDetail');
    if (!root || root.dataset.lessonViewerBound) return; root.dataset.lessonViewerBound = '1';
    root.addEventListener('click', event => {
      if (event.target.closest('.learning-status-button,a,iframe,.attached-exam-link')) return;
      const row = event.target.closest('.learning-cell[data-learning-block]');
      if (!row) return;
      if (row.classList.contains('locked-exam-row')) return; // keeps the standard exam prompt
      if (!row.classList.contains('locked') && !event.target.closest('summary')) return;
      event.preventDefault(); event.stopPropagation();
      open(row.dataset.learningBlock);
    }, true);
    root.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const row = event.target.closest?.('.learning-cell.locked[data-learning-block]:not(.locked-exam-row)');
      if (row) { event.preventDefault(); open(row.dataset.learningBlock); }
    });
  }

  /* Locked rows become keyboard-reachable buttons. */
  function decorate() {
    document.querySelectorAll('#studentSubjectDetail .learning-cell.locked[data-learning-block]:not(.locked-exam-row)').forEach(row => { row.setAttribute('role', 'button'); row.tabIndex = 0; });
    renderCoursePath();
    renderClassMembers();
    const root = document.getElementById('studentSubjectDetail');
    if (typeof LessonViewMode !== 'undefined') LessonViewMode.mount(root, root?.querySelector('.weekly-learning-section>h3'));
  }

  return { open, bind, decorate };
})();
