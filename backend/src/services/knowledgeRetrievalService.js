/**
 * Real Knowledge Retrieval Service - Replaces AI hallucination with actual data lookup
 * Provides semantic search and retrieval from actual Purdue course/program data
 */

const { DegreeRequirementsService } = require('../data/degree_requirements_migrated');
const { logger } = require('../utils/logger');

class KnowledgeRetrievalService {
  constructor() {
    // Initialize with migrated comprehensive data
    this.degreeService = new DegreeRequirementsService();
    // Knowledge base loaded from actual data files
    this.programAliases = {
      // REAL SUPPORTED PROGRAMS ONLY
      // Computer Science Programs
      'computer science': 'computer_science',
      'cs': 'computer_science',
      'comp sci': 'computer_science',
      'computer science major': 'computer_science',
      'cs major': 'computer_science',
      
      // Data Science Programs  
      'data science': 'data_science', 
      'ds': 'data_science',
      'data science major': 'data_science',
      'ds major': 'data_science',
      
      // Artificial Intelligence Programs
      'artificial intelligence': 'artificial_intelligence',
      'ai': 'artificial_intelligence',
      'ai major': 'artificial_intelligence',
      'artificial intelligence major': 'artificial_intelligence',
      'machine learning': 'artificial_intelligence',
      
      // Minors
      'computer science minor': 'computer_science_minor',
      'cs minor': 'computer_science_minor',
      'data science minor': 'data_science_minor',
      'ds minor': 'data_science_minor',
      'artificial intelligence minor': 'artificial_intelligence_minor',
      'ai minor': 'artificial_intelligence_minor'
    };

    this.coursePatterns = {
      // REAL COURSES FROM OUR ACTUAL DATA ONLY
      // Computer Science Foundation Courses
      'cs 18000': /cs\s*18000|problem solving|object.oriented|oop|java programming/i,
      'cs 18200': /cs\s*18200|foundations|discrete math|mathematical foundations/i,
      'cs 24000': /cs\s*24000|programming.+c|c programming/i,
      'cs 25000': /cs\s*25000|computer architecture|assembly/i,
      'cs 25100': /cs\s*25100|data structures/i,
      'cs 25200': /cs\s*25200|systems programming/i,
      'cs 30700': /cs\s*30700|software engineering/i,
      
      // Computer Science Core Courses
      'cs 35200': /cs\s*35200|compilers/i,
      'cs 38100': /cs\s*38100|analysis.+algorithms/i,
      'cs 40700': /cs\s*40700|software engineering.+ii/i,
      'cs 42200': /cs\s*42200|computer networks/i,
      'cs 44300': /cs\s*44300|database systems/i,
      
      // Data Science Courses
      'cs 37300': /cs\s*37300|data mining|machine learning/i,
      'cs 44000': /cs\s*44000|large scale|data analytics/i,
      'cs 44100': /cs\s*44100|data science capstone/i,
      'cs 25300': /cs\s*25300|data structures.+algorithms.+ds|ds.+ai/i,
      
      // AI Courses
      'cs 24300': /cs\s*24300|ai basics|artificial intelligence basics/i,
      'cs 47100': /cs\s*47100|introduction.+artificial intelligence/i,
      
      // Mathematics Courses (Real ones from our data)
      'ma 16100': /ma\s*16100|calculus.+i|calc.+1|plane analytic geometry/i,
      'ma 16200': /ma\s*16200|calculus.+ii|calc.+2|plane analytic geometry/i,
      'ma 16500': /ma\s*16500|analytic geometry|calculus.+i/i,
      'ma 16600': /ma\s*16600|analytic geometry|calculus.+ii/i,
      'ma 26100': /ma\s*26100|multivariate|calc.+3/i,
      'ma 26500': /ma\s*26500|linear algebra/i,
      'ma 35100': /ma\s*35100|elementary linear algebra/i,
      
      // Statistics Courses
      'stat 35000': /stat\s*35000|introduction.+statistics/i,
      'stat 35500': /stat\s*35500|statistics.+data science/i,
      'stat 41600': /stat\s*41600|probability/i,
      'stat 41700': /stat\s*41700|statistical theory/i,
      
      // Science Courses (Real ones from our data)
      'phys 17200': /phys\s*17200|modern mechanics/i,
      'phys 27200': /phys\s*27200|electric.+magnetic/i,
      'chm 11500': /chm\s*11500|general chemistry/i,
      'chm 11600': /chm\s*11600|general chemistry/i,
      
      // Psychology (for AI major)
      'psy 12000': /psy\s*12000|elementary psychology/i,
      'psy 20000': /psy\s*20000|cognitive psychology/i,
      'psy 22200': /psy\s*22200|behavioral neuroscience/i,
      
      // Philosophy (for AI major)
      'phil 20700': /phil\s*20700|ethics.+technology/i,
      'phil 20800': /phil\s*20800|ethics.+data science/i
    };
  }

