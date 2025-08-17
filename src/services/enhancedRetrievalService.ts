/**
 * Enhanced Retrieval Service
 * 
 * Implements SmartCourse/Echelon-inspired retrieval with:
 * - Dual query strategy (strict + relaxed)
 * - BM25 scoring with term frequency analysis
 * - ELO-based reranking system
 * - Synonym/alias expansion
 * - Citation tracking
 * - Privacy-first design
 */

import coursesData from '@/data/purdue_courses_complete.json';
import codoPolicies from '@/data/codoPolicies.json';
import { logger } from '@/utils/logger';

// Types for retrieval system
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

interface CODOPolicy {
  program_name: string;
  degree_type: string;
  college: string;
  department: string;
  codo_requirements: {
    minimum_gpa: number;
    purdue_gpa_requirement: number;
    credit_requirements: {
      minimum_purdue_credits: number;
      maximum_total_credits: number;
    };
    required_courses: Array<{
      course_code: string;
      course_title: string;
      minimum_grade: string;
      required: boolean;
      alternatives: string[];
      notes: string;
    }>;
    recommended_courses: Array<{
      course_code: string;
      course_title: string;
      notes: string;
    }>;
    application_periods: {
      fall_deadline: string;
      spring_deadline: string;
      summer_deadline: string;
    };
    additional_requirements: {
      essay_required: boolean;
      advisor_meeting: boolean;
      prerequisite_planning: boolean;
    };
  };
  competitiveness: {
    acceptance_rate: string;
    average_gpa: number;
    notes: string;
  };
  career_outlook: {
    job_placement_rate: string;
    average_starting_salary: string;
    top_employers: string[];
  };
}

interface QueryPlan {
  strict_query: string;
  relaxed_query: string;
  query_type: 'course_search' | 'policy_lookup' | 'prerequisite_check' | 'codo_evaluation' | 'general_academic';
  expected_result_types: ('course' | 'policy' | 'requirement')[];
  synonyms: string[];
  aliases: string[];
}

interface RetrievalResult {
  id: string;
  type: 'course' | 'policy' | 'requirement';
  content: Course | CODOPolicy | any;
  bm25_score: number;
  elo_score: number;
  final_score: number;
  citations: Citation[];
  confidence: number;
}

interface Citation {
  source: string;
  section: string;
  url?: string;
  last_updated?: string;
  authority_level: 'official' | 'derived' | 'computed';
}

interface ELOUpdate {
  query_text: string;
  result_id: string;
  feedback_type: 'success' | 'failure' | 'partial';
  timestamp: Date;
}

class EnhancedRetrievalService {
  private courses: Course[];
  private policies: Record<string, CODOPolicy>;
  private elo_scores: Map<string, number>;
  private synonym_map: Map<string, string[]>;
  private alias_map: Map<string, string>;
  private query_history: ELOUpdate[];
  private citation_cache: Map<string, Citation[]>;

  constructor() {
    this.courses = coursesData as Course[];
    this.policies = codoPolicies as Record<string, CODOPolicy>;
    this.elo_scores = new Map();
    this.synonym_map = new Map();
    this.alias_map = new Map();
    this.query_history = [];
    this.citation_cache = new Map();
    
    this.initializeSynonymMap();
    this.initializeAliasMap();
    this.loadELOScores();
    
    logger.info('Enhanced Retrieval Service initialized', 'RETRIEVAL', {
      courses_count: this.courses.length,
      policies_count: Object.keys(this.policies).length
    });
  }

