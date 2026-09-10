-- Migrasi: tambah kolom terakhir_rotasi ke incubator_status
-- Akar masalah: model IncubatorStatus memakai kolom terakhir_rotasi (DateTime,
-- nullable) tapi tabel di MySQL masih skema lama -> POST/GET /api/incubator/status
-- gagal dengan OperationalError 1054 "Unknown column 'terakhir_rotasi'".
-- Base.metadata.create_all() tidak menambah kolom ke tabel yang sudah ada,
-- jadi migrasi ini wajib dijalankan sekali di database server.
--
-- Cara pakai (aman diulang):
--   docker exec -i kampung-merak-db mysql -u root -pkampung_merak kampung_merak < migrasi_incubator_terakhir_rotasi.sql

DELIMITER $$

CREATE PROCEDURE sp_add_terakhir_rotasi()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'incubator_status'
          AND COLUMN_NAME = 'terakhir_rotasi'
    ) THEN
        ALTER TABLE incubator_status
            ADD COLUMN terakhir_rotasi DATETIME NULL AFTER lampu_status;
    END IF;
END$$

DELIMITER ;

CALL sp_add_terakhir_rotasi();
DROP PROCEDURE sp_add_terakhir_rotasi;