  /**
   * Main RAG query processing - returns actual data instead of AI generation
   */
  async processRAGQuery(query, context = null, filters = {}) {
    try {
      logger.info('Processing RAG query with real data', { query, hasContext: !!context });

      // Analyze query intent
      const intent = this.analyzeQueryIntent(query);
      
      let results;
      switch (intent.type) {
        case 'program_structure':
          results = this.getProgramStructure(intent.program);
          break;
        case 'course_info':
          results = this.getCourseInformation(intent.courses);
          break;
        case 'major_requirements':
          results = this.getMajorRequirements(intent.program);
          break;
        case 'course_search':
          results = this.searchCourses(intent.searchTerm);
          break;
        case 'math_requirements':
          results = this.getMathRequirements(intent.program);
          break;
        case 'codo_info':
          results = this.getCODOInformation(intent.program);
          break;
        case 'academic_policies':
          results = this.getAcademicPolicies();
          break;
        case 'prerequisites':
          results = this.getPrerequisiteInformation(intent.courses);
          break;
        case 'minor_info':
          results = this.getMinorInformation();
          break;
        case 'graduation_requirements':
          results = this.getGraduationRequirements(intent.program);
          break;
        default:
          results = this.getGeneralInformation(query);
      }

      return {
        sources: results.sources,
        answer: results.answer,
        confidence: results.confidence,
        query_type: intent.type,
        matched_programs: intent.program ? [intent.program] : [],
        matched_courses: intent.courses || []
      };

    } catch (error) {
      logger.error('Knowledge retrieval failed', { error: error.message, query });
      throw error;
    }
  }

  /**
   * Analyze user query to determine intent and extract entities
   */
  analyzeQueryIntent(query) {
    const queryLower = query.toLowerCase();
    
    // Extract program mentions
    let program = null;
    for (const [alias, canonical] of Object.entries(this.programAliases)) {
      if (queryLower.includes(alias)) {
        program = canonical;
        break;
      }
    }

    // Extract course mentions with expanded patterns
    const courses = [];
    const courseRegex = /(cs|ma|stat|me|engr|mgmt|econ|psy|phys|chm|biol|agry)\s*(\d{5})/gi;
    let match;
    while ((match = courseRegex.exec(query)) !== null) {
      courses.push(`${match[1].toUpperCase()} ${match[2]}`);
    }

    // Check for CODO-related queries
    if (queryLower.includes('codo') || queryLower.includes('change') && (queryLower.includes('major') || queryLower.includes('degree'))) {
      return { type: 'codo_info', program, courses };
    }

    // Check for academic policy queries
    if (queryLower.includes('gpa') || queryLower.includes('probation') || queryLower.includes('academic standing') || 
        queryLower.includes('graduation requirements') || queryLower.includes('academic policy')) {
      return { type: 'academic_policies', program, courses };
    }

    // Check for prerequisite queries
    if (queryLower.includes('prerequisite') || queryLower.includes('prereq') || queryLower.includes('before taking')) {
      return { type: 'prerequisites', program, courses };
    }

    // Check for minor queries
    if (queryLower.includes('minor') || queryLower.includes('certificate')) {
      return { type: 'minor_info', program, courses };
    }

    // Check for graduation queries
    if (queryLower.includes('graduation') || queryLower.includes('graduate') || queryLower.includes('degree completion')) {
      return { type: 'graduation_requirements', program, courses };
    }

    // Determine query type based on keywords and entities
    if (queryLower.includes('structure') || queryLower.includes('major') || queryLower.includes('degree')) {
      if (program) {
        return { type: 'program_structure', program, courses };
      }
    }

    if (queryLower.includes('requirements') || queryLower.includes('needed') || queryLower.includes('take')) {
      if (program) {
        return { type: 'major_requirements', program, courses };
      }
    }

    if (queryLower.includes('math') || queryLower.includes('mathematics')) {
      const defaultProgram = program || 'computer_science';
      return { type: 'math_requirements', program: defaultProgram, courses };
    }

    if (courses.length > 0) {
      return { type: 'course_info', courses, program };
    }

    if (queryLower.includes('course') && (queryLower.includes('find') || queryLower.includes('search'))) {
      const searchTerm = this.extractSearchTerm(query);
      return { type: 'course_search', searchTerm, program };
    }

    return { type: 'general', program, courses, searchTerm: query };
  }

