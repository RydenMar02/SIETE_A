import "dotenv/config";
import http from "http";
import db from "./db/conexion.js";
import app from "./app.js";
import { initSockets } from "./sockets/index.js";

try {
  await db.authenticate();
  console.log("Base de datos conectada");

  /*app.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor corriendo en puerto ${process.env.PORT || 3000}`);
  });*/
  /*app.listen(process.env.PORT || 3000, process.env.HOST || "0.0.0.0", () => {
    console.log(
      `Servidor corriendo en http://${process.env.HOST || "0.0.0.0"}:${process.env.PORT || 3000}`,
    );
  });*/
  // Antes: app.listen(...) directo. Ahora envolvemos Express en un
  // http.Server propio porque Socket.IO necesita engancharse ahí (no puede
  // colgarse de la app de Express sola). Mismo puerto, mismo proceso —
  // las rutas REST siguen funcionando exactamente igual que antes.
  const httpServer = http.createServer(app);
  initSockets(httpServer);
 
  httpServer.listen(process.env.PORT || 3000, process.env.HOST || "0.0.0.0", () => {
    console.log(
      `Servidor corriendo en http://${process.env.HOST || "0.0.0.0"}:${process.env.PORT || 3000}`,
    );
  });
} catch (error) {
  console.error("Error al conectar la base de datos:", error);
}
