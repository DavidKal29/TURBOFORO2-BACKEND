const nodemailer = require('nodemailer')
const dotenv = require('dotenv').config()

//Configuramos nodemailer para enviar correos
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.CORREO,
        pass: process.env.PASSWORD_DEL_CORREO
    }
});

module.exports = transporter