  /**
   * Get comprehensive program structure information
   */
  getProgramStructure(programKey) {
    const program = this.degreeService.getProgram(programKey);
    if (!program) {
      return this.createNotFoundResponse(`Program '${programKey}' not found`);
    }

    const info = program.degree_info;
    let answer = `# ${info.degree} Program Structure\n\n`;
    answer += `**Institution**: ${info.institution}\n`;
    answer += `**College**: ${info.college}\n`;
    answer += `**Total Credits Required**: ${info.total_credits_required}\n`;
    answer += `**Minimum GPA**: ${info.minimum_gpa_required}\n\n`;

    // Foundation courses
    if (program.foundation_courses) {
      answer += `## Foundation Courses (${program.foundation_courses.credits_required} credits)\n\n`;
      program.foundation_courses.courses.forEach(course => {
        answer += `- **${course.code}**: ${course.title} (${course.credits} credits)\n`;
        if (course.description) {
          answer += `  ${course.description}\n`;
        }
      });
      answer += '\n';
    }

    // Core courses
    if (program.core_courses) {
      answer += `## Core Courses (${program.core_courses.credits_required} credits)\n\n`;
      program.core_courses.courses.forEach(course => {
        answer += `- **${course.code}**: ${course.title} (${course.credits} credits)\n`;
      });
      answer += '\n';
    }

    // Required major courses (for Data Science)
    if (program.required_major_courses) {
      answer += `## Required Major Courses (${program.required_major_courses.credits_required} credits)\n\n`;
      program.required_major_courses.courses.forEach(course => {
        answer += `- **${course.code}**: ${course.title} (${course.credits} credits)\n`;
        if (course.description) {
          answer += `  ${course.description}\n`;
        }
      });
      answer += '\n';
    }

    // Mathematics requirements
    if (program.mathematics_requirements) {
      answer += `## Mathematics Requirements (${program.mathematics_requirements.credits_required} credits)\n\n`;
      program.mathematics_requirements.courses.forEach(course => {
        answer += `- **${course.code}**: ${course.title} (${course.credits} credits)\n`;
      });
      answer += '\n';
    }

    // Mathematics foundation (for Data Science)
    if (program.mathematics_foundation) {
      answer += `## Mathematics Foundation (${program.mathematics_foundation.credits_required} credits)\n\n`;
      program.mathematics_foundation.courses.forEach(course => {
        answer += `- **${course.code}**: ${course.title} (${course.credits} credits)\n`;
        if (course.description) {
          answer += `  ${course.description}\n`;
        }
      });
      answer += '\n';
    }

    // Add electives section
    if (program.electives) {
      answer += `## Electives\n\n`;
      
      if (program.electives.cs_electives) {
        const csElectives = program.electives.cs_electives;
        answer += `### CS Electives (${csElectives.courses_required} courses, ${csElectives.credits_required} credits)\n`;
        answer += `${csElectives.description}\n\n`;
        csElectives.choose_from.forEach(course => {
          answer += `- **${course.code}**: ${course.title} (${course.credits} credits)\n`;
          if (course.description) {
            answer += `  *${course.description}*\n`;
          }
        });
        answer += '\n';
      }

      if (program.electives.stat_elective) {
        const statElective = program.electives.stat_elective;
        answer += `### Statistics Elective (${statElective.courses_required} course, ${statElective.credits_required} credits)\n`;
        answer += `${statElective.description}\n\n`;
        statElective.choose_from.forEach(course => {
          answer += `- **${course.code}**: ${course.title} (${course.credits} credits)\n`;
          if (course.description) {
            answer += `  *${course.description}*\n`;
          }
        });
        answer += '\n';
      }

      if (program.electives.ethics_course) {
        const ethicsCourse = program.electives.ethics_course;
        answer += `### Ethics Course (${ethicsCourse.courses_required} course, ${ethicsCourse.credits_required} credits)\n`;
        answer += `${ethicsCourse.description}\n\n`;
        ethicsCourse.choose_from.forEach(course => {
          answer += `- **${course.code}**: ${course.title} (${course.credits} credits)\n`;
          if (course.description) {
            answer += `  *${course.description}*\n`;
          }
        });
        answer += '\n';
      }
    }

    // Tracks
    if (program.tracks) {
      answer += `## Available Tracks\n\n`;
      Object.entries(program.tracks).forEach(([key, track]) => {
        answer += `### ${track.track_info.name}\n`;
        answer += `${track.track_info.description}\n\n`;
        if (track.required_courses) {
          answer += `**Required Courses**:\n`;
          track.required_courses.forEach(course => {
            answer += `- ${course.code}: ${course.title} (${course.credits} credits)\n`;
          });
        }
        answer += '\n';
      });
    }

    return {
      sources: [
        {
          id: `${programKey}_structure`,
          title: `${info.degree} Program Requirements`,
          excerpt: `Complete degree structure for ${info.degree}`,
          relevance: 1.0
        }
      ],
      answer,
      confidence: 0.95
    };
  }

