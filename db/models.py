from sqlalchemy import Column, String, Integer, Numeric, Boolean, Text, BigInteger, ForeignKey, CheckConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

Base = declarative_base()

class Major(Base):
    __tablename__ = 'majors'
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    version = Column(String, nullable=False)
    active = Column(Boolean, default=True)
    
    courses = relationship("Course", back_populates="major")
    tracks = relationship("Track", back_populates="major")
    policies = relationship("Policy", back_populates="major")

class Course(Base):
    __tablename__ = 'courses'
    
    id = Column(String, primary_key=True)
    major_id = Column(String, ForeignKey('majors.id'), nullable=False)
    title = Column(String, nullable=False)
    credits = Column(Numeric, nullable=False)
    level = Column(Integer)
    
    major = relationship("Major", back_populates="courses")
    offerings = relationship("Offering", back_populates="course")
    prereqs_as_dst = relationship("Prereq", foreign_keys="Prereq.dst_course", back_populates="dst_course_rel")

class Prereq(Base):
    __tablename__ = 'prereqs'
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    major_id = Column(String, ForeignKey('majors.id'), nullable=False)
    dst_course = Column(String, ForeignKey('courses.id'), nullable=False)
    kind = Column(String, nullable=False)
    expr = Column(JSONB, nullable=False)
    min_grade = Column(String, default='C')
    
    __table_args__ = (
        CheckConstraint("kind IN ('allof','oneof','coreq')", name='valid_prereq_kind'),
    )
    
    dst_course_rel = relationship("Course", back_populates="prereqs_as_dst")

class Requirement(Base):
    __tablename__ = 'requirements'
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    major_id = Column(String, ForeignKey('majors.id'), nullable=False)
    key = Column(String, nullable=False)
    rule = Column(JSONB, nullable=False)

class Offering(Base):
    __tablename__ = 'offerings'
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    course_id = Column(String, ForeignKey('courses.id'), nullable=False)
    term_pattern = Column(String, nullable=False)
    
    course = relationship("Course", back_populates="offerings")

class Track(Base):
    __tablename__ = 'tracks'
    
    id = Column(String, primary_key=True)
    major_id = Column(String, ForeignKey('majors.id'), nullable=False)
    name = Column(String, nullable=False)
    
    major = relationship("Major", back_populates="tracks")
    track_groups = relationship("TrackGroup", back_populates="track")

class TrackGroup(Base):
    __tablename__ = 'track_groups'
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    track_id = Column(String, ForeignKey('tracks.id'), nullable=False)
    key = Column(String, nullable=False)
    need = Column(Integer, nullable=False)
    course_list = Column(JSONB, nullable=False)
    
    track = relationship("Track", back_populates="track_groups")

class Policy(Base):
    __tablename__ = 'policies'
    
    major_id = Column(String, ForeignKey('majors.id'), primary_key=True)
    max_credits_per_term = Column(Integer, nullable=False)
    summer_allowed_default = Column(Boolean, nullable=False)
    min_grade_default = Column(String, nullable=False)
    overload_requires_approval = Column(Boolean, nullable=False)
    
    major = relationship("Major", back_populates="policies")

