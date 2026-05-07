const PROFANITY_PATTERNS = [
  /б[^\p{L}\p{N}]*л[^\p{L}\p{N}]*я/iu,
  /б[^\p{L}\p{N}]*л[^\p{L}\p{N}]*и[^\p{L}\p{N}]*н/iu,
  /х[^\p{L}\p{N}]*у[^\p{L}\p{N}]*[йеёя]/iu,
  /п[^\p{L}\p{N}]*и[^\p{L}\p{N}]*з[^\p{L}\p{N}]*д/iu,
  /м[^\p{L}\p{N}]*у[^\p{L}\p{N}]*д[^\p{L}\p{N}]*/iu,
  /с[^\p{L}\p{N}]*у[^\p{L}\p{N}]*к[^\p{L}\p{N}]*а/iu,
  /д[^\p{L}\p{N}]*е[^\p{L}\p{N}]*б[^\p{L}\p{N}]*и[^\p{L}\p{N}]*л/iu,
  /и[^\p{L}\p{N}]*д[^\p{L}\p{N}]*и[^\p{L}\p{N}]*о[^\p{L}\p{N}]*т/iu,
  /f[^\p{L}\p{N}]*u[^\p{L}\p{N}]*c[^\p{L}\p{N}]*k/iu,
  /s[^\p{L}\p{N}]*h[^\p{L}\p{N}]*i[^\p{L}\p{N}]*t/iu
];

const SPAM_PATTERNS = [
  /(https?:\/\/|www\.)/i,
  /(?:\+?\d[\s().-]*){10,}/,
  /@[a-z0-9_]{3,}/i
];

const normalizeReviewText = (value) => {
  if (typeof value !== 'string') return '';

  return value
    .replace(/\s+/g, ' ')
    .trim();
};

const moderateReviewText = (value) => {
  const text = normalizeReviewText(value);

  if (text.length < 20) {
    return {
      ok: false,
      text,
      reason: 'Отзыв должен содержать минимум 20 символов.'
    };
  }

  if (text.length > 1200) {
    return {
      ok: false,
      text,
      reason: 'Отзыв не должен превышать 1200 символов.'
    };
  }

  if (/(.)\1{8,}/i.test(text)) {
    return {
      ok: false,
      text,
      reason: 'Уберите повторяющиеся символы.'
    };
  }

  if (PROFANITY_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      ok: false,
      text,
      reason: 'Отзыв содержит запрещенные или грубые слова.'
    };
  }

  if (SPAM_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      ok: false,
      text,
      reason: 'Отзыв не должен содержать ссылки, контакты или рекламу.'
    };
  }

  return { ok: true, text, reason: null };
};

module.exports = {
  moderateReviewText,
  normalizeReviewText
};