  /**
   * Get detailed course information
   */
  getCourseInformation(courseCodes) {
    const courses = [];
    const notFound = [];

    courseCodes.forEach(code => {
      const course = this.degreeService.getCourseByCode(code);
      if (course) {
        courses.push(course);
      } else {
        notFound.push(code);
      }
    });

    if (courses.length === 0) {
      return this.createNotFoundResponse(`Courses not found: ${courseCodes.join(', ')}`);
    }

    let answer = `# Course Information\n\n`;
    
    courses.forEach(course => {
      answer += `## ${course.code}: ${course.title}\n`;
      answer += `**Credits**: ${course.credits}\n`;
      if (course.description) {
        answer += `**Description**: ${course.description}\n`;
      }
      if (course.prerequisites && course.prerequisites.length > 0) {
        answer += `**Prerequisites**: ${course.prerequisites.join(', ')}\n`;
      }
      if (course.typical_semester) {
        answer += `**Typical Semester**: ${course.typical_semester.replace('_', ' ')}\n`;
      }
      answer += '\n';
    });

    if (notFound.length > 0) {
      answer += `\n*Note: The following courses were not found: ${notFound.join(', ')}*\n`;
    }

    return {
      sources: courses.map(course => ({
        id: course.code.replace(' ', '').toLowerCase(),
        title: `${course.code}: ${course.title}`,
        excerpt: course.description || `${course.credits} credit course`,
        relevance: 0.9
      })),
      answer,
      confidence: courses.length / courseCodes.length
    };
  }

  /**
   * Get major requirements for a specific program
   */
  getMajorRequirements(programKey) {
    const program = this.degreeService.getProgram(programKey);
    if (!program) {
      return this.createNotFoundResponse(`Program '${programKey}' not found`);
    }

    const allCourses = this.degreeService.getAllCourses(programKey);
    const courseArray = Object.values(allCourses);
    const totalCredits = courseArray.reduce((sum, course) => sum + (course.credits || 0), 0);

    let answer = `# ${program.degree_info.degree} Requirements\n\n`;
    answer += `**Total Program Credits**: ${program.degree_info.total_credits_required}\n`;
    answer += `**Major Course Credits**: ${totalCredits}\n`;
    answer += `**Minimum GPA**: ${program.degree_info.minimum_gpa_required}\n\n`;

    // Group courses by category
    const categories = {
      'Foundation Courses': program.foundation_courses?.courses || [],
      'Core Courses': program.core_courses?.courses || [],
      'Required Major Courses': program.required_major_courses?.courses || [],
      'Mathematics Requirements': program.mathematics_requirements?.courses || [],
      'Mathematics Foundation': program.mathematics_foundation?.courses || []
    };

    Object.entries(categories).forEach(([category, courses]) => {
      if (courses.length > 0) {
        answer += `## ${category}\n\n`;
        courses.forEach(course => {
          answer += `- ${course.code}: ${course.title} (${course.credits} credits)\n`;
          if (course.description) {
            answer += `  *${course.description}*\n`;
          }
        });
        answer += '\n';
      }
    });

    // Add electives section for Data Science and other programs
    if (program.electives) {
      answer += `## Electives\n\n`;
      
      if (program.electives.cs_electives) {
        const csElectives = program.electives.cs_electives;
        answer += `### CS Electives (${csElectives.courses_required} courses, ${csElectives.credits_required} credits)\n`;
        answer += `${csElectives.description}\n\n`;
        csElectives.choose_from.forEach(course => {
          answer += `- **${course.code}**: ${course.title} (${course.credits} credits)\n`;
          if (course.description) {
            answer += `  *${course.description}*\n`;
          }
        });
        answer += '\n';
      }

      if (program.electives.stat_elective) {
        const statElective = program.electives.stat_elective;
        answer += `### Statistics Elective (${statElective.courses_required} course, ${statElective.credits_required} credits)\n`;
        answer += `${statElective.description}\n\n`;
        statElective.choose_from.forEach(course => {
          answer += `- **${course.code}**: ${course.title} (${course.credits} credits)\n`;
          if (course.description) {
            answer += `  *${course.description}*\n`;
          }
        });
        answer += '\n';
      }

      if (program.electives.ethics_course) {
        const ethicsCourse = program.electives.ethics_course;
        answer += `### Ethics Course (${ethicsCourse.courses_required} course, ${ethicsCourse.credits_required} credits)\n`;
        answer += `${ethicsCourse.description}\n\n`;
        ethicsCourse.choose_from.forEach(course => {
          answer += `- **${course.code}**: ${course.title} (${course.credits} credits)\n`;
          if (course.description) {
            answer += `  *${course.description}*\n`;
          }
        });
        answer += '\n';
      }
    }

    // Add summary for freshman year students
    if (programKey === 'data_science') {
      answer += `## For Freshman Year Students\n\n`;
      answer += `**First Year Focus:**\n`;
      answer += `- Complete foundational courses: CS 18000, CS 18200\n`;
      answer += `- Start mathematics sequence: MA 16100, MA 16200\n`;
      answer += `- Begin statistics foundation: STAT 35500\n\n`;
      answer += `**Plan Ahead:**\n`;
      answer += `- Choose 2 CS electives based on your interests\n`;
      answer += `- Select 1 statistics elective for advanced study\n`;
      answer += `- Pick 1 ethics course to fulfill degree requirements\n`;
    }

    return {
      sources: [
        {
          id: `${programKey}_requirements`,
          title: `${program.degree_info.degree} Requirements`,
          excerpt: `Complete degree requirements for ${program.degree_info.degree}`,
          relevance: 1.0
        }
      ],
      answer,
      confidence: 0.95
    };
  }

