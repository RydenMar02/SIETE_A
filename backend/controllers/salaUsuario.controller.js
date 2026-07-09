import Sala from '../models/sala.js';
import SalaUsuario from '../models/salaUsuario.js';
import Usuario from '../models/usuario.js';

export const getSalasConProfesores = async (req, res) => {
    const { desde = 0, limite = 10, curso, semestre, id_usuario, rol } = req.query;

    try {
        const whereSala = {};
        if (curso) whereSala.curso = curso;
        if (semestre) whereSala.semestre = semestre;

        const whereProfesor = {};
        if (rol && parseInt(rol) === 2 && id_usuario) {
            whereProfesor.id_usuario = parseInt(id_usuario);
        }

        const [total, salaUsuarios] = await Promise.all([
            SalaUsuario.count({
                where: { tipo: 'PROFESOR', estado: 1 },
                include: [
                    { model: Sala, where: whereSala },
                    { model: Usuario, as: 'Profesor', where: whereProfesor }
                ]
            }),
            SalaUsuario.findAll({
                where: { tipo: 'PROFESOR', estado: 1 },
                include: [
                    { model: Sala, where: whereSala, attributes: ['id_sala', 'sala', 'curso', 'semestre'] },
                    { model: Usuario, as: 'Profesor', where: whereProfesor, attributes: ['id_usuario', 'nombre'] }
                ],
                order: [['id_salausuario', 'ASC']],
                offset: parseInt(desde),
                limit: parseInt(limite),
                attributes: ['id_salausuario', 'id_sala', 'id_profesor']
            })
        ]);

        res.json({ total, salaUsuarios });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener salas con profesores' });
    }
};
export const getUsuarioEnSala = async (req, res) => {
    const { id_sala, id_usuario, tipo } = req.query;

    try {
        if (!tipo || !['ALUMNO', 'PROFESOR'].includes(tipo.toUpperCase())) {
            return res.status(400).json({ msg: 'Tipo inválido, debe ser ALUMNO o PROFESOR' });
        }

        const campoUsuario = tipo.toUpperCase() === 'PROFESOR' ? 'id_profesor' : 'id_alumno';
        const alias = tipo.toUpperCase() === 'PROFESOR' ? 'Profesor' : 'Alumno'; // 👈 alias obligatorio

        const salaUsuario = await SalaUsuario.findOne({
            where: {
                id_sala: parseInt(id_sala),
                [campoUsuario]: parseInt(id_usuario),
                estado: 1
            },
            include: [
                { model: Sala, attributes: ['sala', 'curso', 'semestre'] },
                { model: Usuario, as: alias, attributes: ['nombre'] } // 👈 as obligatorio
            ],
            attributes: ['id_salausuario', 'id_sala', campoUsuario]
        });

        if (!salaUsuario) {
            return res.status(404).json({ msg: 'El usuario no está registrado en esta sala' });
        }

        res.json(salaUsuario);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al verificar sala del usuario' });
    }
};

export const ingresarSala = async (req, res) => {
    const { id_sala, id_profesor, contrasena } = req.body;
    const id_alumno = req.usuario.id_usuario;

    try {
        if (!contrasena) {
            return res.status(400).json({ msg: 'La contraseña es obligatoria' });
        }

        const sala = await Sala.findByPk(id_sala, { attributes: ['contra'] });
        if (!sala) return res.status(404).json({ msg: 'La sala no existe' });

        if (sala.contra.trim() !== contrasena.trim()) {
            return res.status(401).json({ msg: 'Contraseña de sala incorrecta' });
        }

        const yaExiste = await SalaUsuario.findOne({ where: { id_sala, id_alumno } });
        if (yaExiste) return res.status(400).json({ msg: 'Ya estás registrado en esta sala' });

        const registro = await SalaUsuario.create({
            id_sala, id_profesor, id_alumno,
            tipo: 'ALUMNO', estado: 1, baja: 0
        });

        res.status(201).json({ msg: 'Ingreso a la sala exitoso', registro });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al ingresar a la sala' });
    }
};