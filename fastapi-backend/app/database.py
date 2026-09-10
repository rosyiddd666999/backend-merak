import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

MYSQL_HOST = os.getenv("MYSQL_HOST")
if MYSQL_HOST:
    DATABASE_URL = (
        f"mysql+pymysql://{os.getenv('MYSQL_USER', 'root')}:"
        f"{os.getenv('MYSQL_PASSWORD', 'kampung_merak')}@"
        f"{MYSQL_HOST}:{os.getenv('MYSQL_PORT', '3306')}/"
        f"{os.getenv('MYSQL_DATABASE', 'kampung_merak')}"
    )
    # pool_pre_ping: buang koneksi basi sebelum dipakai (cegah "MySQL server
    # has gone away" 2006 / "Lost connection" 2013 pada proses long-running).
    # pool_recycle: daur ulang koneksi tiap 1 jam agar tidak melewati wait_timeout.
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=3600)
else:
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kampung_merak.db")
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get DB session in endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
