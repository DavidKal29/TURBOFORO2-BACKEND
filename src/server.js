const express = require('express')
const app = express()
const dotenv = require('dotenv').config()
const pool = require('./db.js')
const bcrypt = require('bcryptjs')
const cors = require('cors')

const cookieParser = require('cookie-parser')

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}))

const PORT = process.env.PORT


app.get('/',(req,res)=>{
    res.send('Esto funciona')
})


app.listen(PORT,()=>{
    console.log('Escuhando en el puerto', PORT);
    
})