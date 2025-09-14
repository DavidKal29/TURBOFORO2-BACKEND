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


const authMiddleware = async(req,res,next) =>{
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

app.get('/categorias',async(req,res)=>{
    const conn = await pool.getConnection()

    console.log('La peticion de /categorias funciona y ha sido abierta');
    

    const [data] = await conn.query('SELECT * FROM categorias')

    conn.release();

    if (data.length>0) {
        console.log('Categorias obtenidas con éxito');
        
        
        res.json({categorias:data})
        
    }else{
        console.log('Las malditas categorias no han sido obtenidas');
        
        res.json({categorias:[]})
    }
})

//Ruta de login
app.post('/login',CSRFProtection,async(req,res)=>{
    try{

        let {email,password} = req.body

        const conn = await pool.getConnection()
        const [user_exists] = await conn.query('SELECT *,DATE_FORMAT(fecha_registro, "%d %M %Y") AS fecha,timestampdiff(YEAR, fecha_registro, NOW()) AS veterania  FROM usuarios WHERE email = ?',[email])

        if (user_exists.length>0) {
            const equalPassword = await bcrypt.compare(password,user_exists[0].password)

            if (equalPassword) {
                
                const user = {
                    id: user_exists[0].id,
                    email: user_exists[0].email,
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
        .notEmpty().withMessage('Email no puede estar vacío')
        .isEmail().withMessage('Debes poner un email válido')
        .normalizeEmail()
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .escape(),

        body('username')
        .trim()
        .notEmpty().withMessage('Username no puede estar vacío')
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .isLength({min:5,max:15}).withMessage('Username debe contener entre 5 y 15 carácteres')
        .matches(/^[a-zA-Z0-9_.]+$/).withMessage('Solo se permiten letras, números, guion bajo y punto')
        .matches(/[a-zA-Z]/).withMessage('Mínimo una letra en Username')
        .escape(),

        body('password')
        .trim()
        .notEmpty().withMessage('Password no puede estar vacío')
        .matches(/\d/).withMessage('Mínimo un dígito')
        .isLength({min:8,max:30}).withMessage('Password debe contener entre 8 y 30 carácteres')
        .matches(/[A-Z]/).withMessage('Mínimo una mayúscula en Password')
        .matches(/[#$€&%]/).withMessage('Mínimo un carácter especial en Password')
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
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
            const [user_exists] = await conn.query('SELECT *,DATE_FORMAT(fecha_registro, "%d %M %Y") AS fecha,timestampdiff(YEAR, fecha_registro, NOW()) AS veterania  FROM usuarios WHERE email = ?',[email])
                
            const user = {
                id: user_exists[0].id,
                email: user_exists[0].email,
                username: user_exists[0].username,
                avatar: 16,
                description: user_exists[0].description,
                hilos: user_exists[0].hilos,
                mensajes: user_exists[0].mensajes,
                fecha_registro: user_exists[0].fecha,
                verificado: user_exists[0].verificado,
                rol: user_exists[0].rol,
                veterania: user_exists[0].veterania
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
        .notEmpty().withMessage('Email no puede estar vacío')
        .isEmail().withMessage('Debes poner un email válido')
        .normalizeEmail()
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .escape(),

        body('username')
        .trim()
        .notEmpty().withMessage('Username no puede estar vacío')
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .isLength({min:5,max:15}).withMessage('Username debe contener entre 5 y 15 carácteres')
        .matches(/^[a-zA-Z0-9_.]+$/).withMessage('Solo se permiten letras, números, guion bajo y punto')
        .matches(/[a-zA-Z]/).withMessage('Mínimo una letra en Username')
        .escape(),

        body('description')
        .trim()
        .isLength({min:0, max:500}).withMessage('Máximo 500 carácteres')
        .customSanitizer(val=>val.replace(/\s+/g, ' '))
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
        .notEmpty().withMessage('Email no puede estar vacío')
        .isEmail().withMessage('Debes poner un email válido')
        .normalizeEmail()
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
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
                text: `Para recuperar la contraseña entra en este enlace -> ${process.env.FRONTEND_URL}/change_password/${token}`
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


const validadorChangePassword = [
        
        body('new_password')
        .trim()
        .notEmpty().withMessage('Password no puede estar vacío')
        .matches(/\d/).withMessage('Mínimo un dígito')
        .isLength({min:8,max:30}).withMessage('Password debe contener entre 8 y 30 carácteres')
        .matches(/[A-Z]/).withMessage('Mínimo una mayúscula en Password')
        .matches(/[#$€&%]/).withMessage('Mínimo un carácter especial en Password')
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .escape()
        
    ]


//Ruta para cambiar contraseña
app.post('/cambiarPassword/:token',validadorChangePassword,CSRFProtection,async(req,res)=>{
    try{
        const errors = validationResult(req)

        const token = req.params.token
        const conn = await pool.getConnection()
       
        const decoded = jwt.verify(token,JWT_SECRET)
        const email = decoded.email
        
        const [data] = await conn.query('SELECT token FROM usuarios WHERE email = ? and token = ?',[email,token])
        
        if (data.length>0) {
            const {new_password,confirm_password} = req.body
            if (new_password===confirm_password) {
                const [datos] = await conn.query('SELECT password FROM usuarios WHERE email = ?',[email])
                if (datos.length>0) {
                    const password_equals = await bcrypt.compare(new_password,datos[0].password)
                    if (password_equals) {
                        res.json({"message":"La nueva contraseña no puede ser igual a la anterior"})
                    }else{
                        if (!errors.isEmpty()) {
                            return res.status(400).json({error:errors.array()[0]})
                        }else{
                            const new_encripted_password = await bcrypt.hash(new_password,10)
                            await conn.query('UPDATE usuarios SET password = ? WHERE email = ?',[new_encripted_password,email])
                            await conn.query('UPDATE usuarios SET token = "" WHERE email = ?',[email])
                            return res.json({"message":"Contraseña cambiada con éxito"})
                        }
                        
                    }
                }
            }else{
                res.json({"message":"Contraseñas no coinciden"})
            }
        }else{
            res.json({"message":"Token inválido o expirado"})
        }
    }catch(error){
        res.json({"message":"El enlace que estás usando es inválido"})
    }
})



app.post('/enviar_verificacion',authMiddleware,(req,res)=>{
    try {
        const {email} = req.body

        const token = jwt.sign({email:email},JWT_SECRET,{expiresIn:'5m'})

        console.log('El token:',token);
        

        const mailOptions = {
            from: process.env.CORREO,
            to: email,
            subject: "Verificación",
            text: `Para verificar la cuenta, entra a -> http://localhost:5000/verificar/${token}`
        };
            
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log("Error al enviar:", error);
                res.json({"message":"Error al enviar correo de verificación"})
            }
        });

        res.json({message:"Correo enviado con éxito"})
        
    } catch (error) {
        res.json({"message":"Error al mandar correo de verificación"})
    }
})


app.get('/verificar/:token',authMiddleware,async(req,res)=>{

    try {

        console.log('El tokencillo va');
        
        const token = req.params.token

        console.log('El token en verificar:',token);

        const conn = await pool.getConnection()

        const decoded = jwt.verify(token,JWT_SECRET)

        const [data] = await conn.query('SELECT verificado FROM usuarios WHERE email = ? and verificado = 0',[decoded.email])

        console.log('la data:',data);
        

        if (data.length>0) {
            await conn.query('UPDATE usuarios SET verificado = 1 WHERE email = ?',[decoded.email])

            const new_user = {...req.user, verificado:1}

            console.log(new_user);

            const token = jwt.sign(new_user,JWT_SECRET)

            res.cookie('token',token,{
                httpOnly: true,
                secure: false,
                sameSite: 'lax'
            })

             res.send(`
                    <!doctype html>
                    <html lang="es">
                        <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1" />
                        <title>Correo verificado</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        </head>
                        <body class="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                        <div class="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
                            <div class="mx-auto w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            </div>
                            <h1 class="text-2xl font-semibold text-gray-800 mb-2">¡Correo verificado!</h1>
                            <p class="text-sm text-gray-500 mb-6">Gracias — tu dirección de email ha sido confirmada correctamente.</p>
                            <hr class="my-6" />
                            <p class="text-xs text-gray-400">Si no hiciste esta acción, contacta con soporte.</p>
                        </div>
                        </body>
                    </html>`
                )
        }else{
            res.send('Correo ya verificado o incorrecto')
        }


    } catch (error) {
        res.send('Enlace Inválido o Expirado')
    }

})



const validadorCrearHilo = [
        body('titulo')
        .trim()
        .notEmpty().withMessage('Título no puede estar vacío')
        .isLength({min:5,max:100}).withMessage('Título debe contener entre 5 y 100 carácteres')
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .escape(),

        body('mensaje')
        .trim()
        .notEmpty().withMessage('Mensaje no puede estar vacío')
        .isLength({min:0, max:5000}).withMessage('Máximo 5000 carácteres')
        .customSanitizer(val=>val.replace(/\s+/g, ' '))
        .escape()
        
    ]


app.post('/crearHilo',authMiddleware,CSRFProtection,validadorCrearHilo,async(req,res)=>{
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.json({error: errors.array()[0]})
    }else{
        
        const {titulo,mensaje,categoria} = req.body

        console.log(typeof(req.user.id));
        

        const conn = await pool.getConnection()

        const [user_verified] = await conn.query('SELECT * FROM usuarios WHERE id = ? and verificado = 1',[req.user.id])

        if (!user_verified.length>0) {
            return res.json({message:"Debes verificar tu email para poder crear hilos"})
        }


        const [data] = await conn.query('SELECT * FROM categorias WHERE id = ?',[categoria])

        if (data.length>0) {
            await conn.query('INSERT INTO hilos (titulo,id_usuario,id_categoria) VALUES (?,?,?)',[titulo,req.user.id,categoria])

            const [data] = await conn.query('SELECT id FROM hilos ORDER BY id DESC LIMIT 1')

            if (data.length>0) {
                const id_hilo = data[0].id
                
                await conn.query('INSERT INTO mensajes (contenido,id_usuario,id_hilo) VALUES (?,?,?)',[mensaje,req.user.id,id_hilo])

                await conn.query('UPDATE usuarios SET mensajes = mensajes + 1, hilos = hilos + 1 WHERE id = ?',[req.user.id])

                const new_user = {...req.user, hilos: req.user.hilos+1, mensajes: req.user.mensajes+1}

                const token = jwt.sign(new_user,JWT_SECRET)

                res.cookie('token',token,{
                    httpOnly: true,
                    secure: false,
                    sameSite: 'lax'
                })

                return res.json({message:"Hilo creado con éxito"})

            }else{
                return res.json({message:"No se ha podido recuperar el hilo creado"})
            }
            
        }else{
            return res.json({message:"La categoría que se ha enviado es inexistente"})
        }

    }
})


const PORT = process.env.PORT

app.listen(PORT,()=>{
    console.log('Escuhando en el puerto', PORT);
    
})