import "dotenv/config";
import db from "./db/conexion.js";
import app from "./app.js";

try {
  await db.authenticate();
  console.log("Base de datos conectada");

  app.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor corriendo en puerto ${process.env.PORT || 3000}`);
  });
 /* app.listen(process.env.PORT || 3000, process.env.HOST || "0.0.0.0", () => {
    console.log(
      `Servidor corriendo en http://${process.env.HOST || "0.0.0.0"}:${process.env.PORT || 3000}`,
    );
  });*/
} catch (error) {
  console.error("Error al conectar la base de datos:", error);
}
