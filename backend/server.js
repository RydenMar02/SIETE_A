import 'dotenv/config';
import db from './db/conexion.js';
import app from './app.js';

try {
    await db.authenticate();
    console.log('Base de datos conectada');

    app.listen(process.env.PORT || 3000, () => {
        console.log(`Servidor corriendo en puerto ${process.env.PORT || 3000}`);
    });

} catch (error) {
    console.error('Error al conectar la base de datos:', error);
}