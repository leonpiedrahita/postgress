const tokenServices = require('../services/token');

// Guardar o actualizar borrador (upsert por id)
exports.guardar = async (req, res) => {
  const prisma = req.prisma;
  const { id, equipoId, datos } = req.body;

  if (!equipoId || !datos) {
    return res.status(400).json({ message: 'equipoId y datos son requeridos' });
  }

  try {
    const decoded = await tokenServices.decode(req.headers.token);
    const usuarioId = decoded.id;

    let borrador;

    if (id) {
      // Verificar que el borrador pertenece al usuario antes de actualizar
      const existente = await prisma.borrador.findUnique({ where: { id: parseInt(id) } });
      if (!existente || existente.usuarioId !== usuarioId) {
        return res.status(403).json({ message: 'No autorizado para modificar este borrador' });
      }
      borrador = await prisma.borrador.update({
        where: { id: parseInt(id) },
        data: { datos },
      });
    } else {
      borrador = await prisma.borrador.create({
        data: { usuarioId, equipoId: parseInt(equipoId), datos },
      });
    }

    res.status(200).json({ message: 'Borrador guardado', borrador });
  } catch (err) {
    console.error('Error al guardar borrador:', err);
    res.status(500).json({ error: err.message });
  }
};

// Listar borradores del usuario autenticado
exports.listar = async (req, res) => {
  const prisma = req.prisma;

  try {
    const decoded = await tokenServices.decode(req.headers.token);
    const usuarioId = decoded.id;

    const borradores = await prisma.borrador.findMany({
      where: { usuarioId },
      include: {
        equipo: {
          include: {
            propietario: true,
            cliente: true,
            referencia: true,
          },
        },
      },
      orderBy: { actualizadoEn: 'desc' },
    });

    res.status(200).json(borradores);
  } catch (err) {
    console.error('Error al listar borradores:', err);
    res.status(500).json({ error: err.message });
  }
};

// Obtener un borrador por id (solo si pertenece al usuario)
exports.obtener = async (req, res) => {
  const prisma = req.prisma;

  try {
    const decoded = await tokenServices.decode(req.headers.token);
    const usuarioId = decoded.id;

    const borrador = await prisma.borrador.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        equipo: {
          include: {
            propietario: true,
            cliente: true,
            referencia: true,
          },
        },
      },
    });

    if (!borrador) {
      return res.status(404).json({ message: 'Borrador no encontrado' });
    }

    if (borrador.usuarioId !== usuarioId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    res.status(200).json(borrador);
  } catch (err) {
    console.error('Error al obtener borrador:', err);
    res.status(500).json({ error: err.message });
  }
};

// Eliminar borrador (solo si pertenece al usuario)
exports.eliminar = async (req, res) => {
  const prisma = req.prisma;

  try {
    const decoded = await tokenServices.decode(req.headers.token);
    const usuarioId = decoded.id;

    const borrador = await prisma.borrador.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!borrador) {
      return res.status(404).json({ message: 'Borrador no encontrado' });
    }

    if (borrador.usuarioId !== usuarioId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    await prisma.borrador.delete({ where: { id: parseInt(req.params.id) } });
    res.status(200).json({ message: 'Borrador eliminado' });
  } catch (err) {
    console.error('Error al eliminar borrador:', err);
    res.status(500).json({ error: err.message });
  }
};
