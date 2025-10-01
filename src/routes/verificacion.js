const express = require('express')
const router = express.Router()
const pool = require('../db.js')
const authMiddleware = require('./middlewares/authMiddleware.js')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv').config()
const JWT_SECRET = process.env.JWT_SECRET
const {apiInstance, brevo} = require('../utils/brevo.js')
const options = require('./middlewares/options.js')

// Ruta para enviar la verificación por email
router.post('/enviar_verificacion', authMiddleware, async (req, res) => {
    console.log(process.env.CORREO);
    

    try {
        const { email } = req.body

        const token = jwt.sign({ email: email }, JWT_SECRET, { expiresIn: '5m' })
        console.log('El token:', token)

        const sendSmtpEmail = {
            sender: { name: "TurboForo2", email: process.env.CORREO },
            to: [{ email }],
            subject: "Verificación",
            textContent: `Para verificar la cuenta, entra a -> ${process.env.BACKEND_URL}/verificar/${token}`,
            htmlContent: `<p>Para verificar la cuenta, entra a -> <a href="${process.env.BACKEND_URL}/verificar/${token}">Verificar</a></p>`
        };
        

        await apiInstance.sendTransacEmail(sendSmtpEmail)

        return res.json({message:'Correo enviado con exito'})

    } catch (error) {
        console.error(error)
        return res.json({ message: "Error al mandar correo de verificación" })
    }
})

//Ruta para marcar como verificado al usuario
router.get('/verificar/:token',authMiddleware,async(req,res)=>{
    let conn
    try {

        console.log('El tokencillo va');
        
        const token = req.params.token

        console.log('El token en verificar:',token);

        conn = await pool.getConnection()

        const decoded = jwt.verify(token,JWT_SECRET)

        const [data] = await conn.query('SELECT verificado FROM usuarios WHERE email = ? and verificado = 0',[decoded.email])

        console.log('la data:',data);
        
        if (data.length>0) {
            await conn.query('UPDATE usuarios SET verificado = 1 WHERE email = ?',[decoded.email])

            const new_user = {...req.user, verificado:1}

            console.log(new_user);

            const token = jwt.sign(new_user,JWT_SECRET)

            res.cookie('token',token,options)

             res.send(`
                    <!doctype html>
                    <html lang="es">
                        <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1" />
                        <title>Correo verificado</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        </head>
                        <body class="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                        <div class="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
                            <div class="mx-auto w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            </div>
                            <h1 class="text-2xl font-semibold text-gray-800 mb-2">¡Correo verificado!</h1>
                            <p class="text-sm text-gray-500 mb-6">Gracias — tu dirección de email ha sido confirmada correctamente.</p>
                            <hr class="my-6" />
                            <p class="text-xs text-gray-400">Si no hiciste esta acción, contacta con soporte.</p>
                        </div>
                        </body>
                    </html>`
                )
        }else{
            res.send('Correo ya verificado o incorrecto')
        }


    } catch (error) {
        res.send('Enlace Inválido o Expirado')
    }finally{
        if (conn) conn.release();
    }

})

module.exports = router