  /**
   * Get mathematics requirements for a specific program
   */
  getMathRequirements(programKey) {
    const program = this.degreeService.getProgram(programKey);
    if (!program || !program.mathematics_requirements) {
      return this.createNotFoundResponse(`Mathematics requirements not found for program '${programKey}'`);
    }

    const mathReqs = program.mathematics_requirements;
    let answer = `# Mathematics Requirements for ${program.degree_info.degree}\n\n`;
    answer += `**Total Mathematics Credits Required**: ${mathReqs.credits_required}\n\n`;

    mathReqs.courses.forEach(course => {
      answer += `## ${course.code}: ${course.title}\n`;
      answer += `**Credits**: ${course.credits}\n`;
      if (course.description) {
        answer += `**Description**: ${course.description}\n`;
      }
      if (course.prerequisites && course.prerequisites.length > 0) {
        answer += `**Prerequisites**: ${course.prerequisites.join(', ')}\n`;
      }
      answer += '\n';
    });

    return {
      sources: [
        {
          id: `${programKey}_math_requirements`,
          title: `${program.degree_info.degree} Mathematics Requirements`,
          excerpt: `Mathematics course requirements for ${program.degree_info.degree}`,
          relevance: 1.0
        }
      ],
      answer,
      confidence: 0.95
    };
  }

  /**
   * Search courses by keyword
   */
  searchCourses(searchTerm) {
    const results = this.degreeService.searchCourses(searchTerm);
    
    if (results.length === 0) {
      return this.createNotFoundResponse(`No courses found matching '${searchTerm}'`);
    }

    let answer = `# Course Search Results for "${searchTerm}"\n\n`;
    answer += `Found ${results.length} course(s):\n\n`;

    results.forEach(course => {
      answer += `## ${course.code}: ${course.title}\n`;
      answer += `**Credits**: ${course.credits}\n`;
      if (course.description) {
        answer += `**Description**: ${course.description}\n`;
      }
      answer += '\n';
    });

    return {
      sources: results.map(course => ({
        id: course.code.replace(' ', '').toLowerCase(),
        title: `${course.code}: ${course.title}`,
        excerpt: course.description || `${course.credits} credit course`,
        relevance: 0.8
      })),
      answer,
      confidence: 0.8
    };
  }

  /**
   * Handle general queries with best-effort matching - ONLY REAL PROGRAMS
   */
  getGeneralInformation(query) {
    // Try to find relevant information based on keywords
    const queryLower = query.toLowerCase();
    
    // Check for specific program mentions - ONLY REAL PROGRAMS WE SUPPORT
    if (queryLower.includes('computer science') || queryLower.includes('cs major')) {
      return this.getProgramStructure('computer_science');
    }
    
    if (queryLower.includes('data science')) {
      return this.getProgramStructure('data_science');
    }
    
    if (queryLower.includes('artificial intelligence') || queryLower.includes('ai major')) {
      return this.getProgramStructure('artificial_intelligence');
    }

    // Check for minor mentions
    if (queryLower.includes('minor')) {
      return this.getMinorInformation();
    }

    // Generic response with ONLY our real programs
    const programs = this.degreeService.getAllPrograms();
    let answer = `# BoilerAI Academic Information\n\n`;
    answer += `I can provide detailed information about the following **Purdue University** programs:\n\n`;
    
    // Only show real programs we actually support
    answer += `## Undergraduate Majors\n`;
    answer += `- **Computer Science (BS)**: 120 credits, College of Science\n`;
    answer += `  - Machine Intelligence Track\n`;
    answer += `  - Software Engineering Track\n`;
    answer += `- **Data Science (BS)**: 120 credits, College of Science\n`;
    answer += `- **Artificial Intelligence (BS)**: 120 credits, College of Science\n\n`;
    
    answer += `## Minor Programs\n`;
    answer += `- **Computer Science Minor**: 19 credits\n`;
    answer += `- **Data Science Minor**: 18 credits\n`;
    answer += `- **Artificial Intelligence Minor**: 18 credits\n\n`;
    
    answer += `## I can help with:\n`;
    answer += `- **CODO (Change of Degree Objective)** procedures and requirements\n`;
    answer += `- **Academic policies** (GPA requirements, probation, graduation)\n`;
    answer += `- **Course prerequisites** and sequences\n`;
    answer += `- **Program structure** and detailed course requirements\n`;
    answer += `- **Specific course information** (CS, Math, Statistics, etc.)\n`;
    answer += `- **Track options** and specializations\n\n`;
    
    answer += `**Example questions I can answer:**\n`;
    answer += `- "What is the Computer Science major structure?"\n`;
    answer += `- "How do I change my major to Data Science?" (CODO)\n`;
    answer += `- "What are the prerequisites for CS 25100?"\n`;
    answer += `- "What minors are available?"\n`;
    answer += `- "What math courses do I need for AI major?"\n`;

    return {
      sources: [
        {
          id: 'general_info',
          title: 'BoilerAI Academic Programs',
          excerpt: 'Overview of supported Purdue degree programs and academic policies',
          relevance: 0.6
        }
      ],
      answer,
      confidence: 0.6
    };
  }

