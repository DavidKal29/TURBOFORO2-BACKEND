const express = require('express')
const router = express.Router()
const pool = require('../db.js')
const {body, validationResult} = require('express-validator')
const CSRFProtection = require('./middlewares/csrf.js')
const authMiddleware = require('./middlewares/authMiddleware.js')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv').config()
const JWT_SECRET = process.env.JWT_SECRET


//Ruta para obtener los hilos más recientes y trending
router.get('/hilos_trending',async(req,res)=>{
    let conn
    try {
        conn = await pool.getConnection()

        const consulta = `
            SELECT 
                h.*, 
                DATE_FORMAT(h.fecha_registro, '%M %Y %H:%i') AS fecha, 
                u.username AS username
            FROM hilos AS h
            INNER JOIN usuarios AS u 
                ON h.id_usuario = u.id
            ORDER BY h.mensajes DESC, h.id DESC
            LIMIT 5
        `

        const [hilos] = await conn.query(consulta)

        if (hilos.length>0) {
            return res.json({hilos:hilos})
        }else{
            return res.json({hilos:[]})
        }    
        
    } catch (error) {
        console.log('Error:',error)
        return res.json({message:'Error al obtener los datos'})
       
    }finally{
        if (conn) conn.release();
    }
})


//Validador de los inputs de creación de hilos
const validadorCrearHilo = [
        body('titulo')
        .trim()
        .notEmpty().withMessage('Título no puede estar vacío')
        .isLength({min:5,max:100}).withMessage('Título debe contener entre 5 y 100 carácteres')
        .escape(),

        body('mensaje')
        .trim()
        .notEmpty().withMessage('Mensaje no puede estar vacío')
        .isLength({min:0, max:5000}).withMessage('Máximo 5000 carácteres')
        .customSanitizer(val=>val.replace(/\s+/g, ' '))
        .escape()
        
    ]

//Ruta para crear un hilo
router.post('/crearHilo',authMiddleware,CSRFProtection,validadorCrearHilo,async(req,res)=>{
    let conn
    try {
        const errors = validationResult(req)

        conn = await pool.getConnection()

        
        if (!errors.isEmpty()) {
            console.log('Caemos aqui');
            
            return res.json({error: errors.array()[0].msg})
        }else{

            const [result] = await conn.query('UPDATE usuarios SET last_message_at = CURRENT_TIMESTAMP WHERE id = ? AND last_message_at <= NOW() - INTERVAL 15 SECOND',[req.user.id])

            if (result.affectedRows === 0) {
                return res.json({ error: 'Debes esperar 15 segundos para crear un hilo o mensaje' })
            }
            
            const {titulo,mensaje,categoria} = req.body

            console.log(typeof(req.user.id));
            

            const [data] = await conn.query('SELECT * FROM categorias WHERE id = ?',[categoria])

            if (data.length>0) {
                await conn.query('INSERT INTO hilos (titulo,id_usuario,id_categoria) VALUES (?,?,?)',[titulo,req.user.id,categoria])

                const [data] = await conn.query('SELECT id FROM hilos ORDER BY id DESC LIMIT 1')

                if (data.length>0) {
                    const id_hilo = data[0].id
                    
                    await conn.query('INSERT INTO mensajes (contenido,id_usuario,id_hilo) VALUES (?,?,?)',[mensaje,req.user.id,id_hilo])

                    await conn.query('UPDATE categorias SET counter = counter + 1 WHERE id = ?',[categoria])

                    await conn.query('UPDATE hilos SET mensajes = mensajes + 1 WHERE id = ?',[id_hilo])

                    await conn.query('UPDATE usuarios SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?',[req.user.id])

                    const new_user = {...req.user, hilos: req.user.hilos+1, mensajes: req.user.mensajes+1}

                    const token = jwt.sign(new_user,JWT_SECRET)

                    res.cookie('token',token,{
                        httpOnly: true,
                        secure: false,
                        sameSite: 'lax'
                    })

                    return res.json({message:"Hilo creado con éxito",id_hilo:id_hilo})

                }else{
                    return res.json({message:"No se ha podido recuperar el hilo creado"})
                }
                
            }else{
                return res.json({message:"La categoría que se ha enviado es inexistente"})
            }

        }
    } catch (error) {
        return res.json({message:"Error al crear hilo"})
    }finally {
        if (conn) conn.release();
    }
})

//Ruta para obtener los hilos de una categoría específica
router.get('/hilos/:id_categoria/:page', async (req, res) => {
    let conn
    try {
        conn = await pool.getConnection();
        console.log('Entramos en la ruta de hilos');

        const id_categoria = Number(req.params.id_categoria);
        const page = Number(req.params.page);

        console.log(id_categoria, page);

        const offset = 39 * (page - 1);

        const consulta = `
            SELECT h.*, DATE_FORMAT(h.fecha_registro, '%M %Y %H:%i') as fecha, u.username as username 
            FROM hilos as h
            INNER JOIN usuarios as u 
            ON h.id_usuario = u.id 
            WHERE h.id_categoria = ? 
            ORDER BY id DESC 
            LIMIT 39 OFFSET ?
        `

        const [data] = await conn.query(
            consulta,
            [id_categoria, offset]
        );

        if (data.length > 0) {
            console.log('La respuesta ha obtenido datos');
            res.json({ hilos: data });
        } else {
            console.log('Datos erróneos');
            res.json({ message: 'Datos erróneos' });
        }
    } catch (error) {
        console.error(error);
        res.json({ message: 'Datos erróneos' });
    } finally {
        if (conn) conn.release();
    }
});


