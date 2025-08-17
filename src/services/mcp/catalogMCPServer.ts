/**
 * Catalog MCP Server
 * 
 * SuperClaude MCP-compatible server for course catalog retrieval
 * Exposes course and catalog information as structured tools
 * 
 * Tools provided:
 * - query_courses: Search and retrieve course information
 * - get_course_details: Get detailed information for specific course
 * - search_prerequisites: Find prerequisite chains and relationships
 * - get_course_offerings: Check course availability and scheduling
 */

import { enhancedRetrievalService } from '../enhancedRetrievalService';
import coursesData from '@/data/purdue_courses_complete.json';
import { logger } from '@/utils/logger';

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

interface Course {
  department_code: string;
  course_number: string;
  full_course_code: string;
  course_title: string;
  credit_hours: string;
  description: string;
  prerequisites: string;
  corequisites: string;
  restrictions: string;
  course_level: 'undergraduate' | 'graduate';
  url: string;
}

class CatalogMCPServer {
  private courses: Course[];
  private prerequisite_graph: Map<string, string[]>;
  private course_index: Map<string, Course>;

  constructor() {
    this.courses = coursesData as Course[];
    this.prerequisite_graph = new Map();
    this.course_index = new Map();
    
    this.buildCourseIndex();
    this.buildPrerequisiteGraph();
    
    logger.info('Catalog MCP Server initialized', 'MCP_CATALOG', {
      courses_count: this.courses.length,
      indexed_courses: this.course_index.size
    });
  }

