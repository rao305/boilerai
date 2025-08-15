// Major list based on Purdue University's academic programs
export const purdueMajors = [
  // Engineering
  "Aerospace Engineering",
  "Agricultural and Biological Engineering",
  "Biomedical Engineering", 
  "Chemical Engineering",
  "Civil Engineering",
  "Computer Engineering",
  "Electrical Engineering",
  "Environmental and Ecological Engineering",
  "Industrial Engineering",
  "Materials Engineering",
  "Mechanical Engineering",
  "Nuclear Engineering",

  // Computer Science & Technology
  "Computer Science",
  "Data Science",
  "Cybersecurity",
  "Information Technology",
  "Computer Graphics Technology",
  "Web Programming and Design",

  // Business
  "Accounting",
  "Economics",
  "Finance",
  "Management",
  "Marketing",
  "Supply Chain Management",
  "Business Analytics and Information Management",
  "Hospitality and Tourism Management",

  // Agriculture & Life Sciences
  "Agricultural Economics",
  "Agronomy",
  "Animal Sciences",
  "Biochemistry",
  "Biology",
  "Botany and Plant Pathology",
  "Entomology",
  "Food Science",
  "Forestry",
  "Horticulture",
  "Nutrition Science",
  "Pre-Veterinary Medicine",

  // Liberal Arts
  "Anthropology",
  "Art and Design",
  "Communication",
  "Creative Writing",
  "English",
  "Film and Video Studies",
  "History",
  "Journalism and Mass Communication",
  "Linguistics",
  "Philosophy",
  "Political Science",
  "Psychology",
  "Sociology",
  "Spanish",
  "Theatre",

  // Science
  "Actuarial Science",
  "Atmospheric Science",
  "Chemistry",
  "Earth and Environmental Sciences",
  "Mathematics",
  "Physics",
  "Statistics",

  // Health & Human Sciences
  "Exercise Science",
  "Health Sciences",
  "Human Development and Family Studies",
  "Nursing",
  "Nutrition, Fitness, and Health",
  "Public Health",

  // Education
  "Elementary Education",
  "Secondary Education",
  "Special Education",

  // Aviation & Transportation
  "Aeronautical Engineering Technology",
  "Aviation Management",
  "Professional Flight",

  // Other Popular Programs
  "Architecture",
  "Construction Management",
  "Interior Design",
  "Landscape Architecture",
  "Undecided/Exploratory",
  "Other"
];

export const classStatusOptions = [
  { value: "freshman", label: "Freshman" },
  { value: "sophomore", label: "Sophomore" },
  { value: "junior", label: "Junior" },
  { value: "senior", label: "Senior" },
  { value: "graduate", label: "Graduate Student" },
  { value: "phd", label: "PhD Student" }
];

// Major-specific concentrations
export const majorConcentrations = {
  "Computer Science": [
    "Machine Intelligence",
    "Software Engineering",
    "Computer Graphics and Visualization", 
    "Computational Science and Engineering",
    "Database and Information Systems",
    "Distributed and Parallel Systems",
    "Programming Languages",
    "Security",
    "Systems Software"
  ],
  // Add more majors and their concentrations as needed
};

// Helper function to get concentrations for a major
export const getConcentrations = (major) => {
  return majorConcentrations[major] || [];
};