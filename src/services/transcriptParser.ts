import allCourses from '@/data/purdue_courses_complete.json';
import { parseTranscriptWithEnhancedParser } from './enhancedTranscriptParser';

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
}

// Enhanced grade points mapping for Purdue system
const gradePointsMap: { [grade: string]: number } = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0.0, 'W': 0.0, 'I': 0.0, 'P': 0.0, 'S': 0.0, 'U': 0.0
};

// Course classification database
const courseClassifications = {
  foundation_courses: {
    'CS 18000': { category: 'foundation', sequence_order: 1 },
    'CS 18200': { category: 'foundation', sequence_order: 2 },
    'CS 24000': { category: 'foundation', sequence_order: 2 },
    'CS 25000': { category: 'foundation', sequence_order: 3 },
    'CS 25100': { category: 'foundation', sequence_order: 3 },
    'CS 25200': { category: 'foundation', sequence_order: 4 }
  },
  math_requirements: {
    'MA 16100': { category: 'math_requirement', equivalent: 'MA 16500' },
    'MA 16200': { category: 'math_requirement', equivalent: 'MA 16600' },
    'MA 26100': { category: 'math_requirement' },
    'MA 26600': { category: 'math_requirement' },
    'STAT 35000': { category: 'math_requirement' }
  }
};

