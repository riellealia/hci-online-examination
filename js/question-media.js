/* Question media helpers shared by Faculty authoring and Student delivery.
   Only http(s) resources are accepted; executable/data URLs are rejected. */
const QUESTION_IMAGE_EXTENSIONS = /\.(avif|gif|jpe?g|png|webp)$/i;

function safeQuestionUrl(raw, kind = 'link') {
  const value = String(raw || '').trim();
  if (!value) return { value: '', error: '' };
  if (kind === 'image' && /^data:image\/(png|jpe?g|gif|webp|avif);base64,/i.test(value)) {
    return value.length <= 2100000
      ? { value, error: '' }
      : { value, error: 'Uploaded images must be 1.5 MB or smaller.' };
  }
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { value, error: 'Use an http:// or https:// URL.' };
    }
    if (kind === 'image' && !QUESTION_IMAGE_EXTENSIONS.test(url.pathname)) {
      return { value, error: 'Image URLs must end in PNG, JPG, JPEG, GIF, WEBP, or AVIF.' };
    }
    return { value: url.href, error: '' };
  } catch (_) {
    return { value, error: 'Enter a complete, valid URL.' };
  }
}

function escapeQuestionMedia(value) {
  return String(value || '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

function questionMediaMarkup(question, { faculty = false } = {}) {
  if (!question) return '';
  const image = safeQuestionUrl(question.imageUrl, 'image');
  const link = safeQuestionUrl(question.linkUrl, 'link');
  let html = '';
  if (image.value && !image.error) {
    const alt = String(question.imageAlt || '').trim();
    html += `<figure class="question-media"><img src="${escapeQuestionMedia(image.value)}" alt="${escapeQuestionMedia(alt)}"><div class="question-media-error" role="status" hidden>Image unavailable. The written question remains available.</div>${question.imageCaption ? `<figcaption>${escapeQuestionMedia(question.imageCaption)}</figcaption>` : ''}</figure>`;
    if (faculty && !alt) html += '<div class="media-warning">Alternative text is required before saving.</div>';
  } else if (question.imageUrl) {
    html += `<div class="question-media-error" role="status">Image unavailable: ${escapeQuestionMedia(image.error)}</div>`;
  }
  if (link.value && !link.error) {
    const label = String(question.linkText || '').trim() || 'Open supporting resource';
    html += `<p class="question-resource"><a href="${escapeQuestionMedia(link.value)}" target="_blank" rel="noopener noreferrer">${escapeQuestionMedia(label)}</a><span aria-hidden="true"> ↗</span></p>`;
  } else if (question.linkUrl) {
    html += `<div class="media-warning">Resource link unavailable: ${escapeQuestionMedia(link.error)}</div>`;
  }
  return html;
}

function bindQuestionMediaFallbacks(scope = document) {
  scope.querySelectorAll('.question-media img').forEach(img => {
    img.addEventListener('error', () => {
      img.hidden = true;
      const fallback = img.parentElement.querySelector('.question-media-error');
      if (fallback) fallback.hidden = false;
    }, { once: true });
  });
}
