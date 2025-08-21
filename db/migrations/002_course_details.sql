-- Course long-form details and lookups
CREATE TABLE course_details (
  course_id TEXT PRIMARY KEY REFERENCES courses(id),
  description TEXT NOT NULL,
  credit_hours_min NUMERIC,
  credit_hours_max NUMERIC,
  offered_by TEXT,
  department TEXT,
  attribute TEXT         -- e.g., 'Lower Division'
);

CREATE TABLE course_levels (
  course_id TEXT REFERENCES courses(id),
  level_name TEXT,        -- 'Graduate' | 'Professional' | 'Undergraduate'
  PRIMARY KEY (course_id, level_name)
);

CREATE TABLE course_schedule_types (
  course_id TEXT REFERENCES courses(id),
  schedule_type TEXT,     -- 'Lecture' | 'Laboratory' | 'Recitation' | 'Distance Learning' | ...
  PRIMARY KEY (course_id, schedule_type)
);

CREATE TABLE course_campuses (
  course_id TEXT REFERENCES courses(id),
  campus TEXT,            -- 'Indianapolis' | 'West Lafayette' | ...
  PRIMARY KEY (course_id, campus)
);

CREATE TABLE course_outcomes (
  course_id TEXT REFERENCES courses(id),
  outcome_no INT,
  text TEXT,
  PRIMARY KEY (course_id, outcome_no)
);

CREATE TABLE course_program_restrictions (
  course_id TEXT REFERENCES courses(id),
  program TEXT,           -- e.g., 'Computer Science'
  allow BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (course_id, program)
);

-- Optional convenience for "CS 240" style queries
CREATE TABLE course_aliases (
  alias TEXT PRIMARY KEY, -- e.g., 'CS240'
  course_id TEXT REFERENCES courses(id)
);

-- Add indexes for performance
CREATE INDEX idx_course_details_course_id ON course_details(course_id);
CREATE INDEX idx_course_levels_course_id ON course_levels(course_id);
CREATE INDEX idx_course_schedule_types_course_id ON course_schedule_types(course_id);
CREATE INDEX idx_course_campuses_course_id ON course_campuses(course_id);
CREATE INDEX idx_course_outcomes_course_id ON course_outcomes(course_id);
CREATE INDEX idx_course_program_restrictions_course_id ON course_program_restrictions(course_id);
CREATE INDEX idx_course_aliases_course_id ON course_aliases(course_id);

