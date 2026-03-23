/**
 * services/pricing.service.js
 * Cost calculation. Always server-side. Never trust client cost.
 */

const { PricingQueries }   = require('../db/queries')
const { calculateJobCost } = require('../utils/costCalculator')
const { AppError, ERRORS } = require('../constants/errors')

const PricingService = {

  /**
   * Calculate cost for a job and attach the pricing row.
   * Returns { cost, pricingRule } ready to write to DB.
   *
   * @param {number} shopId
   * @param {Object} printSettings - Row from print_settings table
   * @param {number} pages         - Page count from file
   * @returns {{ cost: number, pricingRule: Object }}
   */
  calculateCost: async (shopId, printSettings, pages) => {
    const rule = await PricingQueries.findMatchingRule(
      shopId,
      printSettings.color_mode,
      printSettings.paper_size,
      'none'   // finishing_type — extend later
    )
    if (!rule) throw new AppError(ERRORS.JOB_NO_PRICING)

    const { total } = calculateJobCost(rule, printSettings, pages)
    return { cost: total, pricingRule: rule }
  },
}

module.exports = PricingService
