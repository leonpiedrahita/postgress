const { validarArchivo, TIPOS_PERMITIDOS, TAMANO_MAX, verificarMagicBytes } = require('../src/middleware/validarArchivo');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PDF_BYTES  = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]); // %PDF-
const JPEG_BYTES = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
const PNG_BYTES  = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const GIF87_BYTES= Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]);
const GIF89_BYTES= Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
const TIFF_LE    = Buffer.from([0x49, 0x49, 0x2A, 0x00]);
const TIFF_BE    = Buffer.from([0x4D, 0x4D, 0x00, 0x2A]);
const WEBP_BYTES = (() => {
  const b = Buffer.alloc(12);
  b.write('RIFF', 0, 'ascii');
  b.write('WEBP', 8, 'ascii');
  return b;
})();
const ZIP_BYTES  = Buffer.from([0x50, 0x4B, 0x03, 0x04]); // DOCX/XLSX/PPTX
const OLE2_BYTES = Buffer.from([0xD0, 0xCF, 0x11, 0xE0]); // DOC/XLS/PPT
const FAKE_BYTES = Buffer.from([0x00, 0x01, 0x02, 0x03]);

function mockFile(overrides = {}) {
  return {
    mimetype: 'application/pdf',
    originalname: 'test.pdf',
    size: 1024,
    buffer: PDF_BYTES,
    ...overrides,
  };
}

