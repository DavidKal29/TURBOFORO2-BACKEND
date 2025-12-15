# TurboForo2

Esta es una **API/backend** para un foro en línea llamada **TurboForo2**, especializada en ofrecer funcionalidades de gestión de usuarios, publicaciones y comentarios, diseñada para ser robusta, segura y escalable.  
⚠️ Este proyecto **no incluye frontend**, está pensado para ser consumido por aplicaciones web, móviles o clientes externos.

---

### Funcionalidades para la API:

- **Autenticación completa**: registro, login y recuperación de contraseña mediante JWT.
- **Gestión de usuarios**: crear, editar y eliminar cuentas de usuario.
- **Gestión de publicaciones y comentarios**: crear y ver hilos, así como comentar y responder a otros usuarios dentro de estos.
- **Modo Admin**: Rutas que solo un usuario con el rol admin puede acceder. Esto incluye ver y manipular cualquier mensaje, hilo o usuario.
- **Protección de rutas** mediante **JWT**, **Cookies**, mediante un **Middleware**, asegurando que solo usuarios autorizados puedan acceder a ciertas operaciones
- **CORS habilitado**, preparado para trabajar con frontend externo.
- **Envío de emails automáticos** para confirmaciones, notificaciones o recuperación de contraseña. Utilizando el servicio de Brevo(paquete indicado abajo).
- **Validación de datos** con `express-validator` para garantizar integridad y seguridad.
- **Middleware de seguridad** con `csurf` y `cookie-parser`.

---

### Requisitos

Para ejecutar este proyecto necesitas:

- **Node.js >= 18.x**
- **MySQL** (local o en la nube, en este caso Clever Cloud)
- Paquetes de Node.js incluidos en `package.json`:
  - `express`
  - `cors`
  - `dotenv`
  - `mysql2`
  - `jsonwebtoken`
  - `bcryptjs`
  - `cookie-parser`
  - `csurf`
  - `express-validator`
  - `nodemailer`
  - `nodemon`
  - `cross-env`
  - `@getbrevo/brevo`

---

### Instalación

1. **Clona el repositorio**  
   ```bash
   git clone https://github.com/DavidKal29/TURBOFORO2-BACKEND.git
   cd TurboForo2

2. **Instala las dependencias**  
   ```bash
    npm install

3. **Crea un .env en la raíz del proyecto y añade tus propios datos**
   ```bash
    HOST=
    USER=
    PASSWORD=
    DATABASE=
    JWT_SECRET=
    CORREO=
    APIKEY= (Asegurate de tener cuenta en Brevo y tener la apikey válida)
    PORT=
    FRONTEND_URL=
    BACKEND_URL=


4. **Modo Desarrollo**
   ```bash
    npm run dev

5. **Modo Producción**
   ```bash
    npm start
 
