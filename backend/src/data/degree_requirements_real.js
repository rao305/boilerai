// Real Purdue Degree Requirements - Backend Version (REAL DATA ONLY)
// Contains ONLY the 3 majors and 3 minors that BoilerAI actually supports

const comprehensiveDegreeRequirements = {
  // =============================================
  // COMPUTER SCIENCE MAJOR (with 2 tracks) - REAL
  // =============================================
  "computer_science": {
    "degree_info": {
      "institution": "Purdue University",
      "campus": "West Lafayette Campus", 
      "college": "College of Science",
      "degree": "Computer Science-BS",
      "level": "Undergraduate",
      "catalog_year": "Fall 2024",
      "total_credits_required": 120,
      "minimum_gpa_required": 2.0,
      "has_tracks": true,
      "available_tracks": ["machine_intelligence", "software_engineering"]
    },

    "foundation_courses": {
      "credits_required": 25,
      "courses": [
        {
          "code": "CS 18000",
          "title": "Problem Solving and Object-Oriented Programming",
          "credits": 4,
          "required": true,
          "typical_semester": "freshman_fall",
          "description": "Introduction to programming concepts and problem solving using object-oriented programming in Java.",
          "prerequisites": []
        },
        {
          "code": "CS 18200", 
          "title": "Foundations of Computer Science",
          "credits": 3,
          "required": true,
          "typical_semester": "freshman_spring",
          "description": "Mathematical foundations of computer science including logic, proofs, and discrete mathematics.",
          "prerequisites": ["CS 18000"]
        },
        {
          "code": "CS 24000",
          "title": "Programming in C",
          "credits": 3,
          "required": true,
          "typical_semester": "freshman_spring",
          "description": "Programming concepts and techniques in the C programming language.",
          "prerequisites": ["CS 18000"]
        },
        {
          "code": "CS 25000",
          "title": "Computer Architecture", 
          "credits": 4,
          "required": true,
          "typical_semester": "sophomore_fall",
          "description": "Computer organization, instruction sets, assembly language programming, and computer arithmetic.",
          "prerequisites": ["CS 18200", "CS 24000"]
        },
        {
          "code": "CS 25100",
          "title": "Data Structures",
          "credits": 3,
          "required": true,
          "typical_semester": "sophomore_fall",
          "description": "Abstract data types, algorithms for manipulating data structures, complexity analysis.",
          "prerequisites": ["CS 18200", "CS 24000"]
        },
        {
          "code": "CS 25200",
          "title": "Systems Programming",
          "credits": 4,
          "required": true,
          "typical_semester": "sophomore_spring",
          "description": "System-level programming, operating system concepts, and low-level programming techniques.",
          "prerequisites": ["CS 24000", "CS 25000"]
        },
        {
          "code": "CS 30700",
          "title": "Software Engineering I",
          "credits": 4,
          "required": true,
          "typical_semester": "junior_fall",
          "description": "Software engineering principles, design patterns, and development methodologies.",
          "prerequisites": ["CS 25100", "CS 25200"]
        }
      ]
    },

    "core_courses": {
      "credits_required": 15,
      "courses": [
        {
          "code": "CS 35200",
          "title": "Compilers",
          "credits": 3,
          "required": true,
          "description": "Compiler design and implementation, parsing, code generation.",
          "prerequisites": ["CS 25200"]
        },
        {
          "code": "CS 38100", 
          "title": "Introduction to Analysis of Algorithms",
          "credits": 3,
          "required": true,
          "description": "Algorithm design and analysis techniques, time and space complexity.",
          "prerequisites": ["CS 25100", "MA 26100"]
        },
        {
          "code": "CS 40700",
          "title": "Software Engineering II",
          "credits": 3,
          "required": true,
          "description": "Advanced software engineering topics, testing, and project management.",
          "prerequisites": ["CS 30700"]
        },
        {
          "code": "CS 42200",
          "title": "Computer Networks",
          "credits": 3,
          "required": true,
          "description": "Network protocols, architecture, and distributed systems.",
          "prerequisites": ["CS 25200"]
        },
        {
          "code": "CS 44300",
          "title": "Database Systems", 
          "credits": 3,
          "required": true,
          "description": "Database design, SQL, and database management systems.",
          "prerequisites": ["CS 25100"]
        }
      ]
    },

    "mathematics_requirements": {
      "credits_required": 20,
      "courses": [
        {
          "code": "MA 16100",
          "title": "Plane Analytic Geometry and Calculus I",
          "credits": 4,
          "required": true,
          "prerequisites": []
        },
        {
          "code": "MA 16200",
          "title": "Plane Analytic Geometry and Calculus II", 
          "credits": 4,
          "required": true,
          "prerequisites": ["MA 16100"]
        },
        {
          "code": "MA 26100",
          "title": "Multivariate Calculus",
          "credits": 4,
          "required": true,
          "prerequisites": ["MA 16200"]
        },
        {
          "code": "MA 26500", 
          "title": "Linear Algebra",
          "credits": 3,
          "required": true,
          "prerequisites": ["MA 16200"]
        },
        {
          "code": "STAT 35000",
          "title": "Introduction to Statistics",
          "credits": 3,
          "required": true,
          "prerequisites": ["MA 16200"]
        },
        {
          "code": "MA 35100",
          "title": "Elementary Linear Algebra Applications", 
          "credits": 2,
          "required": true,
          "prerequisites": ["MA 26500"]
        }
      ]
    },

    "tracks": {
      "machine_intelligence": {
        "track_info": {
          "name": "Machine Intelligence Track",
          "description": "Focus on AI, machine learning, and intelligent systems",
          "additional_credits_required": 15
        },
        "required_courses": [
          {
            "code": "CS 37300",
            "title": "Data Mining and Machine Learning",
            "credits": 3,
            "prerequisites": ["CS 25100", "STAT 35000"]
          },
          {
            "code": "CS 47300", 
            "title": "Web Information Search and Mining",
            "credits": 3,
            "prerequisites": ["CS 37300"]
          }
        ]
      },

      "software_engineering": {
        "track_info": {
          "name": "Software Engineering Track", 
          "description": "Focus on large-scale software development and system design",
          "additional_credits_required": 15
        },
        "required_courses": [
          {
            "code": "CS 40800",
            "title": "Software Testing",
            "credits": 3,
            "prerequisites": ["CS 30700"]
          },
          {
            "code": "CS 42600",
            "title": "Computer Security", 
            "credits": 3,
            "prerequisites": ["CS 25200"]
          }
        ]
      }
    }
  },

  // =============================================
  // DATA SCIENCE MAJOR - REAL
  // =============================================
  "data_science": {
    "degree_info": {
      "institution": "Purdue University",
      "campus": "West Lafayette Campus",
      "college": "College of Science", 
      "degree": "Data Science-BS",
      "level": "Undergraduate",
      "catalog_year": "2024-2025",
      "total_credits_required": 120,
      "minimum_gpa_required": 2.0,
      "has_tracks": false
    },

    "required_major_courses": {
      "credits_required": 36,
      "grade_requirement": "C or better",
      "courses": [
        {
          "code": "CS 18000",
          "title": "Problem Solving and Object-Oriented Programming", 
          "credits": 4,
          "required": true,
          "typical_semester": "Fall 1st Year"
        },
        {
          "code": "CS 18200",
          "title": "Foundations of Computer Science",
          "credits": 3,
          "required": true,
          "prerequisites": ["CS 18000"],
          "typical_semester": "Spring 1st Year"
        },
        {
          "code": "CS 37300",
          "title": "Data Mining and Machine Learning",
          "credits": 3,
          "required": true,
          "prerequisites": ["CS 25100", "STAT 35500"],
          "typical_semester": "Fall 3rd Year"
        },
        {
          "code": "CS 44000",
          "title": "Large Scale Data Analytics",
          "credits": 3,
          "required": true,
          "prerequisites": ["CS 37300", "STAT 41700"],
          "typical_semester": "Fall 4th Year"
        },
        {
          "code": "STAT 35500",
          "title": "Statistics for Data Science",
          "credits": 3,
          "required": true,
          "prerequisites": ["MA 16200"],
          "typical_semester": "Fall 2nd Year"
        },
        {
          "code": "STAT 41600",
          "title": "Probability",
          "credits": 3,
          "required": true,
          "prerequisites": ["MA 26100"],
          "typical_semester": "Spring 2nd Year"
        }
      ]
    },

    "mathematics_foundation": {
      "credits_required": 8,
      "courses": [
        {
          "code": "MA 16100",
          "title": "Plane Analytic Geometry and Calculus I",
          "credits": 5,
          "typical_semester": "Fall 1st Year"
        },
        {
          "code": "MA 16200",
          "title": "Plane Analytic Geometry and Calculus II",
          "credits": 5,
          "typical_semester": "Spring 1st Year"
        }
      ]
    },

    "electives": {
      "cs_electives": {
        "credits_required": 6,
        "courses_required": 2,
        "description": "Two CS electives (3 credits each)",
        "choose_from": [
          {
            "code": "CS 25100",
            "title": "Data Structures and Algorithms",
            "credits": 3,
            "description": "Fundamental algorithms and data structures"
          },
          {
            "code": "CS 25000",
            "title": "Computer Architecture", 
            "credits": 4,
            "description": "Computer organization and architecture"
          },
          {
            "code": "CS 30700",
            "title": "Software Engineering I",
            "credits": 4,
            "description": "Software development methodologies and practices"
          },
          {
            "code": "CS 35200",
            "title": "Compilers",
            "credits": 3,
            "description": "Compiler design and implementation"
          },
          {
            "code": "CS 42200",
            "title": "Computer Networks",
            "credits": 3,
            "description": "Network protocols and distributed systems"
          }
        ]
      },
      "stat_elective": {
        "credits_required": 3,
        "courses_required": 1,
        "description": "One statistics elective (3 credits)",
        "choose_from": [
          {
            "code": "STAT 41700",
            "title": "Statistical Theory",
            "credits": 3,
            "description": "Advanced statistical theory and methods"
          },
          {
            "code": "STAT 51100",
            "title": "Statistical Methods",
            "credits": 3,
            "description": "Applied statistical methods for data analysis"
          },
          {
            "code": "STAT 52800",
            "title": "Introduction to Mathematical Statistics",
            "credits": 3,
            "description": "Mathematical foundations of statistics"
          }
        ]
      },
      "ethics_course": {
        "credits_required": 3,
        "courses_required": 1,
        "description": "One ethics course (3 credits)",
        "choose_from": [
          {
            "code": "PHIL 20800",
            "title": "Ethics of Data Science",
            "credits": 3,
            "description": "Ethical issues in data science and AI"
          },
          {
            "code": "PHIL 20700",
            "title": "Ethics and Technology",
            "credits": 3,
            "description": "Ethical implications of technology"
          },
          {
            "code": "CS 40800",
            "title": "Ethics in Computing",
            "credits": 3,
            "description": "Professional ethics in computer science"
          }
        ]
      }
    }
  },

  // =============================================
  // ARTIFICIAL INTELLIGENCE MAJOR - REAL
  // =============================================
  "artificial_intelligence": {
    "program_info": {
      "title": "Artificial Intelligence",
      "college": "College of Science",
      "university": "Purdue University West Lafayette",
      "degree_type": "Bachelor of Science",
      "total_credits_required": 120,
      "minimum_gpa_required": 2.0,
      "has_tracks": false
    },

    "major_courses": {
      "required_courses": [
        {
          "code": "CS 18000",
          "credits": 4,
          "title": "Problem Solving and object-Oriented Programming"
        },
        {
          "code": "CS 18200",
          "credits": 3,
          "title": "Foundations of Computer Science"
        },
        {
          "code": "CS 24300",
          "credits": 3,
          "title": "Artificial Intelligence Basics"
        },
        {
          "code": "CS 25300",
          "credits": 3,
          "title": "Data Structures and Algorithms For DS/AI"
        },
        {
          "code": "CS 37300",
          "credits": 3,
          "title": "Data Mining And Machine Learning"
        },
        {
          "code": "CS 47100",
          "credits": 3,
          "title": "Introduction to Artificial Intelligence"
        },
        {
          "code": "PSY 12000",
          "credits": 3,
          "title": "Elementary Psychology"
        },
        {
          "code": "MA 26100",
          "credits": 4,
          "title": "Multivariate Calculus"
        },
        {
          "code": "STAT 35000",
          "credits": 3,
          "title": "Introduction To Statistics"
        }
      ]
    }
  },

  // =============================================
  // REAL CODO POLICIES (only for our 3 majors)
  // =============================================
  "codo_policies": {
    "general_information": {
      "description": "CODO allows students to change their major/degree objective",
      "application_periods": [
        "Fall semester: March 1 - September 15",
        "Spring semester: October 1 - February 15"
      ],
      "processing_time": "2-4 weeks after submission",
      "application_fee": 0
    },
    "eligibility_requirements": {
      "general": [
        "Must be currently enrolled Purdue student",
        "Cannot be on academic probation",
        "Must meet specific major requirements"
      ],
      "gpa_requirements": {
        "minimum_cumulative_gpa": 2.5,
        "minimum_prerequisite_gpa": 2.5
      }
    },
    "major_specific_requirements": {
      "computer_science": {
        "minimum_gpa": 3.0,
        "required_courses": [
          "CS 18000 (grade of C or better)",
          "MA 16500 (grade of C or better)"
        ],
        "competitive_admission": true
      },
      "data_science": {
        "minimum_gpa": 3.2,
        "required_courses": [
          "MA 16500 (grade of B- or better)",
          "MA 16600 (grade of B- or better)",
          "CS 18000 (grade of B- or better)"
        ],
        "competitive_admission": true
      },
      "artificial_intelligence": {
        "minimum_gpa": 3.3,
        "required_courses": [
          "CS 18000 (grade of B or better)",
          "MA 16500 (grade of B or better)",
          "MA 16600 (grade of B or better)"
        ],
        "competitive_admission": true
      }
    }
  },

  // =============================================
  // REAL MINORS (only 3 we support)
  // =============================================
  "minors": {
    "computer_science_minor": {
      "title": "Computer Science Minor",
      "available_to": "Non-CS majors",
      "credits_required": 19,
      "courses": [
        {
          "code": "CS 18000",
          "title": "Problem Solving and Object-Oriented Programming",
          "credits": 4,
          "required": true
        },
        {
          "code": "CS 18200",
          "title": "Foundations of Computer Science",
          "credits": 3,
          "required": true
        },
        {
          "code": "CS 24000",
          "title": "Programming in C",
          "credits": 3,
          "required": true
        },
        {
          "code": "CS 25100",
          "title": "Data Structures",
          "credits": 3,
          "required": true
        }
      ],
      "electives": {
        "credits_required": 6,
        "choose_from": ["CS 25000", "CS 25200", "CS 30700", "CS 37300"]
      }
    },
    "data_science_minor": {
      "title": "Data Science Minor",
      "available_to": "All majors",
      "credits_required": 18,
      "courses": [
        {
          "code": "CS 18000",
          "title": "Problem Solving and Object-Oriented Programming",
          "credits": 4,
          "required": true
        },
        {
          "code": "STAT 35000",
          "title": "Introduction to Statistics",
          "credits": 3,
          "required": true
        },
        {
          "code": "CS 37300",
          "title": "Data Mining and Machine Learning",
          "credits": 3,
          "required": true
        }
      ],
      "electives": {
        "credits_required": 8,
        "choose_from": ["STAT 41600", "CS 25100", "CS 43900"]
      }
    },
    "artificial_intelligence_minor": {
      "title": "Artificial Intelligence Minor",
      "available_to": "All majors", 
      "credits_required": 18,
      "courses": [
        {
          "code": "CS 18000",
          "title": "Problem Solving and Object-Oriented Programming",
          "credits": 4,
          "required": true
        },
        {
          "code": "CS 25100",
          "title": "Data Structures",
          "credits": 3,
          "required": true
        },
        {
          "code": "CS 47100",
          "title": "Introduction to Artificial Intelligence",
          "credits": 3,
          "required": true
        },
        {
          "code": "STAT 35000",
          "title": "Introduction to Statistics",
          "credits": 3,
          "required": true
        }
      ],
      "electives": {
        "credits_required": 5,
        "choose_from": ["CS 37300", "CS 24300"]
      }
    }
  },

  // =============================================
  // ACADEMIC POLICIES - REAL
  // =============================================
  "academic_policies": {
    "gpa_requirements": {
      "minimum_graduation_gpa": 2.0,
      "minimum_major_gpa": 2.0,
      "probation_threshold": 2.0,
      "suspension_threshold": 1.5
    },
    "credit_requirements": {
      "minimum_total_credits": 120,
      "minimum_residence_credits": 32,
      "maximum_transfer_credits": 88,
      "maximum_credits_per_semester": 20,
      "minimum_credits_for_fulltime": 12
    },
    "graduation_requirements": {
      "general_requirements": [
        "Complete minimum credit hours for degree",
        "Achieve minimum GPA requirements",
        "Complete major and core curriculum requirements",
        "Meet residency requirements"
      ]
    }
  }
};

