-- ============================================================
-- MIGRACIÓN: Sistema de Trazabilidad de Pallets
-- Ejecutar en orden sobre la BD existente
-- ============================================================

-- 1. Tabla: Lote de Huevos (antes estaba implícito en Incubacion)
CREATE TABLE IF NOT EXISTS Lote_Huevo (
    id_lote_huevo   SERIAL PRIMARY KEY,
    codigo_qr       VARCHAR(100) UNIQUE NOT NULL,  -- valor del QR escaneado
    origen          VARCHAR(200),
    fecha_registro  DATE NOT NULL DEFAULT CURRENT_DATE,
    activo          BOOLEAN NOT NULL DEFAULT TRUE   -- TRUE = lote en marcha
);

-- 2. Marcar el lote de alimento como activo/finalizado
ALTER TABLE Lote_Alimento
    ADD COLUMN IF NOT EXISTS codigo_qr  VARCHAR(100) UNIQUE,
    ADD COLUMN IF NOT EXISTS activo     BOOLEAN NOT NULL DEFAULT TRUE;

-- 3. Ampliar tabla Engorde (Pallet) con trazabilidad
ALTER TABLE Engorde
    ADD COLUMN IF NOT EXISTS codigo_qr              VARCHAR(100) UNIQUE,
    ADD COLUMN IF NOT EXISTS estado                 VARCHAR(20) NOT NULL DEFAULT 'vacio'
                                                    CHECK (estado IN ('vacio','preparado','en_camara','desmontar')),
    ADD COLUMN IF NOT EXISTS id_lote_alimento_traz  INT REFERENCES Lote_Alimento(id_lote_alimento),
    ADD COLUMN IF NOT EXISTS id_lote_huevo_traz     INT REFERENCES Lote_Huevo(id_lote_huevo),
    ADD COLUMN IF NOT EXISTS fecha_entrada_camara   DATE,
    ADD COLUMN IF NOT EXISTS fecha_salida_prevista  DATE;

-- 4. Ampliar tabla Camara con capacidad real
ALTER TABLE Camara
    ADD COLUMN IF NOT EXISTS codigo_qr      VARCHAR(100) UNIQUE,
    ADD COLUMN IF NOT EXISTS nombre         VARCHAR(100),
    ADD COLUMN IF NOT EXISTS capacidad_max  INT NOT NULL DEFAULT 20;  -- número de huecos

-- 5. Vista útil: estado actual de una cámara
CREATE OR REPLACE VIEW vista_camara_estado AS
SELECT
    c.id_camara,
    c.nombre,
    c.codigo_qr,
    c.capacidad_max,
    COUNT(e.id_pallet) FILTER (WHERE e.estado = 'en_camara' AND e.id_camara = c.id_camara) AS pallets_dentro,
    ROUND(
        COUNT(e.id_pallet) FILTER (WHERE e.estado = 'en_camara' AND e.id_camara = c.id_camara)::numeric
        / NULLIF(c.capacidad_max, 0) * 100, 1
    ) AS porcentaje_uso
FROM Camara c
LEFT JOIN Engorde e ON e.id_camara = c.id_camara AND e.estado = 'en_camara'
GROUP BY c.id_camara, c.nombre, c.codigo_qr, c.capacidad_max;
