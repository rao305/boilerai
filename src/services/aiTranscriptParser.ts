import { OpenAI } from 'openai';

interface ParsedCourse {
  id: string;
  subject: string;
  courseNumber: string;
  courseCode: string;
  courseTitle: string;
  level: string;
  credits: number;
  grade: string;
  gradePoints: number;
  qualityPoints: number;
  semester: string;
  year: number;
  status: 'completed' | 'in_progress' | 'withdrawn';
  repeatIndicator?: 'R' | 'I' | 'E' | null;
  matchStatus: 'verified' | 'probable' | 'unrecognized';
  matchConfidence: number;
  verified: boolean;
  purdueCourseMatch?: string;
  classification?: 'foundation' | 'math_requirement' | 'general_education' | 'elective' | 'unclassified';
}

interface TranscriptData {
  studentInfo: {
    name: string;
    studentId: string;
    program: string;
    college: string;
    campus: string;
  };
  completedCourses: {
    [semesterKey: string]: {
      semester: string;
      year: number;
      academicStanding: string;
      courses: ParsedCourse[];
      semesterGpa: number;
      semesterCredits: number;
    };
  };
  coursesInProgress: ParsedCourse[];
  gpaSummary: {
    cumulativeGPA: number;
    totalCreditsAttempted: number;
    totalCreditsEarned: number;
    totalQualityPoints: number;
    majorGPA: number;
  };
  uploadDate: Date;
  verificationStatus: 'pending' | 'verified' | 'needs_review';
  aiProvider?: string;
  aiInsights?: any;
}

class AITranscriptParser {
  private openaiClient: OpenAI | null = null;

  constructor() {
    // Initialize with API key if available
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('openai_api_key');
    if (apiKey) {
      this.initializeOpenAI(apiKey);
    }
  }

  initializeOpenAI(apiKey: string): boolean {
    try {
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

  updateApiKey(apiKey: string): boolean {
    this.openaiClient = null;
    return this.initializeOpenAI(apiKey);
  }

  async parseTranscriptWithAI(extractedText: string, apiKey?: string): Promise<any> {
    // Check if API key is valid
    const currentApiKey = apiKey || import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('openai_api_key');
    
    if (!currentApiKey || currentApiKey === 'your_openai_api_key_here' || currentApiKey.length < 10) {
      throw new Error('OpenAI API key is required for transcript processing. Please configure your API key in Settings or use the paste text option for manual entry.');
    }

    if (!this.openaiClient) {
      const success = this.initializeOpenAI(currentApiKey);
      if (!success) {
        throw new Error('Failed to initialize OpenAI client. Please check your API key and try again.');
      }
    }

    try {
      console.log('🤖 Using OpenAI AI for transcript parsing...');
      console.log(`📝 Processing ${extractedText.length} characters`);

      const response = await this.openaiClient.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert academic transcript parser specializing in Purdue University transcripts. Your task is to extract structured data from transcript text with high accuracy. Always return valid JSON with no additional text or explanations."
          },
          {
            role: "user",
            content: `You are an expert academic transcript parser. Analyze this academic transcript carefully and extract ALL available information. Return ONLY valid JSON with this exact structure:

{
  "studentInfo": {
    "name": "Student Name from transcript or 'Unknown' if not found",
    "studentId": "Student ID if found or 'Unknown'",
    "program": "Program/Major or 'Unknown Program'",
    "college": "College/School or 'Unknown College'",
    "campus": "Campus location or 'Unknown Campus'"
  },
  "completedCourses": {
    "semester_year": {
      "semester": "Fall/Spring/Summer/Unknown",
      "year": 2023,
      "academicStanding": "Academic status or 'Unknown'",
      "courses": [
        {
          "id": "unique_course_id",
          "subject": "CS",
          "courseNumber": "18000",
          "courseCode": "CS 18000",
          "courseTitle": "Course Title",
          "level": "Undergraduate",
          "credits": 4.0,
          "grade": "A",
          "gradePoints": 4.0,
          "qualityPoints": 16.0,
          "semester": "Fall",
          "year": 2023,
          "status": "completed",
          "matchStatus": "verified",
          "matchConfidence": 0.95,
          "verified": true,
          "purdueCourseMatch": "CS 18000",
          "classification": "foundation"
        }
      ],
      "semesterGpa": 3.8,
      "semesterCredits": 15
    }
  },
  "coursesInProgress": [],
  "gpaSummary": {
    "cumulativeGPA": 3.75,
    "totalCreditsAttempted": 45,
    "totalCreditsEarned": 45,
    "totalQualityPoints": 168.75,
    "majorGPA": 3.8
  }
}

CRITICAL PARSING INSTRUCTIONS:
1. FIND ALL COURSES: Look for any pattern that indicates courses (course codes, titles, grades, credits)
2. FLEXIBLE PARSING: Transcripts may have various formats - be adaptive
3. EXTRACT EVERYTHING: Even if format is unusual, extract what you can identify
4. COMMON PATTERNS: Look for:
   - Course codes like "CS 18000", "MATH 161", "ENGL 106"
   - Semester/term information
   - Credit hours (usually 1-4 credits)
   - Grades (A, B, C, D, F, or numerical equivalents)
   - GPAs and totals
5. DEFAULT VALUES: Use "Unknown" for missing required fields
6. GRADE POINT VALUES: A=4.0, A-=3.7, B+=3.3, B=3.0, B-=2.7, C+=2.3, C=2.0, C-=1.7, D+=1.3, D=1.0, D-=0.7, F=0.0
7. CLASSIFICATION: Guess reasonable classifications based on course codes
8. SEMESTER KEYS: Use format like "fall_2023", "spring_2024", "summer_2024", or "unknown_term" if unclear

IMPORTANT: Even if the transcript format is non-standard or unclear, extract whatever course information you can identify. Better to have partial data than no data.

TRANSCRIPT TEXT TO ANALYZE:
${extractedText}

Return only the JSON object, no explanations or additional text.`
          }
        ],
        max_tokens: 2500,
        temperature: 0.1
      });

