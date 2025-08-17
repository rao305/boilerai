/**
 * Eligibility MCP Server
 * 
 * SuperClaude MCP-compatible server for academic eligibility and rules checking
 * Handles prerequisite verification, CODO requirements, and policy compliance
 * 
 * Tools provided:
 * - check_prerequisites: Verify prerequisite completion for courses
 * - evaluate_codo_eligibility: Assess CODO (Change of Degree Objective) eligibility  
 * - verify_graduation_requirements: Check graduation requirement completion
 * - assess_course_load: Evaluate credit hour load and overload policies
 * - check_policy_compliance: Verify compliance with academic policies
 */

import codoPolicies from '@/data/codoPolicies.json';
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

interface EligibilityCheck {
  requirement_id: string;
  requirement_name: string;
  is_met: boolean;
  current_status: string;
  required_value: string;
  gap_analysis: string;
  remediation_steps: string[];
}

interface CODOEvaluation {
  target_major: string;
  overall_eligibility: 'eligible' | 'not_eligible' | 'conditional';
  eligibility_score: number; // 0-100
  requirements: EligibilityCheck[];
  timeline_estimate: string;
  next_steps: string[];
  alternative_options: string[];
  application_deadlines: {
    fall: string;
    spring: string;
    summer: string;
  };
}

interface PrerequisiteCheck {
  course_code: string;
  course_title: string;
  prerequisites_met: boolean;
  missing_prerequisites: string[];
  alternative_paths: string[];
  enrollment_recommendations: string[];
}

interface GraduationRequirementCheck {
  category: string;
  requirement_type: 'core' | 'elective' | 'general_education' | 'track_specific';
  credits_required: number;
  credits_completed: number;
  courses_needed: string[];
  estimated_semesters: number;
}

class EligibilityMCPServer {
  private codo_policies: Record<string, any>;
  private grade_point_values: Map<string, number>;

  constructor() {
    this.codo_policies = codoPolicies;
    this.grade_point_values = new Map([
      ['A+', 4.0], ['A', 4.0], ['A-', 3.7],
      ['B+', 3.3], ['B', 3.0], ['B-', 2.7],
      ['C+', 2.3], ['C', 2.0], ['C-', 1.7],
      ['D+', 1.3], ['D', 1.0], ['D-', 0.7],
      ['F', 0.0]
    ]);
    
    logger.info('Eligibility MCP Server initialized', 'MCP_ELIGIBILITY', {
      codo_programs: Object.keys(this.codo_policies).length
    });
  }