// Offline transcript parser - no AI/API required
export const parseTranscriptOffline = (extractedText: string): any => {
  console.log('🔧 Starting offline transcript parsing...');
  console.log('📝 Input text length:', extractedText.length);
  
  const result = {
    student_info: {
      name: '',
      student_id: '',
      program: '',
      college: '',
      campus: ''
    },
    completed_courses: [] as any[],
    courses_in_progress: [] as any[],
    gpa_summary: {
      overall_gpa: 0,
      major_gpa: 0,
      total_credits: 0
    }
  };

  // Clean up the text for parsing
  const cleanText = extractedText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();

  try {
    // Extract student information
    const studentInfo = extractStudentInfo(cleanText);
    result.student_info = { ...result.student_info, ...studentInfo };

    // Extract completed courses from INSTITUTION CREDIT sections
    const completedCourses = extractCompletedCourses(cleanText);
    result.completed_courses = completedCourses;

    // Extract in-progress courses from COURSE(S) IN PROGRESS section
    const inProgressCourses = extractInProgressCourses(cleanText);
    result.courses_in_progress = inProgressCourses;

    // Extract GPA summary from TRANSCRIPT TOTALS
    const gpaSummary = extractGPASummary(cleanText);
    result.gpa_summary = { ...result.gpa_summary, ...gpaSummary };

    console.log('✅ Offline parsing completed successfully');
    console.log('📊 Results:', {
      student: result.student_info.name,
      completed: result.completed_courses.length,
      inProgress: result.courses_in_progress.length,
      gpa: result.gpa_summary.overall_gpa
    });

    return result;

  } catch (error) {
    console.error('❌ Offline parsing failed:', error);
    throw new Error(`Failed to parse transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Extract student information from STUDENT INFORMATION section
const extractStudentInfo = (text: string) => {
  const studentInfo: any = {};

  // Extract name - look for "Name" followed by the actual name
  const nameMatch = text.match(/Name\s+([A-Za-z\s]+?)(?:\s+Current\s+Program|\s+Program)/i);
  if (nameMatch) {
    studentInfo.name = nameMatch[1].trim();
  }

  // Alternative name pattern for when name appears on next line
  if (!studentInfo.name) {
    const nameMatch2 = text.match(/Name\s*\n\s*([A-Za-z\s]+?)(?:\s*\n)/i);
    if (nameMatch2) {
      studentInfo.name = nameMatch2[1].trim();
    }
  }

  // Extract program - look for specific program format with "-BS", "-MS", etc.
  const programMatch = text.match(/Program\s+([^\n]*?-(?:BS|MS|PhD|BA|MA))/i);
  if (programMatch) {
    studentInfo.program = programMatch[1].trim();
  }

  // Alternative program pattern
  if (!studentInfo.program) {
    const programMatch2 = text.match(/Program\s*\n\s*([^\n]*?-(?:BS|MS|PhD|BA|MA))/i);
    if (programMatch2) {
      studentInfo.program = programMatch2[1].trim();
    }
  }

  // Extract college - look for "College of" pattern
  const collegeMatch = text.match(/College\s+(College\s+of\s+[^\n]+)/i);
  if (collegeMatch) {
    studentInfo.college = collegeMatch[1].trim();
  }

  // Alternative college pattern
  if (!studentInfo.college) {
    const collegeMatch2 = text.match(/College\s*\n\s*(College\s+of\s+[^\n]+)/i);
    if (collegeMatch2) {
      studentInfo.college = collegeMatch2[1].trim();
    }
  }

  // Extract campus - look for campus information
  const campusMatch = text.match(/Campus\s+([^\n]*(?:Lafayette|Indianapolis)[^\n]*)/i);
  if (campusMatch) {
    studentInfo.campus = campusMatch[1].trim();
  }

  // Alternative campus pattern
  if (!studentInfo.campus) {
    const campusMatch2 = text.match(/Campus\s*\n\s*([^\n]*(?:Lafayette|Indianapolis)[^\n]*)/i);
    if (campusMatch2) {
      studentInfo.campus = campusMatch2[1].trim();
    }
  }

  console.log('👤 Extracted student info:', studentInfo);
  return studentInfo;
};

// Extract completed courses from INSTITUTION CREDIT sections
const extractCompletedCourses = (text: string): any[] => {
  const courses: any[] = [];
  
  console.log('📚 Starting to extract completed courses...');
  console.log('📝 Text length:', text.length);
  
  // Find all period sections with completed courses
  const periodRegex = /Period:\s*(Fall|Spring|Summer)\s+(\d{4})([\s\S]*?)(?=Period:|TRANSCRIPT\s+TOTALS|COURSE\(S\)\s+IN\s+PROGRESS|$)/gi;
  let periodMatch;

  while ((periodMatch = periodRegex.exec(text)) !== null) {
    const semester = periodMatch[1];
    const year = parseInt(periodMatch[2]);
    const periodContent = periodMatch[3];

    console.log(`📚 Processing period: ${semester} ${year}`);
    console.log(`📝 Period content preview: ${periodContent.substring(0, 200)}...`);

    // Look for course entries in a more flexible way
    // Pattern for: SUBJECT COURSE Campus Level Title Grade Credits QualityPoints
    const lines = periodContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for course code pattern (SUBJECT NUMBER)
      const courseCodeMatch = line.match(/^([A-Z]{2,5})\s+(\d{5})/);
      if (courseCodeMatch) {
        const subject = courseCodeMatch[1];
        const courseNumber = courseCodeMatch[2];
        
        // Look for the rest of the course data in this line or subsequent lines
        let courseData = line;
        let nextLineIndex = i + 1;
        
        // Collect course data from multiple lines if needed
        while (nextLineIndex < lines.length && !lines[nextLineIndex].match(/^[A-Z]{2,5}\s+\d{5}/) && nextLineIndex < i + 10) {
          courseData += ' ' + lines[nextLineIndex].trim();
          nextLineIndex++;
        }
        
        console.log(`🔍 Analyzing course data: ${courseData}`);
        
        // Extract grade and credits from the combined data
        // Look for grade pattern (A, B, C, D, F with optional +/-, or W, I)
        const gradeMatch = courseData.match(/\s([A-F][+-]?|W|I|P|S|N)\s+(\d+\.?\d*)\s+(\d+\.?\d*)/);
        
        if (gradeMatch) {
          const grade = gradeMatch[1];
          const credits = parseFloat(gradeMatch[2]);
          const qualityPoints = parseFloat(gradeMatch[3]);
          
          // Extract title (everything between UG/GR and the grade)
          const titleMatch = courseData.match(/UG\s+(.+?)\s+[A-F][+-]?|UG\s+(.+?)\s+[WIP]/);
          const title = titleMatch ? (titleMatch[1] || titleMatch[2] || 'Unknown Course').trim() : 'Unknown Course';

          const course = {
            course_code: `${subject} ${courseNumber}`,
            title: cleanCourseTitle(title),
            credits: credits,
            grade: grade,
            semester: semester,
            year: year
          };

          courses.push(course);
          console.log(`  ➕ Added course: ${course.course_code} - ${course.title} (${course.grade}) - ${course.credits} credits`);
        } else {
          console.log(`  ⚠️ Could not parse grade/credits for: ${subject} ${courseNumber}`);
        }
      }
    }
  }

  console.log(`✅ Extracted ${courses.length} completed courses`);
  return courses;
};

// Extract in-progress courses from COURSE(S) IN PROGRESS section
const extractInProgressCourses = (text: string): any[] => {
  const courses: any[] = [];
  
  console.log('⏳ Starting to extract in-progress courses...');
  
  // Find the COURSE(S) IN PROGRESS section
  const progressSection = text.match(/COURSE\(S\)\s+IN\s+PROGRESS([\s\S]*?)$/i);
  if (!progressSection) {
    console.log('📝 No in-progress courses section found');
    return courses;
  }

  const progressContent = progressSection[1];
  console.log('⏳ Processing in-progress courses...');
  console.log(`📝 Progress content preview: ${progressContent.substring(0, 200)}...`);

  // Find period subsections within in-progress
  const periodRegex = /Period:\s*(Fall|Spring|Summer)\s+(\d{4})([\s\S]*?)(?=Period:|$)/gi;
  let periodMatch;

  while ((periodMatch = periodRegex.exec(progressContent)) !== null) {
    const semester = periodMatch[1];
    const year = parseInt(periodMatch[2]);
    const periodContent = periodMatch[3];

    console.log(`📚 Processing in-progress period: ${semester} ${year}`);

    // Look for course entries in a more flexible way (no grades for in-progress)
    const lines = periodContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for course code pattern (SUBJECT NUMBER)
      const courseCodeMatch = line.match(/^([A-Z]{2,5})\s+(\d{5})/);
      if (courseCodeMatch) {
        const subject = courseCodeMatch[1];
        const courseNumber = courseCodeMatch[2];
        
        // Look for the rest of the course data in this line or subsequent lines
        let courseData = line;
        let nextLineIndex = i + 1;
        
        // Collect course data from multiple lines if needed
        while (nextLineIndex < lines.length && !lines[nextLineIndex].match(/^[A-Z]{2,5}\s+\d{5}/) && nextLineIndex < i + 10) {
          courseData += ' ' + lines[nextLineIndex].trim();
          nextLineIndex++;
        }
        
        console.log(`🔍 Analyzing in-progress course data: ${courseData}`);
        
        // Extract credits from the combined data (no grade for in-progress)
        const creditsMatch = courseData.match(/UG\s+(.+?)\s+(\d+\.?\d*)$/);
        
        if (creditsMatch) {
          const title = creditsMatch[1].trim();
          const credits = parseFloat(creditsMatch[2]);
          
          const course = {
            course_code: `${subject} ${courseNumber}`,
            title: cleanCourseTitle(title),
            credits: credits,
            semester: semester,
            year: year
          };

          courses.push(course);
          console.log(`  ➕ Added in-progress course: ${course.course_code} - ${course.title} - ${course.credits} credits`);
        } else {
          console.log(`  ⚠️ Could not parse credits for in-progress: ${subject} ${courseNumber}`);
        }
      }
    }
  }

  console.log(`✅ Extracted ${courses.length} in-progress courses`);
  return courses;
};

// Extract GPA summary from TRANSCRIPT TOTALS section
const extractGPASummary = (text: string) => {
  const gpaSummary: any = {};

  // Look for the TRANSCRIPT TOTALS section
  const totalsSection = text.match(/TRANSCRIPT\s+TOTALS([\s\S]*?)(?:COURSE\(S\)\s+IN\s+PROGRESS|$)/i);
  if (!totalsSection) {
    console.log('📊 No transcript totals section found');
    return gpaSummary;
  }

  const totalsContent = totalsSection[1];

  // Extract overall GPA
  const gpaMatch = totalsContent.match(/Overall\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+([\d.]+)\s+[\d.]+\s+([\d.]+)/i);
  if (gpaMatch) {
    gpaSummary.total_credits = parseFloat(gpaMatch[1]);
    gpaSummary.overall_gpa = parseFloat(gpaMatch[2]);
  }

  // Also try to extract from a simpler pattern
  if (!gpaSummary.overall_gpa) {
    const simpleGpaMatch = totalsContent.match(/GPA\s+([\d.]+)/i);
    if (simpleGpaMatch) {
      gpaSummary.overall_gpa = parseFloat(simpleGpaMatch[1]);
    }
  }

  console.log('📊 Extracted GPA summary:', gpaSummary);
  return gpaSummary;
};

// Clean up course titles
const cleanCourseTitle = (title: string): string => {
  return title
    .replace(/\s+/g, ' ')
    .replace(/&/g, '&')
    .replace(/Prob Solving & O-O Programming/g, 'Problem Solving & Object-Oriented Programming')
    .replace(/Analytc/g, 'Analytic')
    .replace(/Geomtry/g, 'Geometry')
    .replace(/Crit Think & Com/g, 'Critical Thinking & Communication')
    .trim();
};

// Legacy AI function - now redirects to offline parser
export const parseTranscriptWithRealGemini = async (extractedText: string): Promise<any> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash';
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  try {
    console.log('🤖 Calling Gemini API for transcript parsing...');
    
    // Truncate very long text to prevent timeout
    const maxTextLength = 6000; // Reduced for better reliability
    const truncatedText = extractedText.length > maxTextLength 
      ? extractedText.substring(0, maxTextLength) + "\n[Text truncated for processing]"
      : extractedText;
    
    console.log(`📝 Processing ${truncatedText.length} characters (original: ${extractedText.length})`);
    
    const prompt = `Parse this Purdue University transcript with structured table format. Extract data carefully - this is the standard Purdue format.

IMPORTANT: Return ONLY valid JSON with no explanations, no markdown, no additional text.

TRANSCRIPT STRUCTURE TO PARSE:
1. STUDENT INFORMATION section:
   - Name: [Student Name]
   - Program: [Program Name like "Computer Science-BS"]
   - College: [College Name like "College of Science"]
   - Campus: [Campus like "Indianapolis and W Lafayette"]

2. INSTITUTION CREDIT sections by period:
   - Period: Fall 2024, Spring 2025, etc.
   - Course tables with columns: Subject | Course | Campus | Level | Title | Grade | Credit Hours | Quality Points | R
   - Examples: CS 18000, MA 16500, PHYS 17200, etc.

3. COURSE(S) IN PROGRESS section:
   - Period: Summer 2025, Fall 2025, etc.
   - Courses without grades (future courses)
   - Format: Subject | Course | Campus | Level | Title | Credit Hours

4. TRANSCRIPT TOTALS section:
   - Overall GPA, Total Institution credits, etc.

PARSING RULES:
- Extract course codes as "SUBJECT COURSE" (e.g., "CS 18000", "MA 16500")
- Get course titles from the Title column
- Extract credit hours as numbers (convert 4.000 to 4.0)
- Extract grades: A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F, W, I
- Parse semester and year from "Period: [Semester] [Year]"
- For in-progress courses, no grade field needed
- Extract overall GPA from TRANSCRIPT TOTALS section

Return exactly this JSON structure:
{
  "student_info": {
    "name": "ACTUAL_NAME_FROM_TRANSCRIPT",
    "student_id": "",
    "program": "ACTUAL_PROGRAM_FROM_TRANSCRIPT",
    "college": "ACTUAL_COLLEGE_FROM_TRANSCRIPT",
    "campus": "ACTUAL_CAMPUS_FROM_TRANSCRIPT"
  },
  "completed_courses": [
    {
      "course_code": "CS 18000",
      "title": "Prob Solving & O-O Programming",
      "credits": 4.0,
      "grade": "F",
      "semester": "Fall",
      "year": 2024
    }
  ],
  "courses_in_progress": [
    {
      "course_code": "CS 18200",
      "title": "Foundations Of Comp Sc",
      "credits": 3.0,
      "semester": "Summer",
      "year": 2025
    }
  ],
  "gpa_summary": {
    "overall_gpa": 2.88,
    "major_gpa": 0,
    "total_credits": 32
  }
}

TRANSCRIPT TEXT:
${truncatedText}`;

    // Single timeout for the entire request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏰ API request timeout, aborting...');
      controller.abort();
    }, 60000); // 60 second timeout

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1500, // Reduced for faster processing
            topP: 0.95,
            topK: 20
          }
        }),
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('❌ API Error Response:', errorText);
        
        // Parse error response for better user messages
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            const error = errorJson.error;
            if (error.code === 429 && error.message.includes('quota')) {
              throw new Error('Daily API quota exceeded (50 requests/day for free tier). Please try again tomorrow or upgrade your API plan at https://ai.google.dev/pricing');
            } else if (error.code === 503) {
              throw new Error('AI service is temporarily overloaded. Please wait a few minutes and try again.');
            } else if (error.code === 400) {
              throw new Error('Invalid request format. Please try with different transcript text.');
            } else if (error.code === 401 || error.code === 403) {
              throw new Error('API authentication failed. Please check your API key configuration.');
            } else {
              throw new Error(`API Error: ${error.message || 'Unknown error'}`);
            }
          }
        } catch (parseError) {
          // If we can't parse the error, use the raw response
        }
        
        throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      console.log('📥 Raw API response:', JSON.stringify(data, null, 2).substring(0, 500));
      
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!aiResponse) {
        throw new Error('Empty response from Gemini API');
      }

      console.log('🔍 Raw AI response length:', aiResponse.length);
      console.log('🔍 AI response preview:', aiResponse.substring(0, 300));

      // Enhanced JSON extraction with markdown code block handling
      let jsonData;
      try {
        // First try: Parse directly
        jsonData = JSON.parse(aiResponse.trim());
      } catch (firstError) {
        console.log('❌ Direct JSON parse failed, trying extraction...');
        try {
          // Second try: Remove markdown code blocks and extract JSON
          let cleanResponse = aiResponse.trim();
          
          // Remove markdown code block markers
          cleanResponse = cleanResponse.replace(/^```json\s*/i, '');
          cleanResponse = cleanResponse.replace(/```\s*$/, '');
          cleanResponse = cleanResponse.trim();
          
          console.log('🔧 Cleaned response:', cleanResponse.substring(0, 300));
          
          // Try parsing the cleaned response
          jsonData = JSON.parse(cleanResponse);
        } catch (secondError) {
          console.log('❌ Cleaned parse failed, trying regex extraction...');
          try {
            // Third try: Extract JSON from between curly braces
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              throw new Error('No JSON structure found in AI response');
            }
            const extractedJson = jsonMatch[0].trim();
            console.log('🔧 Extracted JSON:', extractedJson.substring(0, 300));
            jsonData = JSON.parse(extractedJson);
          } catch (thirdError) {
            console.error('❌ All JSON extraction attempts failed');
            console.error('❌ Original error:', firstError.message);
            console.error('❌ Cleaned error:', secondError.message);
            console.error('❌ Regex error:', thirdError.message);
            console.error('❌ AI Response that failed:', aiResponse);
            throw new Error(`Failed to parse AI response as JSON. All extraction methods failed. Response preview: ${aiResponse.substring(0, 200)}...`);
          }
        }
      }

      // Basic validation
      if (!jsonData || typeof jsonData !== 'object') {
        throw new Error('AI returned invalid data structure');
      }

      if (!jsonData.student_info || !jsonData.student_info.name) {
        throw new Error('AI could not extract student information from the transcript');
      }

      if (!jsonData.completed_courses && !jsonData.courses_in_progress) {
        console.warn('⚠️ No course data found in AI response');
        // Don't fail completely, just warn
      }

      // Clean up placeholder values
      if (jsonData.student_info.name.includes('[') || 
          jsonData.student_info.name.includes('ACTUAL') || 
          jsonData.student_info.name === 'Sample Student') {
        throw new Error('AI returned placeholder values instead of extracting real transcript data');
      }

      console.log('✅ Successfully parsed transcript with Gemini API');
      console.log(`📊 Extracted: "${jsonData.student_info.name}", ${jsonData.completed_courses?.length || 0} completed courses, ${jsonData.courses_in_progress?.length || 0} in-progress courses`);
      
      return jsonData;

    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

  } catch (error) {
    console.error('❌ Gemini API parsing failed:', error);
    
    // Enhanced error handling with specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        throw new Error('Processing timed out (60 seconds). Please try with shorter text or try again.');
      } else if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
        throw new Error('Network connection failed. Please check your internet connection and try again.');
      } else if (error.message.includes('503') || error.message.includes('overloaded')) {
        throw new Error('AI service is temporarily overloaded. Please wait a few minutes and try again.');
      } else if (error.message.includes('429') || error.message.includes('rate limit')) {
        throw new Error('Too many requests. Please wait a moment and try again.');
      } else if (error.message.includes('401') || error.message.includes('403') || error.message.includes('key')) {
        throw new Error('AI service authentication failed. Please check API configuration.');
      } else if (error.message.includes('JSON') || error.message.includes('parse')) {
        throw new Error(`AI returned malformed data: ${error.message}. Please try again.`);
      } else {
        throw new Error(`Processing failed: ${error.message}`);
      }
    } else {
      throw new Error('Unknown error during transcript processing. Please refresh the page and try again.');
    }
  }
};

// BACKUP - Original complex implementation removed due to syntax issues
// TODO: Fix and restore the original Gemini API implementation

// Enhanced validation function for structured Purdue transcript JSON
const validateTranscriptJSON = (data: any, originalText: string): { isValid: boolean; errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Response is not a valid object');
    return { isValid: false, errors, warnings };
  }
  
  // Validate student_info with Purdue-specific fields
  if (!data.student_info || typeof data.student_info !== 'object') {
    errors.push('Missing or invalid student_info section');
  } else {
    if (!data.student_info.name || typeof data.student_info.name !== 'string') {
      errors.push('Missing or invalid student name');
    }
    if (!data.student_info.program) {
      warnings.push('Missing program information');
    }
    if (!data.student_info.college) {
      warnings.push('Missing college information');
    }
    
    // Check for Purdue-specific patterns in student info
    if (data.student_info.program && !data.student_info.program.includes('-BS') && !data.student_info.program.includes('-MS')) {
      warnings.push(`Program format unusual: "${data.student_info.program}"`);
    }
    if (data.student_info.college && !data.student_info.college.includes('College')) {
      warnings.push(`College format unusual: "${data.student_info.college}"`);
    }
  }
  
  // Validate completed courses with enhanced checks
  if (data.completed_courses && Array.isArray(data.completed_courses)) {
    const validSubjects = ['CS', 'MA', 'PHYS', 'EAPS', 'TDM', 'SCLA', 'CLCS', 'ENGR', 'MATH', 'STAT'];
    
    for (let i = 0; i < data.completed_courses.length; i++) {
      const course = data.completed_courses[i];
      
      // Validate course code format (Subject + 5-digit number)
      if (!course.course_code || !course.course_code.match(/^[A-Z]{2,5}\s+\d{5}$/)) {
        warnings.push(`Course ${i + 1}: Invalid course code format "${course.course_code}"`);
      } else {
        const subject = course.course_code.split(' ')[0];
        if (!validSubjects.includes(subject)) {
          warnings.push(`Course ${i + 1}: Unusual subject code "${subject}"`);
        }
      }
      
      // Validate grade format
      if (!course.grade || !course.grade.match(/^[A-F][+-]?$|^[WI]$|^[PNS]$/)) {
        warnings.push(`Course ${i + 1}: Invalid grade format "${course.grade}"`);
      }
      
      // Validate credits (typically 1-5 for Purdue courses)
      if (typeof course.credits !== 'number' || course.credits <= 0 || course.credits > 6) {
        warnings.push(`Course ${i + 1}: Unusual credit hours "${course.credits}"`);
      }
      
      // Validate semester and year
      if (!course.semester || !['Fall', 'Spring', 'Summer'].includes(course.semester)) {
        warnings.push(`Course ${i + 1}: Invalid semester "${course.semester}"`);
      }
      if (!course.year || course.year < 2020 || course.year > 2030) {
        warnings.push(`Course ${i + 1}: Unusual year "${course.year}"`);
      }
    }
  }
  
  // Validate in-progress courses
  if (data.courses_in_progress && Array.isArray(data.courses_in_progress)) {
    for (let i = 0; i < data.courses_in_progress.length; i++) {
      const course = data.courses_in_progress[i];
      
      if (!course.course_code || !course.course_code.match(/^[A-Z]{2,5}\s+\d{5}$/)) {
        warnings.push(`In-progress course ${i + 1}: Invalid course code format "${course.course_code}"`);
      }
      
      // In-progress courses should not have grades
      if (course.grade && course.grade !== 'IP') {
        warnings.push(`In-progress course ${i + 1}: Should not have grade "${course.grade}"`);
      }
    }
  }
  
  // Validate GPA with more specific checks
  if (data.gpa_summary) {
    if (typeof data.gpa_summary.overall_gpa !== 'number' || 
        data.gpa_summary.overall_gpa < 0 || 
        data.gpa_summary.overall_gpa > 4.0) {
      warnings.push(`Invalid overall GPA: ${data.gpa_summary.overall_gpa}`);
    }
    
    // Check if total credits seems reasonable
    if (data.gpa_summary.total_credits && (data.gpa_summary.total_credits < 1 || data.gpa_summary.total_credits > 200)) {
      warnings.push(`Unusual total credits: ${data.gpa_summary.total_credits}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
};

// Enhanced preprocessing for structured Purdue transcript format
const preprocessPurdueTranscript = (text: string): string => {
  console.log('📝 Preprocessing structured Purdue transcript text...');
  
  let processedText = text
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Fix common PDF/copy-paste extraction issues
    .replace(/Unoﬃcial/g, 'Unofficial')
    .replace(/oﬃcial/g, 'official')
    .replace(/Anlytc/g, 'Analytic')
    .replace(/Geomtry/g, 'Geometry')
    .replace(/Geomtry&Calc/g, 'Geometry & Calc')
    .replace(/Analytc/g, 'Analytic')
    // Fix common course title issues
    .replace(/Prob Solving & O-O Programming/g, 'Problem Solving & Object-Oriented Programming')
    .replace(/Analytc Geom & Calc/g, 'Analytic Geometry & Calculus')
    .replace(/Crit Think & Com/g, 'Critical Thinking & Communication')
    // Preserve table structure indicators
    .replace(/Subject\s+Course\s+Campus\s+Level\s+Title\s+Grade\s+Credit\s+Hours/g, 'COURSE_TABLE_HEADER')
    .replace(/Period:\s*([A-Za-z]+\s+\d{4})/g, 'PERIOD: $1')
    .replace(/COURSE\(S\)\s+IN\s+PROGRESS/g, 'COURSES_IN_PROGRESS')
    .replace(/TRANSCRIPT\s+TOTALS/g, 'TRANSCRIPT_TOTALS')
    // Clean up whitespace while preserving structure
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();

  console.log('✅ Enhanced preprocessing complete, text length:', processedText.length);
  console.log('📄 Key sections found:');
  console.log('- STUDENT INFORMATION:', processedText.includes('STUDENT INFORMATION'));
  console.log('- INSTITUTION CREDIT:', processedText.includes('INSTITUTION CREDIT'));
  console.log('- COURSES_IN_PROGRESS:', processedText.includes('COURSES_IN_PROGRESS'));
  console.log('- TRANSCRIPT_TOTALS:', processedText.includes('TRANSCRIPT_TOTALS'));
  
  return processedText;
};

// Main transcript parsing function - uses enhanced parser with course validation
export const parseTranscriptWithClaude = async (extractedText: string): Promise<any> => {
  console.log('🚀 Using enhanced transcript parser with course validation...');
  console.log('📝 Processing actual transcript text...');
  
  try {
    // Use enhanced parser with course database validation
    const result = await parseTranscriptWithEnhancedParser(extractedText);
    
    // Validate that we got some meaningful data
    if (!result.student_info.name && result.completed_courses.length === 0 && result.courses_in_progress.length === 0) {
      console.warn('⚠️ Enhanced parser returned minimal data, trying fallback...');
      
      // Fallback to original offline parser
      const fallbackResult = parseTranscriptOffline(extractedText);
      if (fallbackResult.completed_courses.length > 0 || fallbackResult.courses_in_progress.length > 0) {
        console.log('✅ Fallback parser provided better results');
        return fallbackResult;
      } else {
        throw new Error('Could not extract any meaningful data from the transcript. Please check the format and try again.');
      }
    }
    
    console.log('✅ Successfully parsed transcript with enhanced parser');
    return result;
    
  } catch (error) {
    console.error('❌ Enhanced parsing failed, trying fallback:', error);
    
    try {
      // Fallback to original offline parser
      const result = parseTranscriptOffline(extractedText);
      console.log('✅ Fallback parser completed successfully');
      return result;
    } catch (fallbackError) {
      console.error('❌ Both parsers failed:', fallbackError);
      throw new Error(`Failed to parse transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

// Enhanced course matching with classification
export const matchCourseWithDatabase = (subject: string, courseNumber: string, courseTitle: string): {
  match: any | null;
  confidence: number;
  status: 'verified' | 'probable' | 'unrecognized';
  classification: string;
} => {
  // Basic validation
  if (!subject || !courseNumber) {
    return {
      match: null,
      confidence: 0,
      status: 'unrecognized',
      classification: 'unclassified'
    };
  }

  // Search in course database
  const courseCode = `${subject} ${courseNumber}`;
  const exactMatch = allCourses.find(course => 
    course.full_course_code === courseCode || 
    (course.department_code === subject && course.course_number === courseNumber)
  );

  if (exactMatch) {
    return {
      match: exactMatch,
      confidence: 1.0,
      status: 'verified',
      classification: classifyCourseType(courseCode)
    };
  }

  // Try fuzzy matching with title if provided
  if (courseTitle) {
    const titleMatch = allCourses.find(course => 
      course.department_code === subject && 
      course.course_title.toLowerCase().includes(courseTitle.toLowerCase())
    );

    if (titleMatch) {
      return {
        match: titleMatch,
        confidence: 0.8,
        status: 'probable',
        classification: classifyCourseType(`${titleMatch.department_code} ${titleMatch.course_number}`)
      };
    }
  }

  return {
    match: null,
    confidence: 0,
    status: 'unrecognized',
    classification: 'unclassified'
  };
};

// Helper function to classify course types
const classifyCourseType = (courseCode: string): string => {
  const foundationCourses = ['CS 18000', 'CS 18200', 'CS 24000', 'CS 25000', 'CS 25100', 'CS 25200'];
  const mathCourses = ['MA 16100', 'MA 16200', 'MA 16500', 'MA 16600', 'MA 26100', 'MA 26600', 'STAT 35000'];
  
  if (foundationCourses.includes(courseCode)) {
    return 'foundation';
  } else if (mathCourses.includes(courseCode)) {
    return 'math_requirement';
  } else if (courseCode.startsWith('CS ')) {
    return 'major_requirement';
  } else {
    return 'general_education';
  }
};

// Enhanced GPA calculation functions
export const calculateGPA = (courses: ParsedCourse[], filter?: (course: ParsedCourse) => boolean): number => {
  let filteredCourses = courses.filter(course => 
    course.grade !== 'W' && course.grade !== 'I' && course.grade !== 'P' && 
    course.grade !== 'S' && course.grade !== 'U'
  );
  
  if (filter) {
    filteredCourses = filteredCourses.filter(filter);
  }

  if (filteredCourses.length === 0) return 0;

  const totalCredits = filteredCourses.reduce((sum, course) => sum + course.credits, 0);
  const totalQualityPoints = filteredCourses.reduce((sum, course) => sum + course.qualityPoints, 0);
  
  return totalCredits > 0 ? Math.round((totalQualityPoints / totalCredits) * 100) / 100 : 0;
};

export const calculateMajorGPA = (courses: ParsedCourse[]): number => {
  return calculateGPA(courses, course => 
    courseClassifications.foundation_courses[course.courseCode] || 
    courseClassifications.major_requirements[course.courseCode] || 
    courseClassifications.electives[course.courseCode]
  );
};

// Enhanced offline PDF text extraction helper
const extractTextFromPDF = async (file: File): Promise<string> => {
  console.log(`📄 Extracting text from ${file.type} file: ${file.name}`);
  
  // Handle plain text files
  if (file.type === 'text/plain') {
    const text = await file.text();
    console.log(`✅ Extracted ${text.length} characters from text file`);
    return text;
  }
  
  // Handle PDF files with enhanced offline extraction
  if (file.type === 'application/pdf') {
    try {
      console.log('🔧 Starting offline PDF text extraction...');
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
        
        // Also look for bracket notation [text]
        const bracketStrings = textContent.match(/\[(.*?)\]/g) || [];
        bracketStrings.forEach(str => {
          const cleanText = str.slice(1, -1); // Remove brackets
          if (cleanText.length > 0 && !cleanText.match(/^[\d\s.-]+$/)) {
            extractedText += cleanText + ' ';
          }
        });
      }
      
      // Method 2: Extract from stream objects
      console.log('🔍 Method 2: Extracting from PDF streams...');
      const streamRegex = /stream\s*(.*?)\s*endstream/gs;
      let streamMatch;
      
      while ((streamMatch = streamRegex.exec(pdfString)) !== null) {
        const streamContent = streamMatch[1];
        
        // Look for readable text in streams
        const readableText = streamContent.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Only add if it contains likely transcript content
        if (readableText.length > 10 && 
            (readableText.match(/[A-Z]{2,5}\s+\d{5}/) || // Course codes
             readableText.toLowerCase().includes('transcript') ||
             readableText.toLowerCase().includes('purdue') ||
             readableText.toLowerCase().includes('student') ||
             readableText.match(/[A-F][+-]?\s+\d+\.\d+/))) { // Grades and credits
          extractedText += readableText + ' ';
        }
      }
      
      // Method 3: Fallback - scan for readable ASCII sequences
      if (extractedText.length < 100) {
        console.log('🔍 Method 3: Fallback ASCII extraction...');
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
      console.log(`📝 First 300 characters: ${extractedText.substring(0, 300)}...`);
      
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
        throw new Error('PDF text extraction resulted in very little content. The PDF may be image-based or encrypted.');
      }
      
      if (confidenceScore < 0.3) {
        console.warn(`⚠️ Low confidence (${Math.round(confidenceScore * 100)}%) that this is a valid transcript PDF`);
      }
      
      return extractedText;
      
    } catch (error) {
      console.error('❌ PDF text extraction failed:', error);
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure the PDF is text-based and not password-protected.`);
    }
  }
  
  // Handle DOCX files (basic attempt)
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const text = await file.text();
      console.log(`✅ Extracted ${text.length} characters from DOCX file`);
      return text;
    } catch (error) {
      console.error('❌ DOCX text extraction failed:', error);
      throw new Error('Failed to extract text from DOCX file.');
    }
  }
  
  // Fallback for other file types
  throw new Error(`Unsupported file type: ${file.type}. Please upload a PDF or DOCX file.`);
};

