CREATE TABLE majors(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE courses(
  id TEXT PRIMARY KEY,
  major_id TEXT NOT NULL,
  title TEXT NOT NULL,
  credits NUMERIC NOT NULL,
  level INT,
  UNIQUE (id, major_id)
);

CREATE TABLE prereqs(
  id BIGSERIAL PRIMARY KEY,
  major_id TEXT NOT NULL,
  dst_course TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('allof','oneof','coreq')),
  expr JSONB NOT NULL,
  min_grade TEXT DEFAULT 'C'
);

CREATE TABLE requirements(
  id BIGSERIAL PRIMARY KEY,
  major_id TEXT NOT NULL,
  key TEXT NOT NULL,
  rule JSONB NOT NULL
);

CREATE TABLE offerings(
  id BIGSERIAL PRIMARY KEY,
  course_id TEXT NOT NULL,
  term_pattern TEXT NOT NULL
);

/* Tracks */
CREATE TABLE tracks(
  id TEXT PRIMARY KEY,          -- 'systems','ai'
  major_id TEXT NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE track_groups(
  id BIGSERIAL PRIMARY KEY,
  track_id TEXT NOT NULL REFERENCES tracks(id),
  key TEXT NOT NULL,            -- 'systems_core','ai_core'
  need INT NOT NULL,            -- how many to pick
  course_list JSONB NOT NULL    -- ["CS252","CS354",...]
);

/* Structured policies used by planner */
CREATE TABLE policies(
  major_id TEXT PRIMARY KEY,
  max_credits_per_term INT NOT NULL,
  summer_allowed_default BOOLEAN NOT NULL,
  min_grade_default TEXT NOT NULL,
  overload_requires_approval BOOLEAN NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_courses_major_id ON courses(major_id);
CREATE INDEX idx_prereqs_dst_course ON prereqs(dst_course);
CREATE INDEX idx_prereqs_major_id ON prereqs(major_id);
CREATE INDEX idx_offerings_course_id ON offerings(course_id);
CREATE INDEX idx_track_groups_track_id ON track_groups(track_id);
