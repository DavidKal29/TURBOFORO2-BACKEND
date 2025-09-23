# TurboForo2

Esta es una **API/backend** para un foro en línea llamada **TurboForo2**, especializada en ofrecer funcionalidades de gestión de usuarios, publicaciones y comentarios, diseñada para ser robusta, segura y escalable.  
⚠️ Este proyecto **no incluye frontend**, está pensado para ser consumido por aplicaciones web, móviles o clientes externos.

---

### Funcionalidades para la API:

- **Autenticación completa**: registro, login y recuperación de contraseña mediante JWT.
- **Gestión de usuarios**: crear, editar y eliminar cuentas de usuario.
- **Gestión de publicaciones y comentarios**: CRUD completo sobre posts y comentarios.
- **Protección de rutas** mediante **JWT**, asegurando que solo usuarios autorizados puedan acceder a ciertas operaciones.
- **CORS habilitado**, preparado para trabajar con frontend externo.
- **Envío de emails automáticos** para confirmaciones, notificaciones o recuperación de contraseña.
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
    PASSWORD_DEL_CORREO=
    PORT=
    FRONTEND_URL=

4. **Modo Desarrollo**
   ```bash
    npm run dev

5. **Modo Producción**
   ```bash
    npm start
 
