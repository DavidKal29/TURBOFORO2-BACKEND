const express = require('express')
const router = express.Router()
const pool = require('../db.js')
const authMiddleware = require('./middlewares/authMiddleware.js')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv').config()
const JWT_SECRET = process.env.JWT_SECRET
const options = require('./middlewares/options.js')



//Ruta para eliminar un hilo
router.get('/delete_thread/:id_hilo',authMiddleware,async(req,res)=>{
    let conn;
    let admin;
    let author;
    try {
        conn = await pool.getConnection()

        const id_hilo = req.params.id_hilo

        const [thread_exists] = await conn.query('SELECT * FROM hilos WHERE id = ?',[id_hilo])

        if (thread_exists.length<=0) {
            return res.json({deleted: false, message: 'El hilo que intentas borrar no existe'})
        }
       
        const id_usuario = req.user.id

        const [is_admin] = await conn.query('SELECT * FROM usuarios WHERE id = ? and rol = "admin"',[id_usuario])

        if (is_admin.length>0) {
            console.log('EL usuario es admin');
            admin = true
            
        }else{
            console.log('El usuario no es admin');
            admin = false 
        }

        const [data] = await conn.query('SELECT * FROM hilos WHERE id = ? and id_usuario = ?',[id_hilo,id_usuario])

        if (data.length > 0) {
            console.log('EL usuario es autor del hilo');
            author = true
            
        } else {
            console.log('El usuario no es autor del hilo');
            author = false
        }

        const id_categoria = thread_exists[0].id_categoria

        if (admin || author) {
            

            if (admin) {
                await conn.query('DELETE FROM hilos WHERE id = ?',[id_hilo])
            }else if (author) {
                await conn.query('DELETE FROM hilos WHERE id = ? and id_usuario = ?',[id_hilo,id_usuario])
            }

            await conn.query('UPDATE categorias SET counter = counter - 1 WHERE id = ?',[id_categoria])

            return res.json({deleted:true})
        }else{
            return res.json({deleted:false,message:'No tienes permisos sobre este hilo'})
        }
    
    } catch (error) {
        console.log('EL error:',error);
        
        return res.json({deleted:false,message:'Error al intentar borrar el hilo'})
    }finally{
        if (conn) conn.release();
    }
})


//Ruta para eliminar un mensaje de un hilo
router.get('/delete_message/:id_mensaje', authMiddleware, async (req, res) => {
    let conn;
    let admin;
    let author;
    try {
        console.log('Hemos entrado en la rutilla prohibidilla');
        
        conn = await pool.getConnection()

        const id_mensaje = req.params.id_mensaje
       
        const id_usuario = req.user.id

        const [message_exists] = await conn.query('SELECT * FROM mensajes WHERE id = ?',[id_mensaje])

        if (message_exists.length<=0) {
            return res.json({deleted: false, message: 'El mensaje que intentas borrar no existe'})
        }


        const [is_admin] = await conn.query('SELECT * FROM usuarios WHERE id = ? and rol = "admin"',[id_usuario])

        if (is_admin.length>0) {
            console.log('EL usuario es admin');
            admin = true
            
        }else{
            console.log('El usuario no es admin');
            admin = false 
        }

        const [data] = await conn.query('SELECT * FROM mensajes WHERE id = ?',[id_mensaje, id_usuario])

        if (data.length > 0) {
            console.log('EL usuario es autor del mensaje');
            author = true
            
        } else {
            console.log('El usuario no es autor del mensaje');
            author = false
        }


        const id_hilo = message_exists[0].id_hilo

        if (admin || author) {
            
            console.log('El hilo id:',id_hilo);
            

            const [primerMensaje] = await conn.query(
                'SELECT id FROM mensajes WHERE id_hilo = ? ORDER BY id ASC LIMIT 1',
                [id_hilo]
            )

            if (primerMensaje.length > 0 && primerMensaje[0].id == id_mensaje) {
                console.log('No puedes borrar el primer mensaje del hilo');
                return res.json({ deleted: false, message: 'No puedes borrar el primer mensaje del hilo' })
            }

            if (admin) {
                await conn.query('DELETE FROM mensajes WHERE id = ?', [id_mensaje])
            }else if (author) {
                await conn.query('DELETE FROM mensajes WHERE id = ? and id_usuario = ?', [id_mensaje, id_usuario])
            }
           

            const [total] = await conn.query('SELECT COUNT(distinct id) as count FROM mensajes WHERE id_hilo = ?', [id_hilo])

            let mensajes_totales
            if (total.length > 0) {
                mensajes_totales = total[0].count
            } else {
                mensajes_totales = 0
            }

            await conn.query('UPDATE hilos SET mensajes = ? WHERE id = ?', [mensajes_totales, id_hilo])

            
            console.log('Mensaje borrado correctamente');
            return res.json({ deleted: true })
        }else{
            return res.json({ deleted: false, message: 'No tienes permisos sobre este mensaje' })
        }


    } catch (error) {
        console.log('EL error:', error);
        return res.json({ deleted: false, message: 'Error al intentar borrar el mensaje' })
    } finally {
        if (conn) conn.release();
    }
})


//Ruta para borrar la cuenta y todos sus datos
router.get('/delete_account/:id_usuario', authMiddleware, async (req, res) => {
    let conn;
    let author;
    let admin;
    try {
        conn = await pool.getConnection();

        const id_usuario = Number(req.params.id_usuario)

        const [user_exists] = await conn.query('SELECT * FROM usuarios WHERE id = ?',[id_usuario])

        if (user_exists.length<=0) {
            return res.json({deleted: false, message: 'El usuario que intentas borrar no existe'})
        }

        const [is_admin] = await conn.query('SELECT * FROM usuarios WHERE id = ? and rol = "admin"',[req.user.id])

        if (is_admin.length>0) {
            console.log('EL usuario que intenta borrar al otro, es admin');
            admin = true
            
        }else{
            console.log('El usuario que intenta borrar al otro, no es admin');
            admin = false 
        }

        if (req.user.id === id_usuario) {
            console.log('EL usuario es el mismo que va a ser borrado');
            
            author = true
        }else{
            console.log('EL usuario no es el mismo que va a ser borrado');
            
            author = false
        }

        if (author || admin) {
            await conn.query('DELETE FROM usuarios WHERE id = ?', [id_usuario]);

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
        }else{
            console.log('El usuario no tiene permisos sobre esta cuenta');
            return res.json({deleted: false, message: 'No tienes permisos de borrado sobre esta cuenta'})
            
        }

    } catch (error) {
        console.log('Error:', error);
        return res.json({ deleted: false, message:'Error interno al intentar borrar' })
    } finally {
        if (conn) conn.release();
    }
});


module.exports = router