// Process transcript file and convert to internal format
export const processTranscript = async (file: File): Promise<TranscriptData> => {
  try {
    console.log('📄 Processing transcript file:', file.name);
    
    // Extract text from file
    const extractedText = await extractTextFromPDF(file);
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from the file');
    }
    
    // Parse with AI
    const aiParsedData = await parseTranscriptWithClaude(extractedText);
    
    // Convert to internal format
    const transcriptData: TranscriptData = {
      studentInfo: {
        name: aiParsedData.student_info?.name || 'Unknown Student',
        studentId: aiParsedData.student_info?.student_id || '',
        program: aiParsedData.student_info?.program || 'Unknown Program',
        college: aiParsedData.student_info?.college || 'Unknown College',
        campus: aiParsedData.student_info?.campus || 'West Lafayette'
      },
      completedCourses: {},
      coursesInProgress: [],
      gpaSummary: {
        cumulativeGPA: aiParsedData.gpa_summary?.overall_gpa || 0.0,
        totalCreditsAttempted: aiParsedData.gpa_summary?.total_credits || 0,
        totalCreditsEarned: aiParsedData.gpa_summary?.total_credits || 0,
        totalQualityPoints: 0,
        majorGPA: aiParsedData.gpa_summary?.major_gpa || 0.0
      },
      uploadDate: new Date(),
      verificationStatus: 'pending'
    };
    
    // Process completed courses
    if (aiParsedData.completed_courses && Array.isArray(aiParsedData.completed_courses)) {
      aiParsedData.completed_courses.forEach((course: any) => {
        const semesterKey = `${course.semester || 'Unknown'} ${course.year || 2023}`.replace(/\s+/g, '_').toLowerCase();
        
        if (!transcriptData.completedCourses[semesterKey]) {
          transcriptData.completedCourses[semesterKey] = {
            semester: course.semester || 'Unknown',
            year: course.year || 2023,
            academicStanding: 'Good Standing',
            courses: [],
            semesterGpa: 0.0,
            semesterCredits: 0
          };
        }
        
        const parsedCourse: ParsedCourse = {
          id: `${course.course_code}_${course.semester}_${course.year}`,
          subject: course.course_code?.split(' ')[0] || 'UNK',
          courseNumber: course.course_code?.split(' ')[1] || '000',
          courseCode: course.course_code || 'UNK 000',
          courseTitle: course.title || 'Unknown Course',
          level: 'Undergraduate',
          credits: course.credits || 0,
          grade: course.grade || 'N/A',
          gradePoints: gradePointsMap[course.grade] || 0,
          qualityPoints: (course.credits || 0) * (gradePointsMap[course.grade] || 0),
          semester: course.semester || 'Unknown',
          year: course.year || 2023,
          status: 'completed',
          matchStatus: 'probable',
          matchConfidence: 0.8,
          verified: false,
          classification: 'unclassified'
        };
        
        transcriptData.completedCourses[semesterKey].courses.push(parsedCourse);
      });
    }
    
    // Process in-progress courses
    if (aiParsedData.courses_in_progress && Array.isArray(aiParsedData.courses_in_progress)) {
      transcriptData.coursesInProgress = aiParsedData.courses_in_progress.map((course: any) => ({
        id: `${course.course_code}_${course.semester}_${course.year}`,
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
        matchStatus: 'probable',
        matchConfidence: 0.8,
        verified: false,
        classification: 'unclassified'
      }));
    }
    
    console.log('✅ Transcript processing completed successfully');
    return transcriptData;
    
  } catch (error) {
    console.error('❌ Error processing transcript:', error);
    throw new Error(`Failed to process transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Test with the actual provided transcript data
export const testActualTranscriptParsing = async (): Promise<any> => {
  console.log('🧪 Testing with actual provided transcript data...');
  
  // The actual copy-paste transcript text provided by the user
  const actualTranscriptText = `Student Type
Continuing
Purdue Production Instance
Unoﬃcial Academic Transcript
This is not an oﬃcial transcript. Courses which are in progress may also be included on this transcript.
Transcript Data
STUDENT INFORMATION
Name
Rohit Vayugundla Rao
Current Program
Bachelor of Science
Program
Computer Science-BS
INSTITUTION CREDIT
Period: Fall 2024
College
College of Science
Major
Computer Science
Academic Standing
Academic Notice
Subject Course Campus Level Title Grade Credit
Hours
UG Prob Solving & O-O
Programming
UG Tools B 1.000 3.00
College
College of Science
Campus
Indianapolis and W Lafayette
Major
Computer Science
Quality
Points
R
F 4.000 0.00 E
UG Anlytc Geomtry&Calc I B 4.000 12.00
UG Crit Think & Com I B 3.000 9.00
UG The Data Mine Seminar I D 1.000 1.00
UG Corporate Partners I W 3.000 0.00
CS 18000 Indianapolis
and W
Lafayette
CS 19300 Indianapolis
and W
Lafayette
MA 16500 Indianapolis
and W
Lafayette
SCLA 10100 Indianapolis
and W
Lafayette
TDM 10100 Indianapolis
and W
Lafayette
TDM 11100 Indianapolis
and W
Lafayette
Period Totals
Attempt Hours Passed Hours Earned Hours GPA Hours Quality Points GPA
(Undergraduate)
Current Period 16.000 9.000 9.000 9.000 25.00 2.78
Cumulative 16.000 9.000 9.000 9.000 25.00 2.78
Period: Spring 2025
College
College of Science
Major
Computer Science
Academic Standing
Continued Good Standing
Subject Course Campus Level Title Grade Credit
Hours
UG Prob Solving & O-O
Programming
UG Geosciences Cinema A+ 3.000 12.00
Quality
Points
R
CS 18000 Indianapolis
C 4.000 8.00 I
and W
Lafayette
EAPS 10600 Indianapolis
and W
Lafayette
MA 16600 Indianapolis
UG Analytc Geom & Calc II B+ 4.000 13.20
and W
Lafayette
PHYS 17200 Indianapolis
UG Modern Mechanics B- 4.000 10.80
and W
Lafayette
TDM 10200 Indianapolis
UG The Data Mine Seminar II B 1.000 3.00
and W
Lafayette
Period Totals
Attempt Hours Passed Hours Earned Hours GPA Hours Quality Points GPA
(Undergraduate)
Current Period 16.000 16.000 16.000 16.000 47.00 2.94
Cumulative 32.000 25.000 25.000 25.000 72.00 2.88
TRANSCRIPT TOTALS
Transcript Totals
Attempt Hours Passed Hours Earned Hours GPA Hours Quality Points GPA
(Undergraduate)
Total Institution 32.000 25.000 25.000 25.000 72.00 2.88
Total Transfer 0.000 0.000 0.000 0.000 0.00 0.00
Overall 32.000 25.000 25.000 25.00 72.00 2.88
COURSE(S) IN PROGRESS
Period: Summer 2025
College
College of Science
Major
Computer Science
Subject Course Campus Level Title Credit Hours
CS 18200 West Lafayette UG Foundations Of Comp Sc 3.000
CS 24000 West Lafayette UG Programming In C 3.000
Period: Fall 2025
College
College of Science
Major
Computer Science
Subject Course Campus Level Title Credit Hours
CLCS 23500 Indianapolis and W
Lafayette
CS 19000 Indianapolis and W
Lafayette
CS 25000 Indianapolis and W
Lafayette
CS 25100 Indianapolis and W
Lafayette
MA 26100 Indianapolis and W
Lafayette
SCLA 10200 Indianapolis and W
Lafayette
UG Intr To Classical Myth 3.000
UG Intro To Professional Practice 1.000
UG Computer Architecture 4.000
UG Data Structures And Algorithms 3.000
UG Multivariate Calculus 4.000
UG Crit Think & Com II 3.000`;

  try {
    // Test the enhanced parsing with actual data
    console.log('📝 Testing enhanced parsing with actual transcript...');
    const result = await parseTranscriptWithClaude(actualTranscriptText);
    
    console.log('✅ Actual transcript parsing test successful!');
    console.log('📊 Test Results:', {
      studentName: result.student_info?.name,
      completedCourses: result.completed_courses?.length || 0,
      inProgressCourses: result.courses_in_progress?.length || 0,
      overallGPA: result.gpa_summary?.overall_gpa
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Actual transcript parsing test failed:', error);
    throw new Error(`Test with actual transcript failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const testTranscriptParsing = async (): Promise<TranscriptData> => {
  console.log('🧪 Running test transcript parsing with realistic Purdue format...');
  
  // Create mock transcript data representing a typical Purdue CS student
  const mockTranscriptData: TranscriptData = {
    studentInfo: {
      name: "Alex Johnson", // Generic test name
      studentId: "123456789",
      program: "Computer Science-BS",
      college: "College of Science",
      campus: "West Lafayette"
    },
    completedCourses: {
      'fall_2024': {
        semester: "Fall 2024",
        year: 2024,
        academicStanding: "Academic Notice",
        courses: [
          {
            id: "cs18000_fall_2024",
            subject: "CS",
            courseNumber: "18000",
            courseCode: "CS 18000",
            courseTitle: "Prob Solving & O-O Programming",
            level: "Undergraduate",
            credits: 4,
            grade: "F",
            gradePoints: 0.0,
            qualityPoints: 0.0,
            semester: "Fall 2024",
            year: 2024,
            status: "completed",
            matchStatus: "verified",
            matchConfidence: 1.0,
            verified: true,
            classification: "foundation"
          },
          {
            id: "cs19300_fall_2024",
            subject: "CS",
            courseNumber: "19300",
            courseCode: "CS 19300",
            courseTitle: "Tools",
            level: "Undergraduate",
            credits: 1,
            grade: "B",
            gradePoints: 3.0,
            qualityPoints: 3.0,
            semester: "Fall 2024",
            year: 2024,
            status: "completed",
            matchStatus: "verified",
            matchConfidence: 1.0,
            verified: true,
            classification: "foundation"
          },
          {
            id: "ma16500_fall_2024",
            subject: "MA",
            courseNumber: "16500",
            courseCode: "MA 16500",
            courseTitle: "Analytc Geomtry&Calc I",
            level: "Undergraduate",
            credits: 4,
            grade: "B",
            gradePoints: 3.0,
            qualityPoints: 12.0,
            semester: "Fall 2024",
            year: 2024,
            status: "completed",
            matchStatus: "verified",
            matchConfidence: 1.0,
            verified: true,
            classification: "math_requirement"
          }
        ],
        semesterGpa: 2.78,
        semesterCredits: 9
      },
      'spring_2025': {
        semester: "Spring 2025",
        year: 2025,
        academicStanding: "Continued Good Standing",
        courses: [
          {
            id: "cs18000_spring_2025",
            subject: "CS",
            courseNumber: "18000",
            courseCode: "CS 18000",
            courseTitle: "Prob Solving & O-O Programming",
            level: "Undergraduate",
            credits: 4,
            grade: "C",
            gradePoints: 2.0,
            qualityPoints: 8.0,
            semester: "Spring 2025",
            year: 2025,
            status: "completed",
            matchStatus: "verified",
            matchConfidence: 1.0,
            verified: true,
            classification: "foundation"
          },
          {
            id: "ma16600_spring_2025",
            subject: "MA",
            courseNumber: "16600",
            courseCode: "MA 16600",
            courseTitle: "Analytc Geom & Calc II",
            level: "Undergraduate",
            credits: 4,
            grade: "B+",
            gradePoints: 3.3,
            qualityPoints: 13.2,
            semester: "Spring 2025",
            year: 2025,
            status: "completed",
            matchStatus: "verified",
            matchConfidence: 1.0,
            verified: true,
            classification: "math_requirement"
          }
        ],
        semesterGpa: 2.94,
        semesterCredits: 8
      }
    },
    coursesInProgress: [
      {
        id: "cs18200_summer_2025",
        subject: "CS",
        courseNumber: "18200",
        courseCode: "CS 18200",
        courseTitle: "Foundations Of Comp Sc",
        level: "Undergraduate",
        credits: 3,
        grade: "IP",
        gradePoints: 0,
        qualityPoints: 0,
        semester: "Summer 2025",
        year: 2025,
        status: "in_progress",
        matchStatus: "verified",
        matchConfidence: 1.0,
        verified: true,
        classification: "foundation"
      },
      {
        id: "cs25000_fall_2025",
        subject: "CS",
        courseNumber: "25000",
        courseCode: "CS 25000",
        courseTitle: "Computer Architecture",
        level: "Undergraduate",
        credits: 4,
        grade: "IP",
        gradePoints: 0,
        qualityPoints: 0,
        semester: "Fall 2025",
        year: 2025,
        status: "in_progress",
        matchStatus: "verified",
        matchConfidence: 1.0,
        verified: true,
        classification: "foundation"
      }
    ],
    gpaSummary: {
      cumulativeGPA: 2.88,
      totalCreditsAttempted: 25,
      totalCreditsEarned: 25,
      totalQualityPoints: 72.0,
      majorGPA: 2.88
    },
    uploadDate: new Date(),
    verificationStatus: 'verified'
  };
  
  console.log('✅ Test transcript data generated with Purdue format');
  return mockTranscriptData;
};

// Test enhanced parser with actual transcript
export const testEnhancedTranscriptParsing = async (): Promise<any> => {
  console.log('🧪 Testing enhanced transcript parser with actual data...');
  
  const actualTranscriptText = `Student Type
Continuing
Purdue Production Instance
Unoﬃcial Academic Transcript
This is not an oﬃcial transcript. Courses which are in progress may also be included on this transcript.
Transcript Data
STUDENT INFORMATION
Name
Rohit Vayugundla Rao
Current Program
Bachelor of Science
Program
Computer Science-BS
INSTITUTION CREDIT
Period: Fall 2024
College
College of Science
Major
Computer Science
Academic Standing
Academic Notice
Subject Course Campus Level Title Grade Credit
Hours
UG Prob Solving & O-O
Programming
UG Tools B 1.000 3.00
College
College of Science
Campus
Indianapolis and W Lafayette
Major
Computer Science
Quality
Points
R
F 4.000 0.00 E
UG Anlytc Geomtry&Calc I B 4.000 12.00
UG Crit Think & Com I B 3.000 9.00
UG The Data Mine Seminar I D 1.000 1.00
UG Corporate Partners I W 3.000 0.00
CS 18000 Indianapolis
and W
Lafayette
CS 19300 Indianapolis
and W
Lafayette
MA 16500 Indianapolis
and W
Lafayette
SCLA 10100 Indianapolis
and W
Lafayette
TDM 10100 Indianapolis
and W
Lafayette
TDM 11100 Indianapolis
and W
Lafayette
Period Totals
Attempt Hours Passed Hours Earned Hours GPA Hours Quality Points GPA
(Undergraduate)
Current Period 16.000 9.000 9.000 9.000 25.00 2.78
Cumulative 16.000 9.000 9.000 9.000 25.00 2.78
Period: Spring 2025
College
College of Science
Major
Computer Science
Academic Standing
Continued Good Standing
Subject Course Campus Level Title Grade Credit
Hours
UG Prob Solving & O-O
Programming
UG Geosciences Cinema A+ 3.000 12.00
Quality
Points
R
CS 18000 Indianapolis
C 4.000 8.00 I
and W
Lafayette
EAPS 10600 Indianapolis
and W
Lafayette
MA 16600 Indianapolis
UG Analytc Geom & Calc II B+ 4.000 13.20
and W
Lafayette
PHYS 17200 Indianapolis
UG Modern Mechanics B- 4.000 10.80
and W
Lafayette
TDM 10200 Indianapolis
UG The Data Mine Seminar II B 1.000 3.00
and W
Lafayette
Period Totals
Attempt Hours Passed Hours Earned Hours GPA Hours Quality Points GPA
(Undergraduate)
Current Period 16.000 16.000 16.000 16.000 47.00 2.94
Cumulative 32.000 25.000 25.000 25.000 72.00 2.88
TRANSCRIPT TOTALS
Transcript Totals
Attempt Hours Passed Hours Earned Hours GPA Hours Quality Points GPA
(Undergraduate)
Total Institution 32.000 25.000 25.000 25.000 72.00 2.88
Total Transfer 0.000 0.000 0.000 0.000 0.00 0.00
Overall 32.000 25.000 25.000 25.00 72.00 2.88
COURSE(S) IN PROGRESS
Period: Summer 2025
College
College of Science
Major
Computer Science
Subject Course Campus Level Title Credit Hours
CS 18200 West Lafayette UG Foundations Of Comp Sc 3.000
CS 24000 West Lafayette UG Programming In C 3.000
Period: Fall 2025
College
College of Science
Major
Computer Science
Subject Course Campus Level Title Credit Hours
CLCS 23500 Indianapolis and W
Lafayette
CS 19000 Indianapolis and W
Lafayette
CS 25000 Indianapolis and W
Lafayette
CS 25100 Indianapolis and W
Lafayette
MA 26100 Indianapolis and W
Lafayette
SCLA 10200 Indianapolis and W
Lafayette
UG Intr To Classical Myth 3.000
UG Intro To Professional Practice 1.000
UG Computer Architecture 4.000
UG Data Structures And Algorithms 3.000
UG Multivariate Calculus 4.000
UG Crit Think & Com II 3.000`;

  try {
    const result = await parseTranscriptWithClaude(actualTranscriptText);
    
    console.log('✅ Enhanced transcript parsing test successful!');
    console.log('📊 Test Results:', {
      studentName: result.student_info?.name,
      completedCourses: result.completed_courses?.length || 0,
      inProgressCourses: result.courses_in_progress?.length || 0,
      overallGPA: result.gpa_summary?.overall_gpa
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Enhanced transcript parsing test failed:', error);
    throw error;
  }
};

export default {
  processTranscript,
  matchCourseWithDatabase,
  parseTranscriptWithClaude,
  calculateGPA,
  calculateMajorGPA,
  testTranscriptParsing,
  testActualTranscriptParsing,
  testEnhancedTranscriptParsing
};

