const express = require('express')
const router = express.Router()
const pool = require('../db.js')
const authMiddleware = require('./middlewares/authMiddleware.js')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv').config()
const JWT_SECRET = process.env.JWT_SECRET
const options = require('./middlewares/options.js')

//Ruta para obtener el contador de usuario
router.get('/admin/users_counter',authMiddleware,async(req,res)=>{
    let conn
    console.log('Ruta de usuarios contador');
    
    try {
        conn = await pool.getConnection()


        if (req.user.rol != 'admin') {
            console.log('No eres admin');
            
            return res.json({message:'Debes ser administrador para entrar aquí'})
        }

        console.log('Eres admin');
        

        const consulta = `
            SELECT COUNT(distinct id) as counter FROM usuarios WHERE id != ?
        `

        const [data] = await conn.query(consulta,[req.user.id])

        if (data.length>0) {
            console.log('Contador obtenido');

            console.log(data.length);
            
            
            return res.json({counter:data[0].counter})
        }else{
            console.log('Contador no obtenido');
            
            return res.json({message:'No hay usuarios'})
        }
        
    } catch (error) {
        console.log('El error en cuestión:');
        console.log(error);
        
        return res.json({message:'Sucedió un error al intentar obtener el cunter de los usuarios'})
        
    }finally{
        if (conn) conn.release();
    }
})

//Ruta de usuarios
router.get('/admin/users/:page',authMiddleware,async(req,res)=>{
    let conn
    console.log('R>utilla de usuaricillos');
    
    try {
        conn = await pool.getConnection()

        if (req.user.rol != 'admin') {
            console.log('No eres admin');
            
            return res.json({message:'Debes ser administrador para entrar aquí'})
        }

        console.log('Eres admin');

        const page = req.params.page
        const offset = 20 * (page - 1);
        

        const consulta = `
            SELECT 
                u.id, 
                u.email,
                u.username,
                u.id_avatar, 
                u.rol, 
                DATE_FORMAT(u.fecha_registro, "%d %M %Y") AS fecha
            FROM usuarios u
            WHERE u.id != ?
            ORDER BY fecha_registro DESC
            LIMIT 20
            OFFSET ?
        `

        const [data] = await conn.query(consulta,[req.user.id,offset])

        if (data.length>0) {
            console.log('Usuarios obtenidos');

            console.log(data.length);
            
            
            return res.json({users:data})
        }else{
            console.log('Usuarios no obtenidos');
            
            return res.json({message:'No hay usuarios'})
        }
        
    } catch (error) {
        console.log('El error en cuestión:');
        console.log(error);
        
        return res.json({message:'Sucedió un error al intentar obtener los usuarios'})
        
    }finally{
        if (conn) conn.release();
    }
})




module.exports = router