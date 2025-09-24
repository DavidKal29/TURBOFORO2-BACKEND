const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const pool = require('../db.js')
const {body, validationResult} = require('express-validator')
const CSRFProtection = require('./middlewares/csrf.js')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv').config()
const JWT_SECRET = process.env.JWT_SECRET
const authMiddleware = require('./middlewares/authMiddleware.js')


//Ruta de login
router.post('/login',CSRFProtection,async(req,res)=>{
    let conn
    try{
        let {email,password} = req.body

        conn = await pool.getConnection()
        
        const consulta = `
            SELECT 
                u.id, 
                u.email, 
                u.username,
                u.password, 
                u.id_avatar, 
                u.description, 
                u.rol, 
                u.verificado,
                COUNT(DISTINCT h.id) AS hilos, 
                COUNT(DISTINCT m.id) AS mensajes,
                DATE_FORMAT(u.fecha_registro, "%d %M %Y") AS fecha, 
                TIMESTAMPDIFF(YEAR, u.fecha_registro, NOW()) AS veterania
            FROM usuarios u
            LEFT JOIN hilos h ON u.id = h.id_usuario
            LEFT JOIN mensajes m ON u.id = m.id_usuario
            WHERE u.email = ?
            GROUP BY u.id, u.email, u.username, u.id_avatar, u.description, u.rol, u.fecha_registro;

        `
        
        const [user_exists] = await conn.query(consulta,[email])

        if (user_exists.length>0) {
            const equalPassword = await bcrypt.compare(password,user_exists[0].password)

            if (equalPassword) {
                
                const user = {
                    id: user_exists[0].id,
                    email: user_exists[0].email,
                    username: user_exists[0].username,
                    avatar: user_exists[0].id_avatar,
                    description: user_exists[0].description,
                    hilos: user_exists[0].hilos,
                    mensajes: user_exists[0].mensajes,
                    fecha_registro: user_exists[0].fecha,
                    verificado: user_exists[0].verificado,
                    rol: user_exists[0].rol,
                    veterania: user_exists[0].veterania
                }
                
                const token = jwt.sign(user,JWT_SECRET,{expiresIn:'1h'})

                res.cookie('token',token,{
                    httpOnly: true,
                    secure: true,
                    maxAge: 3600 * 1000,
                    sameSite:'none'
                })

                res.json({"user":user_exists[0],"message":"Usuario logueado con éxito"})
            }else{
                res.json({"message":"Contraseña o Email Incorrectos"})
            }
        }else{
            res.json({"message":"Contraseña o Email Incorrectos"})
        }
    }catch(error){
        console.log(error);
        
        res.status(500).json({message:"Error en login"})
    }finally{
        if (conn) conn.release();
    }
})


//Validador de los inputs del register
const validadorRegister = [
        body('email')
        .trim()
        .notEmpty().withMessage('Email no puede estar vacío')
        .isEmail().withMessage('Debes poner un email válido')
        .normalizeEmail()
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .escape(),

        body('username')
        .trim()
        .notEmpty().withMessage('Username no puede estar vacío')
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .isLength({min:5,max:15}).withMessage('Username debe contener entre 5 y 15 carácteres')
        .matches(/^[a-zA-Z0-9_.]+$/).withMessage('Solo se permiten letras, números, guion bajo y punto')
        .matches(/[a-zA-Z]/).withMessage('Mínimo una letra en Username')
        .escape(),

        body('password')
        .trim()
        .notEmpty().withMessage('Password no puede estar vacío')
        .matches(/\d/).withMessage('Mínimo un dígito')
        .isLength({min:8,max:30}).withMessage('Password debe contener entre 8 y 30 carácteres')
        .matches(/[A-Z]/).withMessage('Mínimo una mayúscula en Password')
        .matches(/[#$€&%]/).withMessage('Mínimo un carácter especial en Password')
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .escape()
        
    ]


//Ruta de register
router.post('/register',validadorRegister,CSRFProtection,async(req,res)=>{
    let conn
    try{
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            return res.status(400).json({error:errors.array()[0]})
        }

        let {email,username,password} = req.body
        conn = await pool.getConnection()
        const encriptedPassword = await bcrypt.hash(password,10)
        const [user_exists] = await conn.query('SELECT * FROM usuarios WHERE email = ? or username = ?',[email,username])
        
        if (user_exists.length>0) {
            console.log('El usuario ya existe');
            
            res.json({"message":"El usuario ya existe"})
        }else{
            await conn.query('INSERT INTO usuarios (email, username, password) VALUES (?,?,?)',[email,username,encriptedPassword])
            
            const consulta = `
                SELECT 
                    u.id, 
                    u.email, 
                    u.username, 
                    u.id_avatar, 
                    u.description, 
                    u.rol, 
                    u.verificado,
                    COUNT(DISTINCT h.id) AS hilos, 
                    COUNT(DISTINCT m.id) AS mensajes,
                    DATE_FORMAT(u.fecha_registro, "%d %M %Y") AS fecha, 
                    TIMESTAMPDIFF(YEAR, u.fecha_registro, NOW()) AS veterania
                FROM usuarios u
                LEFT JOIN hilos h ON u.id = h.id_usuario
                LEFT JOIN mensajes m ON u.id = m.id_usuario
                WHERE u.email = ?
                GROUP BY u.id, u.email, u.username, u.id_avatar, u.description, u.rol, u.fecha_registro;

            `

            const [user_exists] = await conn.query(consulta,[email])
                
            const user = {
                id: user_exists[0].id,
                email: user_exists[0].email,
                username: user_exists[0].username,
                avatar: 16,
                description: user_exists[0].description,
                hilos: user_exists[0].hilos,
                mensajes: user_exists[0].mensajes,
                fecha_registro: user_exists[0].fecha,
                verificado: user_exists[0].verificado,
                rol: user_exists[0].rol,
                veterania: user_exists[0].veterania
            }

            const token = jwt.sign(user,JWT_SECRET,{expiresIn:'1h'})

            res.cookie('token',token,{
                httpOnly: true,
                secure: true,
                maxAge: 3600 * 1000,
                sameSite:'none'
            })

            res.json({"user":user,"message":"El usuario ha sido registrado"})
        }
    }catch(error){
        console.log(error);
        res.status(500).json({message:"Error en register"})
    }finally{
        if (conn) conn.release();
    }
})


//Ruta para cerrar sesión
router.get('/logout',authMiddleware,(req,res)=>{
    try {
        res.clearCookie('token',{httpOnly:true, secure:true, sameSite:'none'})
        res.json({loggedOut:true})
        
    } catch (error) {
        res.json({loggedOut:false})
    }
    
})

module.exports = router