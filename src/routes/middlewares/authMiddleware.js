const jwt = require('jsonwebtoken')
const dotenv = require('dotenv').config()
const JWT_SECRET = process.env.JWT_SECRET


//Middleware para verificar que el usuario está logueado
const authMiddleware = async(req,res,next) =>{
    try {
        const token = req.cookies.token
        if (!token) {
            res.status(401).json({loggedIn:false, "message":"No estas autorizado"})
        }else{
            try {
                const payload = jwt.verify(token,JWT_SECRET)

                req.user = payload
                
                next()        

            } catch (error) {
                res.status(401).json({loggedIn:false, "message":"No estas autorizado"})
            }

        }
    } catch (error) {
        res.status(401).json({loggedIn:false, "message":"No estas autorizado"})
    }
}

module.exports = authMiddleware