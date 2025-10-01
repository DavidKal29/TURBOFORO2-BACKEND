const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const pool = require('../db.js')
const {body, validationResult} = require('express-validator')
const CSRFProtection = require('./middlewares/csrf.js')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv').config()
const JWT_SECRET = process.env.JWT_SECRET
const transporter = require('../utils/transporter.js')


//Validador del email de recuperación de contraseña
const validadorRecuperarPassword = [
        body('email')
        .trim()
        .notEmpty().withMessage('Email no puede estar vacío')
        .isEmail().withMessage('Debes poner un email válido')
        .normalizeEmail()
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .escape()
    ]

//Ruta para enviar correo de recuperación
router.post('/recuperarPassword',validadorRecuperarPassword,CSRFProtection,async(req,res)=>{
    let conn
    try{

        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            return res.status(400).json({error:errors.array()[0]})
        }

        conn = await pool.getConnection()
        const {email} = req.body
        const [user_exists] = await conn.query('SELECT * FROM usuarios WHERE email = ?',[email])
        if (user_exists.length>0) {
            const token = jwt.sign({email:email},JWT_SECRET)
            
            const mailOptions = {
                from: process.env.CORREO,
                to: email,
                subject: "Recuperación de Contraseña",
                text: `Para recuperar la contraseña entra en este enlace -> ${process.env.FRONTEND_URL}/change_password/${token}`
            };
            
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log("Error al enviar:", error);
                    return res.json({"message":"Error al enviar correo"})
                }
            });
            
            await conn.query('UPDATE usuarios SET token = ? WHERE email = ?',[token,email])
            res.json({"message":"Correo enviado"})
        }else{
            res.json({"message":"No hay ninguna cuenta asociada a este correo"})
        }
    }catch(error){
        res.status(500).json({message:"Error en recuperarPassword"})
    }finally{
        if (conn) conn.release();
    }
})

//Validador de cambio de contraseña
const validadorChangePassword = [
        
        body('new_password')
        .trim()
        .notEmpty().withMessage('Password no puede estar vacío')
        .matches(/\d/).withMessage('Mínimo un dígito')
        .isLength({min:8,max:30}).withMessage('Password debe contener entre 8 y 30 carácteres')
        .matches(/[A-Z]/).withMessage('Mínimo una mayúscula en Password')
        .matches(/[#$€&%]/).withMessage('Mínimo un carácter especial en Password')
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .escape()
        
    ]


//Ruta para cambiar contraseña
router.post('/cambiarPassword/:token',validadorChangePassword,CSRFProtection,async(req,res)=>{
    let conn
    try{
        const errors = validationResult(req)

        const token = req.params.token
        conn = await pool.getConnection()
       
        const decoded = jwt.verify(token,JWT_SECRET)
        const email = decoded.email
        
        const [data] = await conn.query('SELECT token FROM usuarios WHERE email = ? and token = ?',[email,token])
        
        if (data.length>0) {
            const {new_password,confirm_password} = req.body
            if (new_password===confirm_password) {
                const [datos] = await conn.query('SELECT password FROM usuarios WHERE email = ?',[email])
                if (datos.length>0) {
                    const password_equals = await bcrypt.compare(new_password,datos[0].password)
                    if (password_equals) {
                        res.json({"message":"La nueva contraseña no puede ser igual a la anterior"})
                    }else{
                        if (!errors.isEmpty()) {
                            return res.status(400).json({error:errors.array()[0]})
                        }else{
                            const new_encripted_password = await bcrypt.hash(new_password,10)
                            await conn.query('UPDATE usuarios SET password = ? WHERE email = ?',[new_encripted_password,email])
                            await conn.query('UPDATE usuarios SET token = "" WHERE email = ?',[email])
                            return res.json({"message":"Contraseña cambiada con éxito"})
                        }
                        
                    }
                }
            }else{
                res.json({"message":"Contraseñas no coinciden"})
            }
        }else{
            res.json({"message":"Token inválido o expirado"})
        }
    }catch(error){
        res.json({"message":"El enlace que estás usando es inválido"})
    }finally{
        if (conn) conn.release();
    }
})

module.exports = router