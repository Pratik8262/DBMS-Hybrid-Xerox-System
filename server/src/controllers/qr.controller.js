const os = require('os')
const { sendSuccess } = require('../utils/response')

const getNetworkInfo = (req, res) => {
  const interfaces = os.networkInterfaces()
  const addresses = []
  
  // List of keywords to ignore (usually virtual or internal adapters)
  const ignoreKeywords = ['virtual', 'box', 'wdag', 'wsl', 'vmware', 'docker', 'vpn', 'bridge']

  for (const name in interfaces) {
    const isVirtual = ignoreKeywords.some(keyword => name.toLowerCase().includes(keyword))
    if (isVirtual) continue

    for (const info of interfaces[name]) {
      if (info.family === 'IPv4' && !info.internal) {
        addresses.push(info.address)
      }
    }
  }
  
  // Try to find an IP that starts with the standard local ranges first
  const preferredIp = addresses.find(ip => ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.')) || addresses[0] || 'localhost'

  sendSuccess(res, {
    localIp: preferredIp,
    allIps: addresses,
    port: process.env.PORT || 3000
  }, 'Network info retrieved')
}

const QrQueries = require('../db/queries/qr.queries')

const generate = async (req, res, next) => {
  try {
    const shopId = req.user?.shop_id || req.user?.shopId || process.env.SHOP_ID || 1
    const tokenRecord = await QrQueries.createToken(shopId)
    
    // Explicitly using the Vite Frontend IP and Port provided by the user
    // This allows the mobile phone to access the React interface directly.
    const baseUrl = 'http://10.90.1.48:5173'
    const apiPort = process.env.PORT || 3000
    const url = `${baseUrl}/?token=${tokenRecord.token}&api_port=${apiPort}`

    sendSuccess(res, { url, token: tokenRecord.token, ...tokenRecord }, 'QR token generated')
  } catch (error) {
    next(error)
  }
}

const consume = async (req, res, next) => {
  try {
    const { token } = req.body
    if (!token) return res.status(400).json({ success: false, message: 'Token is required' })
    
    const validToken = await QrQueries.consumeToken(token)
    if (!validToken) return res.status(403).json({ success: false, message: 'Invalid or expired QR token' })

    const SessionQueries = require('../db/queries/session.queries')
    const { generateUuid } = require('../utils/uuid')
    const NetworkQueries = require('../db/queries/network.queries')
    const primaryNetwork = await NetworkQueries.findPrimaryByShop(validToken.shop_id)
    
    const isLocal = process.env.SERVER_MODE === 'local' ? 1 : true
    const session = await SessionQueries.create({
      uuid: generateUuid(),
      user_id: null,
      shop_id: validToken.shop_id,
      network_id: primaryNetwork ? primaryNetwork.network_id : null,
      is_local: isLocal,
      qr_token: token
    })
    
    sendSuccess(res, { session_id: session.session_id, shop_id: validToken.shop_id }, 'Token consumed')
  } catch (error) { next(error) }
}

module.exports = { getNetworkInfo, generate, consume }
