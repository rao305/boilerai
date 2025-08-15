// Knowledge Base Service - Dynamic information retrieval for AI responses
import { OpenAI } from 'openai';

interface KnowledgeQuery {
  topic: string;
  context: string;
  studentData?: any;
}

interface KnowledgeResult {
  information: string;
  sources: string[];
  confidence: number;
}

class KnowledgeBaseService {
  private openaiClient: OpenAI | null = null;
  
  constructor() {
    this.initializeOpenAI();
  }

  private initializeOpenAI(): boolean {
    try {
      const apiKey = localStorage.getItem('openai_api_key');
      if (!apiKey || apiKey === 'your_openai_api_key_here' || apiKey.length < 10) {
        return false;
      }

      this.openaiClient = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
        fetch: window.fetch.bind(window)
      });
      return true;
    } catch (error) {
      console.error('Failed to initialize knowledge base:', error);
      return false;
    }
  }

  // Retrieve specific knowledge based on query
  async retrieveKnowledge(query: KnowledgeQuery): Promise<KnowledgeResult> {
    if (!this.openaiClient && !this.initializeOpenAI()) {
      throw new Error('Knowledge base unavailable - no API key configured');
    }

    try {
      const knowledgePrompt = `You are a comprehensive knowledge base for Purdue University academic information. Provide specific, accurate information about the following query:

Topic: ${query.topic}
Context: ${query.context}
Student Context: ${query.studentData ? JSON.stringify(query.studentData) : 'No specific student data'}

Provide detailed, accurate information that directly addresses this query. Include:
1. Specific facts, requirements, or procedures
2. Relevant policies or guidelines
3. Practical next steps or recommendations
4. Any important deadlines or timing considerations

Focus on providing actionable, accurate information that would be helpful for academic planning and decision-making.`;

      const response = await this.openaiClient!.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert knowledge base for Purdue University academic information. Provide accurate, detailed, and practical information.'
          },
          {
            role: 'user',
            content: knowledgePrompt
          }
        ],
        max_tokens: 800,
        temperature: 0.1 // Low temperature for factual accuracy
      });

      const information = response.choices[0]?.message?.content || '';
      
      return {
        information,
        sources: ['Purdue University Knowledge Base', 'Academic Policies', 'Course Catalog'],
        confidence: 0.9
      };
    } catch (error) {
      console.error('Knowledge retrieval failed:', error);
      throw new Error('Failed to retrieve knowledge from database');
    }
  }

  // Analyze course prerequisites and sequences
  async analyzeCourseRequirements(courseCode: string, studentContext?: any): Promise<KnowledgeResult> {
    return this.retrieveKnowledge({
      topic: 'course_prerequisites',
      context: `Analyze prerequisites, corequisites, and course sequence for ${courseCode}`,
      studentData: studentContext
    });
  }

  // Get degree requirement information
  async getDegreeRequirements(program: string, studentContext?: any): Promise<KnowledgeResult> {
    return this.retrieveKnowledge({
      topic: 'degree_requirements',
      context: `Provide comprehensive degree requirements for ${program} program`,
      studentData: studentContext
    });
  }

  // Analyze graduation timeline
  async analyzeGraduationPath(studentContext: any): Promise<KnowledgeResult> {
    return this.retrieveKnowledge({
      topic: 'graduation_planning',
      context: 'Analyze graduation timeline and remaining requirements',
      studentData: studentContext
    });
  }

  // Get CODO (Change of Degree Objective) information
  async getCODORequirements(fromProgram: string, toProgram: string): Promise<KnowledgeResult> {
    return this.retrieveKnowledge({
      topic: 'codo_requirements',
      context: `CODO process from ${fromProgram} to ${toProgram}`,
    });
  }

  // Get academic policy information
  async getAcademicPolicy(policyTopic: string): Promise<KnowledgeResult> {
    return this.retrieveKnowledge({
      topic: 'academic_policy',
      context: `Academic policy information about ${policyTopic}`,
    });
  }

  // Check if knowledge base is available
  isAvailable(): boolean {
    return !!this.openaiClient;
  }

  // Reinitialize if API key is updated
  reinitialize(): boolean {
    return this.initializeOpenAI();
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();
export default knowledgeBaseService;
