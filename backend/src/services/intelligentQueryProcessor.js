const { logger } = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Intelligent Query Processor for Knowledge Base Queries
 * 
 * Analyzes user queries and converts them to appropriate knowledge base lookups
 * using actual available data schema and course progression information.
 */
class IntelligentQueryProcessor {
  constructor() {
    this.dataDir = path.join(__dirname, '../../../packs/CS');
    this.knowledgeSchema = this.loadKnowledgeSchema();
  }

  /**
   * Load available knowledge schema to understand what data is available
   */
  loadKnowledgeSchema() {
    try {
      // Load degree progression data
      const progressionPath = path.join(this.dataDir, 'cs_degree_progression.json');
      const progressionData = JSON.parse(fs.readFileSync(progressionPath, 'utf8'));
      
      // Load tracks data
      const tracksPath = path.join(this.dataDir, 'tracks.json');
      const tracksData = JSON.parse(fs.readFileSync(tracksPath, 'utf8'));
      
      // Get available courses from course pages
      const coursePagesDir = path.join(this.dataDir, 'docs/course_pages');
      const availableCourses = fs.existsSync(coursePagesDir) 
        ? fs.readdirSync(coursePagesDir)
            .filter(file => file.endsWith('.md') && !file.startsWith('_'))
            .map(file => file.replace('.md', '').toUpperCase())
        : [];

      return {
        degree_info: progressionData.degree_info,
        academic_progression: progressionData.academic_progression,
        track_definitions: progressionData.track_definitions,
        core_requirements: progressionData.core_requirements,
        tracks: tracksData.tracks,
        available_courses: availableCourses,
        degree_progression_courses: this.extractCoursesFromProgression(progressionData.academic_progression)
      };
    } catch (error) {
      logger.error('Failed to load knowledge schema', { error: error.message });
      return null;
    }
  }

  /**
   * Extract all courses mentioned in degree progression
   */
  extractCoursesFromProgression(academicProgression) {
    const courses = [];
    
    for (const [semesterKey, semesterData] of Object.entries(academicProgression)) {
      semesterData.courses.forEach(course => {
        courses.push({
          course_id: course.course_id,
          title: course.title,
          credits: course.credits,
          semester: semesterData.semester,
          requirement_type: course.requirement_type,
          prerequisites: course.prerequisites || [],
          notes: course.notes || ''
        });
      });
    }
    
    return courses;
  }

  /**
   * Analyze user query and suggest appropriate knowledge base lookups
   */
  analyzeQuery(query) {
    if (!this.knowledgeSchema) {
      return {
        type: 'error',
        message: 'Knowledge schema not available'
      };
    }

    const queryLower = query.toLowerCase();
    const analysis = {
      type: 'unknown',
      confidence: 0.0,
      suggestedLookup: null,
      knowledgeAvailable: true
    };

    // Check for specific course queries
    const courseMatch = this.analyzeCourseQuery(query, queryLower);
    if (courseMatch) {
      return courseMatch;
    }

    // Check for track queries
    const trackMatch = this.analyzeTrackQuery(query, queryLower);
    if (trackMatch) {
      return trackMatch;
    }

    // Check for progression/timing queries
    const progressionMatch = this.analyzeProgressionQuery(query, queryLower);
    if (progressionMatch) {
      return progressionMatch;
    }

    // Check for requirement queries
    const requirementMatch = this.analyzeRequirementQuery(query, queryLower);
    if (requirementMatch) {
      return requirementMatch;
    }

    // Check for out-of-scope queries
    const scopeMatch = this.analyzeScopeQuery(query, queryLower);
    if (scopeMatch) {
      return scopeMatch;
    }

    return {
      type: 'general_academic',
      confidence: 0.5,
      knowledgeAvailable: true,
      suggestedLookup: 'knowledge_base_overview'
    };
  }

  /**
   * Analyze course-specific queries
   */
  analyzeCourseQuery(query, queryLower) {
    const coursePattern = /\b(CS\s?(\d{3}|\d{5}))\b/gi;
    const matches = query.match(coursePattern);
    
    if (!matches) return null;

    const courseIds = matches.map(code => code.replace(/\s/g, '').toUpperCase());
    const availableCourses = courseIds.filter(id => 
      this.knowledgeSchema.available_courses.includes(id) ||
      this.knowledgeSchema.degree_progression_courses.some(c => c.course_id === id)
    );

    if (availableCourses.length === 0) {
      return {
        type: 'course_not_available',
        confidence: 0.9,
        knowledgeAvailable: false,
        courses: courseIds,
        message: `I don't have information about ${courseIds.join(', ')} in my knowledge base.`
      };
    }

    const queryType = this.determineCourseQueryType(queryLower);
    
    return {
      type: 'course_query',
      confidence: 0.95,
      knowledgeAvailable: true,
      courses: availableCourses,
      queryType: queryType,
      suggestedLookup: 'course_information'
    };
  }

  /**
   * Determine what type of course information is being requested
   */
  determineCourseQueryType(queryLower) {
    if (queryLower.includes('when') || queryLower.includes('semester') || queryLower.includes('year')) {
      return 'sequence';
    }
    if (queryLower.includes('credit')) {
      return 'credits';
    }
    if (queryLower.includes('prerequisite') || queryLower.includes('prereq')) {
      return 'prerequisites';
    }
    if (queryLower.includes('what is') || queryLower.includes('describe') || queryLower.includes('about')) {
      return 'description';
    }
    return 'general';
  }

