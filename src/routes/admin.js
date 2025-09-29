const express = require('express')
const router = express.Router()
const pool = require('../db.js')
const authMiddleware = require('./middlewares/authMiddleware.js')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv').config()
const JWT_SECRET = process.env.JWT_SECRET
const options = require('./middlewares/options.js')


//Ruta para borrar la cuenta y todos sus datos
router.get('/admin/delete_user/:id_cuenta', authMiddleware, async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();

        const id_usuario = req.user.id;

        const [user_is_admin] = await conn.query('SELECT * FROM usuarios WHERE id = ? and rol = "admin"',[id_usuario])

        if (user_is_admin.length===0) {
            return res.json({deleted:false,message:'Solo el administrador puede borrar este perfil'})
        }

        const id_cuenta = req.params.id_cuenta

        await conn.query('DELETE FROM usuarios WHERE id = ?', [id_cuenta]);

        await conn.query(`
            UPDATE categorias c
            LEFT JOIN (
                SELECT id_categoria, COUNT(*) as count
                FROM hilos
                GROUP BY id_categoria
            ) t ON c.id = t.id_categoria
            SET c.counter = IFNULL(t.count, 0)
        `);

        await conn.query(`
            UPDATE hilos h
            LEFT JOIN (
                SELECT id_hilo, COUNT(*) as count
                FROM mensajes
                GROUP BY id_hilo
            ) m ON h.id = m.id_hilo
            SET h.mensajes = IFNULL(m.count, 0)
        `);

        console.log('Todo borrado con éxito');
        return res.json({ deleted: true });

    } catch (error) {
        console.log('Error:', error);
        return res.json({ deleted: false, message:'Error al borrar al usuario' })
    } finally {
        if (conn) conn.release();
    }
});


//Ruta de usuarios
router.get('/admin/users',authMiddleware,async(req,res)=>{
    let conn
    console.log('R>utilla de usuaricillos');
    
    try {
        conn = await pool.getConnection()

        if (req.user.rol != 'admin') {
            console.log('No eres admin');
            
            return res.json({message:'Debes ser administrador para entrar aquí'})
        }

        console.log('Eres admin');
        

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
        `

        const [data] = await conn.query(consulta,[req.user.id])

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

//Ruta de usuarios
router.get('/admin/users',authMiddleware,async(req,res)=>{
    let conn
    console.log('R>utilla de usuaricillos');
    
    try {
        conn = await pool.getConnection()

        if (req.user.rol != 'admin') {
            console.log('No eres admin');
            
            return res.json({message:'Debes ser administrador para entrar aquí'})
        }

        console.log('Eres admin');
        

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
        `

        const [data] = await conn.query(consulta,[req.user.id])

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