  /**
   * Main retrieval interface - implements dual query strategy
   */
  async retrieve(user_query: string, options: {
    max_results?: number;
    result_types?: ('course' | 'policy' | 'requirement')[];
    enable_elo_reranking?: boolean;
    cite_sources?: boolean;
  } = {}): Promise<RetrievalResult[]> {
    const {
      max_results = 10,
      result_types = ['course', 'policy', 'requirement'],
      enable_elo_reranking = true,
      cite_sources = true
    } = options;

    try {
      // Step 1: Query Planning
      const query_plan = this.planQuery(user_query);
      
      // Step 2: Synonym/Alias Expansion  
      const expanded_queries = this.expandQuery(query_plan);
      
      // Step 3: Dual Query Execution (Strict + Relaxed)
      const strict_results = await this.executeQuery(expanded_queries.strict_query, query_plan, 'strict');
      const relaxed_results = await this.executeQuery(expanded_queries.relaxed_query, query_plan, 'relaxed');
      
      // Step 4: Merge and Deduplicate Results
      const merged_results = this.mergeResults(strict_results, relaxed_results);
      
      // Step 5: BM25 Scoring
      const bm25_scored = this.calculateBM25Scores(merged_results, user_query);
      
      // Step 6: ELO Reranking (if enabled)
      const final_results = enable_elo_reranking 
        ? this.applyELOReranking(bm25_scored, user_query)
        : bm25_scored;
      
      // Step 7: Add Citations (if enabled)
      if (cite_sources) {
        final_results.forEach(result => {
          result.citations = this.generateCitations(result);
        });
      }
      
      // Step 8: Filter by result types and limit
      const filtered_results = final_results
        .filter(result => result_types.includes(result.type))
        .slice(0, max_results);
      
      logger.info('Retrieval completed', 'RETRIEVAL', {
        query: user_query,
        plan_type: query_plan.query_type,
        results_count: filtered_results.length,
        elo_enabled: enable_elo_reranking
      });
      
      return filtered_results;
      
    } catch (error) {
      logger.error('Retrieval failed', 'RETRIEVAL', error);
      throw new Error(`Retrieval service error: ${error}`);
    }
  }

  /**
   * Query Planning - Analyzes user intent and creates dual query strategy
   */
  private planQuery(user_query: string): QueryPlan {
    const query_lower = user_query.toLowerCase();
    
    // Detect query type using patterns
    let query_type: QueryPlan['query_type'] = 'general_academic';
    let expected_result_types: ('course' | 'policy' | 'requirement')[] = ['course', 'policy', 'requirement'];
    
    // Course search patterns
    if (/\b[A-Z]{2,4}\s*\d{3,5}\b/.test(user_query) || 
        /course|class|credit|prerequisite/.test(query_lower)) {
      query_type = 'course_search';
      expected_result_types = ['course'];
    }
    
    // CODO/Policy patterns
    else if (/codo|change.*major|transfer.*to|switch.*to|requirements.*for/.test(query_lower)) {
      query_type = 'codo_evaluation';
      expected_result_types = ['policy', 'requirement'];
    }
    
    // Prerequisite patterns
    else if (/prerequisite|prereq|before.*taking|required.*before/.test(query_lower)) {
      query_type = 'prerequisite_check';
      expected_result_types = ['course', 'requirement'];
    }
    
    // Policy lookup patterns
    else if (/policy|regulation|rule|deadline|requirement/.test(query_lower)) {
      query_type = 'policy_lookup';
      expected_result_types = ['policy', 'requirement'];
    }

    // Create strict query (exact terms, focused)
    const strict_query = this.createStrictQuery(user_query, query_type);
    
    // Create relaxed query (expanded terms, broader)
    const relaxed_query = this.createRelaxedQuery(user_query, query_type);
    
    return {
      strict_query,
      relaxed_query,
      query_type,
      expected_result_types,
      synonyms: this.getSynonyms(user_query),
      aliases: this.getAliases(user_query)
    };
  }

  /**
   * Create focused strict query
   */
  private createStrictQuery(user_query: string, query_type: QueryPlan['query_type']): string {
    // Extract key terms based on query type
    const key_terms = this.extractKeyTerms(user_query, query_type);
    
    // For strict queries, use exact terms with minimal expansion
    return key_terms.join(' AND ');
  }

