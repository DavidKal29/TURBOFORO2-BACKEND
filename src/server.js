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
                const user = {id:id,email:email,username:username}
                
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
            const user = {id:user_exists[0].id,email:user_exists[0].email,username:user_exists[0].username}
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

app.get('/logout',authMiddleware,(req,res)=>{
    res.clearCookie('token',{httpOnly:true, secure:false, sameSite:'lax'})

    res.status(200).json({loggedOut:true})
})





const PORT = process.env.PORT

app.listen(PORT,()=>{
    console.log('Escuhando en el puerto', PORT);
    
})