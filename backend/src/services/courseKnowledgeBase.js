const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

/**
 * Course Knowledge Base for CS Program
 * 
 * Provides structured access to CS course information, track requirements,
 * and program policies from the knowledge base files.
 */
class CourseKnowledgeBase {
  constructor() {
    this.dataDir = path.join(__dirname, '../../../packs/CS');
    this.coursesData = null;
    this.tracksData = null;
    this.coursePages = new Map();
    this.initialized = false;
    
    this.initialize();
  }

  /**
   * Initialize knowledge base by loading all data files
   */
  initialize() {
    try {
      this.loadTracksData();
      this.loadCoursesData();
      this.loadCoursePages();
      this.initialized = true;
      logger.info('Course Knowledge Base initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Course Knowledge Base', { error: error.message });
      this.initialized = false;
    }
  }

  /**
   * Load tracks configuration
   */
  loadTracksData() {
    const tracksPath = path.join(this.dataDir, 'tracks.json');
    if (fs.existsSync(tracksPath)) {
      const data = fs.readFileSync(tracksPath, 'utf8');
      this.tracksData = JSON.parse(data);
      logger.info('Loaded tracks data', { 
        tracks: this.tracksData.tracks.map(t => t.name) 
      });
    }
  }

  /**
   * Load courses CSV data
   */
  loadCoursesData() {
    const coursesPath = path.join(this.dataDir, 'courses.csv');
    if (fs.existsSync(coursesPath)) {
      // For now, we'll use the course pages instead of parsing CSV
      // This could be enhanced to parse CSV if needed
      logger.info('Courses CSV file found');
    }
  }

  /**
   * Load individual course pages with detailed information
   */
  loadCoursePages() {
    const coursePagesDir = path.join(this.dataDir, 'docs/course_pages');
    
    if (!fs.existsSync(coursePagesDir)) {
      logger.warn('Course pages directory not found');
      return;
    }

    const files = fs.readdirSync(coursePagesDir);
    let loadedCount = 0;

    files.forEach(file => {
      if (file.endsWith('.md') && !file.startsWith('_')) {
        try {
          const courseId = file.replace('.md', '').toUpperCase();
          const filePath = path.join(coursePagesDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          
          const courseInfo = this.parseCoursePage(content, courseId);
          if (courseInfo) {
            this.coursePages.set(courseId, courseInfo);
            loadedCount++;
          }
        } catch (error) {
          logger.warn('Failed to load course page', { file, error: error.message });
        }
      }
    });

    logger.info('Loaded course pages', { count: loadedCount });
  }

  /**
   * Parse individual course markdown files
   */
  parseCoursePage(content, courseId) {
    try {
      // Extract frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const frontmatter = {};
      
      if (frontmatterMatch) {
        const frontmatterText = frontmatterMatch[1];
        frontmatterText.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length) {
            const value = valueParts.join(':').trim();
            frontmatter[key.trim()] = value;
          }
        });
      }

