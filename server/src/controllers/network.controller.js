const NetworkQueries = require('../db/queries/network.queries')
const { sendSuccess, sendCreated, sendNotFound, sendError } = require('../utils/response')

const createNetwork = async (req, res, next) => {
  try {
    const { shop_id, ssid, auth_type, credential_ref, is_primary } = req.body
    if (!shop_id || !ssid) throw new Error('shop_id and ssid are required')
    
    // If setting as primary, we might want to unset other primaries for this shop
    if (is_primary) {
      const existingPrimary = await NetworkQueries.findPrimaryByShop(shop_id)
      if (existingPrimary) {
        await NetworkQueries.update(existingPrimary.network_id, { is_primary: false })
      }
    }

    const newNetwork = await NetworkQueries.create({
      shop_id,
      ssid,
      auth_type: auth_type || 'WPA2',
      credential_ref,
      is_primary: is_primary || false
    })
    sendCreated(res, newNetwork, 'Network configured successfully')
  } catch (error) { next(error) }
}

const getShopNetworks = async (req, res, next) => {
  try {
    const networks = await NetworkQueries.findByShopId(req.params.shopId)
    sendSuccess(res, networks)
  } catch (error) { next(error) }
}

const updateNetwork = async (req, res, next) => {
  try {
    const { is_primary, ...rest } = req.body
    
    // If updating to primary, unset others first
    if (is_primary) {
      const current = await NetworkQueries.findById(req.params.id)
      if (current) {
        const existingPrimary = await NetworkQueries.findPrimaryByShop(current.shop_id)
        if (existingPrimary && existingPrimary.network_id !== parseInt(req.params.id)) {
          await NetworkQueries.update(existingPrimary.network_id, { is_primary: false })
        }
      }
    }

    const updated = await NetworkQueries.update(req.params.id, { is_primary, ...rest })
    if (!updated) return sendNotFound(res, 'Network config not found')
    sendSuccess(res, updated, 'Network updated')
  } catch (error) { next(error) }
}

const deleteNetwork = async (req, res, next) => {
  try {
    await NetworkQueries.delete(req.params.id)
    sendSuccess(res, null, 'Network deleted')
  } catch (error) { next(error) }
}

module.exports = {
  createNetwork,
  getShopNetworks,
  updateNetwork,
  deleteNetwork
}
