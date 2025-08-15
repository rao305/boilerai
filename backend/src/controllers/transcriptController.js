const axios = require('axios');
const pdf = require('pdf-parse');

class TranscriptController {
  constructor() {
    this.processingJobs = new Map();
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

      // Process with AI
      const result = await this.processWithAI(extractedText, req.body.apiKey, req.body.model);
      return result;
    } catch (error) {
      console.error('Transcript processing error:', error);
      throw error;
    }
  }

  async processTranscriptText(body) {
    try {
      const { transcriptText, apiKey, model } = body;
      const result = await this.processWithAI(transcriptText, apiKey, model);
      return result;
    } catch (error) {
      console.error('Text processing error:', error);
      throw error;
    }
  }

  async processWithAI(transcriptText, apiKey, model = 'gemini-1.5-flash') {
    try {
      const geminiApiKey = apiKey || process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        throw new Error('Gemini API key not provided');
      }

      const prompt = this.buildPrompt(transcriptText);
      
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4000,
            topP: 0.8,
            topK: 40
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );

      if (!response.data.candidates || !response.data.candidates[0]) {
        throw new Error('Invalid response from Gemini API');
      }

      const aiResponse = response.data.candidates[0].content.parts[0].text;
      const parsedData = this.parseAIResponse(aiResponse);
      
      return {
        success: true,
        data: parsedData,
        rawAIResponse: aiResponse
      };
    } catch (error) {
      console.error('AI processing error:', error);
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }

  buildPrompt(transcriptText) {
    return `You are an expert academic transcript parser. Parse the following transcript and return a JSON object with this exact structure:

{
  "studentInfo": {
    "name": "Student Name",
    "studentId": "Student ID",
    "program": "Program/Major",
    "college": "College/School",
    "campus": "Campus"
  },
  "completedCourses": {
    "semesterKey": {
      "semester": "Fall/Spring/Summer",
      "year": 2023,
      "academicStanding": "Good Standing",
      "courses": [
        {
          "id": "unique_id",
          "subject": "CS",
          "courseNumber": "18000",
          "courseCode": "CS 18000",
          "courseTitle": "Programming I",
          "level": "Undergraduate",
          "credits": 4,
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

Transcript to parse:
${transcriptText}

Return only the JSON object, no additional text.`;
  }

  parseAIResponse(aiResponse) {
    try {
      // Extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      
      // Add upload date
      parsedData.uploadDate = new Date();
      parsedData.verificationStatus = 'pending';

      return parsedData;
    } catch (error) {
      console.error('JSON parsing error:', error);
      throw new Error('Failed to parse AI response');
    }
  }

  getProcessingStatus(jobId) {
    const job = this.processingJobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }
    return job;
  }
}

module.exports = new TranscriptController(); 