// API functions for accessing the real data
const degreeRequirementsAPI = {
  // Get all available programs (ONLY REAL ONES)
  getAllPrograms() {
    return ["computer_science", "data_science", "artificial_intelligence"];
  },

  // Get program information
  getProgram(programKey) {
    return comprehensiveDegreeRequirements[programKey] || null;
  },

  // Get all courses for a program
  getAllCourses(programKey) {
    const program = this.getProgram(programKey);
    if (!program) return [];

    let allCourses = [];
    
    // Add foundation courses
    if (program.foundation_courses?.courses) {
      allCourses = allCourses.concat(program.foundation_courses.courses);
    }
    
    // Add core courses
    if (program.core_courses?.courses) {
      allCourses = allCourses.concat(program.core_courses.courses);
    }
    
    // Add major courses (for AI)
    if (program.major_courses?.required_courses) {
      allCourses = allCourses.concat(program.major_courses.required_courses);
    }
    
    // Add required major courses (for Data Science)
    if (program.required_major_courses?.courses) {
      allCourses = allCourses.concat(program.required_major_courses.courses);
    }
    
    // Add math requirements
    if (program.mathematics_requirements?.courses) {
      allCourses = allCourses.concat(program.mathematics_requirements.courses);
    }
    
    // Add math foundation (for Data Science)
    if (program.mathematics_foundation?.courses) {
      allCourses = allCourses.concat(program.mathematics_foundation.courses);
    }
    
    return allCourses;
  },

  // Search courses by code or title
  searchCourses(query) {
    const queryLower = query.toLowerCase();
    let coursesToSearch = [];
    
    // Search all real programs
    this.getAllPrograms().forEach(prog => {
      coursesToSearch = coursesToSearch.concat(this.getAllCourses(prog));
    });
    
    return coursesToSearch.filter(course => 
      course.code.toLowerCase().includes(queryLower) ||
      course.title.toLowerCase().includes(queryLower) ||
      (course.description && course.description.toLowerCase().includes(queryLower))
    );
  },

  // Get course by exact code
  getCourseByCode(courseCode) {
    const courses = this.getAllPrograms().flatMap(prog => this.getAllCourses(prog));
    return courses.find(course => course.code.toUpperCase() === courseCode.toUpperCase());
  },

  // Get program degree info
  getProgramInfo(programKey) {
    const program = this.getProgram(programKey);
    return program?.degree_info || program?.program_info || null;
  },

  // Get academic policies
  getAcademicPolicies() {
    return comprehensiveDegreeRequirements.academic_policies || null;
  },

  // Get CODO policies
  getCODOPolicies() {
    return comprehensiveDegreeRequirements.codo_policies || null;
  },

  // Get all minors (ONLY REAL ONES)
  getAllMinors() {
    return comprehensiveDegreeRequirements.minors || {};
  },

  // Get prerequisite information
  getPrerequisites(courseCode) {
    const allPrograms = this.getAllPrograms();
    for (const programKey of allPrograms) {
      const courses = this.getAllCourses(programKey);
      const course = courses.find(c => c.code === courseCode);
      if (course && course.prerequisites) {
        return {
          title: course.title,
          prerequisites: course.prerequisites,
          prerequisite_for: []
        };
      }
    }
    return null;
  },

  // Get graduation requirements
  getGraduationRequirements(programKey) {
    const program = this.getProgram(programKey);
    const academicPolicies = this.getAcademicPolicies();
    
    if (!program) return null;
    
    const programInfo = this.getProgramInfo(programKey);
    return {
      program_specific: {
        total_credits: programInfo.total_credits_required,
        minimum_gpa: programInfo.minimum_gpa_required,
        major_courses: this.getAllCourses(programKey).length
      },
      general_requirements: academicPolicies?.graduation_requirements || null
    };
  }
};

module.exports = {
  comprehensiveDegreeRequirements,
  degreeRequirementsAPI
};