  /**
   * Analyze track-related queries
   */
  analyzeTrackQuery(query, queryLower) {
    const trackMentions = queryLower.includes('track') || 
                         queryLower.includes('machine intelligence') || 
                         queryLower.includes('software engineering') ||
                         queryLower.includes('mi track') ||
                         queryLower.includes('se track');

    if (!trackMentions) return null;

    const isComparison = queryLower.includes('vs') || queryLower.includes('compare') || queryLower.includes('which track');
    const isRequirements = queryLower.includes('requirement') || queryLower.includes('classes') || queryLower.includes('courses');
    const isTiming = queryLower.includes('when') || queryLower.includes('declare');

    return {
      type: 'track_query',
      confidence: 0.9,
      knowledgeAvailable: true,
      isComparison: isComparison,
      isRequirements: isRequirements,
      isTiming: isTiming,
      suggestedLookup: 'track_information',
      availableTracks: this.knowledgeSchema.tracks.map(t => t.name)
    };
  }

  /**
   * Analyze progression/timing queries
   */
  analyzeProgressionQuery(query, queryLower) {
    const progressionIndicators = [
      'when should i take',
      'what semester',
      'what year',
      'course sequence',
      'degree plan',
      'graduation'
    ];

    const hasProgressionIndicator = progressionIndicators.some(indicator => 
      queryLower.includes(indicator)
    );

    if (!hasProgressionIndicator) return null;

    return {
      type: 'progression_query',
      confidence: 0.85,
      knowledgeAvailable: true,
      suggestedLookup: 'degree_progression',
      progressionData: this.knowledgeSchema.degree_progression_courses
    };
  }

  /**
   * Analyze requirement queries
   */
  analyzeRequirementQuery(query, queryLower) {
    const requirementIndicators = [
      'requirement',
      'need to take',
      'required',
      'core courses',
      'graduation requirement'
    ];

    const hasRequirementIndicator = requirementIndicators.some(indicator => 
      queryLower.includes(indicator)
    );

    if (!hasRequirementIndicator) return null;

    return {
      type: 'requirement_query',
      confidence: 0.8,
      knowledgeAvailable: true,
      suggestedLookup: 'degree_requirements',
      requirements: this.knowledgeSchema.core_requirements
    };
  }

  /**
   * Check if query is asking about programs outside knowledge base
   */
  analyzeScopeQuery(query, queryLower) {
    const outOfScopePrograms = [
      'data science', 'artificial intelligence program', 'ai program', 
      'data science major', 'ai major', 'ds program', 'statistics major',
      'math major', 'electrical engineering', 'mechanical engineering'
    ];
    
    const mentionsOutOfScope = outOfScopePrograms.some(program => 
      queryLower.includes(program)
    );

    if (!mentionsOutOfScope) return null;

    return {
      type: 'out_of_scope',
      confidence: 0.95,
      knowledgeAvailable: false,
      availablePrograms: [this.knowledgeSchema.degree_info.degree],
      suggestedLookup: 'scope_clarification'
    };
  }

  /**
   * Generate intelligent SQL query based on analysis
   */
  generateSQLQuery(analysis) {
    if (!analysis.knowledgeAvailable) {
      return null;
    }

    switch (analysis.type) {
      case 'course_query':
        return this.generateCourseSQL(analysis);
      case 'track_query':
        return this.generateTrackSQL(analysis);
      case 'progression_query':
        return this.generateProgressionSQL(analysis);
      case 'requirement_query':
        return this.generateRequirementSQL(analysis);
      default:
        return null;
    }
  }

  /**
   * Generate SQL for course queries
   */
  generateCourseSQL(analysis) {
    const courseIds = analysis.courses.map(id => `'${id}'`).join(', ');
    
    switch (analysis.queryType) {
      case 'credits':
        return `SELECT course_id, title, credits FROM courses WHERE course_id IN (${courseIds})`;
      case 'prerequisites':
        return `SELECT course_id, title, prerequisites FROM courses WHERE course_id IN (${courseIds})`;
      case 'description':
        return `SELECT course_id, title, credits, level, description, prerequisites FROM courses WHERE course_id IN (${courseIds})`;
      default:
        return `SELECT * FROM courses WHERE course_id IN (${courseIds})`;
    }
  }

  /**
   * Generate SQL for track queries
   */
  generateTrackSQL(analysis) {
    if (analysis.isRequirements) {
      return `SELECT * FROM track_groups ORDER BY track_id, key`;
    }
    return `SELECT * FROM tracks`;
  }

  /**
   * Generate SQL for progression queries
   */
  generateProgressionSQL(analysis) {
    return `SELECT course_id, title, credits, level FROM courses ORDER BY level, course_id`;
  }

  /**
   * Generate SQL for requirement queries
   */
  generateRequirementSQL(analysis) {
    return `SELECT course_id, title, credits, requirement_type FROM courses WHERE requirement_type IN ('cs_core', 'math_required') ORDER BY requirement_type, course_id`;
  }

  /**
   * Process query with intelligent analysis
   */
  async processQuery(query) {
    logger.info('Processing intelligent query', { 
      queryLength: query.length,
      hasSchema: !!this.knowledgeSchema 
    });

    const analysis = this.analyzeQuery(query);
    
    if (!analysis.knowledgeAvailable) {
      return {
        success: false,
        analysis: analysis,
        message: analysis.message || 'Query is outside available knowledge base scope'
      };
    }

    const sqlQuery = this.generateSQLQuery(analysis);
    
    return {
      success: true,
      analysis: analysis,
      sqlQuery: sqlQuery,
      knowledgeType: analysis.suggestedLookup
    };
  }
}

module.exports = new IntelligentQueryProcessor();