  /**
   * Create broader relaxed query  
   */
  private createRelaxedQuery(user_query: string, query_type: QueryPlan['query_type']): string {
    // Extract key terms and add related concepts
    const key_terms = this.extractKeyTerms(user_query, query_type);
    const expanded_terms = key_terms.flatMap(term => {
      const synonyms = this.synonym_map.get(term.toLowerCase()) || [];
      return [term, ...synonyms];
    });
    
    // For relaxed queries, use OR logic with expanded terms
    return expanded_terms.join(' OR ');
  }

  /**
   * Extract key terms based on query type
   */
  private extractKeyTerms(user_query: string, query_type: QueryPlan['query_type']): string[] {
    const terms: string[] = [];
    
    // Extract course codes
    const course_codes = user_query.match(/\b[A-Z]{2,4}\s*\d{3,5}\b/g) || [];
    terms.push(...course_codes);
    
    // Extract major/program names
    const programs = ['computer science', 'data science', 'artificial intelligence', 'engineering', 'mathematics'];
    programs.forEach(program => {
      if (user_query.toLowerCase().includes(program)) {
        terms.push(program);
      }
    });
    
    // Extract action words based on query type
    switch (query_type) {
      case 'course_search':
        const course_actions = user_query.match(/\b(prerequisite|corequisite|credit|hours|level)\b/gi) || [];
        terms.push(...course_actions);
        break;
      case 'codo_evaluation':
        const codo_actions = user_query.match(/\b(codo|change|transfer|switch|requirement|gpa|deadline)\b/gi) || [];
        terms.push(...codo_actions);
        break;
      case 'prerequisite_check':
        const prereq_actions = user_query.match(/\b(prerequisite|prereq|before|required|complete)\b/gi) || [];
        terms.push(...prereq_actions);
        break;
    }
    
    return [...new Set(terms)]; // Remove duplicates
  }

  /**
   * Expand query with synonyms and aliases
   */
  private expandQuery(query_plan: QueryPlan): { strict_query: string; relaxed_query: string } {
    const expand_with_synonyms = (query: string): string => {
      let expanded = query;
      
      // Replace aliases
      this.alias_map.forEach((canonical, alias) => {
        const regex = new RegExp(`\\b${alias}\\b`, 'gi');
        expanded = expanded.replace(regex, canonical);
      });
      
      return expanded;
    };
    
    return {
      strict_query: expand_with_synonyms(query_plan.strict_query),
      relaxed_query: expand_with_synonyms(query_plan.relaxed_query)
    };
  }

  /**
   * Execute individual query against knowledge base
   */
  private async executeQuery(
    query: string, 
    plan: QueryPlan, 
    mode: 'strict' | 'relaxed'
  ): Promise<Partial<RetrievalResult>[]> {
    const results: Partial<RetrievalResult>[] = [];
    const query_terms = query.toLowerCase().split(/\s+(?:and|or)\s+/);
    
    // Search courses
    if (plan.expected_result_types.includes('course')) {
      const course_results = this.searchCourses(query_terms, mode);
      results.push(...course_results);
    }
    
    // Search policies
    if (plan.expected_result_types.includes('policy')) {
      const policy_results = this.searchPolicies(query_terms, mode);
      results.push(...policy_results);
    }
    
    return results;
  }

  /**
   * Search courses using BM25-style scoring
   */
  private searchCourses(query_terms: string[], mode: 'strict' | 'relaxed'): Partial<RetrievalResult>[] {
    const results: Partial<RetrievalResult>[] = [];
    
    this.courses.forEach((course, index) => {
      const searchable_text = [
        course.full_course_code,
        course.course_title,
        course.description,
        course.prerequisites,
        course.department_code
      ].join(' ').toLowerCase();
      
      let score = 0;
      let matched_terms = 0;
      
      query_terms.forEach(term => {
        if (searchable_text.includes(term.toLowerCase())) {
          matched_terms++;
          // Count term frequency
          const term_freq = (searchable_text.match(new RegExp(term.toLowerCase(), 'g')) || []).length;
          score += Math.log(1 + term_freq);
        }
      });
      
      // For strict mode, require higher match threshold
      const required_matches = mode === 'strict' ? Math.ceil(query_terms.length * 0.7) : 1;
      
      if (matched_terms >= required_matches && score > 0) {
        results.push({
          id: `course_${index}`,
          type: 'course',
          content: course,
          bm25_score: score,
          elo_score: this.elo_scores.get(`course_${index}`) || 1200, // Default ELO
          final_score: 0, // Will be calculated later
          confidence: matched_terms / query_terms.length
        });
      }
    });
    
    return results;
  }

  /**
   * Search policies using structured matching
   */
  private searchPolicies(query_terms: string[], mode: 'strict' | 'relaxed'): Partial<RetrievalResult>[] {
    const results: Partial<RetrievalResult>[] = [];
    
    Object.entries(this.policies).forEach(([key, policy], index) => {
      const searchable_text = [
        policy.program_name,
        policy.college,
        policy.department,
        JSON.stringify(policy.codo_requirements),
        policy.competitiveness.notes
      ].join(' ').toLowerCase();
      
      let score = 0;
      let matched_terms = 0;
      
      query_terms.forEach(term => {
        if (searchable_text.includes(term.toLowerCase())) {
          matched_terms++;
          const term_freq = (searchable_text.match(new RegExp(term.toLowerCase(), 'g')) || []).length;
          score += Math.log(1 + term_freq);
        }
      });
      
      const required_matches = mode === 'strict' ? Math.ceil(query_terms.length * 0.7) : 1;
      
      if (matched_terms >= required_matches && score > 0) {
        results.push({
          id: `policy_${key}`,
          type: 'policy',
          content: policy,
          bm25_score: score,
          elo_score: this.elo_scores.get(`policy_${key}`) || 1200,
          final_score: 0,
          confidence: matched_terms / query_terms.length
        });
      }
    });
    
    return results;
  }

  /**
   * Merge and deduplicate results from strict and relaxed queries
   */
  private mergeResults(
    strict_results: Partial<RetrievalResult>[], 
    relaxed_results: Partial<RetrievalResult>[]
  ): Partial<RetrievalResult>[] {
    const merged = new Map<string, Partial<RetrievalResult>>();
    
    // Add strict results first (higher priority)
    strict_results.forEach(result => {
      if (result.id) {
        result.bm25_score = (result.bm25_score || 0) * 1.2; // Boost strict results
        merged.set(result.id, result);
      }
    });
    
    // Add relaxed results if not already present
    relaxed_results.forEach(result => {
      if (result.id && !merged.has(result.id)) {
        merged.set(result.id, result);
      }
    });
    
    return Array.from(merged.values());
  }

  /**
   * Calculate BM25 scores for all results
   */
  private calculateBM25Scores(
    results: Partial<RetrievalResult>[], 
    original_query: string
  ): Partial<RetrievalResult>[] {
    const query_terms = original_query.toLowerCase().split(/\s+/);
    const total_docs = results.length;
    
    // Calculate IDF for each term
    const idf_scores = new Map<string, number>();
    query_terms.forEach(term => {
      const docs_with_term = results.filter(result => {
        const content_text = JSON.stringify(result.content || {}).toLowerCase();
        return content_text.includes(term);
      }).length;
      
      if (docs_with_term > 0) {
        idf_scores.set(term, Math.log((total_docs - docs_with_term + 0.5) / (docs_with_term + 0.5)));
      }
    });
    
    // Calculate final BM25 scores
    results.forEach(result => {
      const content_text = JSON.stringify(result.content || {}).toLowerCase();
      const doc_length = content_text.split(/\s+/).length;
      const avg_doc_length = results.reduce((sum, r) => {
        const text = JSON.stringify(r.content || {}).toLowerCase();
        return sum + text.split(/\s+/).length;
      }, 0) / results.length;
      
      let bm25_score = 0;
      const k1 = 1.2;
      const b = 0.75;
      
      query_terms.forEach(term => {
        const term_freq = (content_text.match(new RegExp(term, 'g')) || []).length;
        const idf = idf_scores.get(term) || 0;
        
        const numerator = term_freq * (k1 + 1);
        const denominator = term_freq + k1 * (1 - b + b * (doc_length / avg_doc_length));
        
        bm25_score += idf * (numerator / denominator);
      });
      
      result.bm25_score = bm25_score;
    });
    
    return results;
  }