//Ruta para obtener los mensajes de un hilo en específico
router.get('/hilo/:id_hilo/:page',async(req,res)=>{
    let conn
    try {
        conn = await pool.getConnection()

        const id_hilo = Number(req.params.id_hilo)
        
        const page = Number(req.params.page)

        console.log('Id del hilo:',id_hilo);
        console.log('Id del page:',page);
        
        const offset = 39 * (page-1)

        const [thread_exists] = await conn.query('SELECT titulo, mensajes, id_usuario FROM hilos WHERE id = ?',[id_hilo])

        if (thread_exists.length>0) {
            const hilo = thread_exists[0]

            const consulta = `
                SELECT 
                    m.*,
                    DATE_FORMAT(m.fecha_registro, '%d %M %Y %H:%i') AS fecha,
                    u.username AS username_mensaje,
                    u.id_avatar,
                    mr.contenido AS contenido_mensaje_respuesta,
                    u_mr.username AS username_mensaje_respuesta,
                    CEIL((
                        SELECT COUNT(*) 
                        FROM mensajes AS temp
                        WHERE temp.id_hilo = m.id_hilo
                        AND temp.id <= mr.id
                    ) / 39) AS page_mensaje_respuesta
                FROM turboforo2.mensajes AS m
                INNER JOIN usuarios AS u ON m.id_usuario = u.id
                LEFT JOIN mensajes AS mr ON m.id_mensaje_respuesta = mr.id
                LEFT JOIN usuarios AS u_mr ON mr.id_usuario = u_mr.id
                WHERE m.id_hilo = ?
                ORDER BY m.id
                LIMIT 39 OFFSET ?;

            `

            const [data] = await conn.query(consulta,[id_hilo,offset])

            

            if (data.length>0) {
                console.log('Los datos tienen length');
                
                res.json({hilo:hilo,mensajes:data})
            }else{
                console.log('Mensajes no obtenidos');
                res.json({message:'No se han encontrado los mensajes'})
            }

        }else{
            res.json({message:'No se ha encontrado el hilo'})
            console.log('El hilo no existe');
            
        }
    } catch (error) {
        console.log('Error al obtener datos del hilo');
        res.json({message:'Error'})
        
    }finally{
        if (conn) conn.release();
    }
    
    
})

//Validador del mensaje que se envía a un hilo
const validadorMensaje = [

        body('mensaje')
        .trim()
        .notEmpty().withMessage('Mensaje no puede estar vacío')
        .isLength({min:0, max:5000}).withMessage('Máximo 5000 carácteres')
        .customSanitizer(val=>val.replace(/\s+/g, ' '))
        .escape()
        
    ]

//Ruta para enviar un mensaje al hilo
router.post('/hilo/:id_hilo', authMiddleware, validadorMensaje, CSRFProtection, async (req, res) => {
    let conn
    try {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.json({ error: errors.array()[0].msg }) 
        }

        conn = await pool.getConnection()

        const [[cooldown]] = await conn.query(
            `SELECT GREATEST(0, TIMESTAMPDIFF(SECOND, last_message_at + INTERVAL 15 SECOND, NOW()) * -1) AS segundos_restantes
            FROM usuarios WHERE id = ?`,
            [req.user.id]
        )

        if (cooldown.segundos_restantes > 0) {
            return res.json({
                error: `Debes esperar ${cooldown.segundos_restantes} segundos para crear un hilo o mensaje`,
                cooldown: cooldown.segundos_restantes
            })
        }

        await conn.query(
            `UPDATE usuarios 
            SET last_message_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
            [req.user.id]
        )

        const id_hilo = req.params.id_hilo
        const { mensaje, id_mensaje_respuesta } = req.body

        const [thread_exists] = await conn.query(
            'SELECT titulo, mensajes, id_usuario FROM hilos WHERE id = ?',
            [id_hilo]
        )

        if (thread_exists.length === 0) {
            return res.json({ shared: false, error: 'El hilo no existe' })
        }

        await conn.query(
            'INSERT INTO mensajes (contenido,id_usuario,id_hilo,id_mensaje_respuesta) VALUES (?,?,?,?)',
            [mensaje, req.user.id, id_hilo, id_mensaje_respuesta || null]
        )

        await conn.query('UPDATE hilos SET mensajes = mensajes + 1 WHERE id = ?', [id_hilo])

        const new_user = { ...req.user, mensajes: req.user.mensajes + 1 }
        const token = jwt.sign(new_user, JWT_SECRET)

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax'
        })

        return res.json({ shared: true, cooldown: 15 }) 
    } catch (error) {
        console.error(error)
        res.json({ shared: false, error: 'Error interno' })
    } finally {
        if (conn) conn.release();
    }
})


//Ruta para obtener todos los hilos de un usuario logueado
router.get('/mis_hilos/:page',authMiddleware,async(req,res)=>{
    let conn
    try {
        conn = await pool.getConnection();

        const page = Number(req.params.page);

        const offset = 39 * (page - 1);

        const consulta = `
            SELECT h.*, DATE_FORMAT(h.fecha_registro, '%M %Y %H:%i') as fecha, u.username as username 
            FROM hilos as h
            INNER JOIN usuarios as u 
            ON h.id_usuario = u.id 
            WHERE h.id_usuario = ? 
            ORDER BY id DESC 
            LIMIT 39 OFFSET ?
        `

        const [data] = await conn.query(consulta,[req.user.id, offset]);

        if (data.length > 0) {
            console.log('La respuesta ha obtenido datos');
            res.json({ hilos: data });
        } else {
            console.log('El usuario seguramente no tiene hilos');
            res.json({ hilos: data });
        }
    } catch (error) {
        console.error(error);
        res.json({ message: 'Datos erróneos' });
    } finally {
        if (conn) conn.release(); 
    }

})

module.exports = router