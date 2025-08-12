#!/usr/bin/env node

// Test the improved offline parser with better student info regex patterns

// Sample transcript text (real format from user's transcript)
const sampleTranscriptText = `Student Type
Continuing
Purdue Production Instance
Unofficial Academic Transcript
This is not an official transcript. Courses which are in progress may also be included on this transcript.
Transcript Data
STUDENT INFORMATION
Name
Rohit Vayugundla Rao
Current Program
Bachelor of Science
Program
Computer Science-BS
College
College of Science
Campus
Indianapolis and W Lafayette
Major
Computer Science
INSTITUTION CREDIT
Period: Fall 2024
College
College of Science
Major
Computer Science
Academic Standing
Academic Notice
Subject Course Campus Level Title Grade Credit Hours Quality Points R
CS 18000 Indianapolis and W Lafayette UG Prob Solving & O-O Programming F 4.000 0.00 E
CS 19300 Indianapolis and W Lafayette UG Tools B 1.000 3.00
MA 16500 Indianapolis and W Lafayette UG Anlytc Geomtry&Calc I B 4.000 12.00
SCLA 10100 Indianapolis and W Lafayette UG Crit Think & Com I B 3.000 9.00
TDM 10100 Indianapolis and W Lafayette UG The Data Mine Seminar I D 1.000 1.00
TDM 11100 Indianapolis and W Lafayette UG Corporate Partners I W 3.000 0.00
Period Totals
Attempt Hours Passed Hours Earned Hours GPA Hours Quality Points GPA (Undergraduate)
Current Period 16.000 9.000 9.000 9.000 25.00 2.78
Cumulative 16.000 9.000 9.000 9.000 25.00 2.78
Period: Spring 2025
College
College of Science
Major
Computer Science
Academic Standing
Continued Good Standing
Subject Course Campus Level Title Grade Credit Hours Quality Points R
CS 18000 Indianapolis and W Lafayette UG Prob Solving & O-O Programming C 4.000 8.00 I
EAPS 10600 Indianapolis and W Lafayette UG Geosciences Cinema A+ 3.000 12.00
MA 16600 Indianapolis and W Lafayette UG Analytc Geom & Calc II B+ 4.000 13.20
PHYS 17200 Indianapolis and W Lafayette UG Modern Mechanics B- 4.000 10.80
TDM 10200 Indianapolis and W Lafayette UG The Data Mine Seminar II B 1.000 3.00
Period Totals
Attempt Hours Passed Hours Earned Hours GPA Hours Quality Points GPA (Undergraduate)
Current Period 16.000 16.000 16.000 16.000 47.00 2.94
Cumulative 32.000 25.000 25.000 25.000 72.00 2.88
TRANSCRIPT TOTALS
Transcript Totals
Attempt Hours Passed Hours Earned Hours GPA Hours Quality Points GPA (Undergraduate)
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
CLCS 23500 Indianapolis and W Lafayette UG Intr To Classical Myth 3.000
CS 19000 Indianapolis and W Lafayette UG Intro To Professional Practice 1.000
CS 25000 Indianapolis and W Lafayette UG Computer Architecture 4.000
CS 25100 Indianapolis and W Lafayette UG Data Structures And Algorithms 3.000
MA 26100 Indianapolis and W Lafayette UG Multivariate Calculus 4.000
SCLA 10200 Indianapolis and W Lafayette UG Crit Think & Com II 3.000`;

