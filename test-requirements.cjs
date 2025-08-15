const { getDegreeRequirements } = require('./src/data/degreeRequirements.js');

console.log('Testing degree requirements:');
console.log('Computer Science + Machine Intelligence:', getDegreeRequirements('Computer Science', 'Machine Intelligence') !== null);
console.log('Computer Science + Software Engineering:', getDegreeRequirements('Computer Science', 'Software Engineering') !== null);
console.log('Data Science:', getDegreeRequirements('Data Science') !== null);

const dsInfo = getDegreeRequirements('Data Science');
console.log('Data Science degree title:', dsInfo ? dsInfo.degree_info.degree : 'NOT FOUND');

const csmiInfo = getDegreeRequirements('Computer Science', 'Machine Intelligence');
console.log('CS-MI degree title:', csmiInfo ? csmiInfo.degree_info.degree : 'NOT FOUND');

const csseInfo = getDegreeRequirements('Computer Science', 'Software Engineering');
console.log('CS-SE degree title:', csseInfo ? csseInfo.degree_info.degree : 'NOT FOUND');