// Test script for the enhanced transcript parser
const { testEnhancedTranscriptParsing } = require('./src/services/transcriptParser.ts');

async function runTest() {
  console.log('🧪 Starting enhanced transcript parser test...');
  
  try {
    const result = await testEnhancedTranscriptParsing();
    
    console.log('\n✅ Test completed successfully!');
    console.log('📊 Final Results:');
    console.log(`   Student: ${result.student_info?.name || 'Unknown'}`);
    console.log(`   Completed Courses: ${result.completed_courses?.length || 0}`);
    console.log(`   In-Progress Courses: ${result.courses_in_progress?.length || 0}`);
    console.log(`   Overall GPA: ${result.gpa_summary?.overall_gpa || 'N/A'}`);
    
    if (result.completed_courses?.length > 0) {
      console.log('\n📚 Sample Completed Courses:');
      result.completed_courses.slice(0, 5).forEach(course => {
        console.log(`   - ${course.course_code}: ${course.title} (${course.grade}) - ${course.credits} credits`);
      });
    }
    
    if (result.courses_in_progress?.length > 0) {
      console.log('\n⏳ Sample In-Progress Courses:');
      result.courses_in_progress.slice(0, 3).forEach(course => {
        console.log(`   - ${course.course_code}: ${course.title} - ${course.credits} credits`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTest();