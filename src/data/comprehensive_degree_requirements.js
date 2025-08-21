// Comprehensive Purdue Degree Requirements - Computer Science Only
// Focus on Computer Science major and minor with prerequisite tracking

export const comprehensiveDegreeRequirements = {
  // =============================================
  // COMPUTER SCIENCE MAJOR (with 2 tracks)
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
          "typical_semester": "freshman_fall"
        },
        {
          "code": "CS 18200", 
          "title": "Foundations of Computer Science",
          "credits": 3,
          "required": true,
          "typical_semester": "freshman_spring",
        },
        {
          "code": "CS 24000",
          "title": "Programming in C",
          "credits": 3,
          "required": true,
          "typical_semester": "freshman_spring",
        },
        {
          "code": "CS 25000",
          "title": "Computer Architecture", 
          "credits": 4,
          "required": true,
          "typical_semester": "sophomore_fall",
          "prerequisites": ["CS 18200", "CS 24000"]
        },
        {
          "code": "CS 25100",
          "title": "Data Structures",
          "credits": 3,
          "required": true,
          "typical_semester": "sophomore_fall",
          "prerequisites": ["CS 18200", "CS 24000"]
        },
        {
          "code": "CS 25200",
          "title": "Systems Programming",
          "credits": 4,
          "required": true,
          "typical_semester": "sophomore_spring",
          "prerequisites": ["CS 24000", "CS 25000"]
        },
        {
          "code": "CS 30700",
          "title": "Software Engineering I",
          "credits": 4,
          "required": true,
          "typical_semester": "junior_fall",
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
          "prerequisites": ["CS 25200"]
        },
        {
          "code": "CS 38100", 
          "title": "Introduction to Analysis of Algorithms",
          "credits": 3,
          "required": true,
          "prerequisites": ["CS 25100", "MA 26100"]
        },
        {
          "code": "CS 40700",
          "title": "Software Engineering II",
          "credits": 3,
          "required": true,
          "prerequisites": ["CS 30700"]
        },
        {
          "code": "CS 42200",
          "title": "Computer Networks",
          "credits": 3,
          "required": true,
          "prerequisites": ["CS 25200"]
        },
        {
          "code": "CS 44300",
          "title": "Database Systems", 
          "credits": 3,
          "required": true,
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
          "required": true
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
        ],
        "electives": {
          "credits_required": 9,
          "choose_from": [
            "CS 47100", // Introduction to Artificial Intelligence
            "CS 47000", // Introduction to Computer Graphics
            "CS 48900", // Machine Learning
            "CS 49000", // Selected Topics in AI
            "STAT 51100", // Statistical Methods
            "MA 51100" // Linear Algebra with Applications
          ]
        }
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
        ],
        "electives": {
          "credits_required": 9,
          "choose_from": [
            "CS 43500", // Database Systems
            "CS 42200", // Computer Networks  
            "CS 50300", // System Programming
            "CS 50400", // Operating Systems
            "CS 51400", // Numerical Analysis
            "CS 52600"  // Systems Security
          ]
        }
      }
    },

    "science_requirements": {
      "credits_required": 8,
      "description": "Two-semester sequence in chemistry or physics",
      "options": [
        ["CHM 11500", "CHM 11600"], // General Chemistry
        ["PHYS 17200", "PHYS 27200"] // Modern Mechanics + Electric & Magnetic Interaction
      ]
    },

    "university_core_curriculum": {
      "credits_required": 27,
      "requirements": {
        "written_communication": {"credits": 3, "courses": ["ENGL 10600"]},
        "oral_communication": {"credits": 3, "courses": ["COM 11400", "COM 20400"]},
        "information_literacy": {"credits": 3, "courses": ["EDPS 31500"]},
        "humanities": {"credits": 6, "categories": ["Literature", "Philosophy", "History"]},
        "behavioral_social_science": {"credits": 6, "categories": ["Psychology", "Economics", "Sociology"]},
        "science_tech_society": {"credits": 3, "interdisciplinary": true},
        "quantitative_reasoning": {"credits": 3, "satisfied_by_major": true}
      }
    }
  },

  // =============================================
  // COMPUTER SCIENCE MINOR
  // =============================================
  "computer_science_minor": {
    "program_info": {
      "name": "Computer Science Minor",
      "credits_required": 19,
      "minimum_gpa": 2.0,
      "description": "Foundational computer science knowledge for non-CS majors"
    },
    "required_courses": [
      {"code": "CS 18000", "credits": 4, "title": "Problem Solving and Object-Oriented Programming"},
      {"code": "CS 18200", "credits": 3, "title": "Foundations of Computer Science", "prerequisites": ["CS 18000"]},
      {"code": "CS 24000", "credits": 3, "title": "Programming in C", "prerequisites": ["CS 18000"]}, 
      {"code": "CS 25100", "credits": 3, "title": "Data Structures", "prerequisites": ["CS 18200", "CS 24000"]}
    ],
    "electives": {
      "credits_required": 6,
      "choose_from": [
        "CS 25000", "CS 25200", "CS 30700", "CS 35200",
        "CS 37300", "CS 38100", "CS 42200", "CS 44300"
      ]
    }
  }
};

// Export individual degree programs for easier access
export const computerScienceDegree = comprehensiveDegreeRequirements.computer_science;
export const computerScienceMinor = comprehensiveDegreeRequirements.computer_science_minor;