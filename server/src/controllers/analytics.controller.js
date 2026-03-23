/**
 * analytics.controller.js
 */
const { AnalyticsQueries } = require('../db/queries')
const logger = require('../utils/logger')

const getShopAnalytics = async (req, res, next) => {
  try {
    const { shopId } = req.params
    
    // Fetch all analytics in parallel
    const [
      overallStats,
      topUploaders,
      topSpenders,
      mostRevenueDay,
      revenueByMethod,
      statusBreakdown,
      dailyTrend
    ] = await Promise.all([
      AnalyticsQueries.getOverallStats(shopId),
      AnalyticsQueries.getTopCustomerByUploads(shopId),
      AnalyticsQueries.getTopCustomerBySpending(shopId),
      AnalyticsQueries.getMostRevenueDay(shopId),
      AnalyticsQueries.getRevenueByMethod(shopId),
      AnalyticsQueries.getJobStatusBreakdown(shopId),
      AnalyticsQueries.getDailyRevenueTrend(shopId, 30) // Default to 30 days
    ])

    res.json({
      success: true,
      data: {
        overall: overallStats || { total_jobs: 0, total_revenue: 0, avg_order_value: 0 },
        leaderboard: {
          uploads: topUploaders,
          spending: topSpenders
        },
        mostRevenueDay: mostRevenueDay || null,
        revenueByMethod: revenueByMethod || [],
        statusBreakdown: statusBreakdown || [],
        dailyTrend: dailyTrend || []
      }
    })
  } catch (error) {
    logger.error('Error fetching shop analytics:', error)
    next(error)
  }
}

module.exports = {
  getShopAnalytics
}
