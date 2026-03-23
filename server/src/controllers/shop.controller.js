const ShopQueries = require('../db/queries/shop.queries')
const { sendSuccess, sendCreated, sendNotFound } = require('../utils/response')

const getShops = async (req, res, next) => {
  try {
    const shops = await ShopQueries.findAll(req.query)
    sendSuccess(res, shops)
  } catch (error) { next(error) }
}

const getShopById = async (req, res, next) => {
  try {
    const shop = await ShopQueries.findById(req.params.id)
    if (!shop) return sendNotFound(res, 'Shop not found')
    sendSuccess(res, shop)
  } catch (error) { next(error) }
}

const createShop = async (req, res, next) => {
  try {
    const { address, area, city, pincode, local_ip, ...shopData } = req.body
    const newShop = await ShopQueries.create(shopData, { address, area, city, pincode, local_ip })
    sendCreated(res, newShop, 'Shop created successfully')
  } catch (error) { next(error) }
}

const updateShopStatus = async (req, res, next) => {
  try {
    const updated = await ShopQueries.updateStatus(req.params.id, req.body.status)
    sendSuccess(res, updated, 'Shop status updated')
  } catch (error) { next(error) }
}

const updateShop = async (req, res, next) => {
  try {
    const { address, area, city, pincode, local_ip, ...shopData } = req.body
    const addressData = { address, area, city, pincode, local_ip }
    
    // Remote empty fields from addressData
    Object.keys(addressData).forEach(key => addressData[key] === undefined && delete addressData[key])
    
    const updated = await ShopQueries.update(req.params.id, shopData, addressData)
    sendSuccess(res, updated, 'Shop profile updated successfully')
  } catch (error) { next(error) }
}

const getMyShop = async (req, res, next) => {
  try {
    const email = req.user?.email
    console.log('[getMyShop] user email:', email, '| user:', JSON.stringify(req.user))
    if (!email) return sendNotFound(res, 'No email on authenticated user')
    const shop = await ShopQueries.findByEmail(email)
    console.log('[getMyShop] found shop:', JSON.stringify(shop))
    if (!shop) return sendNotFound(res, 'No shop found for this account')
    sendSuccess(res, shop)
  } catch (error) {
    console.error('[getMyShop] ERROR:', error.message, error.stack)
    next(error)
  }
}

module.exports = { getShops, getShopById, getMyShop, createShop, updateShopStatus, updateShop }
