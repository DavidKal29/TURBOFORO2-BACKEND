const jwt = require('jsonwebtoken')
const dotenv = require('dotenv').config()
const JWT_SECRET = process.env.JWT_SECRET


//Middleware para verificar que el usuario está logueado
const authMiddleware = async(req,res,next) =>{
    try {
        const token = req.cookies.token
        if (!token) {
            res.status(401).json({loggedIn:false, "message":"Token inexistente"})
        }else{
            try {
                const payload = jwt.verify(token,JWT_SECRET)

                req.user = payload
                
                next()        

            } catch (error) {
                res.status(401).json({loggedIn:false, "message":"Token inválido"})
            }

        }
    } catch (error) {
        res.status(401).json({loggedIn:false, "message":"Token inválido"})
    }
}

module.exports = authMiddleware