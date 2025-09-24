const csruf = require('csurf')

const CSRFProtection = csruf({
    cookie: {
        httpOnly: true,
        secure: true, 
        sameSite: 'none'
    }
})


module.exports = CSRFProtection