  /**
   * Get list of available MCP tools
   */
  getTools(): MCPTool[] {
    return [
      {
        name: 'query_courses',
        description: 'Search for courses using keywords, department codes, or course titles',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (course code, title keywords, or department)'
            },
            department: {
              type: 'string',
              description: 'Filter by department code (e.g., CS, MA, PHYS)'
            },
            level: {
              type: 'string',
              enum: ['undergraduate', 'graduate', 'all'],
              description: 'Filter by course level'
            },
            credit_hours: {
              type: 'string',
              description: 'Filter by credit hours (e.g., "3", "1-3")'
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'get_course_details',
        description: 'Get comprehensive details for a specific course',
        inputSchema: {
          type: 'object',
          properties: {
            course_code: {
              type: 'string',
              description: 'Full course code (e.g., "CS 18000", "MA 16500")'
            },
            include_prerequisites: {
              type: 'boolean',
              description: 'Include prerequisite chain analysis (default: true)'
            },
            include_offerings: {
              type: 'boolean',
              description: 'Include course offering information (default: false)'
            }
          },
          required: ['course_code']
        }
      },
      {
        name: 'search_prerequisites',
        description: 'Find prerequisite chains and course relationships',
        inputSchema: {
          type: 'object',
          properties: {
            target_course: {
              type: 'string',
              description: 'Course code to analyze prerequisites for'
            },
            depth: {
              type: 'number',
              description: 'Maximum depth of prerequisite chain (default: 3)'
            },
            include_alternatives: {
              type: 'boolean',
              description: 'Include alternative prerequisite paths (default: true)'
            }
          },
          required: ['target_course']
        }
      },
      {
        name: 'get_course_offerings',
        description: 'Check course availability, scheduling, and enrollment information',
        inputSchema: {
          type: 'object',
          properties: {
            course_codes: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of course codes to check'
            },
            semester: {
              type: 'string',
              description: 'Target semester (e.g., "Fall 2024", "Spring 2025")'
            },
            check_conflicts: {
              type: 'boolean',
              description: 'Check for time conflicts between courses (default: false)'
            }
          },
          required: ['course_codes']
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
        case 'query_courses':
          return await this.queryCoursesTool(args);
        case 'get_course_details':
          return await this.getCourseDetailsTool(args);
        case 'search_prerequisites':
          return await this.searchPrerequisitesTool(args);
        case 'get_course_offerings':
          return await this.getCourseOfferingsTool(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true
          };
      }
    } catch (error) {
      logger.error('MCP tool execution failed', 'MCP_CATALOG', { tool: name, error });
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error}` }],
        isError: true
      };
    }
  }

  /**
   * Query courses tool implementation
   */
  private async queryCoursesTool(args: {
    query: string;
    department?: string;
    level?: 'undergraduate' | 'graduate' | 'all';
    credit_hours?: string;
    max_results?: number;
  }): Promise<MCPToolResult> {
    const {
      query,
      department,
      level = 'all',
      credit_hours,
      max_results = 10
    } = args;

    // Use enhanced retrieval service for sophisticated search
    const retrieval_results = await enhancedRetrievalService.retrieve(query, {
      max_results: max_results * 2, // Get more results for filtering
      result_types: ['course'],
      enable_elo_reranking: true,
      cite_sources: true
    });

    // Filter results based on criteria
    let filtered_courses = retrieval_results
      .filter(result => result.type === 'course')
      .map(result => result.content as Course);

    // Apply department filter
    if (department) {
      filtered_courses = filtered_courses.filter(course => 
        course.department_code.toLowerCase() === department.toLowerCase()
      );
    }

    // Apply level filter
    if (level !== 'all') {
      filtered_courses = filtered_courses.filter(course => course.course_level === level);
    }

    // Apply credit hours filter
    if (credit_hours) {
      filtered_courses = filtered_courses.filter(course => {
        const course_credits = parseFloat(course.credit_hours);
        if (credit_hours.includes('-')) {
          const [min, max] = credit_hours.split('-').map(s => parseFloat(s.trim()));
          return course_credits >= min && course_credits <= max;
        } else {
          return course_credits === parseFloat(credit_hours);
        }
      });
    }

    // Limit results
    const final_results = filtered_courses.slice(0, max_results);

    // Format response
    const response_text = this.formatCourseQueryResults(final_results, query);

    return {
      content: [
        {
          type: 'text',
          text: response_text
        }
      ]
    };
  }

  /**
   * Get course details tool implementation
   */
  private async getCourseDetailsTool(args: {
    course_code: string;
    include_prerequisites?: boolean;
    include_offerings?: boolean;
  }): Promise<MCPToolResult> {
    const {
      course_code,
      include_prerequisites = true,
      include_offerings = false
    } = args;

    // Normalize course code
    const normalized_code = this.normalizeCourseCode(course_code);
    const course = this.course_index.get(normalized_code);

    if (!course) {
      return {
        content: [
          {
            type: 'text',
            text: `Course not found: ${course_code}\n\nTip: Make sure to use the format "DEPT NNNNN" (e.g., "CS 18000", "MA 16500")`
          }
        ],
        isError: true
      };
    }

    let details_text = this.formatCourseDetails(course);

    // Add prerequisite analysis if requested
    if (include_prerequisites) {
      const prereq_analysis = this.analyzePrerequisites(course.full_course_code);
      if (prereq_analysis) {
        details_text += '\n\n' + prereq_analysis;
      }
    }

    // Add offering information if requested
    if (include_offerings) {
      const offering_info = this.getCourseOfferingInfo(course.full_course_code);
      if (offering_info) {
        details_text += '\n\n' + offering_info;
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: details_text
        }
      ]
    };
  }

  /**
   * Search prerequisites tool implementation
   */
  private async searchPrerequisitesTool(args: {
    target_course: string;
    depth?: number;
    include_alternatives?: boolean;
  }): Promise<MCPToolResult> {
    const {
      target_course,
      depth = 3,
      include_alternatives = true
    } = args;

    const normalized_code = this.normalizeCourseCode(target_course);
    const course = this.course_index.get(normalized_code);

    if (!course) {
      return {
        content: [
          {
            type: 'text',
            text: `Course not found: ${target_course}`
          }
        ],
        isError: true
      };
    }

    const prereq_chain = this.buildPrerequisiteChain(normalized_code, depth);
    const response_text = this.formatPrerequisiteChain(course, prereq_chain, include_alternatives);

    return {
      content: [
        {
          type: 'text',
          text: response_text
        }
      ]
    };
  }

  /**
   * Get course offerings tool implementation
   */
  private async getCourseOfferingsTool(args: {
    course_codes: string[];
    semester?: string;
    check_conflicts?: boolean;
  }): Promise<MCPToolResult> {
    const {
      course_codes,
      semester,
      check_conflicts = false
    } = args;

    const offering_info: string[] = [];

    for (const course_code of course_codes) {
      const normalized_code = this.normalizeCourseCode(course_code);
      const course = this.course_index.get(normalized_code);

      if (course) {
        const info = this.getCourseOfferingInfo(course.full_course_code, semester);
        offering_info.push(info);
      } else {
        offering_info.push(`${course_code}: Course not found`);
      }
    }

    let response_text = offering_info.join('\n\n');

    // Add conflict analysis if requested
    if (check_conflicts && course_codes.length > 1) {
      const conflict_analysis = this.analyzeScheduleConflicts(course_codes, semester);
      response_text += '\n\n' + conflict_analysis;
    }

    return {
      content: [
        {
          type: 'text',
          text: response_text
        }
      ]
    };
  }

  // Helper methods

  private buildCourseIndex(): void {
    this.courses.forEach(course => {
      const normalized_code = this.normalizeCourseCode(course.full_course_code);
      this.course_index.set(normalized_code, course);
    });
  }

  private buildPrerequisiteGraph(): void {
    this.courses.forEach(course => {
      if (course.prerequisites) {
        const prereqs = this.parsePrerequisites(course.prerequisites);
        this.prerequisite_graph.set(course.full_course_code, prereqs);
      }
    });
  }

  private normalizeCourseCode(code: string): string {
    // Normalize to "DEPT NNNNN" format
    return code.toUpperCase().replace(/\s+/g, ' ').trim();
  }

  private parsePrerequisites(prereq_text: string): string[] {
    // Extract course codes from prerequisite text
    const course_pattern = /\b[A-Z]{2,4}\s*\d{3,5}\b/g;
    const matches = prereq_text.match(course_pattern) || [];
    return matches.map(match => this.normalizeCourseCode(match));
  }

  private formatCourseQueryResults(courses: Course[], query: string): string {
    if (courses.length === 0) {
      return `No courses found matching "${query}"\n\nTips:\n- Try different keywords\n- Check spelling of department codes\n- Use broader search terms`;
    }

    let result = `Found ${courses.length} course${courses.length === 1 ? '' : 's'} matching "${query}":\n\n`;

    courses.forEach((course, index) => {
      result += `${index + 1}. ${course.full_course_code}: ${course.course_title}\n`;
      result += `   Credits: ${course.credit_hours} | Level: ${course.course_level}\n`;
      if (course.prerequisites) {
        result += `   Prerequisites: ${course.prerequisites.substring(0, 100)}${course.prerequisites.length > 100 ? '...' : ''}\n`;
      }
      result += `   URL: ${course.url}\n\n`;
    });

    return result.trim();
  }

  private formatCourseDetails(course: Course): string {
    let details = `Course Details: ${course.full_course_code}\n`;
    details += `=`.repeat(course.full_course_code.length + 16) + '\n\n';
    details += `Title: ${course.course_title}\n`;
    details += `Department: ${course.department_code}\n`;
    details += `Credit Hours: ${course.credit_hours}\n`;
    details += `Level: ${course.course_level}\n\n`;

    if (course.description) {
      details += `Description:\n${course.description}\n\n`;
    }

    if (course.prerequisites) {
      details += `Prerequisites:\n${course.prerequisites}\n\n`;
    }

    if (course.corequisites) {
      details += `Corequisites:\n${course.corequisites}\n\n`;
    }

    if (course.restrictions) {
      details += `Restrictions:\n${course.restrictions}\n\n`;
    }

    details += `Course Catalog: ${course.url}`;

    return details;
  }

  private analyzePrerequisites(course_code: string): string {
    const prereqs = this.prerequisite_graph.get(course_code);
    if (!prereqs || prereqs.length === 0) {
      return 'Prerequisite Analysis:\nNo prerequisites required for this course.';
    }

    let analysis = 'Prerequisite Analysis:\n';
    analysis += `Direct Prerequisites: ${prereqs.join(', ')}\n\n`;

    // Check if prerequisites have their own prerequisites
    const indirect_prereqs = new Set<string>();
    prereqs.forEach(prereq => {
      const nested_prereqs = this.prerequisite_graph.get(prereq) || [];
      nested_prereqs.forEach(np => indirect_prereqs.add(np));
    });

    if (indirect_prereqs.size > 0) {
      analysis += `Indirect Prerequisites: ${Array.from(indirect_prereqs).join(', ')}\n`;
    }

    return analysis;
  }

  private buildPrerequisiteChain(course_code: string, max_depth: number): Map<number, string[]> {
    const chain = new Map<number, string[]>();
    const visited = new Set<string>();
    
    const buildChainRecursive = (code: string, depth: number): void => {
      if (depth > max_depth || visited.has(code)) return;
      
      visited.add(code);
      const prereqs = this.prerequisite_graph.get(code) || [];
      
      if (prereqs.length > 0) {
        chain.set(depth, [...(chain.get(depth) || []), ...prereqs]);
        prereqs.forEach(prereq => buildChainRecursive(prereq, depth + 1));
      }
    };

    buildChainRecursive(course_code, 1);
    return chain;
  }

  private formatPrerequisiteChain(course: Course, chain: Map<number, string[]>, include_alternatives: boolean): string {
    let result = `Prerequisite Chain for ${course.full_course_code}:\n`;
    result += `${'='.repeat(course.full_course_code.length + 24)}\n\n`;

    if (chain.size === 0) {
      result += 'No prerequisites required for this course.\n';
      return result;
    }

    for (let depth = 1; depth <= 3; depth++) {
      const courses_at_depth = chain.get(depth);
      if (courses_at_depth && courses_at_depth.length > 0) {
        const level_name = depth === 1 ? 'Direct Prerequisites' : 
                          depth === 2 ? 'Second-Level Prerequisites' : 
                          'Third-Level Prerequisites';
        
        result += `${level_name}:\n`;
        courses_at_depth.forEach(code => {
          const prereq_course = this.course_index.get(code);
          if (prereq_course) {
            result += `  • ${code}: ${prereq_course.course_title} (${prereq_course.credit_hours} credits)\n`;
          } else {
            result += `  • ${code}\n`;
          }
        });
        result += '\n';
      }
    }

    if (include_alternatives) {
      result += 'Note: Some prerequisites may have alternative courses that satisfy the requirement. ';
      result += 'Check with your academic advisor for approved substitutions.\n';
    }

    return result;
  }

  private getCourseOfferingInfo(course_code: string, semester?: string): string {
    // This would typically query a live course offering database
    // For now, return general information
    const current_semester = semester || this.getCurrentSemester();
    
    return `Course Offering Information for ${course_code}:\n` +
           `Target Semester: ${current_semester}\n` +
           `Status: Check MyPurdue for current availability\n` +
           `Note: Course offerings may vary by semester. Verify availability in MyPurdue course schedule.`;
  }

  private analyzeScheduleConflicts(course_codes: string[], semester?: string): string {
    return `Schedule Conflict Analysis:\n` +
           `Courses: ${course_codes.join(', ')}\n` +
           `Semester: ${semester || this.getCurrentSemester()}\n` +
           `Note: Use MyPurdue's schedule planner to check for actual time conflicts.`;
  }

  private getCurrentSemester(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    if (month >= 8 && month <= 12) return `Fall ${year}`;
    if (month >= 1 && month <= 5) return `Spring ${year}`;
    return `Summer ${year}`;
  }
}

export const catalogMCPServer = new CatalogMCPServer();
export default catalogMCPServer;