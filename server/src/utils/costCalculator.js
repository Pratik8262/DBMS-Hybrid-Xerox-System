/**
 * utils/costCalculator.js
 *
 * Server-side cost calculation — NEVER trust cost from the client.
 * Takes a pricing rule + job settings and returns the total cost.
 */

/**
 * Calculate total cost for a print job.
 *
 * @param {Object} pricingRule   - Row from `pricing` table
 * @param {Object} printSettings - Row from `print_settings` table
 * @param {number} pages         - Page count from the uploaded file
 * @returns {{ total: number, perPage: number, breakdown: Object }}
 */
const calculateJobCost = (pricingRule, printSettings, pages) => {
  if (!pricingRule) throw new Error('No pricing rule found for these settings')
  if (!pages || pages <= 0) throw new Error('Invalid page count')

  const { price_per_page } = pricingRule
  const { copies, sides } = printSettings

  // Duplex halves the number of sheets (rounded up)
  const isDuplex = sides === 'duplex_long' || sides === 'duplex_short'
  const sheetsPerCopy = isDuplex ? Math.ceil(pages / 2) : pages

  // Cost is per page impression, not per sheet
  const totalPages = pages * copies
  const total = parseFloat((price_per_page * totalPages).toFixed(2))

  return {
    total,
    perPage: parseFloat(price_per_page),
    breakdown: {
      pages,
      copies,
      isDuplex,
      sheetsPerCopy,
      totalPages,
      pricePerPage: price_per_page,
    },
  }
}

module.exports = { calculateJobCost }
