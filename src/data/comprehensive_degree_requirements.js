// Comprehensive Purdue Degree Requirements - Updated Structure
// Correctly represents all major and minor programs with accurate requirements

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
          "prerequisites": ["CS 18000"]
        },
        {
          "code": "CS 24000",
          "title": "Programming in C",
          "credits": 3,
          "required": true,
          "typical_semester": "freshman_spring",
          "prerequisites": ["CS 18000"]
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
  // DATA SCIENCE MAJOR (standalone, no tracks)
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
      "has_tracks": false,
      "description": "Standalone program combining computer science, statistics, and mathematics"
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
          "code": "CS 38003",
          "title": "Python Programming",
          "credits": 1,
          "required": true,
          "prerequisites": ["CS 18000"],
          "typical_semester": "Spring 1st Year"
        },
        {
          "code": "CS 25300",
          "title": "Data Structures and Algorithms for DS/AI",
          "credits": 3,
          "required": true,
          "prerequisites": ["CS 18200", "CS/STAT 24200"],
          "typical_semester": "Spring 2nd Year"
        },
        {
          "code": "CS 37300",
          "title": "Data Mining and Machine Learning",
          "credits": 3,
          "required": true,
          "prerequisites": ["CS 25100", "STAT 35500"],
          "typical_semester": "Fall 3rd Year",
          "note": "Must be completed with C or better before Capstone"
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
          "code": "CS/STAT 24200",
          "title": "Introduction to Data Science",
          "credits": 3,
          "required": true,
          "prerequisites": ["CS 18200", "CS 38003", "Coreq STAT 35500"],
          "typical_semester": "Fall 2nd Year"
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
        },
        {
          "code": "STAT 41700",
          "title": "Statistical Theory",
          "credits": 3,
          "required": true,
          "prerequisites": ["STAT 35500", "STAT 41600"],
          "typical_semester": "Fall 3rd Year"
        },
        {
          "code": "MA 35100",
          "title": "Elementary Linear Algebra",
          "credits": 3,
          "required": true,
          "prerequisites": ["MA 26100"],
          "typical_semester": "Spring 2nd Year"
        },
        {
          "code": "MA 26100",
          "title": "Multivariate Calculus",
          "credits": 4,
          "required": true,
          "prerequisites": ["MA 16200"],
          "typical_semester": "Fall 2nd Year",
          "alternative": "MA 27101 (5 credits, Honors)"
        }
      ]
    },

    "mathematics_foundation": {
      "credits_required": 8,
      "grade_requirement": "C or better",
      "courses": [
        {
          "code": "MA 16100",
          "title": "Plane Analytic Geometry and Calculus I",
          "credits": 5,
          "alternative": "MA 16500 (4 credits)",
          "typical_semester": "Fall 1st Year"
        },
        {
          "code": "MA 16200",
          "title": "Plane Analytic Geometry and Calculus II",
          "credits": 5,
          "alternative": "MA 16600 (4 credits)",
          "typical_semester": "Spring 1st Year"
        }
      ]
    },

    "cs_selectives": {
      "credits_required": 6,
      "requirement": "Choose 2 courses",
      "grade_requirement": "C or better",
      "options": [
        {"code": "CS 30700", "title": "Software Engineering I", "credits": 3},
        {"code": "CS 40800", "title": "Software Testing", "credits": 3},
        {"code": "CS 31400", "title": "Numerical Methods", "credits": 3},
        {"code": "CS 34800", "title": "Information Systems", "credits": 3},
        {"code": "CS 44800", "title": "Introduction to Relational Database Systems", "credits": 3},
        {"code": "CS 38100", "title": "Introduction to Analysis of Algorithms", "credits": 3},
        {"code": "CS 48300", "title": "Introduction to Theory of Computation", "credits": 3},
        {"code": "CS 35500", "title": "Introduction to Cryptography", "credits": 3},
        {"code": "CS 43900", "title": "Introduction to Data Visualization", "credits": 3},
        {"code": "CS 47100", "title": "Introduction to Artificial Intelligence", "credits": 3},
        {"code": "CS 47300", "title": "Web Information Search and Management", "credits": 3},
        {"code": "CS 47500", "title": "Human-Computer Interaction", "credits": 3},
        {"code": "CS 31100 + CS 41100", "title": "Competitive Programming II + III", "credits": 4, "note": "Counts as 2 courses"}
      ]
    },

    "statistics_selective": {
      "credits_required": 3,
      "requirement": "Choose 1 course",
      "grade_requirement": "C or better",
      "options": [
        {"code": "STAT 42000", "title": "Introduction to Time Series", "credits": 3},
        {"code": "MA 43200", "title": "Elementary Stochastic Processes", "credits": 3},
        {"code": "STAT 50600", "title": "Statistical Programming and Data Management", "credits": 3},
        {"code": "STAT 51200", "title": "Applied Regression Analysis", "credits": 3},
        {"code": "STAT 51300", "title": "Statistical Quality Control", "credits": 3},
        {"code": "STAT 51400", "title": "Design of Experiments", "credits": 3},
        {"code": "STAT 52200", "title": "Sampling and Survey Techniques", "credits": 3},
        {"code": "STAT 52500", "title": "Intermediate Statistical Methodology", "credits": 3}
      ]
    },

    "ethics_selective": {
      "credits_required": 3,
      "requirement": "Choose 1 course",
      "grade_requirement": "C or better",
      "options": [
        {"code": "ILS 23000", "title": "Data Science & Society: Ethical Legal Social Issues", "credits": 3},
        {"code": "PHIL 20700", "title": "Ethics For Technology, Engineering, And Design", "credits": 3},
        {"code": "PHIL 20800", "title": "Ethics Of Data Science", "credits": 3}
      ]
    },

    "capstone_experience": {
      "credits_required": 3,
      "requirement": "Choose 1 option",
      "grade_requirement": "C or better",
      "prerequisite": "CS 37300 with C or better",
      "note": "STAT 49000 and Data Mine projects do NOT fulfill requirement",
      "options": [
        {"code": "CS 44100", "title": "Data Science Capstone", "credits": 3},
        {"code": "CS 49000", "title": "Topics in Computer Science (Individual Study)", "credits": 3, "note": "Pre-approved unpaid research opportunity"}
      ]
    },

    "college_of_science_core": {
      "credits_required": 47,
      "categories": {
        "written_communication": {"credits": 3, "requirement": "University Core"},
        "technical_writing_presentation": {"credits": 3, "note": "COM 21700 recommended"},
        "teambuilding_collaboration": {"credits": 0, "note": "Satisfied by CS 18000"},
        "language_culture": {"credits": 6, "requirement": "3 courses"},
        "general_education": {"credits": 9, "requirement": "3 options"},
        "great_issues": {"credits": 3, "requirement": "1 course"},
        "science_technology_society": {"credits": 3, "requirement": "University Core"},
        "laboratory_science": {"credits": 6, "requirement": "2 courses"},
        "computing": {"credits": 0, "note": "Satisfied by major courses"},
        "statistics": {"credits": 0, "note": "Satisfied by major courses"}
      }
    },

    "university_core_curriculum": {
      "requirements": [
        "Human Cultures: Behavioral/Social Science",
        "Human Cultures: Humanities",
        "Information Literacy",
        "Oral Communication",
        "Quantitative Reasoning",
        "Science #1",
        "Science #2",
        "Science, Technology, and Society",
        "Written Communication"
      ],
      "civics_literacy": true
    },

    "transfer_credit_policy": {
      "10000_20000_level": "May be used if taken prior to admission to Purdue West Lafayette Data Science BS program",
      "30000_40000_level": "May NOT be used except pre-approved Study Abroad",
      "regional_campus": "May be used if taken prior to admission"
    },

    "sample_timeline": {
      "fall_1st_year": ["CS 18000", "MA 16100/16500", "Science Core", "CS 19300 (recommended)", "Electives"],
      "spring_1st_year": ["CS 18200", "CS 38003", "MA 16200/16600", "Science Core", "Written Communication"],
      "fall_2nd_year": ["CS/STAT 24200", "STAT 35500", "MA 26100/27101", "Science Core", "Electives"],
      "spring_2nd_year": ["CS 25300", "MA 35100", "STAT 41600", "Ethics Selective", "Science Core"],
      "fall_3rd_year": ["CS 37300", "STAT 41700", "Science Core", "Technical Writing", "Electives"],
      "spring_3rd_year": ["CS Selective", "STAT Selective", "Science Core (2)", "Electives"],
      "fall_4th_year": ["CS 44000", "CS Selective", "Science Core", "Electives"],
      "spring_4th_year": ["Capstone Experience", "Science Core (2)", "Electives"]
    }
  },

  // =============================================
  // ARTIFICIAL INTELLIGENCE MAJOR (standalone, no tracks) - UPDATED COMPLETE DATA
  // =============================================
  "artificial_intelligence": {
    "program_info": {
      "title": "Artificial Intelligence",
      "college": "College of Science",
      "university": "Purdue University West Lafayette",
      "academic_year": "2024-2025",
      "degree_type": "Bachelor of Science",
      "department": "Computer Science Department",
      "total_credits_required": 120,
      "minimum_gpa_required": 2.0,
      "has_tracks": false,
      "description": "Standalone interdisciplinary program focusing on AI theory, applications, and ethics"
    },

    "degree_requirements": {
      "university_requirements": {
        "minimum_gpa": 2.0,
        "minimum_credits": 120,
        "residency_credits": 32,
        "residency_level": "30000 and above at Purdue University campus"
      },
      "grade_requirements": {
        "major_courses": "C or better",
        "major_electives": "C or better",
        "prerequisites": "C or better"
      }
    },

    "university_core_curriculum": {
      "requirements": [
        "Human Cultures: Behavioral/Social Science",
        "Human Cultures: Humanities",
        "Information Literacy",
        "Oral Communication",
        "Quantitative Reasoning",
        "Science",
        "Science, Technology & Society Selective",
        "Written Communication"
      ],
      "civic_literacy_proficiency": "https://www.purdue.edu/provost/about/provostInitiatives/civics/"
    },

    "college_of_science_core": {
      "written_communication": "3-4 credits",
      "technical_writing_presentation": "3-6 credits",
      "teaming_collaboration": "NC (No Credit)",
      "general_education": "Met with degree requirements",
      "foreign_language_culture": "0-9 credits",
      "great_issues": "3 credits",
      "laboratory_science": "6-8 credits",
      "science_technology_society": "1-3 credits",
      "mathematics": "6-10 credits",
      "statistics": "3 credits",
      "computing": "3 credits"
    },

    "semester_progression": {
      "fall_1st_year": {
        "total_credits": "15-17",
        "courses": [
          {
            "code": "CS 17600",
            "credits": 3,
            "prerequisite": "Co-req CS 19300",
            "critical_course": true
          },
          {
            "code": "PSY 12000",
            "credits": 3,
            "title": "Elementary Psychology",
            "critical_course": true
          },
          {
            "code": "MA 16100 or MA 16500",
            "credits": "4-5",
            "title": "CALC I",
            "prerequisite": "ALEKS 85+",
            "critical_course": true
          },
          {
            "code": "Science Core Option",
            "credits": "3-4"
          },
          {
            "code": "Free Elective",
            "credits": 1
          }
        ]
      },
      "spring_1st_year": {
        "total_credits": "15-16",
        "courses": [
          {
            "code": "CS 18000",
            "credits": 4,
            "title": "Problem Solving and object-Oriented Programming",
            "prerequisite": "CALC I"
          },
          {
            "code": "CS 18200",
            "credits": 3,
            "title": "Foundations of Computer Science",
            "prerequisite": "CS 18000 & CALC 1"
          },
          {
            "code": "CS 19300",
            "credits": 1,
            "note": "Recommended"
          },
          {
            "code": "MA 16200 or MA 16600",
            "credits": "4-5",
            "title": "CALC II",
            "prerequisite": "CALC I"
          },
          {
            "code": "PSY 20000 or PSY 22200",
            "credits": 3,
            "prerequisite": "PSY 12000"
          }
        ]
      },
      "fall_2nd_year": {
        "total_credits": "16-18",
        "courses": [
          {
            "code": "CS 24300",
            "credits": 3,
            "title": "Artificial Intelligence Basics",
            "prerequisite": "Calc I, CS 18000 & CS 18200"
          },
          {
            "code": "MA 26100 or MA 27101",
            "credits": "4-5",
            "title": "CALC III",
            "prerequisite": "CALC II"
          },
          {
            "code": "STAT 35000 or STAT 51100",
            "credits": 3,
            "prerequisite": "CALC II"
          },
          {
            "code": "PHIL 20700 or PHIL 20800 or PHIL 22100 or PHIL 32200",
            "credits": 3
          },
          {
            "code": "Science Core Option",
            "credits": "3-4"
          }
        ]
      },
      "spring_2nd_year": {
        "total_credits": "15-16",
        "courses": [
          {
            "code": "CS 25300",
            "credits": 3,
            "title": "Data Structures and Algorithms For DS/AI",
            "prerequisite": "CS 17600, CS 18200 & CS 24300"
          },
          {
            "code": "MA 26500 or MA 35100",
            "credits": 3,
            "prerequisite": "CALC II & (co-req CALC III)"
          },
          {
            "code": "MA 41600 or STAT 41600",
            "credits": 3
          },
          {
            "code": "PHIL 20700 or PHIL 20800 or PHIL 22100 or PHIL 32200",
            "credits": 3
          },
          {
            "code": "Science Core Option",
            "credits": "3-4"
          }
        ]
      },
      "fall_3rd_year": {
        "total_credits": "15-17",
        "courses": [
          {
            "code": "CS 37300",
            "credits": 3,
            "title": "Data Mining And Machine Learning",
            "prerequisite": "CS 18200 & CS 25100 & STAT 3500 or STAT 51100"
          },
          {
            "code": "CS Selective I",
            "credits": 3,
            "prerequisite": "Varies"
          },
          {
            "code": "Philosophy Selective",
            "credits": 3,
            "prerequisite": "CALC II"
          },
          {
            "code": "Science Core Option",
            "credits": "3-4",
            "prerequisite": "CALC II"
          },
          {
            "code": "Science Core Option",
            "credits": "3-4"
          }
        ]
      },
      "spring_3rd_year": {
        "total_credits": "15-17",
        "courses": [
          {
            "code": "CS 38100",
            "credits": 3,
            "title": "Introduction To The Analysis Of Algorithms",
            "prerequisite": "CS 25100 & MA 26100"
          },
          {
            "code": "Science Core Option",
            "credits": "3-4"
          },
          {
            "code": "Science Core Option",
            "credits": "3-4"
          },
          {
            "code": "Free Elective",
            "credits": 3
          },
          {
            "code": "Free Elective",
            "credits": 3
          }
        ]
      },
      "fall_4th_year": {
        "total_credits": "15-17",
        "courses": [
          {
            "code": "CS 47100",
            "credits": 3,
            "title": "Introduction to Artificial Intelligence",
            "prerequisite": "CS 25100"
          },
          {
            "code": "CS Selective I",
            "credits": 3,
            "prerequisite": "Varies"
          },
          {
            "code": "Science Core Option",
            "credits": "3-4"
          },
          {
            "code": "Science Core Option",
            "credits": "3-4"
          },
          {
            "code": "Free Elective",
            "credits": 3
          }
        ]
      },
      "spring_4th_year": {
        "total_credits": "15-17",
        "courses": [
          {
            "code": "CS Selective II",
            "credits": 3,
            "prerequisite": "Varies"
          },
          {
            "code": "Science Core Option",
            "credits": "3-4"
          },
          {
            "code": "Science Core Option",
            "credits": "3-4"
          },
          {
            "code": "Free Elective",
            "credits": 3
          },
          {
            "code": "Free Elective",
            "credits": 3
          }
        ]
      }
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
          "code": "CS 38100",
          "credits": 3,
          "title": "Introduction To The Analysis Of Algorithms"
        },
        {
          "code": "CS 47100",
          "credits": 3,
          "title": "Introduction to Artificial Intelligence"
        },
        {
          "code": "MA 26100 or MA 27101",
          "credits": "4-5",
          "title": "Multivariate Calculus or MA 27101 (5 cr)"
        },
        {
          "code": "MA 26500 or MA 35100",
          "credits": 3,
          "title": "Linear Algebra or MA 35100"
        },
        {
          "code": "PSY 12000",
          "credits": 3,
          "title": "Elementary Psychology"
        },
        {
          "code": "MA 41600 or STAT 41600",
          "credits": 3,
          "title": "Probability"
        },
        {
          "code": "PHIL 20700 or PHIL 20800",
          "credits": 3,
          "title": "Ethics For Technology, Engineering, And Design or Ethics Of Data Science"
        },
        {
          "code": "PSY 20000 or PSY 22200",
          "credits": 3,
          "title": "Introduction To Cognitive Psychology or Introduction To Behavioral Neuroscience"
        },
        {
          "code": "PHIL 22100 or PHIL 32200",
          "credits": 3,
          "title": "Introduction To Philosophy Of Science or Philosophy Of Technology"
        },
        {
          "code": "STAT 35000 or STAT 51100",
          "credits": 3,
          "title": "Introduction To Statistics or Statistical Methods"
        }
      ]
    },

    "elective_options": {
      "cs_selective_i": {
        "requirement": "Choose 2",
        "options": [
          {
            "code": "CS 43900",
            "credits": 3,
            "title": "Introduction To Data Visualization"
          },
          {
            "code": "CS 44000",
            "credits": 3,
            "title": "Large Scale Data Analytics"
          },
          {
            "code": "CS 47300",
            "credits": 3,
            "title": "Web Information Search & Management"
          },
          {
            "code": "CS 47500",
            "credits": 3,
            "title": "Human-Computer Interaction"
          },
          {
            "code": "CS 57700",
            "credits": 3,
            "title": "Natural Language Processing"
          }
        ]
      },
      "cs_selective_ii": {
        "requirement": "Choose 1",
        "options": [
          {
            "code": "CS 34800",
            "credits": 3,
            "title": "Information Systems"
          },
          {
            "code": "CS 44800",
            "credits": 3,
            "title": "Introduction To Relational Database Systems"
          },
          {
            "code": "CS 48300",
            "credits": 3,
            "title": "Introduction To The Theory Of Computation"
          },
          {
            "code": "CS 52300",
            "credits": 3,
            "title": "Social, Economic, And Legal Aspects Of Security"
          },
          {
            "code": "CS 52900",
            "credits": 3,
            "title": "Security Analytics"
          }
        ]
      },
      "philosophy_selectives": {
        "requirement": "Choose 1",
        "options": [
          {
            "code": "PHIL 30300",
            "credits": 3,
            "title": "History of Modern Philosophy"
          },
          {
            "code": "PHIL 43200",
            "credits": 3,
            "title": "Theory of Knowledge"
          },
          {
            "code": "PHIL 43500",
            "credits": 3,
            "title": "Philosophy of the Mind"
          }
        ]
      }
    },

    "science_core_curriculum_timing": {
      "first_second_year_recommended": [
        "Written Communication (UC)",
        "Computing (CS 18000)",
        "Foreign Language and Culture (UC) - 3 courses needed",
        "Science, Technology & Society Selective (UC)"
      ],
      "third_fourth_year_recommended": [
        "Technical Writing and Presentation (UC) - COM 217 recommended",
        "General Education (UC) - 3 courses needed",
        "Lab Science (UC) - 2 courses needed",
        "Great Issues"
      ]
    },

    "important_notes": {
      "critical_courses": "Courses marked with CC (Critical Course) designation",
      "grade_requirement": "All major required courses, major electives, and prerequisites must be completed with grade of C or better",
      "enrollment_recommendation": "CS 19300: Tools enrollment recommended with CS 18000 but not required",
      "residency_requirement": "Students must have 32 credits at 30000 level or above completed at Purdue University campus"
    }
  },

  // =============================================
  // MINOR PROGRAMS
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
      {"code": "CS 18200", "credits": 3, "title": "Foundations of Computer Science"},
      {"code": "CS 24000", "credits": 3, "title": "Programming in C"}, 
      {"code": "CS 25100", "credits": 3, "title": "Data Structures"}
    ],
    "electives": {
      "credits_required": 6,
      "choose_from": [
        "CS 25000", "CS 25200", "CS 30700", "CS 35200",
        "CS 37300", "CS 38100", "CS 42200", "CS 44300"
      ]
    }
  },

  "data_science_minor": {
    "program_info": {
      "name": "Data Science Minor",
      "credits_required": 18,
      "minimum_gpa": 2.0,
      "description": "Essential data science skills for various majors"
    },
    "required_courses": [
      {"code": "CS 18000", "credits": 4, "title": "Problem Solving and Object-Oriented Programming"},
      {"code": "STAT 35000", "credits": 3, "title": "Introduction to Statistics"},
      {"code": "STAT 42000", "credits": 3, "title": "Introduction to Data Science"},
      {"code": "CS 37300", "credits": 3, "title": "Data Mining and Machine Learning"}
    ],
    "electives": {
      "credits_required": 5,
      "choose_from": [
        "STAT 41600", "STAT 51200", "CS 25100", 
        "STAT 51200", "CS 43900", "IE 33000"
      ]
    }
  },

  "artificial_intelligence_minor": {
    "program_info": {
      "name": "Artificial Intelligence Minor", 
      "credits_required": 18,
      "minimum_gpa": 2.0,
      "description": "Core AI concepts and applications"
    },
    "required_courses": [
      {"code": "CS 18000", "credits": 4, "title": "Problem Solving and Object-Oriented Programming"},
      {"code": "CS 25100", "credits": 3, "title": "Data Structures"},
      {"code": "CS 47100", "credits": 3, "title": "Introduction to Artificial Intelligence"},
      {"code": "STAT 35000", "credits": 3, "title": "Introduction to Statistics"}
    ],
    "electives": {
      "credits_required": 5,
      "choose_from": [
        "CS 37300", // Data Mining and Machine Learning
        "CS 48900", // Machine Learning  
        "CS 54100", // Natural Language Processing
        "CS 57100", // Computer Vision
        "PHIL 58000" // AI Ethics
      ]
    }
  }
};

// Export individual degree programs for easier access
export const computerScienceDegree = comprehensiveDegreeRequirements.computer_science;
export const dataScienceDegree = comprehensiveDegreeRequirements.data_science;  
export const artificialIntelligenceDegree = comprehensiveDegreeRequirements.artificial_intelligence;
export const computerScienceMinor = comprehensiveDegreeRequirements.computer_science_minor;
export const dataScienceMinor = comprehensiveDegreeRequirements.data_science_minor;
export const artificialIntelligenceMinor = comprehensiveDegreeRequirements.artificial_intelligence_minor;