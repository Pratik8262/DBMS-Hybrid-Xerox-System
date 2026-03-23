const PricingQueries = require('../db/queries/pricing.queries')
const { sendSuccess, sendCreated } = require('../utils/response')

const getShopPricing = async (req, res, next) => {
  try {
    const pricing = await PricingQueries.findByShop(req.params.shopId)
    sendSuccess(res, pricing)
  } catch (error) { next(error) }
}

const addPricing = async (req, res, next) => {
  try {
    const newPricing = await PricingQueries.create(req.body)
    sendCreated(res, newPricing, 'Pricing added successfully')
  } catch (error) { next(error) }
}

const updatePricing = async (req, res, next) => {
  try {
    const updated = await PricingQueries.update(req.params.id, req.body)
    sendSuccess(res, updated, 'Pricing updated')
  } catch (error) { next(error) }
}

module.exports = { getShopPricing, addPricing, updatePricing }
