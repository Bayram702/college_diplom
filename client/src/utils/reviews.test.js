import test from 'node:test'
import assert from 'node:assert/strict'

import {
  REVIEW_COLLAPSED_COUNT,
  REVIEW_TEXT_PREVIEW_LENGTH,
  getReviewText,
  getVisibleReviews,
  isReviewTextExpandable
} from './reviews.js'

test('collapsed reviews list shows first three reviews', () => {
  const reviews = Array.from({ length: 5 }, (_, index) => ({ id: index + 1 }))

  const visibleReviews = getVisibleReviews(reviews, false)

  assert.equal(REVIEW_COLLAPSED_COUNT, 3)
  assert.deepEqual(visibleReviews.map((review) => review.id), [1, 2, 3])
})

test('expanded reviews list shows every review', () => {
  const reviews = Array.from({ length: 5 }, (_, index) => ({ id: index + 1 }))

  const visibleReviews = getVisibleReviews(reviews, true)

  assert.deepEqual(visibleReviews.map((review) => review.id), [1, 2, 3, 4, 5])
})

test('long review text can be collapsed and expanded', () => {
  const text = 'a'.repeat(REVIEW_TEXT_PREVIEW_LENGTH + 20)

  assert.equal(isReviewTextExpandable(text), true)
  assert.equal(getReviewText(text, true), text)
  assert.equal(getReviewText(text, false), `${'a'.repeat(REVIEW_TEXT_PREVIEW_LENGTH)}...`)
})

test('short review text is not changed', () => {
  const text = 'Short review'

  assert.equal(isReviewTextExpandable(text), false)
  assert.equal(getReviewText(text, false), text)
})
