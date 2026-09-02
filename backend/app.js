import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRoutes from './routes/auth.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import rolesRoutes from './routes/roles.routes.js';
import ciudadRoutes from './routes/ciudad.routes.js';
import cuentaRoutes from './routes/cuenta.routes.js';
import salaRoutes from './routes/sala.routes.js';
import salaUsuarioRoutes from './routes/salaUsuario.routes.js';
import periodoRoutes from './routes/periodo.routes.js';
import ejercicioRoutes from './routes/ejercicio.routes.js';
import actividadRoutes from './routes/actividad.routes.js';
import movimientoRoutes from './routes/movimiento.routes.js';
import empresaRoutes from './routes/empresa.routes.js';
import empresaCuentaRoutes from './routes/empresaCuenta.routes.js';
import sucursalRoutes from './routes/sucursal.routes.js';
import clienteProveedorRoutes from './routes/clienteProveedor.routes.js';
import compraVentaRoutes from './routes/compraVenta.routes.js';
import asientoRoutes from './routes/asiento.routes.js';
import reportesRoutes from './routes/reportes.routes.js';
import graficosRoutes from './routes/graficos.routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

const origenesPermitidos = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origen) => origen.trim());

app.use(cors({
    origin: (origen, callback) => {
        
        if (!origen || origenesPermitidos.includes(origen)) {
            callback(null, true);
        } else {
            callback(new Error('Origen no permitido por CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());

app.use('/images', express.static(join(__dirname, 'public', 'images')));
app.use('/api/auth',     authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/roles',    rolesRoutes);
app.use('/api/ciudades', ciudadRoutes);
app.use('/api/cuentas',  cuentaRoutes);
app.use('/api/salas', salaRoutes);
app.use('/api/sala-usuarios', salaUsuarioRoutes);
app.use('/api/periodos', periodoRoutes);
app.use('/api/ejercicios', ejercicioRoutes);
app.use('/api/actividades', actividadRoutes);
app.use('/api/movimientos', movimientoRoutes);
app.use('/api/empresas', empresaRoutes);
app.use('/api/empresa-cuentas', empresaCuentaRoutes);
app.use('/api/sucursales', sucursalRoutes);
app.use('/api/clientes-proveedores', clienteProveedorRoutes);
app.use('/api/compras-ventas', compraVentaRoutes);
app.use('/api/asientos', asientoRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/graficos', graficosRoutes);

app.get('/', (req, res) => {
    res.json({ msg: 'API funcionando correctamente' });
});

export default app;