  /**
   * Apply ELO reranking based on historical performance
   */
  private applyELOReranking(
    results: Partial<RetrievalResult>[], 
    query: string
  ): RetrievalResult[] {
    return results.map(result => {
      const elo_score = result.elo_score || 1200;
      const bm25_score = result.bm25_score || 0;
      
      // Combine BM25 and ELO scores with weighted average
      const final_score = (bm25_score * 0.7) + ((elo_score - 1200) / 400 * 0.3);
      
      return {
        ...result,
        final_score,
        citations: []
      } as RetrievalResult;
    }).sort((a, b) => b.final_score - a.final_score);
  }

  /**
   * Generate citations for results
   */
  private generateCitations(result: RetrievalResult): Citation[] {
    const citations: Citation[] = [];
    
    if (result.type === 'course' && result.content) {
      const course = result.content as Course;
      citations.push({
        source: 'Purdue Course Catalog',
        section: `${course.department_code} Department`,
        url: course.url,
        authority_level: 'official'
      });
    } else if (result.type === 'policy' && result.content) {
      const policy = result.content as CODOPolicy;
      citations.push({
        source: 'Purdue Academic Policies',
        section: `${policy.college} - ${policy.department}`,
        authority_level: 'official'
      });
    }
    
    return citations;
  }

  /**
   * Update ELO scores based on user feedback
   */
  updateELOScore(result_id: string, feedback: 'success' | 'failure' | 'partial', query: string): void {
    const current_elo = this.elo_scores.get(result_id) || 1200;
    
    // Calculate ELO update using standard chess ELO formula
    const K = 32; // K-factor
    const expected_score = 0.5; // Baseline expectation
    
    let actual_score: number;
    switch (feedback) {
      case 'success': actual_score = 1.0; break;
      case 'partial': actual_score = 0.5; break;
      case 'failure': actual_score = 0.0; break;
    }
    
    const new_elo = current_elo + K * (actual_score - expected_score);
    this.elo_scores.set(result_id, Math.max(800, Math.min(2000, new_elo))); // Clamp to reasonable range
    
    // Record the update
    this.query_history.push({
      query_text: query,
      result_id,
      feedback_type: feedback,
      timestamp: new Date()
    });
    
    // Persist ELO scores
    this.saveELOScores();
    
    logger.info('ELO score updated', 'RETRIEVAL', {
      result_id,
      old_elo: current_elo,
      new_elo: this.elo_scores.get(result_id),
      feedback,
      query: query.substring(0, 50)
    });
  }

  /**
   * Initialize synonym mapping for query expansion
   */
  private initializeSynonymMap(): void {
    this.synonym_map.set('cs', ['computer science', 'comp sci']);
    this.synonym_map.set('computer science', ['cs', 'comp sci', 'computing']);
    this.synonym_map.set('math', ['mathematics', 'maths']);
    this.synonym_map.set('mathematics', ['math', 'maths']);
    this.synonym_map.set('calc', ['calculus']);
    this.synonym_map.set('calculus', ['calc']);
    this.synonym_map.set('prereq', ['prerequisite', 'pre-requisite']);
    this.synonym_map.set('prerequisite', ['prereq', 'pre-req']);
    this.synonym_map.set('codo', ['change of degree objective', 'change major', 'transfer']);
    this.synonym_map.set('gpa', ['grade point average', 'grades']);
    this.synonym_map.set('credit', ['credits', 'credit hours', 'hours']);
    this.synonym_map.set('ai', ['artificial intelligence']);
    this.synonym_map.set('artificial intelligence', ['ai']);
    this.synonym_map.set('ds', ['data science']);
    this.synonym_map.set('data science', ['ds', 'data analytics']);
  }

