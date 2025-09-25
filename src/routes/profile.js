const express = require('express')
const router = express.Router()
const pool = require('../db.js')
const {body, validationResult} = require('express-validator')
const CSRFProtection = require('./middlewares/csrf.js')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv').config()
const JWT_SECRET = process.env.JWT_SECRET
const authMiddleware = require('./middlewares/authMiddleware.js')
const options = require('./middlewares/options.js')

//Ruta del perfil
router.get('/perfil',authMiddleware,(req,res)=>{
    try {  
        res.json({loggedIn:true,user:req.user})
    } catch (error) {
        res.json({loggedIn:false})
    }
    
})

//Validador de los inputs de editar perfil
const validadorEditPerfil = [
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

        body('description')
        .trim()
        .isLength({min:0, max:500}).withMessage('Máximo 500 carácteres')
        .customSanitizer(val=>val.replace(/\s+/g, ' '))
        .escape()
        
    ]


//Ruta para editar el perfil
router.post('/editar_perfil',validadorEditPerfil,CSRFProtection,authMiddleware,async(req,res)=>{

    let conn
    try {
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            return res.status(400).json({error:errors.array()[0]})
        }

        const {email,username,description} = req.body

        if (email == req.user.email && username == req.user.username && description === req.user.description) {
            res.json({changed:false, message:"Asegurate que al menos un campo sea distinto al original"})
        }else{
            conn = await pool.getConnection()

            const [data] = await conn.query('SELECT email, username FROM usuarios WHERE (email = ? or username = ?) and id != ?',[email, username,req.user.id])

            if (data.length>0) {
                res.json({changed:false, message:"Email o username ya están en uso"})
            
            }else{
                await conn.query('UPDATE usuarios SET email = ?, username = ?, description = ? WHERE id = ?',[email,username,description,req.user.id])

                const new_user = {...req.user,email:email,username:username,description:description}

                const token = jwt.sign(new_user,JWT_SECRET)

                res.cookie('token',token,options)

                res.json({changed:true, message:"Datos cambiados con éxito"})
            }
        }
        
    } catch (error) {
        res.status(400).json({changed:false, message:"Error al enviar los datos"})
        
    }finally{
        if (conn) conn.release();
    }
})





//Ruta para editar el avatar
router.post('/editar_avatar',authMiddleware,async(req,res)=>{
    let conn
    try {
        const {id_avatar} = req.body

        if (id_avatar>24 || id_avatar<1) {
            console.log("El id del avatar es invalido");
            
            res.json({changed:false, message:"El id del avatar es inválido"})
        }else{
            conn = await pool.getConnection()

            console.log("El id del avatar es valido");

            await conn.query('UPDATE usuarios SET id_avatar = ? WHERE id = ?',[id_avatar,req.user.id])

            const new_user = {...req.user,avatar:id_avatar}

            const token = jwt.sign(new_user,JWT_SECRET)

            res.cookie('token',token,options)

            res.json({changed:true, message:"Avatar cambiado con éxito"})
        }
    } catch (error) {
        res.json({changed:false, message:"Error al cambiar el avatar"})
    }finally{
        if (conn) conn.release();
    }
    
})


module.exports = router
