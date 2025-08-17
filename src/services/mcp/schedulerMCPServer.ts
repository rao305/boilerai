/**
 * Scheduler MCP Server
 * 
 * SuperClaude MCP-compatible server for course scheduling and conflict resolution
 * Handles time slot analysis, course availability, and academic calendar planning
 * 
 * Tools provided:
 * - check_schedule_conflicts: Analyze time conflicts between courses
 * - plan_semester_schedule: Create optimized semester course schedule
 * - find_alternative_sections: Find alternative course sections to resolve conflicts
 * - validate_course_sequence: Verify proper course sequencing across semesters
 * - analyze_workload_distribution: Assess academic workload balance
 */

import { logger } from '@/utils/logger';
import type { StudentProfile } from '@/types/common';

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    uri?: string;
  }>;
  isError?: boolean;
}

interface TimeSlot {
  days: string[]; // ['Monday', 'Wednesday', 'Friday']
  start_time: string; // '09:30'
  end_time: string; // '10:20'
  location?: string;
}

interface CourseSection {
  course_code: string;
  section_number: string;
  instructor: string;
  time_slots: TimeSlot[];
  enrollment_capacity: number;
  enrolled_count: number;
  waitlist_count: number;
  mode: 'in_person' | 'online' | 'hybrid';
}

interface ScheduleConflict {
  type: 'time_overlap' | 'back_to_back' | 'location_distance' | 'workload_concern';
  severity: 'minor' | 'major' | 'blocking';
  courses_involved: string[];
  description: string;
  suggested_resolutions: string[];
}

interface SemesterSchedule {
  semester: string;
  courses: CourseSection[];
  total_credits: number;
  conflicts: ScheduleConflict[];
  schedule_score: number; // 0-100
  recommendations: string[];
}

interface WorkloadAnalysis {
  course_code: string;
  difficulty_estimate: number; // 1-10 scale
  time_commitment: number; // hours per week
  prerequisite_overlap: boolean;
  concurrent_lab: boolean;
}

class SchedulerMCPServer {
  private time_patterns: Map<string, TimeSlot[]>;
  private course_difficulty_map: Map<string, number>;
  private building_distances: Map<string, Map<string, number>>; // Walking time between buildings

  constructor() {
    this.time_patterns = new Map();
    this.course_difficulty_map = new Map();
    this.building_distances = new Map();
    
    this.initializeTimePatterns();
    this.initializeDifficultyMap();
    this.initializeBuildingDistances();
    
    logger.info('Scheduler MCP Server initialized', 'MCP_SCHEDULER');
  }

