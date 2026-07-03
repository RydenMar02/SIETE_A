export const tieneRol = (...rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(500).json({
                msg: 'Se quiere verificar rol sin validar token primero'
            });
        }

        const idRol = parseInt(req.usuario.id_rol);

        if (!rolesPermitidos.includes(idRol)) {
            return res.status(403).json({
                msg: 'No tenés permisos para realizar esta acción'
            });
        }

        next();
    };
};