function mockReq(file) {
  return { file };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

// ─── verificarMagicBytes unit tests ──────────────────────────────────────────

describe('verificarMagicBytes', () => {
  it('acepta PDF con firma correcta', () => {
    expect(verificarMagicBytes('application/pdf', PDF_BYTES)).toBe(true);
  });
  it('rechaza PDF con bytes falsos', () => {
    expect(verificarMagicBytes('application/pdf', FAKE_BYTES)).toBe(false);
  });
  it('rechaza PDF con buffer demasiado corto', () => {
    expect(verificarMagicBytes('application/pdf', Buffer.from([0x25]))).toBe(false);
  });
  it('acepta JPEG', () => {
    expect(verificarMagicBytes('image/jpeg', JPEG_BYTES)).toBe(true);
  });
  it('rechaza JPEG con bytes falsos', () => {
    expect(verificarMagicBytes('image/jpeg', FAKE_BYTES)).toBe(false);
  });
  it('acepta PNG', () => {
    expect(verificarMagicBytes('image/png', PNG_BYTES)).toBe(true);
  });
  it('acepta GIF87a', () => {
    expect(verificarMagicBytes('image/gif', GIF87_BYTES)).toBe(true);
  });
  it('acepta GIF89a', () => {
    expect(verificarMagicBytes('image/gif', GIF89_BYTES)).toBe(true);
  });
  it('rechaza GIF con bytes falsos', () => {
    expect(verificarMagicBytes('image/gif', FAKE_BYTES)).toBe(false);
  });
  it('acepta TIFF little-endian', () => {
    expect(verificarMagicBytes('image/tiff', TIFF_LE)).toBe(true);
  });
  it('acepta TIFF big-endian', () => {
    expect(verificarMagicBytes('image/tiff', TIFF_BE)).toBe(true);
  });
  it('acepta WEBP con header correcto', () => {
    expect(verificarMagicBytes('image/webp', WEBP_BYTES)).toBe(true);
  });
  it('rechaza WEBP con buffer corto', () => {
    expect(verificarMagicBytes('image/webp', Buffer.alloc(8))).toBe(false);
  });
  it('rechaza WEBP con bytes falsos', () => {
    expect(verificarMagicBytes('image/webp', FAKE_BYTES)).toBe(false);
  });
  it('acepta DOCX (ZIP signature)', () => {
    expect(verificarMagicBytes(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ZIP_BYTES
    )).toBe(true);
  });
  it('acepta XLSX (ZIP signature)', () => {
    expect(verificarMagicBytes(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ZIP_BYTES
    )).toBe(true);
  });
  it('acepta PPTX (ZIP signature)', () => {
    expect(verificarMagicBytes(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', ZIP_BYTES
    )).toBe(true);
  });
  it('acepta DOC (OLE2 signature)', () => {
    expect(verificarMagicBytes('application/msword', OLE2_BYTES)).toBe(true);
  });
  it('acepta XLS (OLE2 signature)', () => {
    expect(verificarMagicBytes('application/vnd.ms-excel', OLE2_BYTES)).toBe(true);
  });
  it('acepta PPT (OLE2 signature)', () => {
    expect(verificarMagicBytes('application/vnd.ms-powerpoint', OLE2_BYTES)).toBe(true);
  });
  it('retorna true para MIME sin firma definida (defensive)', () => {
    expect(verificarMagicBytes('application/octet-stream', FAKE_BYTES)).toBe(true);
  });
  it('retorna false si buffer es null', () => {
    expect(verificarMagicBytes('application/pdf', null)).toBe(false);
  });
});

// ─── validarArchivo middleware ────────────────────────────────────────────────

describe('validarArchivo — sin archivo', () => {
  it('retorna 400 si req.file es undefined', () => {
    const res = mockRes();
    validarArchivo(mockReq(undefined), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });
});

describe('validarArchivo — MIME type inválido', () => {
  it('retorna 415 para MIME no permitido', () => {
    const res = mockRes();
    validarArchivo(mockReq(mockFile({ mimetype: 'application/x-executable', originalname: 'virus.exe' })), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(415);
  });

  it('retorna 415 para text/html', () => {
    const res = mockRes();
    validarArchivo(mockReq(mockFile({ mimetype: 'text/html', originalname: 'page.html' })), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(415);
  });
});

describe('validarArchivo — extensión inválida', () => {
  it('retorna 415 si el archivo no tiene extensión', () => {
    const res = mockRes();
    validarArchivo(mockReq(mockFile({ originalname: 'sinextension' })), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(415);
  });

  it('retorna 415 si la extensión no coincide con el MIME type', () => {
    const res = mockRes();
    // MIME dice PDF pero extensión es .exe
    validarArchivo(mockReq(mockFile({ originalname: 'trampa.exe' })), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(415);
  });

  it('retorna 415 si la extensión es de otro tipo permitido pero diferente al MIME', () => {
    const res = mockRes();
    // MIME dice PDF pero extensión es .jpg
    validarArchivo(mockReq(mockFile({ originalname: 'archivo.jpg' })), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(415);
  });
});

describe('validarArchivo — tamaño', () => {
  it('retorna 413 si el archivo supera 10 MB', () => {
    const res = mockRes();
    validarArchivo(mockReq(mockFile({ size: TAMANO_MAX + 1 })), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(413);
  });
});

describe('validarArchivo — bytes mágicos incorrectos', () => {
  it('retorna 415 si los bytes del buffer no coinciden con el MIME declarado', () => {
    const res = mockRes();
    // Declara PDF pero el buffer tiene bytes de un EXE/basura
    validarArchivo(
      mockReq(mockFile({ mimetype: 'application/pdf', originalname: 'doc.pdf', buffer: FAKE_BYTES })),
      res, jest.fn()
    );
    expect(res.status).toHaveBeenCalledWith(415);
  });

  it('retorna 415 si se sube una imagen JPEG con bytes PNG', () => {
    const res = mockRes();
    validarArchivo(
      mockReq(mockFile({ mimetype: 'image/jpeg', originalname: 'foto.jpg', buffer: PNG_BYTES })),
      res, jest.fn()
    );
    expect(res.status).toHaveBeenCalledWith(415);
  });
});

describe('validarArchivo — casos válidos', () => {
  it('acepta PDF válido y llama next()', () => {
    const next = jest.fn();
    const res  = mockRes();
    validarArchivo(mockReq(mockFile()), res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('acepta JPEG válido', () => {
    const next = jest.fn();
    validarArchivo(
      mockReq(mockFile({ mimetype: 'image/jpeg', originalname: 'foto.jpg', buffer: JPEG_BYTES })),
      mockRes(), next
    );
    expect(next).toHaveBeenCalled();
  });

  it('acepta PNG válido', () => {
    const next = jest.fn();
    validarArchivo(
      mockReq(mockFile({ mimetype: 'image/png', originalname: 'imagen.png', buffer: PNG_BYTES })),
      mockRes(), next
    );
    expect(next).toHaveBeenCalled();
  });

  it('acepta DOCX válido', () => {
    const next = jest.fn();
    validarArchivo(
      mockReq(mockFile({
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        originalname: 'informe.docx',
        buffer: ZIP_BYTES,
      })),
      mockRes(), next
    );
    expect(next).toHaveBeenCalled();
  });

  it('acepta XLSX válido', () => {
    const next = jest.fn();
    validarArchivo(
      mockReq(mockFile({
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'datos.xlsx',
        buffer: ZIP_BYTES,
      })),
      mockRes(), next
    );
    expect(next).toHaveBeenCalled();
  });

  it('acepta DOC válido (OLE2)', () => {
    const next = jest.fn();
    validarArchivo(
      mockReq(mockFile({ mimetype: 'application/msword', originalname: 'doc.doc', buffer: OLE2_BYTES })),
      mockRes(), next
    );
    expect(next).toHaveBeenCalled();
  });

  it('acepta WEBP válido', () => {
    const next = jest.fn();
    validarArchivo(
      mockReq(mockFile({ mimetype: 'image/webp', originalname: 'img.webp', buffer: WEBP_BYTES })),
      mockRes(), next
    );
    expect(next).toHaveBeenCalled();
  });

  it('acepta extensión .jpeg (alias de .jpg)', () => {
    const next = jest.fn();
    validarArchivo(
      mockReq(mockFile({ mimetype: 'image/jpeg', originalname: 'foto.jpeg', buffer: JPEG_BYTES })),
      mockRes(), next
    );
    expect(next).toHaveBeenCalled();
  });

  it('acepta TIFF little-endian', () => {
    const next = jest.fn();
    validarArchivo(
      mockReq(mockFile({ mimetype: 'image/tiff', originalname: 'scan.tif', buffer: TIFF_LE })),
      mockRes(), next
    );
    expect(next).toHaveBeenCalled();
  });

  it('funciona correctamente cuando buffer es undefined (storage en disco)', () => {
    const next = jest.fn();
    validarArchivo(
      mockReq(mockFile({ buffer: undefined })),
      mockRes(), next
    );
    expect(next).toHaveBeenCalled();
  });
});
