const express = require('express')
const router = express.Router()
const pool = require('../db.js')


//Ruta para obtener las categorias
router.get('/categorias',async(req,res)=>{
    let conn
    try {
        conn = await pool.getConnection()
        
        const [data] = await conn.query('SELECT * FROM categorias')

        if (data.length>0) {
            console.log('Categorias obtenidas con éxito');
            res.json({categorias:data})
            
        }else{
            console.log('Las categorias no han sido obtenidas');
            res.json({message:"Las categorias no han sido obtenidas"})
        }

    } catch (error) {
        res.json({message:"Las categorias no han sido obtenidas"})
    }finally{
        if (conn) conn.release();
    }
})


module.exports = router