      // Extract description
      const descriptionMatch = content.match(/## Description\n(.*?)(?=\n##|\n\n##|$)/s);
      const description = descriptionMatch ? descriptionMatch[1].trim() : '';

      // Extract learning outcomes
      const outcomesMatch = content.match(/## Learning Outcomes\n(.*?)(?=\n##|\n\n##|$)/s);
      const outcomes = outcomesMatch ? outcomesMatch[1].trim() : '';

      // Extract prerequisites
      const prereqMatch = content.match(/## Prerequisites.*?\n(.*?)(?=\n##|\n\n##|$)/s);
      const prerequisites = prereqMatch ? prereqMatch[1].trim() : '';

      return {
        courseId,
        title: frontmatter.title,
        credits: frontmatter.credits,
        level: frontmatter.level,
        description,
        outcomes,
        prerequisites,
        departments: frontmatter.departments,
        schedule_types: frontmatter.schedule_types,
        campuses: frontmatter.campuses
      };
    } catch (error) {
      logger.warn('Failed to parse course page', { courseId, error: error.message });
      return null;
    }
  }

  /**
   * Get detailed information about a specific course
   */
  getCourseInfo(courseId) {
    if (!this.initialized) {
      return null;
    }

    const normalizedId = courseId.toUpperCase().replace(/\s/g, '');
    return this.coursePages.get(normalizedId) || null;
  }

  /**
   * Get track information and requirements
   */
  getTrackInfo(trackId = null) {
    if (!this.initialized || !this.tracksData) {
      return null;
    }

    if (trackId) {
      return this.tracksData.tracks.find(track => 
        track.id === trackId || 
        track.name.toLowerCase().includes(trackId.toLowerCase())
      );
    }

    return this.tracksData.tracks;
  }

  /**
   * Format course information for display
   */
  formatCourseInfo(courseInfo) {
    if (!courseInfo) {
      return null;
    }

    let formatted = `**${courseInfo.courseId}: ${courseInfo.title}**\n\n`;
    
    // Basic info
    formatted += `• **Credits:** ${courseInfo.credits}\n`;
    formatted += `• **Level:** ${courseInfo.level}\n`;
    
    if (courseInfo.campuses) {
      formatted += `• **Campuses:** ${courseInfo.campuses}\n`;
    }

    // Description
    if (courseInfo.description) {
      formatted += `\n**Description:**\n${courseInfo.description}\n`;
    }

    // Prerequisites
    if (courseInfo.prerequisites) {
      formatted += `\n**Prerequisites:**\n${courseInfo.prerequisites}\n`;
    }

    // Learning outcomes
    if (courseInfo.outcomes) {
      formatted += `\n**Learning Outcomes:**\n${courseInfo.outcomes}\n`;
    }

    return formatted;
  }

  /**
   * Format track information for display
   */
  formatTrackInfo(trackInfo) {
    if (!trackInfo) {
      return null;
    }

    let formatted = `**${trackInfo.name} Track**\n\n`;
    formatted += `**Requirements:**\n`;

    trackInfo.groups.forEach(group => {
      const fromList = group.from.join(', ');
      if (group.need === 1) {
        formatted += `• Choose 1 from: ${fromList}\n`;
      } else {
        formatted += `• Choose ${group.need} from: ${fromList}\n`;
      }
    });

    if (trackInfo.notes) {
      formatted += `\n**Important Notes:**\n`;
      trackInfo.notes.forEach(note => {
        formatted += `• ${note}\n`;
      });
    }

    return formatted;
  }

  /**
   * Get core CS courses information
   */
  getCoreCoursesInfo() {
    const coreCoursesToShow = ['CS18000', 'CS18200', 'CS24000', 'CS25000', 'CS25100', 'CS25200'];
    const coreInfo = [];

    coreCoursesToShow.forEach(courseId => {
      const courseInfo = this.getCourseInfo(courseId);
      if (courseInfo) {
        coreInfo.push({
          id: courseId,
          title: courseInfo.title,
          credits: courseInfo.credits,
          description: courseInfo.description?.substring(0, 100) + '...'
        });
      }
    });

    return coreInfo;
  }

  /**
   * Search for courses by keywords
   */
  searchCourses(keywords) {
    if (!this.initialized) {
      return [];
    }

    const searchTerms = keywords.toLowerCase().split(' ');
    const results = [];

    for (const [courseId, courseInfo] of this.coursePages) {
      const searchText = `${courseInfo.title} ${courseInfo.description}`.toLowerCase();
      
      const matches = searchTerms.filter(term => searchText.includes(term));
      if (matches.length > 0) {
        results.push({
          ...courseInfo,
          relevanceScore: matches.length / searchTerms.length
        });
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return results.slice(0, 10); // Return top 10 results
  }

  /**
   * Get program structure overview
   */
  getProgramStructure() {
    const structure = {
      core_courses: [
        'CS 18000 - Problem Solving and Object-Oriented Programming',
        'CS 18200 - Foundations of Computer Science', 
        'CS 24000 - Programming in C',
        'CS 25000 - Computer Architecture',
        'CS 25100 - Data Structures and Algorithms',
        'CS 25200 - Systems Programming'
      ],
      tracks: []
    };

    if (this.tracksData) {
      this.tracksData.tracks.forEach(track => {
        structure.tracks.push({
          name: track.name,
          id: track.id,
          focus: track.id === 'machine_intelligence' 
            ? 'AI, Machine Learning, and Intelligent Systems'
            : 'Software Development, Testing, and Systems'
        });
      });
    }

    return structure;
  }

  /**
   * Check if knowledge base is properly initialized
   */
  isReady() {
    return this.initialized && this.coursePages.size > 0;
  }

  /**
   * Get knowledge base statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      coursePagesLoaded: this.coursePages.size,
      tracksLoaded: this.tracksData ? this.tracksData.tracks.length : 0,
      dataDirectory: this.dataDir
    };
  }
}

module.exports = new CourseKnowledgeBase();