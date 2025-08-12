// Simple OpenAI-based chat service that doesn't require external Python services
import { OpenAI } from 'openai';
import { TranscriptData } from '@/types';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

class OpenAIChatService {
  private openaiClient: OpenAI | null = null;
  private transcriptContext: string = '';

  constructor() {
    this.initializeOpenAI();
  }

  private initializeOpenAI(): boolean {
    try {
      const apiKey = localStorage.getItem('openai_api_key');
      if (!apiKey || apiKey === 'your_openai_api_key_here') {
        return false;
      }

      this.openaiClient = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });
      return true;
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error);
      return false;
    }
  }

  async sendMessage(message: string, userId: string): Promise<string> {
    if (!this.openaiClient) {
      const initialized = this.initializeOpenAI();
      if (!initialized) {
        throw new Error('OpenAI API key not configured. Please add your API key in Settings.');
      }
    }

    try {
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `You are an intelligent academic advisor AI for Purdue University students. Generate unique, contextual responses based on each student's specific situation and needs.

Your expertise includes:
- Academic planning and course sequencing
- Degree requirements and prerequisite analysis
- Graduation timeline optimization
- Personalized academic recommendations
- Course selection strategies

${this.transcriptContext ? `\n\nStudent Academic Context:\n${this.transcriptContext}` : ''}

Generate natural, conversational responses that feel personal and helpful. Always provide specific, actionable guidance tailored to the student's actual situation. Avoid generic templates - each response should be thoughtfully crafted for their unique academic journey.`
        },
        {
          role: 'user',
          content: message
        }
      ];

      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4',
        messages: messages,
        max_tokens: 800,
        temperature: 0.7
      });

      const reply = response.choices[0]?.message?.content;
      if (!reply) {
        throw new Error('No response received from AI');
      }

      return reply;
    } catch (error: any) {
      console.error('OpenAI chat error:', error);
      
      if (error.message?.includes('401')) {
        throw new Error('Invalid API key. Please check your OpenAI API key in Settings.');
      } else if (error.message?.includes('429')) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      } else if (error.message?.includes('quota')) {
        throw new Error('API quota exceeded. Please check your OpenAI account billing.');
      } else {
        throw new Error('AI service temporarily unavailable. Please try again.');
      }
    }
  }

  setTranscriptContext(transcriptData: TranscriptData): void {
    try {
      const studentInfo = transcriptData.studentInfo;
      const completedCourses = Object.values(transcriptData.completedCourses || {});
      const totalCourses = completedCourses.reduce((sum, semester) => sum + (semester.courses?.length || 0), 0);
      
      this.transcriptContext = `Student: ${studentInfo.name}
Program: ${studentInfo.program}
College: ${studentInfo.college}
Current GPA: ${transcriptData.gpaSummary.cumulativeGPA}
Total Credits: ${transcriptData.gpaSummary.totalCreditsEarned}
Completed Courses: ${totalCourses}

Recent Courses Completed:
${completedCourses.slice(-2).map(semester => 
  `${semester.semester} ${semester.year}: ${semester.courses?.map(c => c.courseCode).join(', ') || 'None'}`
).join('\n')}`;

      console.log('✅ Transcript context set for AI assistant');
    } catch (error) {
      console.error('Failed to set transcript context:', error);
    }
  }

  isAvailable(): boolean {
    const apiKey = localStorage.getItem('openai_api_key');
    return !!(apiKey && apiKey !== 'your_openai_api_key_here' && apiKey.length > 10);
  }
}

export const openaiChatService = new OpenAIChatService();
export default openaiChatService;