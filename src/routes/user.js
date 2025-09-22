const express = require('express')
const router = express.Router()
const pool = require('../db.js')


//Ruta para obtener los datos públicos de un usuario
router.get('/usuario/:id_usuario',async(req,res)=>{
    let conn
    try {
        conn = await pool.getConnection()
        const id_usuario = req.params.id_usuario

        console.log('Hemos recibido peticiones a esta url');

        const consulta = `
            SELECT 
                u.id, 
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
            WHERE u.id = ?
            GROUP BY u.id, u.email, u.username, u.id_avatar, u.description, u.rol, u.fecha_registro;

        `

        const [user_exists] = await conn.query(consulta,[id_usuario])

        if (user_exists.length>0) {
            const user_data = {
                id: user_exists[0].id,
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
            
            return res.json({user_data: user_data})

        }else{ 
            return res.json({user_data:null})
        }
        
    } catch (error) {
        console.log('El error:',error);
        return res.json({user_data:null})
    }finally{
        if (conn) conn.release();
    }
})

module.exports = router