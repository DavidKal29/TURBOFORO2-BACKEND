const express = require('express')
const app = express()
const dotenv = require('dotenv').config()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const CSRFProtection = require('./routes/middlewares/csrf.js')


//Middlewares globales
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())

//Utilizamos CORS para que nos lleguen peticiones satisfactorias
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}))

//Ruta inicial
app.get('/',(req,res)=>{
    res.send('Esto funciona')
})

//Para devolver al cliente el CSRFProtection
app.get('/csrf-token',CSRFProtection,(req,res)=>{
    res.json({csrfToken:req.csrfToken()})
})

//Rutas
const authRoutes = require('./routes/auth.js')
app.use('/',authRoutes)

const profileRoutes = require('./routes/profile.js')
app.use('/',profileRoutes)

const changePasswordRoutes = require('./routes/changePassword.js')
app.use('/',changePasswordRoutes)

const categoriasRoute = require('./routes/categorias.js')
app.use('/',categoriasRoute)

const verificacionRoutes = require('./routes/verificacion.js')
app.use('/',verificacionRoutes)

const threadsRoutes = require('./routes/threads.js')
app.use('/',threadsRoutes)

const deleteDataRoutes = require('./routes/deleteData.js')
app.use('/',deleteDataRoutes)

const userRoute = require('./routes/user.js')
app.use('/',userRoute)


//Puerto donde escuchará el servidor
const PORT = process.env.PORT

//Inicialización del servidor
app.listen(PORT,()=>{
    console.log('Escuchando en el puerto', PORT);
})