const { OpenAI } = require('openai');
const pdf = require('pdf-parse');
const HighPerformanceTranscriptParser = require('./highPerformanceTranscriptParser');

/**
 * NEW: Standardized transcript structure that AI can understand
 * NOTE: This class works with ANY university's transcript format
 * - Does NOT hardcode Purdue-specific course codes here
 * - Parser extracts courses generically, regardless of naming convention
 */
class TranscriptStructure {
  constructor() {
    this.studentInfo = {
      name: '',
      program: '',
      college: '',
      // DO NOT hardcode "Computer Science" - get program name from transcript
      expectedGraduation: ''
    };
    this.gpaSummary = {
      cumulativeGPA: 0,
      termGPA: 0,
      totalCreditsEarned: 0,
      creditsInProgress: 0
    };
    this.courses = [];
    this.requirementsMet = [];
    this.requirementsPending = [];
  }

  /**
   * Convert raw transcript text to structured format
   * NOTE: 
   * - This regex matches ANY course code format (CS 180, MA 16500, STAT 511, etc.)
   * - Purdue uses 4-5 digit course numbers, but keeps flexible for other formats
   */
  static parseFromText(transcriptText) {
    const transcript = new TranscriptStructure();
    
    // 1. Extract student info generically
    const nameMatch = transcriptText.match(/Name:\s*([^\n]+)/);
    if (nameMatch) transcript.studentInfo.name = nameMatch[1].trim();
    
    const programMatch = transcriptText.match(/Program:\s*([^\n]+)/);
    if (programMatch) transcript.studentInfo.program = programMatch[1].trim();
    
    const collegeMatch = transcriptText.match(/College:\s*([^\n]+)/);
    if (collegeMatch) transcript.studentInfo.college = collegeMatch[1].trim();
    
    // 2. Extract GPA and credits generically
    const gpaMatch = transcriptText.match(/Cumulative GPA:\s*([\d.]+)/);
    if (gpaMatch) transcript.gpaSummary.cumulativeGPA = parseFloat(gpaMatch[1]);
    
    const creditsMatch = transcriptText.match(/Total Credits Earned:\s*([\d.]+)/);
    if (creditsMatch) transcript.gpaSummary.totalCreditsEarned = parseInt(creditsMatch[1]);
    
    // 3. Extract courses using flexible regex that works with ANY course code format
    // NOTE: 
    // - Purdue format is typically "DEPT ###" or "DEPT ####" (e.g., "CS 180" or "MA 16500")
    // - But keep this flexible for other formats that might appear in transcripts
    const courseRegex = /([A-Z]{2,4})\s*(\d{3,5})\s+([^(]+?)\s+([A-F][\+-]?)\s+(\d+(\.\d+)?)/g;
    let courseMatch;
    while ((courseMatch = courseRegex.exec(transcriptText)) !== null) {
      const [, dept, number, title, grade, credits] = courseMatch;
      const courseCode = `${dept} ${number}`;
      
      transcript.courses.push({
        courseCode,
        title: title.trim(),
        grade,
        credits: parseFloat(credits),
        status: 'completed',
        term: this.extractTermFromContext(transcriptText, courseMatch.index)
      });
    }
    
    // 4. Extract in-progress courses generically
    const inProgressRegex = /COURSE\(S\) IN PROGRESS[\s\S]*?Period:\s*([^\n]+)\n([\s\S]*?)(?=\n\n|\n[A-Z])/g;
    let inProgressMatch;
    while ((inProgressMatch = inProgressRegex.exec(transcriptText)) !== null) {
      const [, term, coursesText] = inProgressMatch;
      // NOTE: Use the SAME flexible course regex as above
      const inProgressCourseRegex = /([A-Z]{2,4})\s*(\d{3,5})\s+([^(]+?)\s+(\d+(\.\d+)?)/g;
      let ipCourseMatch;
      while ((ipCourseMatch = inProgressCourseRegex.exec(coursesText)) !== null) {
        const [, dept, number, title, credits] = ipCourseMatch;
        const courseCode = `${dept} ${number}`;
        
        transcript.courses.push({
          courseCode,
          title: title.trim(),
          grade: null,
          credits: parseFloat(credits),
          status: 'in-progress',
          term: this.parseTerm(term)
        });
      }
    }
    
    return transcript;
  }

  static extractTermFromContext(text, position) {
    // Look backwards from position to find term information
    const beforeText = text.substring(Math.max(0, position - 500), position);
    const termMatch = beforeText.match(/Period:\s*(Fall|Spring|Summer)\s+(\d{4})/i);
    
    if (termMatch) {
      return {
        season: termMatch[1],
        year: parseInt(termMatch[2])
      };
    }
    
    return { season: 'Unknown', year: new Date().getFullYear() };
  }

  static parseTerm(termString) {
    const match = termString.match(/(Fall|Spring|Summer)\s+(\d{4})/i);
    if (match) {
      return {
        season: match[1],
        year: parseInt(match[2])
      };
    }
    return { season: 'Unknown', year: new Date().getFullYear() };
  }

  // Get all completed courses as a flat array
  get completedCourses() {
    return this.courses.filter(c => c.status === 'completed');
  }

  // Get all in-progress courses as a flat array
  get inProgressCourses() {
    return this.courses.filter(c => c.status === 'in-progress');
  }

  // Get courses by term
  getCoursesByTerm(season, year) {
    return this.courses.filter(c => 
      c.term && c.term.season.toLowerCase() === season.toLowerCase() && c.term.year === year
    );
  }
}

class AITranscriptController {
  constructor() {
    this.processingJobs = new Map();
    this.openaiClient = null;
    this.defaultModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    
    // ⚠️ FERPA COMPLIANCE: No transcript data is stored on the server
    // All processing is ephemeral - data is processed and returned only
    console.log('🔒 FERPA Compliance: Transcript processor initialized with no data persistence');
  }

  isValidApiKey(apiKey) {
    const invalidKeys = [
      'your_openai_api_key_here',
      'sk-test',
      'sk-fake',
      '',
      null,
      undefined
    ];
    
    return apiKey && 
           !invalidKeys.includes(apiKey) && 
           apiKey.length > 10 && 
           (apiKey.startsWith('sk-') || process.env.NODE_ENV === 'development');
  }

  initializeOpenAI(apiKey) {
    if (!apiKey) {
      throw new Error('OpenAI API key not provided');
    }

    try {
      this.openaiClient = new OpenAI({
        apiKey: apiKey
      });
      return true;
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error);
      return false;
    }
  }

  async processTranscript(req) {
    try {
      let extractedText = '';
      
      if (req.file) {
        // Process uploaded file
        if (req.file.mimetype === 'application/pdf') {
          const pdfData = await pdf(req.file.buffer);
          extractedText = pdfData.text;
        } else if (req.file.mimetype === 'text/plain') {
          extractedText = req.file.buffer.toString('utf-8');
        } else {
          throw new Error('Unsupported file type');
        }
      } else if (req.body.transcriptText) {
        extractedText = req.body.transcriptText;
      } else {
        throw new Error('No transcript content provided');
      }

      const apiKey = req.body.apiKey;
      
      // Try high-performance parsing first, fallback to AI if needed
      console.log('⚡ Attempting high-performance parsing...');
      try {
        const highPerfResult = HighPerformanceTranscriptParser.parseTranscript(extractedText);
        if (highPerfResult.success && this.validateHighPerfResult(highPerfResult.data)) {
          console.log(`✅ High-performance parsing successful in ${highPerfResult.processingTimeMs.toFixed(2)}ms`);
          return highPerfResult;
        }
      } catch (hpError) {
        console.log('⚠️ High-performance parsing failed, falling back to AI:', hpError.message);
      }
      
      // Fallback to AI processing if high-perf fails or API key provided
      if (this.isValidApiKey(apiKey)) {
        console.log('🤖 Using AI processing with provided API key');
        try {
          const result = await this.processWithAI(extractedText, apiKey);
          return result;
        } catch (aiError) {
          console.error('❌ AI processing failed:', aiError.message);
          throw new Error(`AI processing failed: ${aiError.message}`);
        }
      } else {
        throw new Error('Valid OpenAI API key required for transcript processing. Please configure your API key in Settings.');
      }
    } catch (error) {
      console.error('Transcript processing error:', error);
      throw error;
    }
  }

  async processTranscriptText(body) {
    try {
      const { transcriptText, apiKey } = body;
      
      // Try high-performance parsing first
      console.log('⚡ Attempting high-performance text parsing...');
      try {
        const highPerfResult = HighPerformanceTranscriptParser.parseTranscript(transcriptText);
        if (highPerfResult.success && this.validateHighPerfResult(highPerfResult.data)) {
          console.log(`✅ High-performance text parsing successful in ${highPerfResult.processingTimeMs.toFixed(2)}ms`);
          return highPerfResult;
        }
      } catch (hpError) {
        console.log('⚠️ High-performance parsing failed, falling back to AI:', hpError.message);
      }
      
      // Fallback to AI processing
      if (this.isValidApiKey(apiKey)) {
        console.log('🤖 Using AI processing for text with provided API key');
        try {
          const result = await this.processWithAI(transcriptText, apiKey);
          return result;
        } catch (aiError) {
          console.error('❌ AI processing failed:', aiError.message);
          throw new Error(`AI processing failed: ${aiError.message}`);
        }
      } else {
        throw new Error('Valid OpenAI API key required for transcript processing. Please configure your API key in Settings.');
      }
    } catch (error) {
      console.error('Text processing error:', error);
      throw error;
    }
  }

  async processWithAI(transcriptText, apiKey) {
    try {
      // Initialize OpenAI client if needed
      if (!this.openaiClient) {
        const success = this.initializeOpenAI(apiKey);
        if (!success) {
          throw new Error('Failed to initialize OpenAI client');
        }
      }

      const prompt = this.buildPureDynamicPrompt(transcriptText);
      
      const response = await this.openaiClient.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: "system",
            content: "You are an expert academic transcript parser specializing in Purdue University transcripts. Your task is to extract structured data from transcript text with high accuracy. Always return valid JSON with no additional text or explanations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      });

      if (!response.choices || !response.choices[0]) {
        throw new Error('Invalid response from OpenAI API');
      }

      const aiResponse = response.choices[0].message.content;
      const parsedData = this.parseAIResponse(aiResponse);
      
      // Validate that we got real data, not mock/placeholder data
      if (parsedData.studentInfo && parsedData.studentInfo.name) {
        const invalidNames = [
          'Alex Johnson', 'John Smith', 'Jane Doe', 'Sample Student', 
          'Test Student', 'Student Name', 'placeholder', 'ACTUAL', 'Unknown',
          'Mock Student', 'Test User', 'Example Student', 'Demo Student'
        ];
        const studentName = parsedData.studentInfo.name.trim();
        
        if (invalidNames.some(invalid => studentName.includes(invalid)) || 
            studentName.length < 3 || 
            studentName.includes('[') || 
            studentName.includes('ACTUAL')) {
          throw new Error('AI returned placeholder or generic data instead of extracting actual student information from the transcript. Please ensure your transcript contains clear student information.');
        }
      }
      
      return {
        success: true,
        data: parsedData,
        rawAIResponse: aiResponse,
        aiProvider: 'openai'
      };
    } catch (error) {
      console.error('AI processing error:', error);
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }

  buildPureDynamicPrompt(transcriptText) {
    return `You are an expert Purdue University transcript parser. This is a REAL Purdue transcript with the specific format used by Purdue University. Parse it with 100% accuracy using these EXACT patterns:

TRANSCRIPT STRUCTURE:
1. STUDENT INFORMATION section with Name, Program, College, Campus, Major
2. INSTITUTION CREDIT section with completed courses organized by "Period: [Season] [Year]"
3. TRANSCRIPT TOTALS section with cumulative statistics
4. COURSE(S) IN PROGRESS section with future planned courses

COURSE LINE FORMAT (Completed Courses):
[Subject] [Course#] [Campus] [Level] [Title] [Grade] [Credit Hours] [Quality Points] [Repeat Indicator]
Example: "CS 18000 Indianapolis and W Lafayette UG Prob Solving & O-O Programming F 4.000 0.00 E"

IN-PROGRESS COURSE FORMAT:
[Subject] [Course#] [Campus] [Level] [Title] [Credit Hours]
Example: "CS 18200 West Lafayette UG Foundations Of Comp Sc 3.000" 

CRITICAL PARSING RULES:
1. Extract EXACT student name from "Name" field in STUDENT INFORMATION
2. Parse ONLY lines that match the exact course format patterns above
3. DO NOT parse semester headers like "Period: Fall 2024" as courses
4. Separate completed courses from in-progress courses correctly
5. Extract grades EXACTLY as shown (F, B, C, A+, B+, B-, etc.)
6. Clean course titles but preserve meaning
7. Calculate quality points correctly for each course

Return ONLY valid JSON with this exact structure:

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
  "coursesInProgress": {
    "summer_2025": {
      "semester": "Summer",
      "year": 2025,
      "college": "College of Science",
      "major": "Computer Science",
      "courses": [
        {
          "id": "cs18200_summer_2025_progress",
          "subject": "CS",
          "courseNumber": "18200",
          "courseCode": "CS 18200",
          "campus": "West Lafayette",
          "level": "Undergraduate",
          "courseTitle": "Foundations of Computer Science",
          "creditHours": 3.0,
          "semester": "Summer",
          "year": 2025,
          "status": "in_progress"
        }
      ]
    }
  },
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
6. GRADE POINT VALUES: A=4.0, A-=3.7, B+=3.3, B=3.0, B-=2.7, C+=2.3, C=2.0, C-=1.7, D+=1.3, D=1.0, D-=0.7, F=0.0, W=0.0, WU=0.0, WP=0.0, WF=0.0, AU=0.0, CR=0.0, NC=0.0, I=0.0, P=0.0, S=0.0, U=0.0
7. CLASSIFICATION: Guess reasonable classifications based on course codes
8. SEMESTER KEYS: Use format like "fall_2023", "spring_2024", "summer_2024", or "unknown_term" if unclear

SPECIFIC PURDUE TRANSCRIPT PATTERNS TO RECOGNIZE:
- Academic Standing: "Academic Notice", "Continued Good Standing"
- Repeat Indicators: E (excluded), I (included), R (repeated)
- Campus format: "Indianapolis and W Lafayette" or "West Lafayette"
- Level: Always "UG" for undergraduate
- Grade patterns: F, B, C, A+, B+, B-, D, W, WU, WP, WF (all withdrawal types), AU (audit), CR (credit), NC (no credit), I (incomplete), P (pass), S (satisfactory), U (unsatisfactory)
- Credit format: Always ".000" (like 4.000, 3.000)

COMMON PURDUE COURSE TITLE CLEANUPS:
- "Prob Solving & O-O Programming" → "Problem Solving & Object-Oriented Programming"
- "Anlytc Geomtry&Calc" → "Analytic Geometry & Calculus"
- "Crit Think & Com" → "Critical Thinking & Communication"
- "The Data Mine Seminar" (keep as-is)
- "Geosciences Cinema" (keep as-is)

QUALITY VALIDATION:
- Verify student name is NOT a placeholder (reject if "Alex Johnson", "John Smith", "Sample Student")
- Ensure course codes follow [LETTERS][NUMBERS] pattern
- Validate grade values are legitimate academic grades
- Check credit hours are reasonable (0.5-6.0 range)
- Confirm quality points calculation: creditHours * gradePoints

RETURN STRUCTURED JSON with completed courses by semester AND separate in-progress courses section.

TRANSCRIPT TEXT TO ANALYZE:
${transcriptText}

Return ONLY the JSON object with no explanations, markdown formatting, or additional text.`;
  }

  parseAIResponse(aiResponse) {
    try {
      console.log('📋 Raw AI Response received:', aiResponse.substring(0, 200) + '...');
      
      // Clean the response to extract JSON
      let jsonText = aiResponse.trim();
      
      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/^```json\s*/i, '');
      jsonText = jsonText.replace(/```\s*$/, '');
      jsonText = jsonText.trim();
      
      // If still not pure JSON, try to extract JSON object
      if (!jsonText.startsWith('{')) {
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error('❌ No JSON object found in AI response');
          throw new Error('No JSON found in AI response');
        }
        jsonText = jsonMatch[0];
      }

      console.log('🔍 Attempting to parse JSON...');
      
      // Advanced JSON truncation detection and repair
      console.log('🔍 Checking for JSON truncation...');
      
      // Enhanced truncation detection patterns
      const truncationPatterns = [
        /"[^"]*$/, // Unterminated string at end
        /:\s*"[^"]*$/, // Incomplete string value
        /,\s*"[^"]*$/, // Incomplete property after comma
        /"courses.*$/, // Truncated "courses" or "coursesInProgress"
        /,\s*$/, // Trailing comma
        /[^}\]"0-9true false null]\s*$/ // Invalid ending character
      ];
      
      let needsRepair = !jsonText.endsWith('}');
      for (const pattern of truncationPatterns) {
        if (pattern.test(jsonText)) {
          needsRepair = true;
          console.log(`⚠️ Found truncation pattern: ${pattern}`);
          break;
        }
      }
      
      if (needsRepair) {
        console.log('⚠️ JSON appears truncated, attempting comprehensive repair...');
        
        // Step 1: Remove incomplete trailing content
        const lastCompletePoints = [
          jsonText.lastIndexOf('"}'),
          jsonText.lastIndexOf('"]'),
          jsonText.lastIndexOf('}'),
          jsonText.lastIndexOf(']')
        ];
        
        const lastValidPoint = Math.max(...lastCompletePoints.filter(p => p > 0));
        
        if (lastValidPoint > 0) {
          // Find the actual end position after the last valid point
          let endPos = lastValidPoint + 1;
          if (jsonText[lastValidPoint] === '"') endPos = lastValidPoint + 2;
          
          console.log(`🔧 Truncating at position ${endPos} (was ${jsonText.length})`);
          jsonText = jsonText.substring(0, endPos);
        }
        
        // Step 2: Clean up any trailing commas or incomplete syntax
        jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
        jsonText = jsonText.replace(/,\s*$/, ''); // Remove trailing comma at end
        
        // Step 3: Count and balance brackets systematically
        let openBraces = (jsonText.match(/\{/g) || []).length;
        let closeBraces = (jsonText.match(/\}/g) || []).length;
        let openArrays = (jsonText.match(/\[/g) || []).length;
        let closeArrays = (jsonText.match(/\]/g) || []).length;
        
        console.log(`📊 Structure count - Braces: ${openBraces}/${closeBraces}, Arrays: ${openArrays}/${closeArrays}`);
        
        // Balance arrays first (inner structures)
        while (closeArrays < openArrays) {
          jsonText += ']';
          closeArrays++;
          console.log('🔧 Added closing array bracket');
        }
        
        // Balance objects (outer structures)
        while (closeBraces < openBraces) {
          jsonText += '}';
          closeBraces++;
          console.log('🔧 Added closing object brace');
        }
        
        console.log('✅ JSON repair completed');
      }
      
      const parsedData = JSON.parse(jsonText);
      
      // Log basic parsing results
      const courseCount = parsedData.completedCourses ? Object.keys(parsedData.completedCourses).length : 0;
      const totalCourses = Object.values(parsedData.completedCourses || {}).reduce((sum, semester) => {
        return sum + (semester.courses ? semester.courses.length : 0);
      }, 0);
      
      console.log(`✅ Successfully parsed transcript data:`);
      console.log(`   - Student: ${parsedData.studentInfo?.name || 'Unknown'}`);
      console.log(`   - Program: ${parsedData.studentInfo?.program || 'Unknown'}`);
      console.log(`   - Semesters: ${courseCount}`);
      console.log(`   - Total Courses: ${totalCourses}`);
      console.log(`   - GPA: ${parsedData.gpaSummary?.cumulativeGPA || 'Unknown'}`);
      
      // Add metadata
      parsedData.uploadDate = new Date();
      parsedData.verificationStatus = 'ai_parsed';
      parsedData.aiProvider = 'openai';
      
      // Validate structure
      this.validateParsedData(parsedData);

      return parsedData;
    } catch (error) {
      console.error('❌ JSON parsing error:', error.message);
      console.error('📄 Full AI Response:', aiResponse);
      throw new Error(`Failed to parse AI response: ${error.message}`);
    }
  }

  validateParsedData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data structure returned by AI');
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

    // Check for courses and validate data quality
    const hasCompleted = Object.keys(data.completedCourses).length > 0;
    const hasInProgress = data.coursesInProgress.length > 0;
    
    if (!hasCompleted && !hasInProgress) {
      console.warn('⚠️ Warning: No courses found in transcript parsing - this might indicate parsing issues or an empty transcript');
    }
    
    // Filter out invalid course entries from completed courses
    for (const semesterKey in data.completedCourses) {
      const semester = data.completedCourses[semesterKey];
      if (semester.courses) {
        semester.courses = semester.courses.filter(course => {
          const isValid = course.courseCode && 
            course.courseCode.length >= 3 && 
            !course.courseCode.toLowerCase().includes('progression') &&
            !course.courseCode.toLowerCase().includes('in progress') &&
            !/^(Fall|Spring|Summer|Winter)\s+\d{4}$/i.test(course.courseCode) &&
            course.courseTitle && 
            course.courseTitle.trim() !== '' &&
            !course.courseTitle.toLowerCase().includes('progression');
          
          if (!isValid) {
            console.log(`🚫 Filtered out invalid course: ${course.courseCode} - ${course.courseTitle}`);
          }
          return isValid;
        });
      }
    }
    
    // Filter out invalid course entries from in-progress courses
    data.coursesInProgress = data.coursesInProgress.filter(course => {
      const isValid = course.courseCode && 
        course.courseCode.length >= 3 && 
        !course.courseCode.toLowerCase().includes('progression') &&
        !course.courseCode.toLowerCase().includes('in progress') &&
        !/^(Fall|Spring|Summer|Winter)\s+\d{4}$/i.test(course.courseCode) &&
        course.courseTitle && 
        course.courseTitle.trim() !== '' &&
        !course.courseTitle.toLowerCase().includes('progression');
      
      if (!isValid) {
        console.log(`🚫 Filtered out invalid in-progress course: ${course.courseCode} - ${course.courseTitle}`);
      }
      return isValid;
    });

    console.log('✅ Data validation completed successfully');
    return true;
  }

  getProcessingStatus(jobId) {
    const job = this.processingJobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }
    return job;
  }

  // Offline processing method - basic pattern matching
  async processOffline(transcriptText) {
    try {
      console.log('🔧 Starting offline transcript processing...');
      console.log(`📝 Input text length: ${transcriptText.length}`);
      
      const result = {
        studentInfo: {
          name: 'Unknown Student',
          studentId: '',
          program: 'Unknown Program',
          college: 'Unknown College',
          campus: 'West Lafayette'
        },
        completedCourses: {},
        coursesInProgress: [],
        gpaSummary: {
          cumulativeGPA: 0,
          totalCreditsAttempted: 0,
          totalCreditsEarned: 0,
          totalQualityPoints: 0,
          majorGPA: 0
        }
      };

      // Clean up the text for parsing
      const cleanText = transcriptText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\s+/g, ' ')
        .trim();

      // Extract student information
      const studentInfo = this.extractStudentInfoOffline(cleanText);
      result.studentInfo = { ...result.studentInfo, ...studentInfo };

      // Extract courses by looking for common patterns
      const courses = this.extractCoursesOffline(cleanText);
      
      // Group courses by semester
      const semesterGroups = {};
      courses.forEach(course => {
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
        
        const parsedCourse = {
          id: `${course.courseCode?.replace(' ', '_').toLowerCase()}_${semesterKey}`,
          subject: course.courseCode?.split(' ')[0] || 'UNK',
          courseNumber: course.courseCode?.split(' ')[1] || '000',
          courseCode: course.courseCode || 'UNK 000',
          courseTitle: course.title || 'Unknown Course',
          level: 'Undergraduate',
          credits: course.credits || 0,
          grade: course.grade || 'N/A',
          gradePoints: this.getGradePoints(course.grade),
          qualityPoints: (course.credits || 0) * this.getGradePoints(course.grade),
          semester: course.semester || 'Unknown',
          year: course.year || 2024,
          status: course.status || 'completed',
          matchStatus: 'probable',
          matchConfidence: 0.7,
          verified: false,
          classification: 'unclassified'
        };
        
        semesterGroups[semesterKey].courses.push(parsedCourse);
      });

      result.completedCourses = semesterGroups;

      // Extract GPA if available
      const gpaMatch = cleanText.match(/GPA[:\s]+([\d.]+)/i);
      if (gpaMatch) {
        result.gpaSummary.cumulativeGPA = parseFloat(gpaMatch[1]);
      }

      console.log(`✅ Offline processing completed: ${Object.keys(result.completedCourses).length} semesters, ${courses.length} total courses`);
      
      return {
        success: true,
        data: result,
        aiProvider: 'offline'
      };

    } catch (error) {
      console.error('❌ Offline processing failed:', error);
      throw new Error(`Offline processing failed: ${error.message}`);
    }
  }

  extractStudentInfoOffline(text) {
    const studentInfo = {};

    // Extract name
    const nameMatch = text.match(/Name[:\s]+([A-Za-z\s]+?)(?:\s+Current\s+Program|\s+Program|$)/i);
    if (nameMatch) {
      studentInfo.name = nameMatch[1].trim();
    }

    // Extract program
    const programMatch = text.match(/Program[:\s]+([^\n]*?-(?:BS|MS|PhD|BA|MA))/i);
    if (programMatch) {
      studentInfo.program = programMatch[1].trim();
    }

    // Extract college
    const collegeMatch = text.match(/College[:\s]+(College\s+of\s+[^\n]+)/i);
    if (collegeMatch) {
      studentInfo.college = collegeMatch[1].trim();
    }

    // Extract campus
    const campusMatch = text.match(/Campus[:\s]+([^\n]*(?:Lafayette|Indianapolis)[^\n]*)/i);
    if (campusMatch) {
      studentInfo.campus = campusMatch[1].trim();
    }

    return studentInfo;
  }

  extractCoursesOffline(text) {
    const courses = [];
    console.log('🔍 Extracting courses using pattern matching...');
    
    // Look for course patterns: SUBJECT NUMBER followed by title, grade, credits
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for course code pattern (SUBJECT NUMBER)
      const courseCodeMatch = line.match(/\b([A-Z]{2,5})\s+(\d{3,5})\b/);
      if (courseCodeMatch) {
        const subject = courseCodeMatch[1];
        const courseNumber = courseCodeMatch[2];
        const courseCode = `${subject} ${courseNumber}`;
        
        // Look for grade and credits in the same line or nearby lines
        let courseData = line;
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          if (!lines[j].match(/\b[A-Z]{2,5}\s+\d{3,5}\b/)) {
            courseData += ' ' + lines[j].trim();
          } else {
            break;
          }
        }
        
        // Extract grade and credits
        const gradeMatch = courseData.match(/\b([A-F][+-]?|W|I|P|S)\s+(\d+\.?\d*)/);
        let grade = 'N/A';
        let credits = 3; // Default credits
        
        if (gradeMatch) {
          grade = gradeMatch[1];
          credits = parseFloat(gradeMatch[2]);
        }
        
        // Extract title (everything between course code and grade, or use generic)
        let title = 'Course';
        const titleMatch = courseData.match(new RegExp(`${subject}\\s+${courseNumber}\\s+([^\\n]*?)(?:\\s+[A-F][+-]?|\\s+[WIP]|$)`, 'i'));
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1].replace(/\s+/g, ' ').trim();
        }
        
        // Extract semester and year from context
        let semester = 'Unknown';
        let year = 2024;
        
        // Look backwards for period information
        for (let k = i - 1; k >= Math.max(0, i - 10); k--) {
          const periodMatch = lines[k].match(/Period[:\s]*(Fall|Spring|Summer)\s+(\d{4})/i);
          if (periodMatch) {
            semester = periodMatch[1];
            year = parseInt(periodMatch[2]);
            break;
          }
        }
        
        courses.push({
          courseCode,
          title: this.cleanCourseTitle(title),
          credits,
          grade,
          semester,
          year,
          status: grade === 'IP' ? 'in_progress' : 'completed'
        });
        
        console.log(`  ➕ Found course: ${courseCode} - ${title} (${grade}) - ${credits} credits`);
      }
    }
    
    console.log(`✅ Extracted ${courses.length} courses using offline processing`);
    return courses;
  }

  cleanCourseTitle(title) {
    return title
      .replace(/\s+/g, ' ')
      .replace(/&/g, '&')
      // Remove suffix indicators like IB, ID, etc.
      .replace(/\s+(IB|ID|IW|IA|IC|IE|II|III|IV)$/g, '')
      // Fix common title abbreviations and typos
      .replace(/Prob Solving & O-O Programming/g, 'Problem Solving & Object-Oriented Programming')
      .replace(/Analytc/g, 'Analytic')
      .replace(/Geomtry/g, 'Geometry') 
      .replace(/Geom/g, 'Geometry')
      .replace(/Crit Think & Com/g, 'Critical Thinking & Communication')
      .replace(/Com$/g, 'Communication')
      .replace(/Calc/g, 'Calculus')
      .replace(/Prog/g, 'Programming')
      .replace(/Intro/g, 'Introduction')
      .replace(/Sem/g, 'Seminar')
      .replace(/\b(I{1,3}|IV|V)([AB])?$/g, '') // Remove trailing Roman numerals
      .trim();
  }

  getGradePoints(grade) {
    const gradeMap = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.7,
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'D-': 0.7,
      'F': 0.0, 'W': 0.0, 'I': 0.0, 'P': 0.0, 'S': 0.0, 'U': 0.0,
      'WU': 0.0, 'WP': 0.0, 'WF': 0.0, 'AU': 0.0, 'CR': 0.0, 'NC': 0.0
    };
    return gradeMap[grade] || 0.0;
  }

  // Validate high-performance parser results
  validateHighPerfResult(data) {
    try {
      // Check if we have real student data (not placeholder)
      if (!data.studentInfo || !data.studentInfo.name || data.studentInfo.name === 'Unknown') {
        console.log('⚠️ High-perf validation failed: No valid student name');
        return false;
      }
      
      // Check if we have courses
      const hasCompletedCourses = data.completedCourses && Object.keys(data.completedCourses).length > 0;
      const hasInProgressCourses = data.coursesInProgress && data.coursesInProgress.length > 0;
      
      if (!hasCompletedCourses && !hasInProgressCourses) {
        console.log('⚠️ High-perf validation failed: No courses found');
        return false;
      }
      
      // Check GPA is reasonable
      if (data.gpaSummary && data.gpaSummary.cumulativeGPA < 0 || data.gpaSummary.cumulativeGPA > 4.0) {
        console.log('⚠️ High-perf validation failed: Invalid GPA');
        return false;
      }
      
      console.log('✅ High-performance result validation passed');
      return true;
    } catch (error) {
      console.log('⚠️ High-perf validation error:', error.message);
      return false;
    }
  }

  // New method to handle API key updates
  updateApiKey(apiKey) {
    try {
      this.openaiClient = null; // Reset client
      return this.initializeOpenAI(apiKey);
    } catch (error) {
      console.error('Failed to update API key:', error);
      return false;
    }
  }

  // Enhanced method for processing with context awareness
  async processTranscriptWithContext(transcriptText, apiKey, userContext = {}) {
    try {
      if (!this.openaiClient) {
        const success = this.initializeOpenAI(apiKey);
        if (!success) {
          throw new Error('Failed to initialize OpenAI client');
        }
      }

      const enhancedPrompt = this.buildContextAwarePrompt(transcriptText, userContext);
      
      const response = await this.openaiClient.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: "system", 
            content: "You are an expert academic transcript parser and advisor specializing in Purdue University Computer Science programs. You understand course sequences, prerequisites, and degree requirements. Provide detailed, accurate parsing with intelligent insights."
          },
          {
            role: "user",
            content: enhancedPrompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      });

      const aiResponse = response.choices[0].message.content;
      const parsedData = this.parseAIResponse(aiResponse);
      
      // Add AI insights if context was provided
      if (userContext && Object.keys(userContext).length > 0) {
        parsedData.aiInsights = await this.generateAcademicInsights(parsedData, userContext);
      }
      
      return {
        success: true,
        data: parsedData,
        rawAIResponse: aiResponse,
        aiProvider: 'openai',
        contextEnhanced: true
      };
    } catch (error) {
      console.error('Context-aware processing error:', error);
      throw new Error(`Context-aware processing failed: ${error.message}`);
    }
  }

  buildContextAwarePrompt(transcriptText, userContext) {
    const basePrompt = this.buildPureDynamicPrompt(transcriptText);
    
    if (!userContext || Object.keys(userContext).length === 0) {
      return basePrompt;
    }

    const contextInfo = [];
    if (userContext.targetGraduation) {
      contextInfo.push(`Target Graduation: ${userContext.targetGraduation}`);
    }
    if (userContext.careerGoals) {
      contextInfo.push(`Career Goals: ${userContext.careerGoals}`);
    }
    if (userContext.trackPreference) {
      contextInfo.push(`Track Preference: ${userContext.trackPreference}`);
    }

    if (contextInfo.length > 0) {
      return basePrompt + `\n\nADDITIONAL CONTEXT:\n${contextInfo.join('\n')}\n\nUse this context to provide more targeted analysis and insights in your parsing.`;
    }

    return basePrompt;
  }

  async generateAcademicInsights(parsedData, userContext) {
    try {
      const insightsPrompt = `Based on this parsed transcript data, provide academic insights and recommendations:

TRANSCRIPT DATA: ${JSON.stringify(parsedData, null, 2)}

USER CONTEXT: ${JSON.stringify(userContext, null, 2)}

Provide insights on:
1. Academic progress assessment
2. Course sequence recommendations  
3. GPA improvement strategies
4. Track selection advice
5. Graduation timeline analysis

Return as JSON object with these insights.`;

      const response = await this.openaiClient.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: "system",
            content: "You are an expert academic advisor for Purdue Computer Science students. Provide detailed, actionable insights and recommendations."
          },
          {
            role: "user", 
            content: insightsPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Failed to generate insights:', error);
      return { error: 'Could not generate academic insights' };
    }
  }
}

module.exports = new AITranscriptController();