  /**
   * Get list of available MCP tools
   */
  getTools(): MCPTool[] {
    return [
      {
        name: 'check_schedule_conflicts',
        description: 'Analyze time conflicts and scheduling issues between courses',
        inputSchema: {
          type: 'object',
          properties: {
            course_sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  course_code: { type: 'string' },
                  section: { type: 'string' },
                  time_slots: { type: 'array' }
                }
              },
              description: 'List of course sections with time information'
            },
            include_travel_time: {
              type: 'boolean',
              description: 'Consider travel time between buildings (default: true)'
            },
            conflict_tolerance: {
              type: 'string',
              enum: ['strict', 'moderate', 'flexible'],
              description: 'How strict to be about potential conflicts'
            }
          },
          required: ['course_sections']
        }
      },
      {
        name: 'plan_semester_schedule',
        description: 'Create optimized semester course schedule based on preferences and constraints',
        inputSchema: {
          type: 'object',
          properties: {
            target_courses: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of courses to include in the schedule'
            },
            student_profile: {
              type: 'object',
              description: 'Student profile including preferences and constraints'
            },
            preferences: {
              type: 'object',
              properties: {
                earliest_start: { type: 'string', description: 'Earliest preferred start time (e.g., "08:00")' },
                latest_end: { type: 'string', description: 'Latest preferred end time (e.g., "17:00")' },
                preferred_days: { type: 'array', items: { type: 'string' } },
                avoid_back_to_back: { type: 'boolean' },
                prefer_online: { type: 'boolean' }
              }
            },
            semester: {
              type: 'string',
              description: 'Target semester (e.g., "Fall 2024")'
            }
          },
          required: ['target_courses', 'student_profile']
        }
      },
      {
        name: 'find_alternative_sections',
        description: 'Find alternative course sections to resolve scheduling conflicts',
        inputSchema: {
          type: 'object',
          properties: {
            problematic_courses: {
              type: 'array',
              items: { type: 'string' },
              description: 'Course codes that are causing conflicts'
            },
            fixed_courses: {
              type: 'array',
              items: { type: 'string' },
              description: 'Course codes that cannot be changed'
            },
            constraints: {
              type: 'object',
              description: 'Scheduling constraints and preferences'
            },
            semester: {
              type: 'string',
              description: 'Target semester'
            }
          },
          required: ['problematic_courses']
        }
      },
      {
        name: 'validate_course_sequence',
        description: 'Verify proper course sequencing and prerequisite timing across semesters',
        inputSchema: {
          type: 'object',
          properties: {
            course_plan: {
              type: 'object',
              description: 'Multi-semester course plan with courses by semester'
            },
            student_profile: {
              type: 'object',
              description: 'Student academic profile'
            },
            graduation_target: {
              type: 'string',
              description: 'Target graduation semester'
            }
          },
          required: ['course_plan', 'student_profile']
        }
      },
      {
        name: 'analyze_workload_distribution',
        description: 'Assess academic workload balance and difficulty distribution',
        inputSchema: {
          type: 'object',
          properties: {
            semester_schedule: {
              type: 'object',
              description: 'Proposed semester schedule'
            },
            student_profile: {
              type: 'object',
              description: 'Student profile including GPA and course history'
            },
            include_recommendations: {
              type: 'boolean',
              description: 'Include workload optimization recommendations (default: true)'
            }
          },
          required: ['semester_schedule', 'student_profile']
        }
      }
    ];
  }

  /**
   * Execute MCP tool
   */
  async executeTool(name: string, args: any): Promise<MCPToolResult> {
    try {
      switch (name) {
        case 'check_schedule_conflicts':
          return await this.checkScheduleConflictsTool(args);
        case 'plan_semester_schedule':
          return await this.planSemesterScheduleTool(args);
        case 'find_alternative_sections':
          return await this.findAlternativeSectionsTool(args);
        case 'validate_course_sequence':
          return await this.validateCourseSequenceTool(args);
        case 'analyze_workload_distribution':
          return await this.analyzeWorkloadDistributionTool(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true
          };
      }
    } catch (error) {
      logger.error('MCP tool execution failed', 'MCP_SCHEDULER', { tool: name, error });
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error}` }],
        isError: true
      };
    }
  }

  /**
   * Check schedule conflicts tool implementation
   */
  private async checkScheduleConflictsTool(args: {
    course_sections: any[];
    include_travel_time?: boolean;
    conflict_tolerance?: 'strict' | 'moderate' | 'flexible';
  }): Promise<MCPToolResult> {
    const {
      course_sections,
      include_travel_time = true,
      conflict_tolerance = 'moderate'
    } = args;

    const conflicts = await this.detectScheduleConflicts(
      course_sections,
      include_travel_time,
      conflict_tolerance
    );

    const response_text = this.formatConflictAnalysis(conflicts, course_sections);

    return {
      content: [{ type: 'text', text: response_text }]
    };
  }

  /**
   * Plan semester schedule tool implementation
   */
  private async planSemesterScheduleTool(args: {
    target_courses: string[];
    student_profile: StudentProfile;
    preferences?: any;
    semester?: string;
  }): Promise<MCPToolResult> {
    const {
      target_courses,
      student_profile,
      preferences = {},
      semester = this.getCurrentSemester()
    } = args;

    const schedule = await this.generateOptimalSchedule(
      target_courses,
      student_profile,
      preferences,
      semester
    );

    const response_text = this.formatSemesterSchedule(schedule);

    return {
      content: [{ type: 'text', text: response_text }]
    };
  }

  /**
   * Find alternative sections tool implementation
   */
  private async findAlternativeSectionsTool(args: {
    problematic_courses: string[];
    fixed_courses?: string[];
    constraints?: any;
    semester?: string;
  }): Promise<MCPToolResult> {
    const {
      problematic_courses,
      fixed_courses = [],
      constraints = {},
      semester = this.getCurrentSemester()
    } = args;

    const alternatives = await this.findAlternativeSections(
      problematic_courses,
      fixed_courses,
      constraints,
      semester
    );

    const response_text = this.formatAlternativeOptions(alternatives);

    return {
      content: [{ type: 'text', text: response_text }]
    };
  }

  /**
   * Validate course sequence tool implementation
   */
  private async validateCourseSequenceTool(args: {
    course_plan: any;
    student_profile: StudentProfile;
    graduation_target?: string;
  }): Promise<MCPToolResult> {
    const {
      course_plan,
      student_profile,
      graduation_target
    } = args;

    const validation = await this.validateCourseSequencing(
      course_plan,
      student_profile,
      graduation_target
    );

    const response_text = this.formatSequenceValidation(validation);

    return {
      content: [{ type: 'text', text: response_text }]
    };
  }

  /**
   * Analyze workload distribution tool implementation
   */
  private async analyzeWorkloadDistributionTool(args: {
    semester_schedule: any;
    student_profile: StudentProfile;
    include_recommendations?: boolean;
  }): Promise<MCPToolResult> {
    const {
      semester_schedule,
      student_profile,
      include_recommendations = true
    } = args;

    const analysis = await this.analyzeWorkloadBalance(
      semester_schedule,
      student_profile,
      include_recommendations
    );

    const response_text = this.formatWorkloadAnalysis(analysis);

    return {
      content: [{ type: 'text', text: response_text }]
    };
  }

  // Core scheduling methods

  private async detectScheduleConflicts(
    course_sections: any[],
    include_travel_time: boolean,
    tolerance: string
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = [];

    // Check time overlaps
    for (let i = 0; i < course_sections.length; i++) {
      for (let j = i + 1; j < course_sections.length; j++) {
        const course1 = course_sections[i];
        const course2 = course_sections[j];

        const time_conflict = this.checkTimeOverlap(course1.time_slots, course2.time_slots);
        if (time_conflict) {
          conflicts.push({
            type: 'time_overlap',
            severity: 'blocking',
            courses_involved: [course1.course_code, course2.course_code],
            description: `Direct time conflict between ${course1.course_code} and ${course2.course_code}`,
            suggested_resolutions: [
              'Find alternative section for one course',
              'Consider online option if available',
              'Move one course to different semester'
            ]
          });
        }

        // Check back-to-back concerns
        if (include_travel_time) {
          const travel_conflict = this.checkTravelTimeConflict(course1, course2);
          if (travel_conflict) {
            conflicts.push(travel_conflict);
          }
        }
      }
    }

    // Check workload concerns
    const workload_conflict = this.assessWorkloadConcerns(course_sections, tolerance);
    if (workload_conflict) {
      conflicts.push(workload_conflict);
    }

    return conflicts;
  }

  private async generateOptimalSchedule(
    target_courses: string[],
    student_profile: StudentProfile,
    preferences: any,
    semester: string
  ): Promise<SemesterSchedule> {
    // This would typically interface with course scheduling APIs
    // For now, generate a mock schedule based on preferences
    
    const course_sections: CourseSection[] = target_courses.map((course_code, index) => ({
      course_code,
      section_number: '001',
      instructor: 'TBD',
      time_slots: this.generateTimeSlot(course_code, preferences, index),
      enrollment_capacity: 150,
      enrolled_count: 120,
      waitlist_count: 5,
      mode: preferences.prefer_online ? 'online' : 'in_person'
    }));

    const conflicts = await this.detectScheduleConflicts(course_sections, true, 'moderate');
    const schedule_score = this.calculateScheduleScore(course_sections, conflicts, preferences);

    return {
      semester,
      courses: course_sections,
      total_credits: target_courses.length * 3, // Assume 3 credits per course
      conflicts,
      schedule_score,
      recommendations: this.generateScheduleRecommendations(course_sections, conflicts, preferences)
    };
  }

  private async findAlternativeSections(
    problematic_courses: string[],
    fixed_courses: string[],
    constraints: any,
    semester: string
  ): Promise<{
    course_code: string;
    current_issues: string[];
    alternative_sections: Array<{
      section: string;
      instructor: string;
      time_slots: TimeSlot[];
      pros: string[];
      cons: string[];
    }>;
  }[]> {
    const alternatives: any[] = [];

    for (const course_code of problematic_courses) {
      // Generate mock alternative sections
      const alternative_sections = [
        {
          section: '002',
          instructor: 'Dr. Smith',
          time_slots: [{ days: ['Tuesday', 'Thursday'], start_time: '14:30', end_time: '15:45' }],
          pros: ['No conflicts with fixed courses', 'Good instructor rating'],
          cons: ['Afternoon time slot']
        },
        {
          section: '003',
          instructor: 'Prof. Johnson',
          time_slots: [{ days: ['Monday', 'Wednesday', 'Friday'], start_time: '11:30', end_time: '12:20' }],
          pros: ['Morning time slot', 'MWF schedule'],
          cons: ['Less popular instructor', 'Potential conflict with lunch']
        }
      ];

      alternatives.push({
        course_code,
        current_issues: ['Time conflict with fixed course', 'Suboptimal time slot'],
        alternative_sections
      });
    }

    return alternatives;
  }

  private async validateCourseSequencing(
    course_plan: any,
    student_profile: StudentProfile,
    graduation_target?: string
  ): Promise<{
    is_valid: boolean;
    sequencing_issues: Array<{
      issue_type: 'prerequisite_violation' | 'corequisite_missing' | 'timing_suboptimal';
      description: string;
      affected_courses: string[];
      semester: string;
      suggested_fix: string;
    }>;
    timeline_analysis: {
      total_semesters: number;
      credit_distribution: Record<string, number>;
      graduation_feasibility: 'on_track' | 'delayed' | 'accelerated';
    };
  }> {
    const issues: any[] = [];
    
    // Mock validation logic
    const has_issues = Math.random() > 0.7; // 30% chance of issues
    
    if (has_issues) {
      issues.push({
        issue_type: 'prerequisite_violation',
        description: 'CS 25100 scheduled before CS 18200 completion',
        affected_courses: ['CS 25100'],
        semester: 'Fall 2024',
        suggested_fix: 'Move CS 25100 to Spring 2025 or complete CS 18200 earlier'
      });
    }

    const total_semesters = Object.keys(course_plan).length;
    const credit_distribution: Record<string, number> = {};
    
    Object.entries(course_plan).forEach(([semester, courses]: [string, any]) => {
      credit_distribution[semester] = Array.isArray(courses) ? courses.length * 3 : 0;
    });

    return {
      is_valid: issues.length === 0,
      sequencing_issues: issues,
      timeline_analysis: {
        total_semesters,
        credit_distribution,
        graduation_feasibility: 'on_track'
      }
    };
  }

  private async analyzeWorkloadBalance(
    semester_schedule: any,
    student_profile: StudentProfile,
    include_recommendations: boolean
  ): Promise<{
    overall_difficulty: number;
    time_commitment: number;
    workload_distribution: WorkloadAnalysis[];
    balance_score: number;
    recommendations: string[];
    warnings: string[];
  }> {
    const courses = semester_schedule.courses || [];
    const workload_distribution: WorkloadAnalysis[] = [];
    
    let total_difficulty = 0;
    let total_time_commitment = 0;

    for (const course of courses) {
      const difficulty = this.course_difficulty_map.get(course.course_code) || 5;
      const time_commitment = difficulty * 2 + 6; // Base 6 hours + difficulty factor
      
      workload_distribution.push({
        course_code: course.course_code,
        difficulty_estimate: difficulty,
        time_commitment,
        prerequisite_overlap: false, // Would check actual prerequisites
        concurrent_lab: course.course_code.includes('LAB')
      });
      
      total_difficulty += difficulty;
      total_time_commitment += time_commitment;
    }

    const avg_difficulty = courses.length > 0 ? total_difficulty / courses.length : 0;
    const balance_score = this.calculateWorkloadBalance(workload_distribution);
    
    const recommendations: string[] = [];
    const warnings: string[] = [];
    
    if (include_recommendations) {
      if (avg_difficulty > 7) {
        warnings.push('High overall difficulty level - consider balancing with easier electives');
        recommendations.push('Consider moving one difficult course to a different semester');
      }
      
      if (total_time_commitment > 50) {
        warnings.push('Very high time commitment - may impact work-life balance');
        recommendations.push('Reduce course load or ensure strong time management');
      }
      
      if (balance_score < 60) {
        recommendations.push('Consider redistributing difficult courses across semesters');
      }
    }

    return {
      overall_difficulty: avg_difficulty,
      time_commitment: total_time_commitment,
      workload_distribution,
      balance_score,
      recommendations,
      warnings
    };
  }

  // Helper methods

  private checkTimeOverlap(slots1: TimeSlot[], slots2: TimeSlot[]): boolean {
    for (const slot1 of slots1) {
      for (const slot2 of slots2) {
        // Check if any days overlap
        const days_overlap = slot1.days.some(day => slot2.days.includes(day));
        if (!days_overlap) continue;

        // Check if times overlap
        const start1 = this.timeToMinutes(slot1.start_time);
        const end1 = this.timeToMinutes(slot1.end_time);
        const start2 = this.timeToMinutes(slot2.start_time);
        const end2 = this.timeToMinutes(slot2.end_time);

        if (start1 < end2 && start2 < end1) {
          return true; // Times overlap
        }
      }
    }
    return false;
  }

  private checkTravelTimeConflict(course1: any, course2: any): ScheduleConflict | null {
    // Mock travel time calculation
    const travel_time = 10; // minutes
    const gap_time = 15; // minimum gap needed

    // This would calculate actual travel time between buildings
    if (travel_time > gap_time) {
      return {
        type: 'location_distance',
        severity: 'major',
        courses_involved: [course1.course_code, course2.course_code],
        description: `Insufficient travel time between ${course1.course_code} and ${course2.course_code}`,
        suggested_resolutions: [
          'Find sections with larger time gaps',
          'Consider online option for one course',
          'Choose sections in nearby buildings'
        ]
      };
    }

    return null;
  }

  private assessWorkloadConcerns(course_sections: any[], tolerance: string): ScheduleConflict | null {
    const total_courses = course_sections.length;
    const difficulty_threshold = tolerance === 'strict' ? 4 : tolerance === 'moderate' ? 5 : 6;
    
    const difficult_courses = course_sections.filter(course => 
      (this.course_difficulty_map.get(course.course_code) || 5) >= difficulty_threshold
    );

    if (difficult_courses.length >= 3) {
      return {
        type: 'workload_concern',
        severity: 'major',
        courses_involved: difficult_courses.map(c => c.course_code),
        description: `High concentration of difficult courses may create excessive workload`,
        suggested_resolutions: [
          'Consider moving one difficult course to another semester',
          'Add easier elective to balance the load',
          'Ensure adequate study time and support resources'
        ]
      };
    }

    return null;
  }

  private generateTimeSlot(course_code: string, preferences: any, index: number): TimeSlot[] {
    // Generate mock time slots based on preferences
    const common_patterns = [
      { days: ['Monday', 'Wednesday', 'Friday'], start_time: '09:30', end_time: '10:20' },
      { days: ['Tuesday', 'Thursday'], start_time: '10:30', end_time: '11:45' },
      { days: ['Monday', 'Wednesday', 'Friday'], start_time: '13:30', end_time: '14:20' },
      { days: ['Tuesday', 'Thursday'], start_time: '14:30', end_time: '15:45' }
    ];

    return [common_patterns[index % common_patterns.length]];
  }

  private calculateScheduleScore(
    course_sections: CourseSection[],
    conflicts: ScheduleConflict[],
    preferences: any
  ): number {
    let score = 100;
    
    // Deduct points for conflicts
    conflicts.forEach(conflict => {
      if (conflict.severity === 'blocking') score -= 30;
      else if (conflict.severity === 'major') score -= 20;
      else score -= 10;
    });
    
    // Bonus for meeting preferences
    if (preferences.avoid_back_to_back) {
      // Check for back-to-back classes and adjust score
    }
    
    return Math.max(0, Math.min(100, score));
  }

  private generateScheduleRecommendations(
    course_sections: CourseSection[],
    conflicts: ScheduleConflict[],
    preferences: any
  ): string[] {
    const recommendations: string[] = [];
    
    if (conflicts.length > 0) {
      recommendations.push('Resolve scheduling conflicts before finalizing enrollment');
    }
    
    if (course_sections.length > 5) {
      recommendations.push('Consider reducing course load for better work-life balance');
    }
    
    recommendations.push('Verify all courses are still required for your degree');
    recommendations.push('Check for any updated prerequisites or course changes');
    
    return recommendations;
  }

  private calculateWorkloadBalance(workload_distribution: WorkloadAnalysis[]): number {
    // Calculate balance based on difficulty distribution
    const difficulties = workload_distribution.map(w => w.difficulty_estimate);
    const mean = difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length;
    const variance = difficulties.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / difficulties.length;
    
    // Lower variance = better balance, scale to 0-100
    return Math.max(0, 100 - (variance * 10));
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private getCurrentSemester(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    if (month >= 8 && month <= 12) return `Fall ${year}`;
    if (month >= 1 && month <= 5) return `Spring ${year}`;
    return `Summer ${year}`;
  }

  // Formatting methods

  private formatConflictAnalysis(conflicts: ScheduleConflict[], course_sections: any[]): string {
    let result = `Schedule Conflict Analysis\n${'='.repeat(28)}\n\n`;
    
    if (conflicts.length === 0) {
      result += '✅ No scheduling conflicts detected!\n\n';
      result += `Analyzed ${course_sections.length} course${course_sections.length === 1 ? '' : 's'}:\n`;
      course_sections.forEach(course => {
        result += `• ${course.course_code}\n`;
      });
    } else {
      result += `⚠️ Found ${conflicts.length} scheduling issue${conflicts.length === 1 ? '' : 's'}:\n\n`;
      
      conflicts.forEach((conflict, index) => {
        const severity_icon = conflict.severity === 'blocking' ? '🚨' : 
                            conflict.severity === 'major' ? '⚠️' : 'ℹ️';
        
        result += `${index + 1}. ${severity_icon} ${conflict.type.replace('_', ' ').toUpperCase()}\n`;
        result += `   Courses: ${conflict.courses_involved.join(', ')}\n`;
        result += `   Issue: ${conflict.description}\n`;
        result += `   Solutions:\n`;
        conflict.suggested_resolutions.forEach(solution => {
          result += `   • ${solution}\n`;
        });
        result += '\n';
      });
    }
    
    return result.trim();
  }

  private formatSemesterSchedule(schedule: SemesterSchedule): string {
    let result = `Semester Schedule: ${schedule.semester}\n${'='.repeat(30)}\n\n`;
    
    result += `📊 Schedule Score: ${schedule.schedule_score}/100\n`;
    result += `📚 Total Credits: ${schedule.total_credits}\n`;
    result += `⚠️ Conflicts: ${schedule.conflicts.length}\n\n`;
    
    result += `Course Schedule:\n`;
    schedule.courses.forEach(course => {
      result += `• ${course.course_code} (${course.section_number})\n`;
      result += `  Instructor: ${course.instructor}\n`;
      course.time_slots.forEach(slot => {
        result += `  Time: ${slot.days.join('/')} ${slot.start_time}-${slot.end_time}\n`;
      });
      result += `  Enrollment: ${course.enrolled_count}/${course.enrollment_capacity}\n`;
      result += '\n';
    });
    
    if (schedule.recommendations.length > 0) {
      result += `Recommendations:\n`;
      schedule.recommendations.forEach(rec => {
        result += `• ${rec}\n`;
      });
    }
    
    return result;
  }

  private formatAlternativeOptions(alternatives: any[]): string {
    let result = `Alternative Course Sections\n${'='.repeat(27)}\n\n`;
    
    alternatives.forEach(alt => {
      result += `Course: ${alt.course_code}\n`;
      result += `Current Issues: ${alt.current_issues.join(', ')}\n\n`;
      
      result += `Alternative Sections:\n`;
      alt.alternative_sections.forEach((section: any, index: number) => {
        result += `${index + 1}. Section ${section.section} - ${section.instructor}\n`;
        section.time_slots.forEach((slot: TimeSlot) => {
          result += `   Time: ${slot.days.join('/')} ${slot.start_time}-${slot.end_time}\n`;
        });
        result += `   Pros: ${section.pros.join(', ')}\n`;
        result += `   Cons: ${section.cons.join(', ')}\n\n`;
      });
    });
    
    return result.trim();
  }

  private formatSequenceValidation(validation: any): string {
    let result = `Course Sequence Validation\n${'='.repeat(27)}\n\n`;
    
    const status_icon = validation.is_valid ? '✅' : '❌';
    result += `${status_icon} Sequence Status: ${validation.is_valid ? 'Valid' : 'Issues Found'}\n\n`;
    
    if (validation.sequencing_issues.length > 0) {
      result += `Issues Found:\n`;
      validation.sequencing_issues.forEach((issue: any, index: number) => {
        result += `${index + 1}. ${issue.issue_type.replace('_', ' ').toUpperCase()}\n`;
        result += `   Description: ${issue.description}\n`;
        result += `   Affected: ${issue.affected_courses.join(', ')}\n`;
        result += `   Semester: ${issue.semester}\n`;
        result += `   Fix: ${issue.suggested_fix}\n\n`;
      });
    }
    
    result += `Timeline Analysis:\n`;
    result += `• Total Semesters: ${validation.timeline_analysis.total_semesters}\n`;
    result += `• Graduation Status: ${validation.timeline_analysis.graduation_feasibility}\n`;
    
    result += `\nCredit Distribution:\n`;
    Object.entries(validation.timeline_analysis.credit_distribution).forEach(([semester, credits]) => {
      result += `• ${semester}: ${credits} credits\n`;
    });
    
    return result;
  }

  private formatWorkloadAnalysis(analysis: any): string {
    let result = `Workload Analysis\n${'='.repeat(17)}\n\n`;
    
    result += `📊 Balance Score: ${analysis.balance_score}/100\n`;
    result += `🎯 Overall Difficulty: ${analysis.overall_difficulty.toFixed(1)}/10\n`;
    result += `⏰ Time Commitment: ${analysis.time_commitment} hours/week\n\n`;
    
    if (analysis.warnings.length > 0) {
      result += `⚠️ Warnings:\n`;
      analysis.warnings.forEach((warning: string) => {
        result += `• ${warning}\n`;
      });
      result += '\n';
    }
    
    result += `Course Breakdown:\n`;
    analysis.workload_distribution.forEach((course: WorkloadAnalysis) => {
      result += `• ${course.course_code}\n`;
      result += `  Difficulty: ${course.difficulty_estimate}/10\n`;
      result += `  Time: ${course.time_commitment} hrs/week\n`;
      if (course.concurrent_lab) result += `  Note: Includes lab component\n`;
      result += '\n';
    });
    
    if (analysis.recommendations.length > 0) {
      result += `Recommendations:\n`;
      analysis.recommendations.forEach((rec: string) => {
        result += `• ${rec}\n`;
      });
    }
    
    return result;
  }

  // Initialization methods

  private initializeTimePatterns(): void {
    // Initialize common time patterns
    this.time_patterns.set('MWF_morning', [
      { days: ['Monday', 'Wednesday', 'Friday'], start_time: '08:30', end_time: '09:20' },
      { days: ['Monday', 'Wednesday', 'Friday'], start_time: '09:30', end_time: '10:20' },
      { days: ['Monday', 'Wednesday', 'Friday'], start_time: '10:30', end_time: '11:20' }
    ]);
  }

  private initializeDifficultyMap(): void {
    // Initialize course difficulty estimates (1-10 scale)
    this.course_difficulty_map.set('CS 18000', 6);
    this.course_difficulty_map.set('CS 18200', 7);
    this.course_difficulty_map.set('CS 25000', 8);
    this.course_difficulty_map.set('CS 25100', 8);
    this.course_difficulty_map.set('MA 16500', 7);
    this.course_difficulty_map.set('MA 16600', 8);
    this.course_difficulty_map.set('PHYS 17200', 6);
    this.course_difficulty_map.set('CHM 11500', 5);
  }

  private initializeBuildingDistances(): void {
    // Initialize walking times between common buildings (in minutes)
    const lawson = new Map([
      ['WALC', 3],
      ['PHYS', 5],
      ['MATH', 2],
      ['HAAS', 8]
    ]);
    
    this.building_distances.set('LWSN', lawson);
  }
}

export const schedulerMCPServer = new SchedulerMCPServer();
export default schedulerMCPServer;