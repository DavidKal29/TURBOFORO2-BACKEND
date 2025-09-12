const express = require('express')
const app = express()
const dotenv = require('dotenv').config()
const pool = require('./db.js')
const bcrypt = require('bcryptjs')
const cors = require('cors')
const jwt = require('jsonwebtoken')
JWT_SECRET = process.env.JWT_SECRET
const {body, validationResult} = require('express-validator')
const csurf = require('csurf')

const cookieParser = require('cookie-parser')


const nodemailer = require('nodemailer')

//Configuramos nodemailer para enviar correos
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.CORREO,
    pass: process.env.PASSWORD_DEL_CORREO
  }
});


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


const CSRFProtection = csurf({
    cookie:true
})

app.get('/csrf-token',CSRFProtection,(req,res)=>{
    res.json({csrfToken:req.csrfToken()})
})

//Ruta de login
app.post('/login',CSRFProtection,async(req,res)=>{
    try{


        let {email,password} = req.body


        const conn = await pool.getConnection()
        const [user_exists] = await conn.query('SELECT *,DATE_FORMAT(fecha_registro, "%d %M %Y") AS fecha  FROM usuarios WHERE email = ?',[email])

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
                const fecha_registro = user_exists[0].fecha
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
            res.json({"message":"Contraseña o Email Incorrectos"})
        }
    }catch(error){
        console.log(error);
        
        res.status(500).json({message:"Error en login"})
    }
})



const validadorRegister = [
        body('email')
        .trim()
        .isEmail().withMessage('Debes poner un email válido')
        .normalizeEmail()
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .notEmpty().withMessage('Email no puede estar vacío')
        .escape(),

        body('username')
        .trim()
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .isLength({min:5,max:15}).withMessage('Username debe contener entre 5 y 15 carácteres')
        .matches(/^[a-zA-Z0-9_.]+$/).withMessage('Solo se permiten letras, números, guion bajo y punto')
        .notEmpty().withMessage('Username no puede estar vacío')
        .matches(/[a-zA-Z]/).withMessage('Mínimo una letra en Username')
        .escape(),

        body('password')
        .trim()
        .matches(/\d/).withMessage('Mínimo un dígito')
        .isLength({min:8,max:30}).withMessage('Password debe contener entre 8 y 30 carácteres')
        .matches(/[A-Z]/).withMessage('Mínimo una mayúscula en Password')
        .matches(/[#$€&%]/).withMessage('Mínimo un carácter especial en Password')
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .notEmpty().withMessage('Password no puede estar vacío')
        .escape()
        
    ]


//Ruta de registro
app.post('/register',validadorRegister,CSRFProtection,async(req,res)=>{
    try{

        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            return res.status(400).json({error:errors.array()[0]})
        }

        let {email,username,password} = req.body
        const conn = await pool.getConnection()
        const encriptedPassword = await bcrypt.hash(password,10)
        const [user_exists] = await conn.query('SELECT * FROM usuarios WHERE email = ? or username = ?',[email,username])
        
        if (user_exists.length>0) {
            conn.release()
            console.log('El usuario ya existe');
            
            res.json({"message":"El usuario ya existe"})
        }else{
            await conn.query('INSERT INTO usuarios (email, username, password) VALUES (?,?,?)',[email,username,encriptedPassword])
            const [user_exists] = await conn.query('SELECT *,DATE_FORMAT(fecha_registro, "%d %M %Y") AS fecha FROM usuarios WHERE email = ?',[email])
                
            const user = {
                id: user_exists[0].id,
                email: user_exists[0].email,
                username: user_exists[0].username,
                avatar: 16,
                description: user_exists[0].description,
                hilos: user_exists[0].hilos,
                mensajes: user_exists[0].mensajes,
                fecha_registro: user_exists[0].fecha
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


const validadorEditPerfil = [
        body('email')
        .trim()
        .isEmail().withMessage('Debes poner un email válido')
        .normalizeEmail()
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .notEmpty().withMessage('Email no puede estar vacío')
        .escape(),

        body('username')
        .trim()
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .isLength({min:5,max:15}).withMessage('Username debe contener entre 5 y 15 carácteres')
        .matches(/^[a-zA-Z0-9_.]+$/).withMessage('Solo se permiten letras, números, guion bajo y punto')
        .notEmpty().withMessage('Username no puede estar vacío')
        .matches(/[a-zA-Z]/).withMessage('Mínimo una letra en Username')
        .escape(),

        body('description')
        .trim()
        .isLength({min:0, max:500}).withMessage('Máximo 500 carácteres')
        .customSanitizer(val=>val.replace(/\s+g/, ' '))
        .escape()
        
    ]


app.post('/editar_perfil',validadorEditPerfil,CSRFProtection,authMiddleware,async(req,res)=>{

    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({error:errors.array()[0]})
    }


    const {email,username,description} = req.body

    if (email == req.user.email && username == req.user.username && description === req.user.description) {
        res.status(400).json({changed:false, message:"Asegurate que al menos un campo sea distinto al original"})
    }else{
        const conn = await pool.getConnection()

        const [data] = await conn.query('SELECT email, username FROM usuarios WHERE (email = ? or username = ?) and id != ?',[email, username,req.user.id])

        if (data.length>0) {
            res.status(400).json({changed:false, message:"Email o username ya están en uso"})
        }else{
            await conn.query('UPDATE usuarios SET email = ?, username = ?, description = ? WHERE id = ?',[email,username,description,req.user.id])

            const new_user = {...req.user,email:email,username:username,description:description}

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

        const new_user = {...req.user,avatar:id_avatar}

        const token = jwt.sign(new_user,JWT_SECRET)

        res.cookie('token',token,{
            httpOnly: true,
            secure: false,
            sameSite: 'lax'
        })



        res.json({changed:true, message:"Avatar cambiado con éxito"})
    }

    
})



const validadorRecuperarPassword = [
        body('email')
        .trim()
        .isEmail().withMessage('Debes poner un email válido')
        .normalizeEmail()
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .notEmpty().withMessage('Email no puede estar vacío')
        .escape()
    ]

//Ruta para enviar correo de recuperación
app.post('/recuperarPassword',validadorRecuperarPassword,CSRFProtection,async(req,res)=>{
    try{

        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            return res.status(400).json({error:errors.array()[0]})
        }

        const conn = await pool.getConnection()
        const {email} = req.body
        const [user_exists] = await conn.query('SELECT * FROM usuarios WHERE email = ?',[email])
        if (user_exists.length>0) {
            const token = jwt.sign({email:email},JWT_SECRET)
            
            const mailOptions = {
                from: process.env.CORREO,
                to: email,
                subject: "Recuperación de Contraseña",
                text: `Para recuperar la contraseña entra en este enlace -> ${process.env.FRONTEND_URL}/cambiarPassword/${token}`
            };
            
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log("Error al enviar:", error);
                    res.json({"message":"Error al enviar correo"})
                }
            });
            
            await conn.query('UPDATE usuarios SET token = ? WHERE email = ?',[token,email])
            res.json({"message":"Correo enviado"})
        }else{
            res.json({"message":"No hay ninguna cuenta asociada a este correo"})
        }
    }catch(error){
        res.status(500).json({message:"Error en recuperarPassword"})
    }
})






const PORT = process.env.PORT

app.listen(PORT,()=>{
    console.log('Escuhando en el puerto', PORT);
    
})