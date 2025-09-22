const csruf = require('csurf')

const CSRFProtection = csruf({cookie:true})


module.exports = CSRFProtection