  /**
   * Extract search term from query
   */
  extractSearchTerm(query) {
    // Simple extraction - can be enhanced with NLP
    const words = query.toLowerCase().split(' ');
    const stopWords = ['find', 'search', 'course', 'courses', 'about', 'on', 'for'];
    return words.filter(word => !stopWords.includes(word)).join(' ');
  }

  /**
   * Create standardized not found response - ONLY REAL PROGRAMS
   */
  createNotFoundResponse(message) {
    return {
      sources: [],
      answer: `I couldn't find specific information about that request. ${message}\n\nI can help you with:\n- **Academic Programs:** Computer Science, Data Science, Artificial Intelligence\n- **Minor Programs:** CS Minor, Data Science Minor, AI Minor\n- **CODO (Change of Degree Objective)** procedures and requirements\n- **Academic Policies:** GPA requirements, probation, suspension, graduation requirements\n- **Course Information:** Prerequisites, descriptions, credit hours for CS, Math, Stats courses\n- **Graduation Requirements:** Program-specific and general university requirements\n- **Course Prerequisites:** Prerequisite chains and sequences\n\n**Example questions:**\n- "What is the Computer Science major structure?"\n- "How do I change my major to Data Science?"\n- "What are the prerequisites for CS 18000?"`,
      confidence: 0.3
    };
  }

  /**
   * Get CODO information
   */
  getCODOInformation(targetProgram = null) {
    const codoPolicies = this.degreeService.getCODOPolicies();
    if (!codoPolicies) {
      return this.createNotFoundResponse('CODO policies not found');
    }

    let answer = `# CODO (Change of Degree Objective) Information\n\n`;
    
    // General CODO information
    answer += `## General Information\n`;
    answer += `${codoPolicies.general_information.description}\n\n`;
    answer += `**Application Periods:**\n`;
    codoPolicies.general_information.application_periods.forEach(period => {
      answer += `- ${period}\n`;
    });
    answer += `\n**Processing Time:** ${codoPolicies.general_information.processing_time}\n`;
    answer += `**Application Fee:** $${codoPolicies.general_information.application_fee}\n\n`;

    // Eligibility requirements
    answer += `## Eligibility Requirements\n`;
    answer += `**General Requirements:**\n`;
    codoPolicies.eligibility_requirements.general.forEach(req => {
      answer += `- ${req}\n`;
    });
    answer += `\n**GPA Requirements:**\n`;
    answer += `- Minimum Cumulative GPA: ${codoPolicies.eligibility_requirements.gpa_requirements.minimum_cumulative_gpa}\n`;
    answer += `- Minimum Prerequisite GPA: ${codoPolicies.eligibility_requirements.gpa_requirements.minimum_prerequisite_gpa}\n`;
    answer += `- Note: ${codoPolicies.eligibility_requirements.gpa_requirements.note}\n\n`;

    // Major-specific requirements if target program specified
    if (targetProgram && codoPolicies.major_specific_requirements[targetProgram]) {
      const majorReqs = codoPolicies.major_specific_requirements[targetProgram];
      const programInfo = this.degreeService.getProgramInfo(targetProgram);
      
      answer += `## Requirements for ${programInfo?.degree || targetProgram}\n`;
      answer += `**Minimum GPA:** ${majorReqs.minimum_gpa}\n`;
      answer += `**Required Courses:**\n`;
      majorReqs.required_courses.forEach(course => {
        answer += `- ${course}\n`;
      });
      if (majorReqs.additional_requirements) {
        answer += `\n**Additional Requirements:**\n`;
        majorReqs.additional_requirements.forEach(req => {
          answer += `- ${req}\n`;
        });
      }
      answer += `\n**Competitive Admission:** ${majorReqs.competitive_admission ? 'Yes' : 'No'}\n`;
    } else {
      // Show all major-specific requirements
      answer += `## Major-Specific Requirements\n`;
      Object.entries(codoPolicies.major_specific_requirements).forEach(([key, reqs]) => {
        const programInfo = this.degreeService.getProgramInfo(key);
        answer += `### ${programInfo?.degree || key}\n`;
        answer += `- Minimum GPA: ${reqs.minimum_gpa}\n`;
        answer += `- Competitive: ${reqs.competitive_admission ? 'Yes' : 'No'}\n\n`;
      });
    }

    return {
      sources: [
        {
          id: 'codo_policies',
          title: 'CODO Policies and Procedures',
          excerpt: 'Complete CODO information and requirements',
          relevance: 0.95
        }
      ],
      answer,
      confidence: 0.95
    };
  }

