#!/usr/bin/env python3
"""
SQL Academic Analyzer - Advanced Query-Based Academic Planning
Uses SQL queries to break down complex academic scenarios and provide precise recommendations
"""

import sqlite3
import json
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

@dataclass
class SQLRecommendation:
    """SQL-driven course recommendation"""
    course_code: str
    course_title: str
    credits: int
    priority_score: int  # 1-10 scale
    blocking_factor: float  # How many courses this blocks (0.0-1.0)
    prerequisite_chain_length: int
    rationale: str
    optimal_semester: str
    risk_level: str  # low, medium, high

class SQLAcademicAnalyzer:
    """Advanced academic analyzer using SQL queries for complex planning scenarios"""
    
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = "/Users/rrao/Desktop/final/purdue_cs_knowledge.db"
        
        self.db_path = db_path
        self.conn = None
        self._initialize_database()
        self._populate_sample_data()
    
    def _initialize_database(self):
        """Initialize the database with academic planning schema"""
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row  # Enable column access by name
        
        # Create comprehensive academic planning tables
        self._create_tables()
    
    def _create_tables(self):
        """Create the SQL schema for academic planning"""
        cursor = self.conn.cursor()
        
        # Courses table with detailed metadata
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS courses (
            course_code TEXT PRIMARY KEY,
            course_title TEXT NOT NULL,
            credits INTEGER NOT NULL,
            department TEXT NOT NULL,
            difficulty_level TEXT,
            difficulty_score REAL,
            semester_offered TEXT,
            workload_hours REAL,
            success_rate REAL,
            is_foundation BOOLEAN,
            is_critical_path BOOLEAN
        )
        ''')
        
        # Prerequisites with relationship strength
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS prerequisites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_code TEXT NOT NULL,
            prerequisite_code TEXT NOT NULL,
            relationship_type TEXT,  -- 'required', 'recommended', 'corequisite'
            strength REAL,  -- 0.0-1.0, how critical this prerequisite is
            FOREIGN KEY (course_code) REFERENCES courses (course_code),
            FOREIGN KEY (prerequisite_code) REFERENCES courses (course_code)
        )
        ''')
        
        # Major requirements and tracks
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS major_requirements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            major_name TEXT NOT NULL,
            track_name TEXT,
            course_code TEXT NOT NULL,
            requirement_type TEXT,  -- 'foundation', 'core', 'elective', 'capstone'
            year_level INTEGER,
            semester_preference TEXT,
            priority_order INTEGER,
            FOREIGN KEY (course_code) REFERENCES courses (course_code)
        )
        ''')
        
        # Student academic records
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS student_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            course_code TEXT NOT NULL,
            grade TEXT,
            semester_taken TEXT,
            credits_earned INTEGER,
            completion_status TEXT,  -- 'completed', 'in_progress', 'failed', 'withdrawn'
            FOREIGN KEY (course_code) REFERENCES courses (course_code)
        )
        ''')
        
        # Graduation requirements tracking
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS graduation_requirements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            major_name TEXT NOT NULL,
            requirement_category TEXT,  -- 'total_credits', 'cs_credits', 'math_credits', 'gpa'
            minimum_value REAL,
            description TEXT
        )
        ''')
        
        # Course scheduling and availability
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS course_schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_code TEXT NOT NULL,
            semester TEXT,  -- 'Fall', 'Spring', 'Summer'
            year INTEGER,
            capacity INTEGER,
            instructor TEXT,
            difficulty_adjustment REAL,  -- Instructor-specific difficulty modifier
            FOREIGN KEY (course_code) REFERENCES courses (course_code)
        )
        ''')
        
        self.conn.commit()
    
    def _populate_sample_data(self):
        """Populate the database with sample academic data"""
        cursor = self.conn.cursor()
        
        # Check if data already exists
        cursor.execute("SELECT COUNT(*) FROM courses")
        if cursor.fetchone()[0] > 0:
            return  # Data already populated
        
        # Insert sample courses
        courses_data = [
            ('CS 18000', 'Problem Solving and Object-Oriented Programming', 4, 'CS', 'Hard', 4.2, 'Fall,Spring', 12.0, 0.73, 1, 1),
            ('CS 18200', 'Discrete Mathematics', 3, 'CS', 'Medium', 3.8, 'Fall,Spring', 10.0, 0.78, 1, 1),
            ('CS 24000', 'Programming in C', 3, 'CS', 'Medium', 3.5, 'Fall,Spring', 10.0, 0.82, 1, 1),
            ('CS 25000', 'Computer Architecture', 4, 'CS', 'Hard', 4.0, 'Fall,Spring', 11.0, 0.75, 1, 1),
            ('CS 25100', 'Data Structures and Algorithms', 4, 'CS', 'Very Hard', 4.5, 'Fall,Spring', 14.0, 0.68, 1, 1),
            ('CS 25200', 'Systems Programming', 4, 'CS', 'Hard', 4.1, 'Fall,Spring', 13.0, 0.72, 1, 1),
            ('CS 38100', 'Introduction to Analysis of Algorithms', 3, 'CS', 'Hard', 4.3, 'Fall,Spring', 11.0, 0.70, 0, 1),
            ('CS 37300', 'Data Mining and Machine Learning', 3, 'CS', 'Very Hard', 4.6, 'Fall,Spring', 12.0, 0.65, 0, 0),
            ('CS 47100', 'Introduction to Artificial Intelligence', 3, 'CS', 'Hard', 4.2, 'Fall,Spring', 11.0, 0.71, 0, 0),
            ('MA 16100', 'Plane Analytic Geometry And Calculus I', 5, 'MATH', 'Hard', 4.0, 'Fall,Spring,Summer', 12.0, 0.74, 1, 1),
            ('MA 16200', 'Plane Analytic Geometry And Calculus II', 5, 'MATH', 'Hard', 4.1, 'Fall,Spring,Summer', 12.0, 0.72, 1, 1),
            ('MA 26100', 'Multivariate Calculus', 4, 'MATH', 'Hard', 4.2, 'Fall,Spring', 11.0, 0.73, 1, 0),
            ('MA 26500', 'Linear Algebra', 3, 'MATH', 'Medium', 3.7, 'Fall,Spring,Summer', 9.0, 0.79, 1, 0),
        ]
        
        cursor.executemany('''
        INSERT OR IGNORE INTO courses 
        (course_code, course_title, credits, department, difficulty_level, difficulty_score, 
         semester_offered, workload_hours, success_rate, is_foundation, is_critical_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', courses_data)
        
        # Insert prerequisites with relationship strength
        prerequisites_data = [
            ('CS 18200', 'CS 18000', 'required', 1.0),
            ('CS 24000', 'CS 18000', 'required', 1.0),
            ('CS 25000', 'CS 18200', 'required', 0.9),
            ('CS 25000', 'CS 24000', 'required', 0.8),
            ('CS 25100', 'CS 25000', 'required', 1.0),
            ('CS 25100', 'CS 18200', 'required', 0.9),
            ('CS 25200', 'CS 25000', 'required', 0.9),
            ('CS 25200', 'CS 24000', 'required', 1.0),
            ('CS 38100', 'CS 25100', 'required', 1.0),
            ('CS 37300', 'CS 25100', 'required', 0.9),
            ('CS 37300', 'MA 26500', 'recommended', 0.7),
            ('CS 47100', 'CS 25100', 'required', 0.9),
            ('CS 47100', 'CS 38100', 'recommended', 0.8),
            ('MA 16200', 'MA 16100', 'required', 1.0),
            ('MA 26100', 'MA 16200', 'required', 1.0),
        ]
        
        cursor.executemany('''
        INSERT OR IGNORE INTO prerequisites 
        (course_code, prerequisite_code, relationship_type, strength)
        VALUES (?, ?, ?, ?)
        ''', prerequisites_data)
        
        # Insert major requirements
        major_requirements_data = [
            ('Computer Science', 'Machine Intelligence', 'CS 18000', 'foundation', 1, 'Fall', 1),
            ('Computer Science', 'Machine Intelligence', 'CS 18200', 'foundation', 1, 'Spring', 2),
            ('Computer Science', 'Machine Intelligence', 'CS 24000', 'foundation', 2, 'Fall', 3),
            ('Computer Science', 'Machine Intelligence', 'CS 25000', 'foundation', 2, 'Spring', 4),
            ('Computer Science', 'Machine Intelligence', 'CS 25100', 'foundation', 2, 'Fall', 5),
            ('Computer Science', 'Machine Intelligence', 'CS 25200', 'foundation', 3, 'Spring', 6),
            ('Computer Science', 'Machine Intelligence', 'CS 38100', 'core', 3, 'Fall', 7),
            ('Computer Science', 'Machine Intelligence', 'CS 37300', 'core', 3, 'Spring', 8),
            ('Computer Science', 'Machine Intelligence', 'CS 47100', 'core', 4, 'Fall', 9),
            ('Computer Science', 'Machine Intelligence', 'MA 26500', 'core', 2, 'Any', 4),
        ]
        
        cursor.executemany('''
        INSERT OR IGNORE INTO major_requirements 
        (major_name, track_name, course_code, requirement_type, year_level, semester_preference, priority_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', major_requirements_data)
        
        # Insert graduation requirements
        graduation_requirements_data = [
            ('Computer Science', 'total_credits', 120, 'Minimum total credits for graduation'),
            ('Computer Science', 'cs_credits', 41, 'Minimum CS credits required'),
            ('Computer Science', 'math_credits', 17, 'Minimum math credits required'),
            ('Computer Science', 'cumulative_gpa', 2.0, 'Minimum cumulative GPA for graduation'),
        ]
        
        cursor.executemany('''
        INSERT OR IGNORE INTO graduation_requirements 
        (major_name, requirement_category, minimum_value, description)
        VALUES (?, ?, ?, ?)
        ''', graduation_requirements_data)
        
        self.conn.commit()
    
    def analyze_student_progression(self, student_context: Dict[str, Any]) -> Dict[str, Any]:
        """Use SQL queries to analyze student's academic progression"""
        
        # Insert or update student record
        self._update_student_record(student_context)
        
        # Complex SQL analysis
        analysis = {
            'prerequisite_readiness': self._analyze_prerequisite_readiness(student_context),
            'critical_path_analysis': self._analyze_critical_path(student_context),
            'graduation_timeline': self._analyze_graduation_timeline(student_context),
            'course_priority_ranking': self._rank_course_priorities(student_context),
            'risk_assessment': self._assess_academic_risks(student_context)
        }
        
        return analysis
    
    def _update_student_record(self, student_context: Dict[str, Any]):
        """Update student record in database"""
        cursor = self.conn.cursor()
        student_id = student_context.get('student_id', 'current_student')
        
        # Clear existing records for this student
        cursor.execute("DELETE FROM student_records WHERE student_id = ?", (student_id,))
        
        # Insert completed courses
        completed_courses = student_context.get('completed_courses', [])
        for course in completed_courses:
            cursor.execute('''
            INSERT INTO student_records 
            (student_id, course_code, grade, semester_taken, credits_earned, completion_status)
            VALUES (?, ?, ?, ?, ?, ?)
            ''', (student_id, course, 'B+', 'Previous', 3, 'completed'))
        
        self.conn.commit()
    
    def _analyze_prerequisite_readiness(self, student_context: Dict[str, Any]) -> List[Dict]:
        """SQL query to find courses student is ready to take"""
        cursor = self.conn.cursor()
        student_id = student_context.get('student_id', 'current_student')
        major = student_context.get('major', 'Computer Science')
        track = student_context.get('target_track', 'Machine Intelligence')
        
        # Complex SQL query to find available courses
        query = '''
        WITH student_completed AS (
            SELECT course_code FROM student_records 
            WHERE student_id = ? AND completion_status = 'completed'
        ),
        prerequisite_check AS (
            SELECT 
                c.course_code,
                c.course_title,
                c.credits,
                c.difficulty_score,
                c.is_critical_path,
                mr.requirement_type,
                mr.priority_order,
                COUNT(p.prerequisite_code) as total_prereqs,
                COUNT(sc.course_code) as completed_prereqs,
                CASE 
                    WHEN COUNT(p.prerequisite_code) = 0 THEN 1.0
                    ELSE CAST(COUNT(sc.course_code) AS REAL) / COUNT(p.prerequisite_code)
                END as prerequisite_completion_ratio
            FROM courses c
            JOIN major_requirements mr ON c.course_code = mr.course_code
            LEFT JOIN prerequisites p ON c.course_code = p.course_code AND p.relationship_type = 'required'
            LEFT JOIN student_completed sc ON p.prerequisite_code = sc.course_code
            WHERE mr.major_name = ? AND mr.track_name = ?
            AND c.course_code NOT IN (SELECT course_code FROM student_completed)
            GROUP BY c.course_code, c.course_title, c.credits, c.difficulty_score, 
                     c.is_critical_path, mr.requirement_type, mr.priority_order
        )
        SELECT * FROM prerequisite_check 
        WHERE prerequisite_completion_ratio = 1.0
        ORDER BY is_critical_path DESC, priority_order ASC, difficulty_score ASC
        '''
        
        cursor.execute(query, (student_id, major, track))
        ready_courses = []
        
        for row in cursor.fetchall():
            ready_courses.append({
                'course_code': row['course_code'],
                'course_title': row['course_title'],
                'credits': row['credits'],
                'difficulty_score': row['difficulty_score'],
                'is_critical_path': bool(row['is_critical_path']),
                'requirement_type': row['requirement_type'],
                'priority_order': row['priority_order'],
                'readiness_score': 1.0  # All prerequisites met
            })
        
        return ready_courses
    
    def _analyze_critical_path(self, student_context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze critical path for graduation using SQL"""
        cursor = self.conn.cursor()
        student_id = student_context.get('student_id', 'current_student')
        
        # Find courses that block the most other courses
        query = '''
        WITH blocking_analysis AS (
            SELECT 
                p.prerequisite_code as blocking_course,
                COUNT(DISTINCT p.course_code) as courses_blocked,
                AVG(c.is_critical_path) as avg_criticality,
                SUM(c.credits) as blocked_credits
            FROM prerequisites p
            JOIN courses c ON p.course_code = c.course_code
            WHERE p.prerequisite_code NOT IN (
                SELECT course_code FROM student_records 
                WHERE student_id = ? AND completion_status = 'completed'
            )
            GROUP BY p.prerequisite_code
        )
        SELECT 
            ba.*,
            c.course_title,
            c.difficulty_score,
            (courses_blocked * avg_criticality * blocked_credits) as blocking_factor
        FROM blocking_analysis ba
        JOIN courses c ON ba.blocking_course = c.course_code
        ORDER BY blocking_factor DESC
        LIMIT 5
        '''
        
        cursor.execute(query, (student_id,))
        critical_courses = cursor.fetchall()
        
        return {
            'most_blocking_courses': [dict(row) for row in critical_courses],
            'critical_path_recommendations': self._get_critical_path_recommendations(critical_courses)
        }
    
    def _analyze_graduation_timeline(self, student_context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze graduation timeline using SQL aggregations"""
        cursor = self.conn.cursor()
        student_id = student_context.get('student_id', 'current_student')
        major = student_context.get('major', 'Computer Science')
        
        # Calculate remaining requirements
        query = '''
        WITH completed_credits AS (
            SELECT 
                SUM(CASE WHEN c.department = 'CS' THEN sr.credits_earned ELSE 0 END) as cs_credits,
                SUM(CASE WHEN c.department = 'MATH' THEN sr.credits_earned ELSE 0 END) as math_credits,
                SUM(sr.credits_earned) as total_credits
            FROM student_records sr
            JOIN courses c ON sr.course_code = c.course_code
            WHERE sr.student_id = ? AND sr.completion_status = 'completed'
        ),
        remaining_requirements AS (
            SELECT 
                gr.requirement_category,
                gr.minimum_value,
                CASE gr.requirement_category
                    WHEN 'cs_credits' THEN gr.minimum_value - COALESCE(cc.cs_credits, 0)
                    WHEN 'math_credits' THEN gr.minimum_value - COALESCE(cc.math_credits, 0)
                    WHEN 'total_credits' THEN gr.minimum_value - COALESCE(cc.total_credits, 0)
                    ELSE gr.minimum_value
                END as credits_needed
            FROM graduation_requirements gr
            CROSS JOIN completed_credits cc
            WHERE gr.major_name = ?
        )
        SELECT * FROM remaining_requirements WHERE credits_needed > 0
        '''
        
        cursor.execute(query, (student_id, major))
        remaining_reqs = cursor.fetchall()
        
        return {
            'remaining_requirements': [dict(row) for row in remaining_reqs],
            'estimated_semesters': self._calculate_estimated_semesters(remaining_reqs),
            'early_graduation_feasible': self._check_early_graduation_feasibility(remaining_reqs)
        }
    
    def _rank_course_priorities(self, student_context: Dict[str, Any]) -> List[SQLRecommendation]:
        """Use complex SQL to rank course priorities"""
        cursor = self.conn.cursor()
        student_id = student_context.get('student_id', 'current_student')
        major = student_context.get('major', 'Computer Science')
        track = student_context.get('target_track', 'Machine Intelligence')
        
        # Complex priority ranking query
        query = '''
        WITH course_metrics AS (
            SELECT 
                c.course_code,
                c.course_title,
                c.credits,
                c.difficulty_score,
                c.is_critical_path,
                c.success_rate,
                mr.priority_order,
                mr.requirement_type,
                -- Calculate blocking factor
                COALESCE(blocking.courses_blocked, 0) as courses_blocked,
                -- Calculate prerequisite chain length
                COALESCE(chain.chain_length, 0) as chain_length,
                -- Calculate priority score
                (
                    (CASE WHEN c.is_critical_path THEN 10 ELSE 5 END) +
                    (CASE mr.requirement_type 
                        WHEN 'foundation' THEN 8
                        WHEN 'core' THEN 6
                        WHEN 'elective' THEN 3
                        ELSE 1 END) +
                    (10 - c.difficulty_score) +
                    (COALESCE(blocking.courses_blocked, 0) * 2) +
                    c.success_rate * 5
                ) as priority_score
            FROM courses c
            JOIN major_requirements mr ON c.course_code = mr.course_code
            LEFT JOIN (
                SELECT prerequisite_code, COUNT(*) as courses_blocked
                FROM prerequisites WHERE relationship_type = 'required'
                GROUP BY prerequisite_code
            ) blocking ON c.course_code = blocking.prerequisite_code
            LEFT JOIN (
                SELECT course_code, COUNT(*) as chain_length
                FROM prerequisites WHERE relationship_type = 'required'
                GROUP BY course_code
            ) chain ON c.course_code = chain.course_code
            WHERE mr.major_name = ? AND mr.track_name = ?
            AND c.course_code NOT IN (
                SELECT course_code FROM student_records 
                WHERE student_id = ? AND completion_status = 'completed'
            )
        )
        SELECT * FROM course_metrics
        ORDER BY priority_score DESC, is_critical_path DESC, priority_order ASC
        '''
        
        cursor.execute(query, (major, track, student_id))
        ranked_courses = []
        
        for row in cursor.fetchall():
            # Determine optimal semester based on prerequisites and difficulty
            optimal_semester = self._determine_optimal_semester(row['course_code'], student_context)
            risk_level = self._assess_course_risk(row['difficulty_score'], row['success_rate'])
            
            recommendation = SQLRecommendation(
                course_code=row['course_code'],
                course_title=row['course_title'],
                credits=row['credits'],
                priority_score=int(row['priority_score']),
                blocking_factor=row['courses_blocked'] / 10.0 if row['courses_blocked'] else 0.0,
                prerequisite_chain_length=row['chain_length'],
                rationale=self._generate_rationale(row),
                optimal_semester=optimal_semester,
                risk_level=risk_level
            )
            ranked_courses.append(recommendation)
        
        return ranked_courses[:10]  # Top 10 recommendations
    
    def _assess_academic_risks(self, student_context: Dict[str, Any]) -> Dict[str, Any]:
        """Assess academic risks using SQL analysis"""
        cursor = self.conn.cursor()
        student_id = student_context.get('student_id', 'current_student')
        
        # Risk assessment query
        query = '''
        SELECT 
            AVG(c.difficulty_score) as avg_difficulty_ahead,
            COUNT(CASE WHEN c.difficulty_score > 4.0 THEN 1 END) as high_difficulty_courses,
            AVG(c.success_rate) as avg_success_rate,
            COUNT(*) as total_remaining_courses
        FROM courses c
        JOIN major_requirements mr ON c.course_code = mr.course_code
        WHERE c.course_code NOT IN (
            SELECT course_code FROM student_records 
            WHERE student_id = ? AND completion_status = 'completed'
        )
        '''
        
        cursor.execute(query, (student_id,))
        risk_data = cursor.fetchone()
        
        return {
            'overall_risk_level': self._calculate_overall_risk(risk_data),
            'high_difficulty_courses_ahead': risk_data['high_difficulty_courses'],
            'average_success_rate': risk_data['avg_success_rate'],
            'workload_risk': 'medium' if risk_data['total_remaining_courses'] > 15 else 'low'
        }
    
    def get_sql_based_recommendations(self, student_context: Dict[str, Any]) -> Dict[str, Any]:
        """Main method to get comprehensive SQL-based recommendations"""
        
        # Perform comprehensive SQL analysis
        analysis = self.analyze_student_progression(student_context)
        
        # Generate structured recommendations
        recommendations = {
            'immediate_courses': analysis['prerequisite_readiness'][:3],
            'critical_path_courses': analysis['critical_path_analysis']['most_blocking_courses'][:2],
            'prioritized_recommendations': analysis['course_priority_ranking'][:5],
            'graduation_analysis': analysis['graduation_timeline'],
            'risk_assessment': analysis['risk_assessment'],
            'sql_insights': self._generate_sql_insights(analysis)
        }
        
        return recommendations
    
    def _determine_optimal_semester(self, course_code: str, student_context: Dict) -> str:
        """Determine optimal semester for a course"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT semester_offered FROM courses WHERE course_code = ?", (course_code,))
        result = cursor.fetchone()
        
        if result and result['semester_offered']:
            semesters = result['semester_offered'].split(',')
            # Logic to determine best semester based on student's timeline
            if student_context.get('graduation_goal') == 'early':
                return semesters[0] if 'Spring' in semesters else 'Next available'
            else:
                return 'Next semester'
        return 'Any semester'
    
    def _assess_course_risk(self, difficulty_score: float, success_rate: float) -> str:
        """Assess risk level for a course"""
        if difficulty_score > 4.2 and success_rate < 0.7:
            return 'high'
        elif difficulty_score > 3.8 or success_rate < 0.75:
            return 'medium'
        else:
            return 'low'
    
    def _generate_rationale(self, course_data: Dict) -> str:
        """Generate rationale for course recommendation"""
        rationale_parts = []
        
        if course_data['is_critical_path']:
            rationale_parts.append("Critical path course")
        
        if course_data['requirement_type'] == 'foundation':
            rationale_parts.append("Foundation requirement")
        
        if course_data['courses_blocked'] > 0:
            rationale_parts.append(f"Unlocks {course_data['courses_blocked']} additional courses")
        
        return "; ".join(rationale_parts) if rationale_parts else "Required for degree completion"
    
    def _get_critical_path_recommendations(self, critical_courses) -> List[str]:
        """Generate recommendations based on critical path analysis"""
        recommendations = []
        for course in critical_courses[:3]:
            recommendations.append(f"Prioritize {course['blocking_course']} - blocks {course['courses_blocked']} courses")
        return recommendations
    
    def _calculate_estimated_semesters(self, remaining_reqs) -> int:
        """Calculate estimated semesters to graduation"""
        total_credits_needed = sum(req['credits_needed'] for req in remaining_reqs if req['requirement_category'] in ['total_credits'])
        avg_credits_per_semester = 15  # Typical course load
        return max(2, int(total_credits_needed / avg_credits_per_semester))
    
    def _check_early_graduation_feasibility(self, remaining_reqs) -> bool:
        """Check if early graduation is feasible"""
        total_credits_needed = sum(req['credits_needed'] for req in remaining_reqs if req['requirement_category'] in ['total_credits'])
        return total_credits_needed <= 45  # 3 semesters of heavy course load
    
    def _calculate_overall_risk(self, risk_data) -> str:
        """Calculate overall academic risk level"""
        if risk_data['avg_difficulty_ahead'] > 4.2 and risk_data['high_difficulty_courses'] > 5:
            return 'high'
        elif risk_data['avg_difficulty_ahead'] > 3.8 or risk_data['high_difficulty_courses'] > 3:
            return 'medium'
        else:
            return 'low'
    
    def _generate_sql_insights(self, analysis: Dict) -> List[str]:
        """Generate insights from SQL analysis"""
        insights = []
        
        ready_courses = analysis['prerequisite_readiness']
        if len(ready_courses) >= 3:
            insights.append(f"You're ready to take {len(ready_courses)} courses immediately")
        
        critical_analysis = analysis['critical_path_analysis']
        if critical_analysis['most_blocking_courses']:
            blocking_course = critical_analysis['most_blocking_courses'][0]
            insights.append(f"{blocking_course['blocking_course']} is your highest priority - it unlocks {blocking_course['courses_blocked']} other courses")
        
        timeline = analysis['graduation_timeline']
        if timeline['early_graduation_feasible']:
            insights.append("Early graduation appears feasible with proper course sequencing")
        
        return insights
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()

def test_sql_analyzer():
    """Test the SQL academic analyzer"""
    analyzer = SQLAcademicAnalyzer()
    
    # Test with the original problematic scenario  
    student_context = {
        'student_id': 'test_student',
        'major': 'Computer Science',
        'target_track': 'Machine Intelligence',
        'current_year': 'sophomore',
        'completed_courses': ['CS 18200', 'CS 24000'],  # CS 182, CS 240
        'graduation_goal': 'early'
    }
    
    print("="*80)
    print("SQL-BASED ACADEMIC ANALYSIS")
    print("="*80)
    
    recommendations = analyzer.get_sql_based_recommendations(student_context)
    
    print("IMMEDIATE COURSES READY TO TAKE:")
    print("-" * 40)
    for course in recommendations['immediate_courses']:
        print(f"• {course['course_code']} - {course['course_title']} ({course['credits']} credits)")
        print(f"  Priority: {course['priority_order']}, Difficulty: {course['difficulty_score']}")
    
    print("\nCRITICAL PATH ANALYSIS:")
    print("-" * 40)
    for course in recommendations['critical_path_courses']:
        print(f"• {course['blocking_course']} - blocks {course['courses_blocked']} courses")
        print(f"  Blocking factor: {course['blocking_factor']:.2f}")
    
    print("\nTOP PRIORITIZED RECOMMENDATIONS:")
    print("-" * 40)
    for rec in recommendations['prioritized_recommendations']:
        print(f"• {rec.course_code} - {rec.course_title}")
        print(f"  Priority Score: {rec.priority_score}, Risk: {rec.risk_level}")
        print(f"  Rationale: {rec.rationale}")
        print(f"  Optimal Timing: {rec.optimal_semester}")
        print()
    
    print("GRADUATION TIMELINE ANALYSIS:")
    print("-" * 40)
    grad_analysis = recommendations['graduation_analysis']
    print(f"Estimated semesters to graduation: {grad_analysis['estimated_semesters']}")
    print(f"Early graduation feasible: {grad_analysis['early_graduation_feasible']}")
    
    print("\nSQL INSIGHTS:")
    print("-" * 40)
    for insight in recommendations['sql_insights']:
        print(f"• {insight}")
    
    analyzer.close()

if __name__ == "__main__":
    test_sql_analyzer()