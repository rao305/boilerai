const mongoose = require('mongoose');
const crypto = require('crypto');

// Schema for individual courses
const CourseSchema = new mongoose.Schema({
  courseCode: { type: String, required: true },
  courseName: { type: String, required: true },
  credits: { type: Number, required: true },
  grade: { type: String, required: true },
  gradePoints: { type: Number, required: true },
  semester: { type: String, required: true },
  year: { type: Number, required: true },
  isTransferCredit: { type: Boolean, default: false },
  department: String,
  level: { type: String, enum: ['undergraduate', 'graduate', 'unknown'], default: 'undergraduate' }
}, { _id: false });

// Schema for semester summaries
const SemesterSummarySchema = new mongoose.Schema({
  semester: { type: String, required: true },
  year: { type: Number, required: true },
  courses: [CourseSchema],
  semesterGPA: Number,
  semesterCredits: Number,
  totalCreditsToDate: Number,
  cumulativeGPA: Number
}, { _id: false });

// Main UserTranscript schema
const UserTranscriptSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  
  // Student Information (encrypted)
  studentInfo: {
    name: { type: String, required: true },
    studentId: String,
    program: String,
    college: String,
    major: String,
    minor: String,
    concentrations: [String],
    expectedGraduation: String,
    admissionDate: String
  },
  
  // Academic Data
  academicSummary: {
    cumulativeGPA: Number,
    majorGPA: Number,
    totalCreditsEarned: Number,
    totalCreditsAttempted: Number,
    academicStanding: String,
    honorsDesignations: [String]
  },
  
  // Coursework organized by semester
  semesterHistory: [SemesterSummarySchema],
  
  // All completed courses (flattened for easy querying)
  allCourses: [CourseSchema],
  
  // Derived insights for quick access
  insights: {
    eligibleTracks: [String],
    codoCourses: [String],
    prerequisitesMet: [String],
    suggestedNextCourses: [String],
    mathSequenceProgress: String,
    csCoreCourseProgress: {
      cs180: Boolean,
      cs240: Boolean,
      cs250: Boolean,
      cs251: Boolean,
      ma161: Boolean,
      ma162: Boolean,
      ma265: Boolean,
      stat355: Boolean
    },
    trackEligibility: {
      systemsProgramming: Boolean,
      softwareEngineering: Boolean,
      machineLearning: Boolean,
      cybersecurity: Boolean,
      computationalScience: Boolean
    }
  },
  
  // Processing metadata
  processingInfo: {
    uploadDate: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    processingVersion: { type: String, default: '1.0' },
    aiProcessed: { type: Boolean, default: false },
    validationStatus: { 
      type: String, 
      enum: ['pending', 'validated', 'needs_review', 'rejected'], 
      default: 'pending' 
    },
    confidenceScore: { type: Number, min: 0, max: 1 },
    extractionNotes: [String]
  },
  
  // Privacy and audit trail
  privacySettings: {
    shareWithAdvisor: { type: Boolean, default: false },
    shareForResearch: { type: Boolean, default: false },
    dataRetentionDays: { type: Number, default: 365 }
  },
  
  auditTrail: [{
    action: String,
    timestamp: { type: Date, default: Date.now },
    userId: mongoose.Schema.Types.ObjectId,
    details: mongoose.Schema.Types.Mixed
  }]
  
}, {
  timestamps: true,
  // Add indexes for common queries
  indexes: [
    { userId: 1, 'processingInfo.uploadDate': -1 },
    { 'studentInfo.studentId': 1 },
    { 'academicSummary.cumulativeGPA': 1 }
  ]
});

// Encryption middleware for sensitive data
UserTranscriptSchema.pre('save', function(next) {
  // Update lastUpdated timestamp
  this.processingInfo.lastUpdated = new Date();
  
  // Add audit trail entry
  this.auditTrail.push({
    action: this.isNew ? 'created' : 'updated',
    timestamp: new Date(),
    userId: this.userId,
    details: { fieldsModified: this.modifiedPaths() }
  });
  
  next();
});

// Instance methods for academic analysis
UserTranscriptSchema.methods.calculateTrackEligibility = function() {
  const courses = this.allCourses.map(c => c.courseCode.toUpperCase());
  const gpa = this.academicSummary.cumulativeGPA;
  
  // CS CODO requirements
  const isCODOEligible = () => {
    const hasCS180 = courses.some(c => c.includes('CS 180') || c.includes('CS18000'));
    const hasCalc = courses.some(c => c.includes('MA 161') || c.includes('MA16100'));
    return hasCS180 && hasCalc && gpa >= 2.5;
  };
  
  // Track-specific eligibility
  const eligibility = {
    codo: isCODOEligible(),
    systemsProgramming: courses.includes('CS 240') && courses.includes('CS 250'),
    softwareEngineering: courses.includes('CS 240') && courses.includes('CS 251'),
    machineLearning: courses.includes('STAT 355') && courses.includes('MA 265'),
    cybersecurity: courses.includes('CS 240') && gpa >= 3.0,
    computationalScience: courses.includes('MA 162') && courses.includes('PHYS 172')
  };
  
  this.insights.trackEligibility = eligibility;
  return eligibility;
};

UserTranscriptSchema.methods.getNextCourseRecommendations = function() {
  const completedCourses = this.allCourses.map(c => c.courseCode.toUpperCase());
  const recommendations = [];
  
  // CS sequence recommendations
  if (completedCourses.some(c => c.includes('CS 180'))) {
    if (!completedCourses.some(c => c.includes('CS 240'))) {
      recommendations.push({
        course: 'CS 24000',
        name: 'Programming in C',
        reason: 'Next core CS course after CS 180',
        priority: 'high'
      });
    }
  }
  
  // Math sequence
  if (completedCourses.some(c => c.includes('MA 161'))) {
    if (!completedCourses.some(c => c.includes('MA 162'))) {
      recommendations.push({
        course: 'MA 16200',
        name: 'Calculus II',
        reason: 'Continue calculus sequence',
        priority: 'high'
      });
    }
  }
  
  // Statistics for ML track
  if (this.insights.trackEligibility?.machineLearning === false) {
    if (!completedCourses.some(c => c.includes('STAT 355'))) {
      recommendations.push({
        course: 'STAT 35500',
        name: 'Introduction to Statistics',
        reason: 'Required for Machine Learning track',
        priority: 'medium'
      });
    }
  }
  
  this.insights.suggestedNextCourses = recommendations;
  return recommendations;
};

UserTranscriptSchema.methods.getAcademicSummary = function() {
  return {
    name: this.studentInfo.name,
    gpa: this.academicSummary.cumulativeGPA,
    totalCredits: this.academicSummary.totalCreditsEarned,
    major: this.studentInfo.major,
    program: this.studentInfo.program,
    expectedGraduation: this.studentInfo.expectedGraduation,
    eligibleTracks: this.insights.eligibleTracks || [],
    nextCourses: this.insights.suggestedNextCourses || []
  };
};

// Static methods for querying
UserTranscriptSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId }).sort({ 'processingInfo.uploadDate': -1 });
};

UserTranscriptSchema.statics.findEligibleForTrack = function(trackName) {
  const query = {};
  query[`insights.trackEligibility.${trackName}`] = true;
  return this.find(query);
};

module.exports = mongoose.model('UserTranscript', UserTranscriptSchema);