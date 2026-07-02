import Sala from '../models/sala.js';
import SalaUsuario from '../models/salaUsuario.js';
import Usuario from '../models/usuario.js';

export const getSalasConProfesores = async (req, res) => {
    const { desde = 0, limite = 10 } = req.query;

    try {
        const [total, salasUsuarios] = await Promise.all([
            SalaUsuario.count({ where: { tipo: 'PROFESOR', estado: 1 } }),
            SalaUsuario.findAll({
                where: { tipo: 'PROFESOR', estado: 1 },
                include: [
                    { model: Sala, attributes: ['sala', 'curso', 'semestre'] },
                    { model: Usuario, as: 'Profesor', attributes: ['id_usuario', 'nombre'] }
                ],
                order: [['idsala_usuario', 'ASC']],
                offset: parseInt(desde),
                limit: parseInt(limite),
                attributes: ['idsala_usuario', 'id_sala', 'id_profesor']
            })
        ]);

        res.json({ total, salasUsuarios });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener salas con profesores' });
    }
};

export const ingresarSala = async (req, res) => {
    const { id_sala, contrasena } = req.body;
    const id_alumno = req.usuario.id_usuario;
    const id_profesor = req.body.id_profesor;

    try {
        const sala = await Sala.findByPk(id_sala, {
            attributes: ['contra']
        });

        if (!sala) {
            return res.status(404).json({ msg: 'La sala no existe' });
        }

        if (sala.contra.trim() !== contrasena?.trim()) {
            return res.status(401).json({ msg: 'Contraseña de sala incorrecta' });
        }

        const yaExiste = await SalaUsuario.findOne({
            where: { id_sala, id_alumno }
        });

        if (yaExiste) {
            return res.status(400).json({ msg: 'Ya estás registrado en esta sala' });
        }

        const registro = await SalaUsuario.create({
            id_sala,
            id_profesor,
            id_alumno,
            tipo: 'ALUMNO',
            estado: 1,
            baja: null
        });

        res.status(201).json({ msg: 'Ingreso a la sala exitoso', registro });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al ingresar a la sala' });
    }
};