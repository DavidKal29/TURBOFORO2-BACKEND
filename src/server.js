const express = require('express')
const app = express()
const dotenv = require('dotenv').config()
const pool = require('./db.js')
const bcrypt = require('bcryptjs')
const cors = require('cors')
const jwt = require('jsonwebtoken')
JWT_SECRET = process.env.JWT_SECRET

const cookieParser = require('cookie-parser')

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}))



app.get('/',(req,res)=>{
    res.send('Esto funciona')
})


const authMiddleware = (req,res,next) =>{
    const token = req.cookies.token
    if (!token) {
        res.status(401).json({loggedIn:false, "message":"Token inexistente"})
    }else{
        try {
            payload = jwt.verify(token,JWT_SECRET)

            req.user = payload

            console.log('El payload:',req.user);
            
            
            next()

        } catch (error) {
            res.status(401).json({loggedIn:false, "message":"Token inválido"})
        }


    }
}

//Ruta de login
app.post('/login',async(req,res)=>{
    try{
        let {email,password} = req.body
        const conn = await pool.getConnection()
        const [user_exists] = await conn.query('SELECT * FROM usuarios WHERE email = ?',[email])

        if (user_exists.length>0) {
            const equalPassword = await bcrypt.compare(password,user_exists[0].password)

            if (equalPassword) {
                const id = user_exists[0].id
                const username = user_exists[0].username
                const email = user_exists[0].email
                const avatar = user_exists[0].id_avatar
                const description = user_exists[0].description
                const hilos = user_exists[0].hilos
                const mensajes = user_exists[0].mensajes
                const fecha_registro = user_exists[0].fecha_registro
                console.log('El avatar:',avatar);
                
                const user = {
                    id: id,
                    email: email,
                    username: username,
                    avatar: avatar,
                    description: description,
                    hilos: hilos,
                    mensajes: mensajes,
                    fecha_registro: fecha_registro
                }
                
                const token = jwt.sign(user,JWT_SECRET,{expiresIn:'1h'})

                res.cookie('token',token,{
                    httpOnly: true,
                    secure: false,
                    maxAge: 3600 * 1000,
                    sameSite:'lax'
                })

                conn.release()
                res.json({"user":user_exists[0],"message":"Usuario logueado con éxito"})
            }else{
                conn.release()
                res.json({"message":"Contraseña o Email Incorrectos"})
            }
        }else{
            conn.release()
            res.json({"message":"Contraseña o Email Incorrecto"})
        }
    }catch(error){
        console.log(error);
        
        res.status(500).json({message:"Error en login"})
    }
})


//Ruta de registro
app.post('/register',async(req,res)=>{
    try{
        let {email,username,password} = req.body
        const conn = await pool.getConnection()
        const encriptedPassword = await bcrypt.hash(password,10)
        const [user_exists] = await conn.query('SELECT * FROM usuarios WHERE email = ? or username = ?',[email,username])
        
        if (user_exists.length>0) {
            conn.release()
            res.json({"message":"El usuario ya existe"})
        }else{
            await conn.query('INSERT INTO usuarios (email, username, password) VALUES (?,?,?)',[email,username,encriptedPassword])
            const [user_exists] = await conn.query('SELECT * FROM usuarios WHERE email = ?',[email])
            
            const id = user_exists[0].id
            const username = user_exists[0].username
            const email = user_exists[0].email
            const avatar = user_exists[0].id_avatar
            const description = user_exists[0].description
            const hilos = user_exists[0].hilos
            const mensajes = user_exists[0].mensajes
            const fecha_registro = user_exists[0].fecha_registro
                
            const user = {
                id: id,
                email: email,
                username: username,
                avatar: avatar,
                description: description,
                hilos: hilos,
                mensajes: mensajes,
                fecha_registro: fecha_registro
            }
            const token = jwt.sign(user,JWT_SECRET,{expiresIn:'1h'})

            res.cookie('token',token,{
                httpOnly: true,
                secure: false,
                maxAge: 3600 * 1000,
                sameSite:'lax'
            })

            conn.release()
            res.json({"user":user,"message":"El usuario ha sido registrado"})
        }
    }catch(error){
        console.log(error);
        res.status(500).json({message:"Error en register"})
    }
})


app.get('/perfil',authMiddleware,(req,res)=>{
    res.status(200).json({loggedIn:true,user:req.user})
})


app.post('/editar_perfil',authMiddleware,async(req,res)=>{
    const {email,username} = req.body

    if (email == req.user.email && username == req.user.username) {
        res.status(400).json({changed:false, message:"Asegurate que al menos un campo sea distinto al original"})
    }else{
        const conn = await pool.getConnection()

        const [data] = await conn.query('SELECT email, username FROM usuarios WHERE (email = ? or username = ?) and id != ?',[email, username,req.user.id])

        if (data.length>0) {
            res.status(400).json({changed:false, message:"Email o username ya están en uso"})
        }else{
            await conn.query('UPDATE usuarios SET email = ?, username = ? WHERE id = ?',[email,username,req.user.id])

            const new_user = {id:req.user.id,email:email,username:username,avatar:req.user.avatar}

            const token = jwt.sign(new_user,JWT_SECRET)

            res.cookie('token',token,{
                httpOnly: true,
                secure: false,
                sameSite: 'lax'
            })


            res.status(200).json({changed:true, message:"Datos cambiados con éxito"})
        }

    }

})


app.get('/logout',authMiddleware,(req,res)=>{
    res.clearCookie('token',{httpOnly:true, secure:false, sameSite:'lax'})

    res.status(200).json({loggedOut:true})
})

app.post('/editar_avatar',authMiddleware,async(req,res)=>{
    const {id_avatar} = req.body

    if (id_avatar>24 || id_avatar<1) {
        console.log("El id del avatar es invalido");
        
        res.json({changed:false, message:"El id del avatar es inválido"})
    }else{
        const conn = await pool.getConnection()

        console.log("El id del avatar es valido");

        await conn.query('UPDATE usuarios SET id_avatar = ? WHERE id = ?',[id_avatar,req.user.id])

        const new_user = {id:req.user.id,email:req.user.email,username:req.user.username,avatar:id_avatar}

        const token = jwt.sign(new_user,JWT_SECRET)

        res.cookie('token',token,{
            httpOnly: true,
            secure: false,
            sameSite: 'lax'
        })



        res.json({changed:true, message:"Avatar cambiado con éxito"})
    }

    
})





const PORT = process.env.PORT

app.listen(PORT,()=>{
    console.log('Escuhando en el puerto', PORT);
    
})