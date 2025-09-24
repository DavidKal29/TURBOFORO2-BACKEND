const express = require('express')
const router = express.Router()
const pool = require('../db.js')
const authMiddleware = require('./middlewares/authMiddleware.js')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv').config()
const JWT_SECRET = process.env.JWT_SECRET



//Ruta para eliminar un hilo
router.get('/delete/:id_hilo',authMiddleware,async(req,res)=>{
    let conn;
    try {
       const conn = await pool.getConnection()

       const id_hilo = req.params.id_hilo

       console.log('El id del hilo:',id_hilo);
       
       const id_usuario = req.user.id

       const [data] = await conn.query('SELECT * FROM hilos WHERE id = ? and id_usuario = ?',[id_hilo,id_usuario])

       if (data.length>0) {
        const id_categoria = data[0].id_categoria


        await conn.query('DELETE FROM hilos WHERE id = ? and id_usuario = ?',[id_hilo,id_usuario])

        await conn.query('UPDATE categorias SET counter = counter - 1 WHERE id = ?',[id_categoria])

        const [messages] = await conn.query('SELECT COUNT(distinct id) as count FROM mensajes WHERE id_usuario = ?',[id_usuario])

        let mensajes
        
        if (messages.length>0) {
            mensajes = messages[0].count
        }else{
            mensajes = 0
        }

        const new_user = {...req.user,mensajes:mensajes, hilos: req.user.hilos - 1 }
            
        const token = jwt.sign(new_user,JWT_SECRET)

        res.cookie('token',token,{
            httpOnly: true,
            sameSite:'none',
            secure:true
        })

        return res.json({deleted:true})
        
       }else{
        return res.json({deleted:false,message:'Hilo inexistente o invalido para borrar'})
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
    try {
        console.log('Hemos entrado en la rutilla prohibidilla');
        
        conn = await pool.getConnection()

        const id_mensaje = req.params.id_mensaje
        console.log('El id del mensaje:', id_mensaje);
       
        const id_usuario = req.user.id

        const [data] = await conn.query(
            'SELECT * FROM mensajes WHERE id = ? AND id_usuario = ?',
            [id_mensaje, id_usuario]
        )

        if (data.length > 0) {
            const id_hilo = data[0].id_hilo

            const [primerMensaje] = await conn.query(
                'SELECT id FROM mensajes WHERE id_hilo = ? ORDER BY id ASC LIMIT 1',
                [id_hilo]
            )

            if (primerMensaje.length > 0 && primerMensaje[0].id == id_mensaje) {
                console.log('No puedes borrar el primer mensaje del hilo');
                return res.json({ deleted: false, message: 'No puedes borrar el primer mensaje del hilo' })
            }

            await conn.query('DELETE FROM mensajes WHERE id = ? AND id_usuario = ?', [id_mensaje, id_usuario])

            const [total] = await conn.query('SELECT COUNT(distinct id) as count FROM mensajes WHERE id_hilo = ?', [id_hilo])

            let mensajes_totales
            if (total.length > 0) {
                mensajes_totales = total[0].count
            } else {
                mensajes_totales = 0
            }

            await conn.query('UPDATE hilos SET mensajes = ? WHERE id = ?', [mensajes_totales, id_hilo])

            const [messages] = await conn.query('SELECT COUNT(distinct id) as count FROM mensajes WHERE id_usuario = ?', [id_usuario])

            let mensajes
            if (messages.length > 0) {
                mensajes = messages[0].count
            } else {
                mensajes = 0
            }

            const new_user = { ...req.user, mensajes: mensajes }
            const token = jwt.sign(new_user, JWT_SECRET)

            res.cookie('token', token, {
                httpOnly: true,
                sameSite: 'none',
                secure: true
            })
            
            console.log('Mensaje borrado correctamente');
            return res.json({ deleted: true })
        } else {
            console.log('El mensaje que intentas borrar no existe');
            return res.json({ deleted: false, message: 'El mensaje que intentas borrar no existe' })
        }

    } catch (error) {
        console.log('EL error:', error);
        return res.json({ deleted: false, message: 'Error al intentar borrar el mensaje' })
    } finally {
        if (conn) conn.release();
    }
})


//Ruta para borrar la cuenta y todos sus datos
router.get('/borrar_cuenta', authMiddleware, async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();

        const id_usuario = req.user.id;

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

    } catch (error) {
        console.log('Error:', error);
        return res.json({ deleted: false })
    } finally {
        if (conn) conn.release();
    }
});


module.exports = router