// Simulate the offline parser functions
const extractStudentInfo = (text) => {
  const studentInfo = {};

  console.log('🔍 Testing student info extraction...');

  // Extract name - look for "Name" followed by the actual name
  const nameMatch = text.match(/Name\s+([A-Za-z\s]+?)(?:\s+Current\s+Program|\s+Program)/i);
  if (nameMatch) {
    studentInfo.name = nameMatch[1].trim();
    console.log('✅ Name found with pattern 1:', studentInfo.name);
  }

  // Alternative name pattern for when name appears on next line
  if (!studentInfo.name) {
    const nameMatch2 = text.match(/Name\s*\n\s*([A-Za-z\s]+?)(?:\s*\n)/i);
    if (nameMatch2) {
      studentInfo.name = nameMatch2[1].trim();
      console.log('✅ Name found with pattern 2:', studentInfo.name);
    }
  }

  // Extract program - look for specific program format with "-BS", "-MS", etc.
  const programMatch = text.match(/Program\s+([^\n]*?-(?:BS|MS|PhD|BA|MA))/i);
  if (programMatch) {
    studentInfo.program = programMatch[1].trim();
    console.log('✅ Program found with pattern 1:', studentInfo.program);
  }

  // Alternative program pattern
  if (!studentInfo.program) {
    const programMatch2 = text.match(/Program\s*\n\s*([^\n]*?-(?:BS|MS|PhD|BA|MA))/i);
    if (programMatch2) {
      studentInfo.program = programMatch2[1].trim();
      console.log('✅ Program found with pattern 2:', studentInfo.program);
    }
  }

  // Extract college - look for "College of" pattern
  const collegeMatch = text.match(/College\s+(College\s+of\s+[^\n]+)/i);
  if (collegeMatch) {
    studentInfo.college = collegeMatch[1].trim();
    console.log('✅ College found with pattern 1:', studentInfo.college);
  }

  // Alternative college pattern
  if (!studentInfo.college) {
    const collegeMatch2 = text.match(/College\s*\n\s*(College\s+of\s+[^\n]+)/i);
    if (collegeMatch2) {
      studentInfo.college = collegeMatch2[1].trim();
      console.log('✅ College found with pattern 2:', studentInfo.college);
    }
  }

  // Extract campus - look for campus information
  const campusMatch = text.match(/Campus\s+([^\n]*(?:Lafayette|Indianapolis)[^\n]*)/i);
  if (campusMatch) {
    studentInfo.campus = campusMatch[1].trim();
    console.log('✅ Campus found with pattern 1:', studentInfo.campus);
  }

  // Alternative campus pattern
  if (!studentInfo.campus) {
    const campusMatch2 = text.match(/Campus\s*\n\s*([^\n]*(?:Lafayette|Indianapolis)[^\n]*)/i);
    if (campusMatch2) {
      studentInfo.campus = campusMatch2[1].trim();
      console.log('✅ Campus found with pattern 2:', studentInfo.campus);
    }
  }

  return studentInfo;
};

const extractCompletedCourses = (text) => {
  const courses = [];
  
  // Find all period sections with completed courses
  const periodRegex = /Period:\s*(Fall|Spring|Summer)\s+(\d{4})([\s\S]*?)(?=Period:|TRANSCRIPT\s+TOTALS|COURSE\(S\)\s+IN\s+PROGRESS|$)/gi;
  let periodMatch;

  while ((periodMatch = periodRegex.exec(text)) !== null) {
    const semester = periodMatch[1];
    const year = parseInt(periodMatch[2]);
    const periodContent = periodMatch[3];

    // Skip if this section doesn't contain grades (likely in-progress)
    if (!periodContent.includes('Grade') || !periodContent.match(/[A-F][+-]?|W|I/)) {
      continue;
    }

    console.log(`📚 Processing period: ${semester} ${year}`);

    // Extract courses from this period - look for course table rows
    const coursePattern = /([A-Z]{2,5})\s+(\d{5})\s+[^\n]*?\s+(UG|GR)\s+([^\n]+?)\s+([A-F][+-]?|W|I|P|S|N)\s+(\d+\.?\d*)\s+(\d+\.?\d*)/gi;
    let courseMatch;

    while ((courseMatch = coursePattern.exec(periodContent)) !== null) {
      const subject = courseMatch[1];
      const courseNumber = courseMatch[2];
      const level = courseMatch[3];
      const title = courseMatch[4].trim();
      const grade = courseMatch[5];
      const credits = parseFloat(courseMatch[6]);
      const qualityPoints = parseFloat(courseMatch[7]);

      const course = {
        course_code: `${subject} ${courseNumber}`,
        title: title,
        credits: credits,
        grade: grade,
        semester: semester,
        year: year
      };

      courses.push(course);
      console.log(`  ➕ Added course: ${course.course_code} - ${course.title} (${course.grade})`);
    }
  }

  return courses;
};