  /**
   * Get list of available MCP tools
   */
  getTools(): MCPTool[] {
    return [
      {
        name: 'check_prerequisites',
        description: 'Verify prerequisite completion for one or more courses',
        inputSchema: {
          type: 'object',
          properties: {
            course_codes: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of course codes to check prerequisites for'
            },
            student_profile: {
              type: 'object',
              description: 'Student academic profile including completed courses and grades'
            },
            include_alternatives: {
              type: 'boolean',
              description: 'Include alternative prerequisite paths (default: true)'
            }
          },
          required: ['course_codes', 'student_profile']
        }
      },
      {
        name: 'evaluate_codo_eligibility',
        description: 'Assess eligibility for Change of Degree Objective (CODO)',
        inputSchema: {
          type: 'object',
          properties: {
            target_major: {
              type: 'string',
              description: 'Target major for CODO (e.g., "Computer Science", "Data Science")'
            },
            student_profile: {
              type: 'object',
              description: 'Complete student academic profile'
            },
            current_semester: {
              type: 'string',
              description: 'Current semester for timeline calculations'
            },
            include_alternatives: {
              type: 'boolean',
              description: 'Include alternative major recommendations (default: true)'
            }
          },
          required: ['target_major', 'student_profile']
        }
      },
      {
        name: 'verify_graduation_requirements',
        description: 'Check graduation requirement completion and remaining needs',
        inputSchema: {
          type: 'object',
          properties: {
            student_profile: {
              type: 'object',
              description: 'Student academic profile including major and completed courses'
            },
            target_graduation: {
              type: 'string',
              description: 'Target graduation semester (e.g., "Spring 2025")'
            },
            include_timeline: {
              type: 'boolean',
              description: 'Include semester-by-semester timeline (default: true)'
            }
          },
          required: ['student_profile']
        }
      },
      {
        name: 'assess_course_load',
        description: 'Evaluate course load and check overload policies',
        inputSchema: {
          type: 'object',
          properties: {
            planned_courses: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of courses planned for the semester'
            },
            student_profile: {
              type: 'object',
              description: 'Student profile including GPA and academic standing'
            },
            semester: {
              type: 'string',
              description: 'Target semester for course load'
            }
          },
          required: ['planned_courses', 'student_profile']
        }
      },
      {
        name: 'check_policy_compliance',
        description: 'Verify compliance with academic policies and regulations',
        inputSchema: {
          type: 'object',
          properties: {
            policy_areas: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific policy areas to check (e.g., "credit_limits", "gpa_requirements", "degree_progress")'
            },
            student_profile: {
              type: 'object',
              description: 'Student academic profile'
            },
            proposed_actions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Proposed academic actions to verify'
            }
          },
          required: ['student_profile']
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
        case 'check_prerequisites':
          return await this.checkPrerequisitesTool(args);
        case 'evaluate_codo_eligibility':
          return await this.evaluateCODOEligibilityTool(args);
        case 'verify_graduation_requirements':
          return await this.verifyGraduationRequirementsTool(args);
        case 'assess_course_load':
          return await this.assessCourseLoadTool(args);
        case 'check_policy_compliance':
          return await this.checkPolicyComplianceTool(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true
          };
      }
    } catch (error) {
      logger.error('MCP tool execution failed', 'MCP_ELIGIBILITY', { tool: name, error });
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error}` }],
        isError: true
      };
    }
  }

  /**
   * Check prerequisites tool implementation
   */
  private async checkPrerequisitesTool(args: {
    course_codes: string[];
    student_profile: StudentProfile;
    include_alternatives?: boolean;
  }): Promise<MCPToolResult> {
    const { course_codes, student_profile, include_alternatives = true } = args;
    
    const prerequisite_checks: PrerequisiteCheck[] = [];
    
    for (const course_code of course_codes) {
      const check = await this.performPrerequisiteCheck(course_code, student_profile, include_alternatives);
      prerequisite_checks.push(check);
    }
    
    const response_text = this.formatPrerequisiteCheckResults(prerequisite_checks);
    
    return {
      content: [{ type: 'text', text: response_text }]
    };
  }

  /**
   * Evaluate CODO eligibility tool implementation
   */
  private async evaluateCODOEligibilityTool(args: {
    target_major: string;
    student_profile: StudentProfile;
    current_semester?: string;
    include_alternatives?: boolean;
  }): Promise<MCPToolResult> {
    const { 
      target_major, 
      student_profile, 
      current_semester = this.getCurrentSemester(),
      include_alternatives = true 
    } = args;
    
    const evaluation = await this.performCODOEvaluation(
      target_major, 
      student_profile, 
      current_semester,
      include_alternatives
    );
    
    const response_text = this.formatCODOEvaluation(evaluation);
    
    return {
      content: [{ type: 'text', text: response_text }]
    };
  }

  /**
   * Verify graduation requirements tool implementation
   */
  private async verifyGraduationRequirementsTool(args: {
    student_profile: StudentProfile;
    target_graduation?: string;
    include_timeline?: boolean;
  }): Promise<MCPToolResult> {
    const { 
      student_profile, 
      target_graduation,
      include_timeline = true 
    } = args;
    
    const graduation_check = await this.performGraduationRequirementCheck(
      student_profile,
      target_graduation,
      include_timeline
    );
    
    const response_text = this.formatGraduationRequirementCheck(graduation_check);
    
    return {
      content: [{ type: 'text', text: response_text }]
    };
  }

  /**
   * Assess course load tool implementation
   */
  private async assessCourseLoadTool(args: {
    planned_courses: string[];
    student_profile: StudentProfile;
    semester?: string;
  }): Promise<MCPToolResult> {
    const { 
      planned_courses, 
      student_profile, 
      semester = this.getCurrentSemester() 
    } = args;
    
    const load_assessment = await this.performCourseLoadAssessment(
      planned_courses,
      student_profile,
      semester
    );
    
    const response_text = this.formatCourseLoadAssessment(load_assessment);
    
    return {
      content: [{ type: 'text', text: response_text }]
    };
  }

  /**
   * Check policy compliance tool implementation
   */
  private async checkPolicyComplianceTool(args: {
    policy_areas?: string[];
    student_profile: StudentProfile;
    proposed_actions?: string[];
  }): Promise<MCPToolResult> {
    const { 
      policy_areas = ['credit_limits', 'gpa_requirements', 'degree_progress'],
      student_profile,
      proposed_actions = []
    } = args;
    
    const compliance_check = await this.performPolicyComplianceCheck(
      policy_areas,
      student_profile,
      proposed_actions
    );
    
    const response_text = this.formatPolicyComplianceCheck(compliance_check);
    
    return {
      content: [{ type: 'text', text: response_text }]
    };
  }

  // Core evaluation methods

  private async performPrerequisiteCheck(
    course_code: string,
    student_profile: StudentProfile,
    include_alternatives: boolean
  ): Promise<PrerequisiteCheck> {
    // This would typically query the course catalog for prerequisites
    // For now, implement basic logic based on common patterns
    
    const completed_courses = student_profile.completedCourses || [];
    const missing_prerequisites: string[] = [];
    const alternative_paths: string[] = [];
    const enrollment_recommendations: string[] = [];
    
    // Simple prerequisite logic for common courses
    const prereq_map: Record<string, string[]> = {
      'CS 18200': ['CS 18000'],
      'CS 25100': ['CS 18200', 'MA 16500'],
      'CS 25000': ['CS 18000'],
      'MA 16600': ['MA 16500'],
      'MA 26100': ['MA 16600'],
      'PHYS 27200': ['PHYS 17200'],
    };
    
    const required_prereqs = prereq_map[course_code] || [];
    
    for (const prereq of required_prereqs) {
      const has_prereq = completed_courses.some(completed => 
        completed.includes(prereq) || completed.startsWith(prereq)
      );
      
      if (!has_prereq) {
        missing_prerequisites.push(prereq);
      }
    }
    
    const prerequisites_met = missing_prerequisites.length === 0;
    
    if (!prerequisites_met) {
      enrollment_recommendations.push(`Complete missing prerequisites: ${missing_prerequisites.join(', ')}`);
      enrollment_recommendations.push('Check with advisor for possible prerequisite waivers');
    }
    
    if (include_alternatives && missing_prerequisites.length > 0) {
      alternative_paths.push('Consider equivalent courses or transfer credit');
      alternative_paths.push('Explore concurrent enrollment with advisor approval');
    }
    
    return {
      course_code,
      course_title: `Course ${course_code}`, // Would be looked up from catalog
      prerequisites_met,
      missing_prerequisites,
      alternative_paths,
      enrollment_recommendations
    };
  }

  private async performCODOEvaluation(
    target_major: string,
    student_profile: StudentProfile,
    current_semester: string,
    include_alternatives: boolean
  ): Promise<CODOEvaluation> {
    // Normalize major name for lookup
    const major_key = target_major.toLowerCase().replace(/\s+/g, '_');
    const policy = this.codo_policies[major_key];
    
    if (!policy) {
      return {
        target_major,
        overall_eligibility: 'not_eligible',
        eligibility_score: 0,
        requirements: [{
          requirement_id: 'major_not_found',
          requirement_name: 'Major Recognition',
          is_met: false,
          current_status: 'Major not found in CODO policies',
          required_value: 'Valid major name',
          gap_analysis: `"${target_major}" is not a recognized CODO-eligible major`,
          remediation_steps: ['Check available majors', 'Verify major name spelling']
        }],
        timeline_estimate: 'N/A',
        next_steps: ['Verify target major name', 'Contact academic advising'],
        alternative_options: ['Computer Science', 'Data Science', 'Artificial Intelligence'],
        application_deadlines: {
          fall: 'N/A',
          spring: 'N/A', 
          summer: 'N/A'
        }
      };
    }
    
    const requirements: EligibilityCheck[] = [];
    let requirements_met = 0;
    
    // Check GPA requirement
    const gpa_requirement = policy.codo_requirements.minimum_gpa;
    const current_gpa = student_profile.gpa || 0;
    const gpa_met = current_gpa >= gpa_requirement;
    
    requirements.push({
      requirement_id: 'minimum_gpa',
      requirement_name: 'Minimum GPA',
      is_met: gpa_met,
      current_status: `Current GPA: ${current_gpa.toFixed(2)}`,
      required_value: `Minimum ${gpa_requirement.toFixed(2)}`,
      gap_analysis: gpa_met ? 'Requirement met' : `Need to raise GPA by ${(gpa_requirement - current_gpa).toFixed(2)} points`,
      remediation_steps: gpa_met ? [] : [
        'Focus on improving grades in current courses',
        'Consider retaking courses with low grades',
        'Meet with academic success coach'
      ]
    });
    
    if (gpa_met) requirements_met++;
    
    // Check required courses
    const completed_courses = student_profile.completedCourses || [];
    const required_courses = policy.codo_requirements.required_courses || [];
    
    for (const req_course of required_courses) {
      const course_completed = completed_courses.some(completed => 
        completed.includes(req_course.course_code)
      );
      
      requirements.push({
        requirement_id: `course_${req_course.course_code.replace(/\s+/g, '_')}`,
        requirement_name: `${req_course.course_code}: ${req_course.course_title}`,
        is_met: course_completed,
        current_status: course_completed ? 'Completed' : 'Not completed',
        required_value: `Grade of ${req_course.minimum_grade} or better`,
        gap_analysis: course_completed ? 'Requirement met' : `Need to complete ${req_course.course_code}`,
        remediation_steps: course_completed ? [] : [
          `Enroll in ${req_course.course_code}`,
          'Ensure prerequisite completion',
          req_course.notes || 'No additional notes'
        ]
      });
      
      if (course_completed) requirements_met++;
    }
    
    // Calculate eligibility score
    const total_requirements = requirements.length;
    const eligibility_score = total_requirements > 0 ? (requirements_met / total_requirements) * 100 : 0;
    
    // Determine overall eligibility
    let overall_eligibility: 'eligible' | 'not_eligible' | 'conditional' = 'not_eligible';
    if (eligibility_score >= 80) {
      overall_eligibility = 'eligible';
    } else if (eligibility_score >= 60) {
      overall_eligibility = 'conditional';
    }
    
    // Generate next steps
    const next_steps: string[] = [];
    if (overall_eligibility === 'eligible') {
      next_steps.push('Submit CODO application');
      next_steps.push('Schedule advisor meeting');
      next_steps.push('Prepare application essay');
    } else {
      next_steps.push('Complete missing requirements');
      next_steps.push('Meet with pre-advisor for planning');
      if (eligibility_score >= 60) {
        next_steps.push('Consider applying conditionally');
      }
    }
    
    // Alternative options
    const alternative_options: string[] = [];
    if (include_alternatives && overall_eligibility !== 'eligible') {
      const similar_majors = this.getSimilarMajors(target_major);
      alternative_options.push(...similar_majors);
    }
    
    return {
      target_major,
      overall_eligibility,
      eligibility_score,
      requirements,
      timeline_estimate: this.estimateCODOTimeline(requirements, current_semester),
      next_steps,
      alternative_options,
      application_deadlines: policy.codo_requirements.application_periods
    };
  }

  private async performGraduationRequirementCheck(
    student_profile: StudentProfile,
    target_graduation?: string,
    include_timeline?: boolean
  ): Promise<GraduationRequirementCheck[]> {
    // This would typically query degree requirements database
    // For now, return example requirements structure
    
    const requirements: GraduationRequirementCheck[] = [
      {
        category: 'Core Computer Science',
        requirement_type: 'core',
        credits_required: 42,
        credits_completed: student_profile.completedCourses?.length ? student_profile.completedCourses.length * 3 : 0,
        courses_needed: ['CS 25100', 'CS 25000', 'CS 35100'],
        estimated_semesters: 2
      },
      {
        category: 'Mathematics',
        requirement_type: 'core',
        credits_required: 18,
        credits_completed: 12,
        courses_needed: ['MA 26100', 'STAT 51100'],
        estimated_semesters: 1
      },
      {
        category: 'Science',
        requirement_type: 'core',
        credits_required: 12,
        credits_completed: 8,
        courses_needed: ['PHYS 27200'],
        estimated_semesters: 1
      }
    ];
    
    return requirements;
  }

  private async performCourseLoadAssessment(
    planned_courses: string[],
    student_profile: StudentProfile,
    semester: string
  ): Promise<{
    total_credits: number;
    is_overload: boolean;
    overload_approval_needed: boolean;
    recommendations: string[];
    warnings: string[];
  }> {
    // Estimate 3 credits per course (typical)
    const total_credits = planned_courses.length * 3;
    const is_overload = total_credits > 17;
    const current_gpa = student_profile.gpa || 0;
    const overload_approval_needed = is_overload && current_gpa < 3.0;
    
    const recommendations: string[] = [];
    const warnings: string[] = [];
    
    if (is_overload) {
      if (current_gpa >= 3.0) {
        recommendations.push('Overload permitted based on GPA requirements');
        recommendations.push('Monitor workload and stress levels carefully');
      } else {
        warnings.push(`Overload not permitted with GPA ${current_gpa.toFixed(2)} (minimum 3.0 required)`);
        recommendations.push('Reduce course load to 15-17 credits');
        recommendations.push('Focus on improving GPA before attempting overload');
      }
    } else {
      recommendations.push('Course load is within normal limits');
    }
    
    if (total_credits < 12) {
      warnings.push('Course load below full-time status (12 credits minimum)');
      recommendations.push('Add courses to maintain full-time enrollment');
    }
    
    return {
      total_credits,
      is_overload,
      overload_approval_needed,
      recommendations,
      warnings
    };
  }

  private async performPolicyComplianceCheck(
    policy_areas: string[],
    student_profile: StudentProfile,
    proposed_actions: string[]
  ): Promise<{
    compliance_score: number;
    policy_violations: string[];
    warnings: string[];
    recommendations: string[];
  }> {
    const policy_violations: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // Check each policy area
    for (const area of policy_areas) {
      switch (area) {
        case 'credit_limits':
          const total_credits = student_profile.totalCreditsEarned || 0;
          if (total_credits > 140) {
            warnings.push('Approaching maximum credit limit for degree');
            recommendations.push('Review degree progress with advisor');
          }
          break;
          
        case 'gpa_requirements':
          const gpa = student_profile.gpa || 0;
          if (gpa < 2.0) {
            policy_violations.push('GPA below minimum requirement (2.0)');
            recommendations.push('Meet with academic success coordinator');
          } else if (gpa < 2.5) {
            warnings.push('GPA below recommended level for good academic standing');
          }
          break;
          
        case 'degree_progress':
          const completed_courses = student_profile.completedCourses?.length || 0;
          const expected_progress = this.calculateExpectedProgress(student_profile);
          if (completed_courses < expected_progress * 0.8) {
            warnings.push('Degree progress may be behind expected timeline');
            recommendations.push('Consider summer courses or increased course load');
          }
          break;
      }
    }
    
    const compliance_score = policy_violations.length === 0 ? 
      (warnings.length === 0 ? 100 : 80) : 
      Math.max(0, 60 - (policy_violations.length * 20));
    
    return {
      compliance_score,
      policy_violations,
      warnings,
      recommendations
    };
  }

  // Formatting methods

  private formatPrerequisiteCheckResults(checks: PrerequisiteCheck[]): string {
    let result = `Prerequisite Check Results\n${'='.repeat(28)}\n\n`;
    
    for (const check of checks) {
      result += `Course: ${check.course_code} - ${check.course_title}\n`;
      result += `Status: ${check.prerequisites_met ? '✅ Prerequisites Met' : '❌ Missing Prerequisites'}\n`;
      
      if (!check.prerequisites_met) {
        result += `Missing: ${check.missing_prerequisites.join(', ')}\n`;
        
        if (check.alternative_paths.length > 0) {
          result += `Alternatives: ${check.alternative_paths.join('; ')}\n`;
        }
        
        if (check.enrollment_recommendations.length > 0) {
          result += `Recommendations:\n`;
          check.enrollment_recommendations.forEach(rec => {
            result += `  • ${rec}\n`;
          });
        }
      }
      result += '\n';
    }
    
    return result.trim();
  }

  private formatCODOEvaluation(evaluation: CODOEvaluation): string {
    const status_icon = evaluation.overall_eligibility === 'eligible' ? '✅' : 
                       evaluation.overall_eligibility === 'conditional' ? '⚠️' : '❌';
    
    let result = `CODO Eligibility Evaluation: ${evaluation.target_major}\n`;
    result += `${'='.repeat(50)}\n\n`;
    result += `${status_icon} Overall Status: ${evaluation.overall_eligibility.toUpperCase()}\n`;
    result += `📊 Eligibility Score: ${evaluation.eligibility_score.toFixed(1)}%\n\n`;
    
    result += `Requirements Analysis:\n`;
    for (const req of evaluation.requirements) {
      const req_icon = req.is_met ? '✅' : '❌';
      result += `${req_icon} ${req.requirement_name}\n`;
      result += `   Current: ${req.current_status}\n`;
      result += `   Required: ${req.required_value}\n`;
      if (!req.is_met && req.remediation_steps.length > 0) {
        result += `   Action: ${req.remediation_steps[0]}\n`;
      }
      result += '\n';
    }
    
    if (evaluation.next_steps.length > 0) {
      result += `Next Steps:\n`;
      evaluation.next_steps.forEach((step, index) => {
        result += `${index + 1}. ${step}\n`;
      });
      result += '\n';
    }
    
    result += `Timeline: ${evaluation.timeline_estimate}\n\n`;
    
    result += `Application Deadlines:\n`;
    result += `• Fall: ${evaluation.application_deadlines.fall}\n`;
    result += `• Spring: ${evaluation.application_deadlines.spring}\n`;
    result += `• Summer: ${evaluation.application_deadlines.summer}\n`;
    
    if (evaluation.alternative_options.length > 0) {
      result += `\nAlternative Majors to Consider:\n`;
      evaluation.alternative_options.forEach(alt => {
        result += `• ${alt}\n`;
      });
    }
    
    return result;
  }

  private formatGraduationRequirementCheck(requirements: GraduationRequirementCheck[]): string {
    let result = `Graduation Requirements Check\n${'='.repeat(30)}\n\n`;
    
    let total_credits_needed = 0;
    let total_credits_completed = 0;
    
    for (const req of requirements) {
      const progress = req.credits_completed / req.credits_required;
      const progress_bar = this.createProgressBar(progress);
      
      result += `${req.category} (${req.requirement_type})\n`;
      result += `${progress_bar} ${req.credits_completed}/${req.credits_required} credits\n`;
      
      if (req.courses_needed.length > 0) {
        result += `Remaining: ${req.courses_needed.join(', ')}\n`;
      }
      
      result += `Estimated completion: ${req.estimated_semesters} semester${req.estimated_semesters === 1 ? '' : 's'}\n\n`;
      
      total_credits_needed += req.credits_required;
      total_credits_completed += req.credits_completed;
    }
    
    const overall_progress = total_credits_completed / total_credits_needed;
    result += `Overall Progress: ${(overall_progress * 100).toFixed(1)}% complete\n`;
    result += `Credits: ${total_credits_completed}/${total_credits_needed}\n`;
    
    return result;
  }

  private formatCourseLoadAssessment(assessment: {
    total_credits: number;
    is_overload: boolean;
    overload_approval_needed: boolean;
    recommendations: string[];
    warnings: string[];
  }): string {
    let result = `Course Load Assessment\n${'='.repeat(23)}\n\n`;
    
    result += `Total Credits: ${assessment.total_credits}\n`;
    result += `Status: ${assessment.is_overload ? '⚠️ Overload' : '✅ Normal Load'}\n`;
    
    if (assessment.overload_approval_needed) {
      result += `🚨 Overload Approval Required: YES\n`;
    }
    
    if (assessment.warnings.length > 0) {
      result += `\nWarnings:\n`;
      assessment.warnings.forEach(warning => {
        result += `• ${warning}\n`;
      });
    }
    
    if (assessment.recommendations.length > 0) {
      result += `\nRecommendations:\n`;
      assessment.recommendations.forEach(rec => {
        result += `• ${rec}\n`;
      });
    }
    
    return result;
  }

  private formatPolicyComplianceCheck(check: {
    compliance_score: number;
    policy_violations: string[];
    warnings: string[];
    recommendations: string[];
  }): string {
    let result = `Policy Compliance Check\n${'='.repeat(24)}\n\n`;
    
    const score_icon = check.compliance_score >= 90 ? '✅' : 
                      check.compliance_score >= 70 ? '⚠️' : '❌';
    
    result += `${score_icon} Compliance Score: ${check.compliance_score}%\n\n`;
    
    if (check.policy_violations.length > 0) {
      result += `🚨 Policy Violations:\n`;
      check.policy_violations.forEach(violation => {
        result += `• ${violation}\n`;
      });
      result += '\n';
    }
    
    if (check.warnings.length > 0) {
      result += `⚠️ Warnings:\n`;
      check.warnings.forEach(warning => {
        result += `• ${warning}\n`;
      });
      result += '\n';
    }
    
    if (check.recommendations.length > 0) {
      result += `💡 Recommendations:\n`;
      check.recommendations.forEach(rec => {
        result += `• ${rec}\n`;
      });
    }
    
    return result;
  }

  // Helper methods

  private getCurrentSemester(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    if (month >= 8 && month <= 12) return `Fall ${year}`;
    if (month >= 1 && month <= 5) return `Spring ${year}`;
    return `Summer ${year}`;
  }

  private getSimilarMajors(target_major: string): string[] {
    const similarities: Record<string, string[]> = {
      'computer science': ['Data Science', 'Artificial Intelligence', 'Computer Engineering'],
      'data science': ['Computer Science', 'Statistics', 'Mathematics'],
      'artificial intelligence': ['Computer Science', 'Data Science', 'Cognitive Science']
    };
    
    return similarities[target_major.toLowerCase()] || ['Computer Science', 'Data Science'];
  }

  private estimateCODOTimeline(requirements: EligibilityCheck[], current_semester: string): string {
    const unmet_requirements = requirements.filter(req => !req.is_met);
    
    if (unmet_requirements.length === 0) {
      return 'Ready to apply this semester';
    } else if (unmet_requirements.length <= 2) {
      return '1-2 semesters to complete requirements';
    } else {
      return '2-3 semesters to complete requirements';
    }
  }

  private calculateExpectedProgress(student_profile: StudentProfile): number {
    // Simple heuristic: expect ~30 credits per year for full-time students
    const years_enrolled = 2; // Would be calculated from enrollment date
    return years_enrolled * 30;
  }

  private createProgressBar(progress: number, length: number = 20): string {
    const filled = Math.round(progress * length);
    const empty = length - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }
}

export const eligibilityMCPServer = new EligibilityMCPServer();
export default eligibilityMCPServer;