  /**
   * Initialize alias mapping for course codes and terms
   */
  private initializeAliasMap(): void {
    // Common course code aliases
    this.alias_map.set('calc 1', 'MA 16500');
    this.alias_map.set('calc 2', 'MA 16600'); 
    this.alias_map.set('calc 3', 'MA 26100');
    this.alias_map.set('intro to cs', 'CS 18000');
    this.alias_map.set('programming', 'CS 18000');
    this.alias_map.set('data structures', 'CS 25100');
    this.alias_map.set('algorithms', 'CS 38100');
    this.alias_map.set('physics 1', 'PHYS 17200');
    this.alias_map.set('physics 2', 'PHYS 27200');
    this.alias_map.set('chem 1', 'CHM 11500');
    this.alias_map.set('chemistry', 'CHM 11500');
  }

  /**
   * Get synonyms for a query
   */
  private getSynonyms(query: string): string[] {
    const synonyms: string[] = [];
    const query_lower = query.toLowerCase();
    
    this.synonym_map.forEach((synonymList, term) => {
      if (query_lower.includes(term)) {
        synonyms.push(...synonymList);
      }
    });
    
    return [...new Set(synonyms)];
  }

  /**
   * Get aliases for a query
   */
  private getAliases(query: string): string[] {
    const aliases: string[] = [];
    const query_lower = query.toLowerCase();
    
    this.alias_map.forEach((canonical, alias) => {
      if (query_lower.includes(alias)) {
        aliases.push(canonical);
      }
    });
    
    return aliases;
  }

  /**
   * Load ELO scores from localStorage
   */
  private loadELOScores(): void {
    try {
      const stored_scores = localStorage.getItem('boilerai_elo_scores');
      if (stored_scores) {
        const scores_data = JSON.parse(stored_scores);
        this.elo_scores = new Map(Object.entries(scores_data));
        logger.info('ELO scores loaded', 'RETRIEVAL', { count: this.elo_scores.size });
      }
    } catch (error) {
      logger.warn('Failed to load ELO scores', 'RETRIEVAL', error);
    }
  }

  /**
   * Save ELO scores to localStorage
   */
  private saveELOScores(): void {
    try {
      const scores_obj = Object.fromEntries(this.elo_scores);
      localStorage.setItem('boilerai_elo_scores', JSON.stringify(scores_obj));
    } catch (error) {
      logger.error('Failed to save ELO scores', 'RETRIEVAL', error);
    }
  }

  /**
   * Get retrieval statistics for admin dashboard
   */
  getRetrievalStats(): {
    total_queries: number;
    avg_elo_score: number;
    top_performing_results: Array<{ id: string; elo: number; query_count: number }>;
    success_rate: number;
  } {
    const total_queries = this.query_history.length;
    const avg_elo = Array.from(this.elo_scores.values()).reduce((sum, elo) => sum + elo, 0) / this.elo_scores.size || 1200;
    
    const result_performance = new Map<string, { elo: number; query_count: number; success_count: number }>();
    this.query_history.forEach(update => {
      const current = result_performance.get(update.result_id) || { 
        elo: this.elo_scores.get(update.result_id) || 1200, 
        query_count: 0, 
        success_count: 0 
      };
      current.query_count++;
      if (update.feedback_type === 'success') current.success_count++;
      result_performance.set(update.result_id, current);
    });
    
    const top_performing = Array.from(result_performance.entries())
      .map(([id, perf]) => ({ id, elo: perf.elo, query_count: perf.query_count }))
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 10);
    
    const success_count = this.query_history.filter(h => h.feedback_type === 'success').length;
    const success_rate = total_queries > 0 ? success_count / total_queries : 0;
    
    return {
      total_queries,
      avg_elo_score: avg_elo,
      top_performing_results: top_performing,
      success_rate
    };
  }
}

export const enhancedRetrievalService = new EnhancedRetrievalService();
export default enhancedRetrievalService;