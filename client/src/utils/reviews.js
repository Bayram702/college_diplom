export const REVIEW_COLLAPSED_COUNT = 3
export const REVIEW_TEXT_PREVIEW_LENGTH = 360

export const getVisibleReviews = (reviews, isExpanded) => {
  if (!Array.isArray(reviews)) return []
  return isExpanded ? reviews : reviews.slice(0, REVIEW_COLLAPSED_COUNT)
}

export const isReviewTextExpandable = (text) => String(text || '').length > REVIEW_TEXT_PREVIEW_LENGTH

export const getReviewText = (text, isExpanded) => {
  const normalizedText = String(text || '')
  if (isExpanded || !isReviewTextExpandable(normalizedText)) return normalizedText
  return `${normalizedText.slice(0, REVIEW_TEXT_PREVIEW_LENGTH)}...`
}