  /**
   * Get academic policies information
   */
  getAcademicPolicies() {
    const policies = this.degreeService.getAcademicPolicies();
    if (!policies) {
      return this.createNotFoundResponse('Academic policies not found');
    }

    let answer = `# Academic Policies and Requirements\n\n`;
    
    // GPA Requirements
    answer += `## GPA Requirements\n`;
    answer += `- **Minimum Graduation GPA:** ${policies.gpa_requirements.minimum_graduation_gpa}\n`;
    answer += `- **Minimum Major GPA:** ${policies.gpa_requirements.minimum_major_gpa}\n`;
    answer += `- **Academic Probation:** GPA below ${policies.gpa_requirements.probation_threshold}\n`;
    answer += `- **Academic Suspension:** GPA below ${policies.gpa_requirements.suspension_threshold}\n\n`;
    
    // Credit Requirements
    answer += `## Credit Requirements\n`;
    answer += `- **Minimum Total Credits:** ${policies.credit_requirements.minimum_total_credits}\n`;
    answer += `- **Minimum Residence Credits:** ${policies.credit_requirements.minimum_residence_credits}\n`;
    answer += `- **Maximum Transfer Credits:** ${policies.credit_requirements.maximum_transfer_credits}\n`;
    answer += `- **Maximum Credits per Semester:** ${policies.credit_requirements.maximum_credits_per_semester}\n`;
    answer += `- **Minimum for Full-time Status:** ${policies.credit_requirements.minimum_credits_for_fulltime}\n\n`;

    // Academic Standing
    answer += `## Academic Standing\n`;
    Object.entries(policies.academic_standing).forEach(([status, info]) => {
      answer += `### ${status.replace('_', ' ').toUpperCase()}\n`;
      answer += `**Description:** ${info.description}\n`;
      if (info.privileges) {
        answer += `**Privileges:**\n`;
        info.privileges.forEach(priv => answer += `- ${priv}\n`);
      }
      if (info.restrictions) {
        answer += `**Restrictions:**\n`;
        info.restrictions.forEach(rest => answer += `- ${rest}\n`);
      }
      if (info.duration) answer += `**Duration:** ${info.duration}\n`;
      if (info.appeal_process) answer += `**Appeal Process:** ${info.appeal_process}\n`;
      answer += `\n`;
    });

    return {
      sources: [
        {
          id: 'academic_policies',
          title: 'Academic Policies and Standards',
          excerpt: 'University academic policies and requirements',
          relevance: 0.95
        }
      ],
      answer,
      confidence: 0.95
    };
  }

  /**
   * Get prerequisite information for courses
   */
  getPrerequisiteInformation(courseCodes) {
    if (!courseCodes || courseCodes.length === 0) {
      return this.createNotFoundResponse('No courses specified for prerequisite search');
    }

    let answer = `# Course Prerequisites\n\n`;
    const found = [];
    const notFound = [];

    courseCodes.forEach(courseCode => {
      const prereqInfo = this.degreeService.getPrerequisites(courseCode);
      if (prereqInfo) {
        found.push({ code: courseCode, info: prereqInfo });
        answer += `## ${courseCode}: ${prereqInfo.title}\n`;
        if (prereqInfo.prerequisites && prereqInfo.prerequisites.length > 0) {
          answer += `**Prerequisites:** ${prereqInfo.prerequisites.join(', ')}\n`;
        } else {
          answer += `**Prerequisites:** None\n`;
        }
        if (prereqInfo.prerequisite_for && prereqInfo.prerequisite_for.length > 0) {
          answer += `**Prerequisite for:** ${prereqInfo.prerequisite_for.join(', ')}\n`;
        }
        answer += `\n`;
      } else {
        notFound.push(courseCode);
      }
    });

    if (notFound.length > 0) {
      answer += `\n*Note: Prerequisite information not found for: ${notFound.join(', ')}*\n`;
    }

    return {
      sources: found.map(item => ({
        id: item.code.replace(' ', '').toLowerCase(),
        title: `${item.code} Prerequisites`,
        excerpt: `Prerequisite information for ${item.code}`,
        relevance: 0.9
      })),
      answer,
      confidence: found.length / courseCodes.length
    };
  }

