from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

class Citizen(Base):
    __tablename__ = "citizens"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    language: Mapped[str] = mapped_column(String(2))
    phone_masked: Mapped[str] = mapped_column(String)
class Helper(Base):
    __tablename__ = "helpers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    helper_type: Mapped[str] = mapped_column(String)
class Pass(Base):
    __tablename__ = "passes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    citizen_id: Mapped[int] = mapped_column(ForeignKey("citizens.id"))
    helper_id: Mapped[int] = mapped_column(ForeignKey("helpers.id"))
    task_label: Mapped[str] = mapped_column(String)
    allowed_actions: Mapped[list] = mapped_column(JSON)
    duration_minutes: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    token: Mapped[str] = mapped_column(String, unique=True, index=True)
class StepUpRequest(Base):
    __tablename__ = "step_up_requests"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pass_id: Mapped[int] = mapped_column(ForeignKey("passes.id"))
    action: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolved_via: Mapped[str | None] = mapped_column(String, nullable=True)
    executed: Mapped[bool] = mapped_column(Boolean, default=False)
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pass_id: Mapped[int] = mapped_column(ForeignKey("passes.id"))
    actor: Mapped[str] = mapped_column(String)
    event: Mapped[str] = mapped_column(String)
    detail: Mapped[str] = mapped_column(String)
    timestamp: Mapped[datetime] = mapped_column(DateTime)