      const aiResponse = response.choices[0].message.content;
      
      if (!aiResponse) {
        throw new Error('Empty response from OpenAI');
      }

      console.log('🔍 Raw AI response length:', aiResponse.length);
      console.log('🔍 AI response preview:', aiResponse.substring(0, 300));

      // Parse JSON response
      let jsonData;
      try {
        // Clean response and extract JSON
        let cleanResponse = aiResponse.trim();
        
        // Remove markdown code blocks
        cleanResponse = cleanResponse.replace(/^```json\s*/i, '');
        cleanResponse = cleanResponse.replace(/```\s*$/, '');
        cleanResponse = cleanResponse.trim();
        
        // Parse the cleaned response
        jsonData = JSON.parse(cleanResponse);
      } catch (parseError) {
        console.log('❌ Direct parse failed, trying extraction...');
        
        // Try to extract JSON from response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON structure found in AI response');
        }
        
        const extractedJson = jsonMatch[0].trim();
        console.log('🔧 Extracted JSON:', extractedJson.substring(0, 300));
        jsonData = JSON.parse(extractedJson);
      }

      // Validate response
      this.validateAIResponse(jsonData);

      // Log parsing results
      const courseCount = Object.keys(jsonData.completedCourses || {}).length;
      const totalCourses = Object.values(jsonData.completedCourses || {}).reduce((sum, semester: any) => {
        return sum + (semester.courses ? semester.courses.length : 0);
      }, 0);
      
      console.log(`✅ Successfully parsed transcript with OpenAI:`);
      console.log(`   - Student: ${jsonData.studentInfo?.name || 'Unknown'}`);
      console.log(`   - Program: ${jsonData.studentInfo?.program || 'Unknown'}`);
      console.log(`   - Semesters: ${courseCount}`);
      console.log(`   - Total Courses: ${totalCourses}`);
      console.log(`   - In Progress: ${jsonData.coursesInProgress?.length || 0}`);
      console.log(`   - GPA: ${jsonData.gpaSummary?.cumulativeGPA || 'Unknown'}`);

      return jsonData;

    } catch (error) {
      console.error('❌ OpenAI transcript parsing failed:', error);
      
      // Provide specific error messages without fallback
      if (error.message.includes('401') || error.message.includes('authentication')) {
        throw new Error('OpenAI API authentication failed. Please check your API key in Settings.');
      } else if (error.message.includes('429')) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      } else if (error.message.includes('insufficient_quota')) {
        throw new Error('OpenAI API quota exceeded. Please check your account billing or try the paste text option.');
      } else {
        throw new Error(`AI processing failed: ${error.message}. Please try the paste text option or check your API key.`);
      }
    }
  }

  validateAIResponse(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new Error('AI returned invalid data structure');
    }

    // Ensure basic structure exists
    if (!data.studentInfo) {
      data.studentInfo = {
        name: 'Unknown',
        studentId: 'Unknown',
        program: 'Unknown Program', 
        college: 'Unknown College',
        campus: 'Unknown Campus'
      };
      console.warn('⚠️ Missing student info, using defaults');
    }

    if (!data.gpaSummary) {
      data.gpaSummary = {
        cumulativeGPA: 0,
        totalCreditsAttempted: 0,
        totalCreditsEarned: 0,
        totalQualityPoints: 0,
        majorGPA: 0
      };
      console.warn('⚠️ Missing GPA summary, using defaults');
    }

    // Ensure completedCourses exists as an object
    if (!data.completedCourses || typeof data.completedCourses !== 'object') {
      data.completedCourses = {};
      console.warn('⚠️ Missing completed courses, initializing empty object');
    }

    // Ensure coursesInProgress exists as an array
    if (!data.coursesInProgress || !Array.isArray(data.coursesInProgress)) {
      data.coursesInProgress = [];
      console.warn('⚠️ Missing courses in progress, initializing empty array');
    }

    // Check for courses
    const hasCompleted = Object.keys(data.completedCourses).length > 0;
    const hasInProgress = data.coursesInProgress.length > 0;
    
    if (!hasCompleted && !hasInProgress) {
      console.warn('⚠️ Warning: No courses found in transcript parsing - this might indicate parsing issues or an empty transcript');
    }

    console.log('✅ Data validation completed successfully');
  }

  async processTranscriptFile(file: File, apiKey?: string): Promise<TranscriptData> {
    try {
      console.log('📄 Processing transcript file:', file.name);
      
      // Extract text from file
      const extractedText = await this.extractTextFromFile(file);
      
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text could be extracted from the file');
      }
      
      // Parse with AI
      const aiParsedData = await this.parseTranscriptWithAI(extractedText, apiKey);
      
      // Convert to internal format
      const transcriptData: TranscriptData = {
        studentInfo: {
          name: aiParsedData.studentInfo?.name || 'Unknown Student',
          studentId: aiParsedData.studentInfo?.studentId || '',
          program: aiParsedData.studentInfo?.program || 'Unknown Program',
          college: aiParsedData.studentInfo?.college || 'Unknown College',
          campus: aiParsedData.studentInfo?.campus || 'West Lafayette'
        },
        completedCourses: aiParsedData.completedCourses || {},
        coursesInProgress: aiParsedData.coursesInProgress || [],
        gpaSummary: {
          cumulativeGPA: aiParsedData.gpaSummary?.cumulativeGPA || 0.0,
          totalCreditsAttempted: aiParsedData.gpaSummary?.totalCreditsAttempted || 0,
          totalCreditsEarned: aiParsedData.gpaSummary?.totalCreditsEarned || 0,
          totalQualityPoints: aiParsedData.gpaSummary?.totalQualityPoints || 0,
          majorGPA: aiParsedData.gpaSummary?.majorGPA || 0.0
        },
        uploadDate: new Date(),
        verificationStatus: 'pending',
        aiProvider: 'openai'
      };
      
      console.log('✅ Transcript processing completed successfully');
      return transcriptData;
      
    } catch (error) {
      console.error('❌ Error processing transcript:', error);
      throw new Error(`Failed to process transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractTextFromFile(file: File): Promise<string> {
    console.log(`📄 Extracting text from ${file.type} file: ${file.name}`);
    
    // Handle plain text files
    if (file.type === 'text/plain') {
      const text = await file.text();
      console.log(`✅ Extracted ${text.length} characters from text file`);
      return text;
    }
    
    // Handle PDF files using enhanced extraction from the legacy parser
    if (file.type === 'application/pdf') {
      try {
        console.log('🔧 Starting PDF text extraction...');
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Convert to string for PDF structure analysis
        const pdfString = Array.from(uint8Array).map(byte => String.fromCharCode(byte)).join('');
        
        // Look for PDF text objects and streams
        let extractedText = '';
        
        // Method 1: Extract from text objects (BT...ET blocks)
        const textObjectRegex = /BT\s*(.*?)\s*ET/gs;
        let textMatch;
        
        console.log('🔍 Method 1: Extracting from PDF text objects...');
        while ((textMatch = textObjectRegex.exec(pdfString)) !== null) {
          const textContent = textMatch[1];
          
          // Look for text strings in parentheses or brackets
          const textStrings = textContent.match(/\((.*?)\)/g) || [];
          textStrings.forEach(str => {
            const cleanText = str.slice(1, -1) // Remove parentheses
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '\r')
              .replace(/\\t/g, '\t')
              .replace(/\\\(/g, '(')
              .replace(/\\\)/g, ')')
              .replace(/\\\\/g, '\\');
            extractedText += cleanText + ' ';
          });
        }
        
        // Method 2: Fallback - scan for readable ASCII sequences
        if (extractedText.length < 100) {
          console.log('🔍 Method 2: Fallback ASCII extraction...');
          let asciiText = '';
          let consecutiveReadable = 0;
          
          for (let i = 0; i < uint8Array.length; i++) {
            const byte = uint8Array[i];
            
            // Check if it's a printable ASCII character or whitespace
            if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
              asciiText += String.fromCharCode(byte);
              consecutiveReadable++;
            } else {
              // If we've collected enough consecutive readable chars, it's likely text
              if (consecutiveReadable >= 3) {
                extractedText += asciiText + ' ';
              }
              asciiText = '';
              consecutiveReadable = 0;
            }
          }
          
          // Add remaining text if it's substantial
          if (consecutiveReadable >= 3) {
            extractedText += asciiText;
          }
        }
        
        // Clean up the extracted text
        extractedText = extractedText
          .replace(/\s+/g, ' ') // Normalize spaces
          .replace(/([a-z])([A-Z])/g, '$1 $2') // Add spaces between camelCase
          .replace(/(\d)([A-Z])/g, '$1 $2') // Add spaces between numbers and letters
          .replace(/([A-Z])(\d)/g, '$1 $2') // Add spaces between letters and numbers
          .replace(/\s+/g, ' ') // Normalize spaces again
          .trim();
        
        console.log(`✅ Extracted ${extractedText.length} characters from PDF`);
        
        // Enhanced validation for transcript content
        const transcriptIndicators = [
          /purdue/i,
          /transcript/i,
          /student\s+information/i,
          /institution\s+credit/i,
          /course.*progress/i,
          /[A-Z]{2,5}\s+\d{5}/, // Course codes like CS 18000
          /period:\s*(fall|spring|summer)/i,
          /gpa/i,
          /credit\s+hours/i
        ];
        
        const matchedIndicators = transcriptIndicators.filter(regex => regex.test(extractedText));
        const confidenceScore = matchedIndicators.length / transcriptIndicators.length;
        
        console.log(`📊 Transcript confidence: ${Math.round(confidenceScore * 100)}% (${matchedIndicators.length}/${transcriptIndicators.length} indicators)`);
        
        // Check if we got meaningful content
        if (extractedText.length < 50) {
          throw new Error('PDF text extraction resulted in very little content. The PDF may be image-based, encrypted, or corrupted. Please try pasting the transcript text directly.');
        }
        
        if (confidenceScore < 0.3) {
          console.warn(`⚠️ Low confidence (${Math.round(confidenceScore * 100)}%) that this is a valid transcript PDF`);
        }
        
        return extractedText;
        
      } catch (error) {
        console.error('❌ PDF text extraction failed:', error);
        throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure the PDF is text-based and not password-protected, or try pasting the transcript text directly.`);
      }
    }
    
    throw new Error(`Unsupported file type: ${file.type}. Please upload a PDF or text file, or paste transcript text directly.`);
  }

  // Method to parse direct text input (no file upload)
  async parseTranscriptText(transcriptText: string, apiKey?: string): Promise<TranscriptData> {
    try {
      console.log('📝 Processing transcript text directly...');
      
      const aiParsedData = await this.parseTranscriptWithAI(transcriptText, apiKey);
      
      const transcriptData: TranscriptData = {
        studentInfo: {
          name: aiParsedData.studentInfo?.name || 'Unknown Student',
          studentId: aiParsedData.studentInfo?.studentId || '',
          program: aiParsedData.studentInfo?.program || 'Unknown Program',
          college: aiParsedData.studentInfo?.college || 'Unknown College',
          campus: aiParsedData.studentInfo?.campus || 'West Lafayette'
        },
        completedCourses: aiParsedData.completedCourses || {},
        coursesInProgress: aiParsedData.coursesInProgress || [],
        gpaSummary: {
          cumulativeGPA: aiParsedData.gpaSummary?.cumulativeGPA || 0.0,
          totalCreditsAttempted: aiParsedData.gpaSummary?.totalCreditsAttempted || 0,
          totalCreditsEarned: aiParsedData.gpaSummary?.totalCreditsEarned || 0,
          totalQualityPoints: aiParsedData.gpaSummary?.totalQualityPoints || 0,
          majorGPA: aiParsedData.gpaSummary?.majorGPA || 0.0
        },
        uploadDate: new Date(),
        verificationStatus: 'pending',
        aiProvider: 'openai'
      };
      
      console.log('✅ Text processing completed successfully');
      return transcriptData;
      
    } catch (error) {
      console.error('❌ Error processing transcript text:', error);
      throw new Error(`Failed to process transcript text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Check if AI parsing is available
  isAIAvailable(): boolean {
    return this.openaiClient !== null;
  }

  // Get API key status
  getApiKeyStatus(): { configured: boolean; source?: string } {
    const envKey = import.meta.env.VITE_OPENAI_API_KEY;
    const localKey = localStorage.getItem('openai_api_key');
    
    if (this.openaiClient) {
      return { 
        configured: true, 
        source: envKey ? 'environment' : 'localStorage'
      };
    }
    
    return { configured: false };
  }

  // Offline parsing fallback method
  private async parseTranscriptOffline(extractedText: string): Promise<any> {
    console.log('🔧 Using offline transcript parsing (no AI required)');
    
    try {
      // Import the offline parser from transcriptParser.ts
      const { parseTranscriptOffline } = await import('@/services/transcriptParser');
      const result = parseTranscriptOffline(extractedText);
      
      // Convert to the expected AI format
      return {
        studentInfo: {
          name: result.student_info?.name || 'Unknown Student',
          studentId: result.student_info?.student_id || '',
          program: result.student_info?.program || 'Unknown Program',
          college: result.student_info?.college || 'Unknown College',
          campus: result.student_info?.campus || 'West Lafayette'
        },
        completedCourses: this.convertCompletedCourses(result.completed_courses || []),
        coursesInProgress: this.convertInProgressCourses(result.courses_in_progress || []),
        gpaSummary: {
          cumulativeGPA: result.gpa_summary?.overall_gpa || 0.0,
          totalCreditsAttempted: result.gpa_summary?.total_credits || 0,
          totalCreditsEarned: result.gpa_summary?.total_credits || 0,
          totalQualityPoints: 0,
          majorGPA: result.gpa_summary?.major_gpa || 0.0
        }
      };
    } catch (error) {
      console.error('❌ Offline parsing failed:', error);
      throw new Error(`Offline parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper method to convert completed courses format
  private convertCompletedCourses(courses: any[]): any {
    const semesterGroups: any = {};
    
    courses.forEach((course: any) => {
      const semesterKey = `${course.semester?.toLowerCase() || 'unknown'}_${course.year || 2024}`;
      
      if (!semesterGroups[semesterKey]) {
        semesterGroups[semesterKey] = {
          semester: course.semester || 'Unknown',
          year: course.year || 2024,
          academicStanding: 'Good Standing',
          courses: [],
          semesterGpa: 0.0,
          semesterCredits: 0
        };
      }
      
      const convertedCourse = {
        id: `${course.course_code?.replace(' ', '_').toLowerCase()}_${semesterKey}`,
        subject: course.course_code?.split(' ')[0] || 'UNK',
        courseNumber: course.course_code?.split(' ')[1] || '000',
        courseCode: course.course_code || 'UNK 000',
        courseTitle: course.title || 'Unknown Course',
        level: 'Undergraduate',
        credits: course.credits || 0,
        grade: course.grade || 'N/A',
        gradePoints: this.getGradePoints(course.grade),
        qualityPoints: (course.credits || 0) * this.getGradePoints(course.grade),
        semester: course.semester || 'Unknown',
        year: course.year || 2024,
        status: 'completed',
        matchStatus: 'verified',
        matchConfidence: 0.8,
        verified: true,
        classification: 'unclassified'
      };
      
      semesterGroups[semesterKey].courses.push(convertedCourse);
    });
    
    return semesterGroups;
  }

  // Helper method to convert in-progress courses format
  private convertInProgressCourses(courses: any[]): any[] {
    return courses.map((course: any) => ({
      id: `${course.course_code?.replace(' ', '_').toLowerCase()}_${course.semester?.toLowerCase()}_${course.year}`,
      subject: course.course_code?.split(' ')[0] || 'UNK',
      courseNumber: course.course_code?.split(' ')[1] || '000',
      courseCode: course.course_code || 'UNK 000',
      courseTitle: course.title || 'Unknown Course',
      level: 'Undergraduate',
      credits: course.credits || 0,
      grade: 'IP',
      gradePoints: 0,
      qualityPoints: 0,
      semester: course.semester || 'Current',
      year: course.year || 2024,
      status: 'in_progress',
      matchStatus: 'verified',
      matchConfidence: 0.8,
      verified: true,
      classification: 'unclassified'
    }));
  }

  // Helper method to get grade points
  private getGradePoints(grade: string): number {
    const gradeMap: { [key: string]: number } = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.7,
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'D-': 0.7,
      'F': 0.0, 'W': 0.0, 'I': 0.0, 'P': 0.0, 'S': 0.0, 'U': 0.0
    };
    return gradeMap[grade] || 0.0;
  }
}

// Export singleton instance
export const aiTranscriptParser = new AITranscriptParser();

// Export types and classes
export { AITranscriptParser, type TranscriptData, type ParsedCourse };

// Main function for backward compatibility
export const parseTranscriptWithAI = async (extractedText: string, apiKey?: string): Promise<any> => {
  return await aiTranscriptParser.parseTranscriptWithAI(extractedText, apiKey);
};

export const processTranscript = async (file: File, apiKey?: string): Promise<TranscriptData> => {
  return await aiTranscriptParser.processTranscriptFile(file, apiKey);
};

export default aiTranscriptParser;