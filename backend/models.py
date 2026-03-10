from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Используем SQLite
DATABASE_URL = "sqlite:///./grader.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class Problem(Base):
    __tablename__ = "problems"
    
    id = Column(Integer, primary_key=True)
    title = Column(String(200))
    description = Column(Text)
    test_cases = Column(JSON)
    time_limit = Column(Integer, default=2)
    memory_limit = Column(Integer, default=256)

class Submission(Base):
    __tablename__ = "submissions"
    
    id = Column(Integer, primary_key=True)
    problem_id = Column(Integer)
    code = Column(Text)
    language = Column(String(50))
    status = Column(String(50))
    result = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

# Создаем таблицы
Base.metadata.create_all(engine)