const extractInProgressCourses = (text) => {
  const courses = [];
  
  // Find the COURSE(S) IN PROGRESS section
  const progressSection = text.match(/COURSE\(S\)\s+IN\s+PROGRESS([\s\S]*?)$/i);
  if (!progressSection) {
    console.log('📝 No in-progress courses section found');
    return courses;
  }

  const progressContent = progressSection[1];
  console.log('⏳ Processing in-progress courses...');

  // Find period subsections within in-progress
  const periodRegex = /Period:\s*(Fall|Spring|Summer)\s+(\d{4})([\s\S]*?)(?=Period:|$)/gi;
  let periodMatch;

  while ((periodMatch = periodRegex.exec(progressContent)) !== null) {
    const semester = periodMatch[1];
    const year = parseInt(periodMatch[2]);
    const periodContent = periodMatch[3];

    console.log(`📚 Processing in-progress period: ${semester} ${year}`);

    // Extract courses from this period - no grades for in-progress
    const coursePattern = /([A-Z]{2,5})\s+(\d{5})\s+[^\n]*?\s+(UG|GR)\s+([^\n]+?)\s+(\d+\.?\d*)/gi;
    let courseMatch;

    while ((courseMatch = coursePattern.exec(periodContent)) !== null) {
      const subject = courseMatch[1];
      const courseNumber = courseMatch[2];
      const level = courseMatch[3];
      const title = courseMatch[4].trim();
      const credits = parseFloat(courseMatch[5]);

      const course = {
        course_code: `${subject} ${courseNumber}`,
        title: title,
        credits: credits,
        semester: semester,
        year: year
      };

      courses.push(course);
      console.log(`  ➕ Added in-progress course: ${course.course_code} - ${course.title}`);
    }
  }

  return courses;
};

const extractGPASummary = (text) => {
  const gpaSummary = {};

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

  return gpaSummary;
};

console.log('🧪 Testing improved offline parser...');
console.log('='.repeat(60));

try {
  // Test student info extraction
  const studentInfo = extractStudentInfo(sampleTranscriptText);
  console.log('\n👤 Student Information Results:');
  console.log('- Name:', studentInfo.name || 'NOT FOUND');
  console.log('- Program:', studentInfo.program || 'NOT FOUND');
  console.log('- College:', studentInfo.college || 'NOT FOUND');
  console.log('- Campus:', studentInfo.campus || 'NOT FOUND');

  // Test completed courses extraction
  const completedCourses = extractCompletedCourses(sampleTranscriptText);
  console.log(`\n📚 Completed Courses: ${completedCourses.length} found`);
  completedCourses.forEach((course, index) => {
    console.log(`${index + 1}. ${course.course_code} - ${course.title} (${course.grade}, ${course.credits} credits)`);
  });

  // Test in-progress courses extraction  
  const inProgressCourses = extractInProgressCourses(sampleTranscriptText);
  console.log(`\n⏳ In-Progress Courses: ${inProgressCourses.length} found`);
  inProgressCourses.forEach((course, index) => {
    console.log(`${index + 1}. ${course.course_code} - ${course.title} (${course.credits} credits)`);
  });

  // Test GPA extraction
  const gpaSummary = extractGPASummary(sampleTranscriptText);
  console.log('\n📊 GPA Summary:');
  console.log('- Overall GPA:', gpaSummary.overall_gpa || 'NOT FOUND');
  console.log('- Total Credits:', gpaSummary.total_credits || 'NOT FOUND');

  console.log('\n✅ Test completed successfully!');
  console.log('📊 Summary:');
  console.log(`- Student name: ${studentInfo.name ? '✅' : '❌'}`);
  console.log(`- Program: ${studentInfo.program ? '✅' : '❌'}`);
  console.log(`- College: ${studentInfo.college ? '✅' : '❌'}`);
  console.log(`- Campus: ${studentInfo.campus ? '✅' : '❌'}`);
  console.log(`- Completed courses: ${completedCourses.length} ✅`);
  console.log(`- In-progress courses: ${inProgressCourses.length} ✅`);
  console.log(`- GPA extracted: ${gpaSummary.overall_gpa ? '✅' : '❌'}`);

} catch (error) {
  console.error('❌ Test failed:', error.message);
}