from sqlalchemy import Column, Integer, String, Date, Numeric, Text, DateTime, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from .database import Base
import enum


class UserRole(str, enum.Enum):
    PEMILIK = "pemilik"
    STAFF = "staff"


class Gender(str, enum.Enum):
    JANTAN = "jantan"
    BETINA = "betina"


class BreederAsal(str, enum.Enum):
    BELI = "beli"
    TERNAK_SENDIRI = "ternak_sendiri"


class BreederStatus(str, enum.Enum):
    BREEDING = "breeding"
    RESTING = "resting"
    READY_FOR_SALE = "ready_for_sale"


class Fertilitas(str, enum.Enum):
    FERTIL = "Fertil"
    INFERTIL = "Infertil"
    BELUM_DICEK = "Belum dicek"


class EggAkhir(str, enum.Enum):
    MENETAS = "Menetas"
    GAGAL = "Gagal"
    PROSES = "Proses"


class ChickStatus(str, enum.Enum):
    NEWBORN = "newborn"
    GROWING = "growing"
    READY_FOR_SALE = "ready_for_sale"
    SOLD = "sold"


class LampuStatus(str, enum.Enum):
    ON = "ON"
    OFF = "OFF"


class RotasiStatus(str, enum.Enum):
    SUKSES = "sukses"
    GAGAL = "gagal"


class FinanceTipe(str, enum.Enum):
    PEMASUKAN = "Pemasukan"
    PENGELUARAN = "Pengeluaran"


class AlertTipe(str, enum.Enum):
    SUHU = "suhu"
    KELEMBAPAN = "kelembapan"
    ROTASI_GAGAL = "rotasi_gagal"
    LAIN = "lain"


class AlertLevel(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class User(Base):
    __tablename__ = "users"
    id = Column(String(50), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    nama = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="staff")
    created_at = Column(DateTime, server_default=func.now())


class Breeder(Base):
    __tablename__ = "breeders"
    id = Column(String(50), primary_key=True, index=True)
    nama = Column(String(255), nullable=True)
    jenis_kelamin = Column(SAEnum(Gender), nullable=False)
    tanggal_lahir = Column(Date, nullable=True)
    generasi = Column(String(50), nullable=False)
    varian_warna = Column(String(100), nullable=False)
    asal = Column(SAEnum(BreederAsal), nullable=False)
    status = Column(SAEnum(BreederStatus), nullable=False, default=BreederStatus.BREEDING)
    foto_url = Column(String(500), nullable=True)
    parent_jantan_id = Column(String(50), ForeignKey("breeders.id"), nullable=True)
    parent_betina_id = Column(String(50), ForeignKey("breeders.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class Egg(Base):
    __tablename__ = "eggs"
    id = Column(String(50), primary_key=True, index=True)
    slot = Column(Integer, unique=True, index=True, nullable=False)
    induk_jantan_id = Column(String(50), ForeignKey("breeders.id"), nullable=False)
    induk_betina_id = Column(String(50), ForeignKey("breeders.id"), nullable=False)
    tanggalMasuk = Column(String(50), nullable=False)
    fertilitas = Column(SAEnum(Fertilitas), default=Fertilitas.BELUM_DICEK)
    akhir = Column(SAEnum(EggAkhir), default=EggAkhir.PROSES)
    catatan = Column(Text, nullable=True)


class Chick(Base):
    __tablename__ = "chicks"
    id = Column(String(50), primary_key=True, index=True)
    egg_id = Column(String(50), ForeignKey("eggs.id"), nullable=False)
    induk_jantan_id = Column(String(50), nullable=True)
    induk_betina_id = Column(String(50), nullable=True)
    tanggal_menetas = Column(Date, nullable=False)
    berat_awal = Column(Numeric(6, 2), nullable=False)
    skor_kesehatan = Column(String(50), nullable=False)
    status = Column(SAEnum(ChickStatus), nullable=False, default=ChickStatus.NEWBORN)
    foto_url = Column(String(500), nullable=True)
    catatan = Column(Text, nullable=True)


class IncubatorSettings(Base):
    __tablename__ = "incubator_settings"
    id = Column(Integer, primary_key=True, index=True)
    suhu_min = Column(Numeric(4, 2), nullable=False, default=37.0)
    suhu_max = Column(Numeric(4, 2), nullable=False, default=38.0)
    kelembapan_min = Column(Numeric(4, 2), nullable=False, default=55.0)
    kelembapan_max = Column(Numeric(4, 2), nullable=False, default=65.0)
    interval_rotasi_menit = Column(Integer, nullable=False, default=240)
    updated_by = Column(String(50), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, nullable=True)


class IncubatorStatus(Base):
    __tablename__ = "incubator_status"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    suhu_sekarang = Column(Numeric(5, 2), nullable=False)
    kelembapan_sekarang = Column(Numeric(5, 2), nullable=False)
    lampu_status = Column(SAEnum(LampuStatus), nullable=False)
    terakhir_rotasi = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, server_default=func.now())


class TelemetryLog(Base):
    __tablename__ = "telemetry_logs"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(String(50), nullable=False)
    temperature = Column(Numeric(5, 2), nullable=False)
    humidity = Column(Numeric(5, 2), nullable=False)


class RotationLog(Base):
    __tablename__ = "rotation_logs"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(String(50), nullable=False)
    status = Column(SAEnum(RotasiStatus), nullable=False)
    catatan = Column(Text, nullable=True)


class Sale(Base):
    __tablename__ = "sales"
    id = Column(String(50), primary_key=True, index=True)
    tanggal = Column(String(50), nullable=False)
    item = Column(String(255), nullable=False)
    referensiId = Column(String(100), nullable=False)
    pembeli = Column(String(255), nullable=False)
    qty = Column(Integer, default=1, nullable=False)
    hargaSatuan = Column(Numeric(12, 2), nullable=False)
    status = Column(String(50), default="Booking")
    catatan = Column(Text, nullable=True)


class FinanceEntry(Base):
    __tablename__ = "finance_entries"
    id = Column(String(50), primary_key=True, index=True)
    tanggal = Column(String(50), nullable=False)
    tipe = Column(SAEnum(FinanceTipe), nullable=False)
    kategori = Column(String(255), nullable=False)
    jumlah = Column(Numeric(12, 2), nullable=False)
    catatan = Column(Text, nullable=True)
    created_by = Column(String(50), ForeignKey("users.id"), nullable=False)


class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tipe = Column(SAEnum(AlertTipe), nullable=False)
    pesan = Column(String(500), nullable=False)
    level = Column(SAEnum(AlertLevel), nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
