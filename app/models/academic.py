"""
Academic program models: majors, tracks, requirements, policies.
"""

from typing import List, Optional

from sqlalchemy import ForeignKey, Index, String, Text, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from .base import TimestampMixin


class Major(Base, TimestampMixin):
    """Academic major definition."""
    
    __tablename__ = "majors"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    degree_type: Mapped[str] = mapped_column(String(20), nullable=False)  # BS, BA, MS, PhD
    description: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    
    # Relationships
    tracks: Mapped[List["Track"]] = relationship(
        "Track", back_populates="major", cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        Index("ix_majors_code", "code"),
        Index("ix_majors_department", "department"),
        Index("ix_majors_active", "is_active"),
    )


class Track(Base, TimestampMixin):
    """Academic track within a major (e.g., Systems, AI)."""
    
    __tablename__ = "tracks"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    major_id: Mapped[int] = mapped_column(ForeignKey("majors.id"), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    
    # Relationships
    major: Mapped["Major"] = relationship("Major", back_populates="tracks")
    track_groups: Mapped[List["TrackGroup"]] = relationship(
        "TrackGroup", back_populates="track", cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        Index("ix_tracks_major_code", "major_id", "code", unique=True),
        Index("ix_tracks_active", "is_active"),
    )


class TrackGroup(Base, TimestampMixin):
    """Grouping within a track (e.g., Core, Electives, Capstone)."""
    
    __tablename__ = "track_groups"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    track_id: Mapped[int] = mapped_column(ForeignKey("tracks.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    required_credits: Mapped[int] = mapped_column(nullable=False)
    display_order: Mapped[int] = mapped_column(default=0, nullable=False)
    
    # Relationships
    track: Mapped["Track"] = relationship("Track", back_populates="track_groups")
    requirements: Mapped[List["Requirement"]] = relationship(
        "Requirement", back_populates="track_group", cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        Index("ix_track_groups_track", "track_id"),
        Index("ix_track_groups_order", "track_id", "display_order"),
    )


class Requirement(Base, TimestampMixin):
    """Specific graduation requirement."""
    
    __tablename__ = "requirements"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    track_group_id: Mapped[int] = mapped_column(
        ForeignKey("track_groups.id"), nullable=False
    )
    requirement_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # course, credit_hours, gpa, etc.
    
    # Requirement specification (JSON for flexibility)
    specification: Mapped[dict] = mapped_column(JSON, nullable=False)
    
    # Examples of specification formats:
    # Course requirement: {"course_codes": ["CS180", "CS182"], "select_count": 1}
    # Credit requirement: {"min_credits": 12, "course_prefixes": ["CS4"], "level": "400+"}
    # GPA requirement: {"min_gpa": 3.0, "courses": ["CS180", "CS182"]}
    
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    
    # Relationships
    track_group: Mapped["TrackGroup"] = relationship(
        "TrackGroup", back_populates="requirements"
    )
    
    __table_args__ = (
        Index("ix_requirements_track_group", "track_group_id"),
        Index("ix_requirements_type", "requirement_type"),
        Index("ix_requirements_active", "is_active"),
    )


class Policy(Base, TimestampMixin):
    """Academic policies and rules."""
    
    __tablename__ = "policies"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Policy rules (JSON for flexibility)
    rules: Mapped[dict] = mapped_column(JSON, nullable=False)
    
    # Examples of policy rules:
    # Grade replacement: {"retake_limit": 2, "grade_threshold": "D"}
    # Credit limits: {"max_credits_per_semester": 18, "overload_approval": True}
    # Prerequisites: {"bypass_conditions": ["advisor_approval", "grade_B_or_higher"]}
    
    effective_date: Mapped[datetime] = mapped_column(nullable=False)
    expiration_date: Mapped[Optional[datetime]] = mapped_column()
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    
    __table_args__ = (
        Index("ix_policies_category", "category"),
        Index("ix_policies_active", "is_active"),
        Index("ix_policies_effective", "effective_date"),
    )