  /**
   * Get minor information
   */
  getMinorInformation() {
    const minors = this.degreeService.getAllMinors();
    if (!minors || Object.keys(minors).length === 0) {
      return this.createNotFoundResponse('Minor information not found');
    }

    let answer = `# Available Minors\n\n`;
    
    Object.entries(minors).forEach(([key, minor]) => {
      answer += `## ${minor.title}\n`;
      answer += `**Available to:** ${minor.available_to}\n`;
      answer += `**Credits Required:** ${minor.credits_required}\n\n`;
      
      if (minor.courses) {
        answer += `**Required Courses:**\n`;
        minor.courses.forEach(course => {
          answer += `- ${course.code}: ${course.title} (${course.credits} credits)\n`;
        });
      }
      
      if (minor.electives) {
        answer += `\n**Electives:** ${minor.electives.credits_required} credits from:\n`;
        minor.electives.choose_from.forEach(course => {
          answer += `- ${course}\n`;
        });
      }
      answer += `\n`;
    });

    return {
      sources: [
        {
          id: 'minors_info',
          title: 'Available Minors and Certificates',
          excerpt: 'Information about available minor programs',
          relevance: 0.9
        }
      ],
      answer,
      confidence: 0.9
    };
  }

  /**
   * Get graduation requirements
   */
  getGraduationRequirements(programKey = null) {
    if (programKey) {
      const gradReqs = this.degreeService.getGraduationRequirements(programKey);
      if (!gradReqs) {
        return this.createNotFoundResponse(`Graduation requirements not found for program '${programKey}'`);
      }

      const programInfo = this.degreeService.getProgramInfo(programKey);
      let answer = `# Graduation Requirements for ${programInfo?.degree || programKey}\n\n`;
      
      answer += `## Program-Specific Requirements\n`;
      answer += `- **Total Credits:** ${gradReqs.program_specific.total_credits}\n`;
      answer += `- **Minimum GPA:** ${gradReqs.program_specific.minimum_gpa}\n`;
      answer += `- **Major Courses:** ${gradReqs.program_specific.major_courses} courses\n\n`;
      
      if (gradReqs.general_requirements) {
        answer += `## General University Requirements\n`;
        gradReqs.general_requirements.general_requirements.forEach(req => {
          answer += `- ${req}\n`;
        });
        
        if (gradReqs.general_requirements.core_curriculum) {
          answer += `\n## Core Curriculum Requirements\n`;
          Object.entries(gradReqs.general_requirements.core_curriculum).forEach(([area, reqs]) => {
            answer += `### ${area.replace('_', ' ').toUpperCase()}\n`;
            answer += `- Credits Required: ${reqs.credits_required}\n`;
            if (reqs.courses) {
              answer += `- Courses: ${reqs.courses.join(', ')}\n`;
            }
            if (reqs.description) {
              answer += `- Description: ${reqs.description}\n`;
            }
            answer += `\n`;
          });
        }
      }

      return {
        sources: [
          {
            id: `${programKey}_graduation_reqs`,
            title: `${programInfo?.degree || programKey} Graduation Requirements`,
            excerpt: `Complete graduation requirements for ${programInfo?.degree || programKey}`,
            relevance: 1.0
          }
        ],
        answer,
        confidence: 0.95
      };
    }

    // General graduation requirements
    const academicPolicies = this.degreeService.getAcademicPolicies();
    if (!academicPolicies?.graduation_requirements) {
      return this.createNotFoundResponse('General graduation requirements not found');
    }

    let answer = `# General Graduation Requirements\n\n`;
    academicPolicies.graduation_requirements.general_requirements.forEach(req => {
      answer += `- ${req}\n`;
    });

    return {
      sources: [
        {
          id: 'general_graduation_reqs',
          title: 'General Graduation Requirements',
          excerpt: 'University-wide graduation requirements',
          relevance: 0.8
        }
      ],
      answer,
      confidence: 0.8
    };
  }

  /**
   * Generate knowledge sources list
   */
  getKnowledgeSources() {
    const allPrograms = this.degreeService.getAllPrograms();
    const totalCourses = allPrograms.reduce((total, program) => {
      return total + Object.keys(this.degreeService.getAllCourses(program)).length;
    }, 0);

    return [
      {
        id: "purdue-catalog-comprehensive",
        name: "Purdue Course Catalog (Comprehensive)",
        type: "official",
        lastUpdated: new Date().toISOString().split('T')[0],
        documentCount: totalCourses
      },
      {
        id: "degree-requirements-database",
        name: "Degree Requirements Database",
        type: "official",
        lastUpdated: new Date().toISOString().split('T')[0],
        documentCount: allPrograms.length
      },
      {
        id: "academic-policies",
        name: "Academic Policies and Procedures",
        type: "official",
        lastUpdated: new Date().toISOString().split('T')[0],
        documentCount: 1
      },
      {
        id: "codo-policies",
        name: "CODO Policies and Requirements",
        type: "official",
        lastUpdated: new Date().toISOString().split('T')[0],
        documentCount: 1
      },
      {
        id: "course-prerequisites",
        name: "Course Prerequisites Database",
        type: "official",
        lastUpdated: new Date().toISOString().split('T')[0],
        documentCount: 1
      },
      {
        id: "minors-certificates",
        name: "Minors and Certificates",
        type: "official",
        lastUpdated: new Date().toISOString().split('T')[0],
        documentCount: Object.keys(this.degreeService.getAllMinors()).length
      }
    ];
  }
}

module.exports = new KnowledgeRetrievalService();