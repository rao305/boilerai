// Comprehensive Purdue Degree Requirements - Backend Version
// CommonJS format for Node.js backend compatibility

const comprehensiveDegreeRequirements = {
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
          "description": "Algorithm design and analysis, complexity theory, advanced data structures.",
          "prerequisites": ["CS 25100", "MA 26100"]
        },
        {
          "code": "CS 40700",
          "title": "Software Engineering II",
          "credits": 3,
          "required": true,
          "description": "Advanced software engineering topics, project management, team development.",
          "prerequisites": ["CS 30700"]
        },
        {
          "code": "CS 42200",
          "title": "Computer Networks",
          "credits": 3,
          "required": true,
          "description": "Network protocols, distributed systems, network programming.",
          "prerequisites": ["CS 25200"]
        },
        {
          "code": "CS 44300",
          "title": "Database Systems", 
          "credits": 3,
          "required": true,
          "description": "Database design, SQL, transaction processing, database management systems.",
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
          "description": "Limits, continuity, derivatives, and applications of derivatives."
        },
        {
          "code": "MA 16200",
          "title": "Plane Analytic Geometry and Calculus II", 
          "credits": 4,
          "required": true,
          "description": "Integration techniques, infinite series, and applications of integrals.",
          "prerequisites": ["MA 16100"]
        },
        {
          "code": "MA 26100",
          "title": "Multivariate Calculus",
          "credits": 4,
          "required": true,
          "description": "Calculus of functions of several variables, vector calculus.",
          "prerequisites": ["MA 16200"]
        },
        {
          "code": "MA 26500", 
          "title": "Linear Algebra",
          "credits": 3,
          "required": true,
          "description": "Vector spaces, linear transformations, eigenvalues and eigenvectors.",
          "prerequisites": ["MA 16200"]
        },
        {
          "code": "STAT 35000",
          "title": "Introduction to Statistics",
          "credits": 3,
          "required": true,
          "description": "Descriptive statistics, probability distributions, hypothesis testing.",
          "prerequisites": ["MA 16200"]
        },
        {
          "code": "MA 35100",
          "title": "Elementary Linear Algebra Applications", 
          "credits": 2,
          "required": true,
          "description": "Applications of linear algebra to computer science and engineering.",
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
            "description": "Machine learning algorithms, data mining techniques, pattern recognition.",
            "prerequisites": ["CS 25100", "STAT 35000"]
          },
          {
            "code": "CS 47300", 
            "title": "Web Information Search and Mining",
            "credits": 3,
            "description": "Information retrieval, web search algorithms, text mining.",
            "prerequisites": ["CS 37300"]
          }
        ],
        "electives": {
          "credits_required": 9,
          "choose_from": [
            "CS 47100", // Introduction to Artificial Intelligence
            "CS 48900", // Machine Learning
            "CS 49000"  // Selected Topics in AI
          ]
        }
      },
      "software_engineering": {
        "track_info": {
          "name": "Software Engineering Track",
          "description": "Focus on software development, testing, and engineering practices",
          "additional_credits_required": 15
        },
        "required_courses": [
          {
            "code": "CS 40800",
            "title": "Software Testing",
            "credits": 3,
            "description": "Software testing methodologies, test automation, quality assurance.",
            "prerequisites": ["CS 30700"]
          },
          {
            "code": "CS 42600",
            "title": "Computer Security",
            "credits": 3,
            "description": "Computer security principles, cryptography, network security.",
            "prerequisites": ["CS 25200"]
          }
        ],
        "electives": {
          "credits_required": 9,
          "choose_from": [
            "CS 35400", // Operating Systems
            "CS 42200", // Computer Networks  
            "CS 49000"  // Selected Topics in Software Engineering
          ]
        }
      }
    }
  },

  // =============================================
  // DATA SCIENCE MAJOR
  // =============================================
  "data_science": {
    "degree_info": {
      "institution": "Purdue University",
      "campus": "West Lafayette Campus",
      "college": "College of Science", 
      "degree": "Data Science-BS",
      "level": "Undergraduate",
      "catalog_year": "Fall 2024",
      "total_credits_required": 120,
      "minimum_gpa_required": 2.0,
      "has_tracks": false
    },
    "foundation_courses": {
      "credits_required": 18,
      "courses": [
        {
          "code": "CS 18000",
          "title": "Problem Solving and Object-Oriented Programming",
          "credits": 4,
          "required": true,
          "description": "Introduction to programming concepts using object-oriented programming."
        },
        {
          "code": "CS/STAT 24200",
          "title": "Introduction to Data Science",
          "credits": 3,
          "required": true,
          "description": "Introduction to data science concepts, tools, and methodologies."
        },
        {
          "code": "STAT 35500",
          "title": "Statistics for Data Science", 
          "credits": 3,
          "required": true,
          "description": "Statistical methods specifically for data science applications."
        }
      ]
    }
  },

  // =============================================
  // ARTIFICIAL INTELLIGENCE MAJOR
  // =============================================
  "artificial_intelligence": {
    "degree_info": {
      "institution": "Purdue University",
      "campus": "West Lafayette Campus",
      "college": "College of Science",
      "degree": "Artificial Intelligence-BS", 
      "level": "Undergraduate",
      "catalog_year": "Fall 2024",
      "total_credits_required": 120,
      "minimum_gpa_required": 2.0,
      "has_tracks": false
    },
    "foundation_courses": {
      "credits_required": 22,
      "courses": [
        {
          "code": "CS 17600",
          "title": "AI Foundations",
          "credits": 4,
          "required": true,
          "typical_semester": "freshman_fall",
          "description": "Introduction to artificial intelligence concepts and applications."
        },
        {
          "code": "CS 18000",
          "title": "Problem Solving and Object-Oriented Programming",
          "credits": 4,
          "required": true,
          "typical_semester": "freshman_spring",
          "description": "Programming fundamentals using object-oriented design."
        },
        {
          "code": "CS 18200",
          "title": "Foundations of Computer Science", 
          "credits": 3,
          "required": true,
          "description": "Mathematical foundations including logic and discrete mathematics."
        }
      ]
    }
  },

  // =============================================
  // MECHANICAL ENGINEERING MAJOR
  // =============================================
  "mechanical_engineering": {
    "degree_info": {
      "institution": "Purdue University",
      "campus": "West Lafayette Campus",
      "college": "College of Engineering",
      "degree": "Mechanical Engineering-BS",
      "level": "Undergraduate",
      "catalog_year": "Fall 2024",
      "total_credits_required": 128,
      "minimum_gpa_required": 2.0,
      "has_tracks": true,
      "available_tracks": ["thermal_fluids", "design_manufacturing", "dynamics_controls"]
    },
    "foundation_courses": {
      "credits_required": 20,
      "courses": [
        {
          "code": "ENGR 13100",
          "title": "Transforming Ideas to Innovation I",
          "credits": 2,
          "required": true,
          "typical_semester": "freshman_fall",
          "description": "Introduction to engineering design process and innovation.",
          "prerequisites": []
        },
        {
          "code": "ENGR 13200",
          "title": "Transforming Ideas to Innovation II",
          "credits": 2,
          "required": true,
          "typical_semester": "freshman_spring",
          "description": "Continuation of engineering design and project work.",
          "prerequisites": ["ENGR 13100"]
        },
        {
          "code": "ME 20000",
          "title": "Thermodynamics I",
          "credits": 3,
          "required": true,
          "typical_semester": "sophomore_fall",
          "description": "Basic principles of thermodynamics and energy systems.",
          "prerequisites": ["MA 16200", "PHYS 17200"]
        },
        {
          "code": "ME 27000",
          "title": "Basic Mechanics I",
          "credits": 3,
          "required": true,
          "typical_semester": "sophomore_spring",
          "description": "Statics and dynamics of mechanical systems.",
          "prerequisites": ["MA 16200", "PHYS 17200"]
        }
      ]
    },
    "mathematics_requirements": {
      "credits_required": 16,
      "courses": [
        {
          "code": "MA 16100",
          "title": "Plane Analytic Geometry and Calculus I",
          "credits": 4,
          "required": true,
          "description": "Differential calculus and applications."
        },
        {
          "code": "MA 16200",
          "title": "Plane Analytic Geometry and Calculus II",
          "credits": 4,
          "required": true,
          "description": "Integral calculus and infinite series.",
          "prerequisites": ["MA 16100"]
        },
        {
          "code": "MA 26100",
          "title": "Multivariate Calculus",
          "credits": 4,
          "required": true,
          "description": "Calculus of several variables.",
          "prerequisites": ["MA 16200"]
        },
        {
          "code": "MA 26600",
          "title": "Ordinary Differential Equations",
          "credits": 4,
          "required": true,
          "description": "Theory and applications of differential equations.",
          "prerequisites": ["MA 26100"]
        }
      ]
    }
  },

  // =============================================
  // BUSINESS ADMINISTRATION MAJOR
  // =============================================
  "business_administration": {
    "degree_info": {
      "institution": "Purdue University",
      "campus": "West Lafayette Campus",
      "college": "Krannert School of Management",
      "degree": "Business Administration-BS",
      "level": "Undergraduate",
      "catalog_year": "Fall 2024",
      "total_credits_required": 120,
      "minimum_gpa_required": 2.0,
      "has_tracks": true,
      "available_tracks": ["finance", "marketing", "management", "analytics"]
    },
    "foundation_courses": {
      "credits_required": 24,
      "courses": [
        {
          "code": "MGMT 20000",
          "title": "Introduction to Business",
          "credits": 3,
          "required": true,
          "typical_semester": "freshman_fall",
          "description": "Overview of business principles and practices.",
          "prerequisites": []
        },
        {
          "code": "ECON 21000",
          "title": "Principles of Economics",
          "credits": 3,
          "required": true,
          "typical_semester": "freshman_spring",
          "description": "Microeconomic and macroeconomic principles.",
          "prerequisites": []
        },
        {
          "code": "MGMT 30000",
          "title": "Business Statistics",
          "credits": 3,
          "required": true,
          "typical_semester": "sophomore_fall",
          "description": "Statistical methods for business decision making.",
          "prerequisites": ["MA 15300"]
        },
        {
          "code": "MGMT 35500",
          "title": "Financial Accounting",
          "credits": 3,
          "required": true,
          "typical_semester": "sophomore_spring",
          "description": "Fundamentals of financial accounting.",
          "prerequisites": ["MGMT 20000"]
        }
      ]
    },
    "mathematics_requirements": {
      "credits_required": 6,
      "courses": [
        {
          "code": "MA 15300",
          "title": "College Algebra",
          "credits": 3,
          "required": true,
          "description": "Algebra fundamentals for business applications."
        },
        {
          "code": "MA 22400",
          "title": "Business Calculus",
          "credits": 3,
          "required": true,
          "description": "Calculus applications in business and economics.",
          "prerequisites": ["MA 15300"]
        }
      ]
    }
  },

  // =============================================
  // PSYCHOLOGY MAJOR
  // =============================================
  "psychology": {
    "degree_info": {
      "institution": "Purdue University",
      "campus": "West Lafayette Campus",
      "college": "College of Health and Human Sciences",
      "degree": "Psychology-BS",
      "level": "Undergraduate",
      "catalog_year": "Fall 2024",
      "total_credits_required": 120,
      "minimum_gpa_required": 2.0,
      "has_tracks": true,
      "available_tracks": ["clinical", "cognitive", "developmental", "social"]
    },
    "foundation_courses": {
      "credits_required": 18,
      "courses": [
        {
          "code": "PSY 12000",
          "title": "Elementary Psychology",
          "credits": 3,
          "required": true,
          "typical_semester": "freshman_fall",
          "description": "Introduction to psychological principles and research.",
          "prerequisites": []
        },
        {
          "code": "PSY 20100",
          "title": "Statistical Methods in Psychology",
          "credits": 3,
          "required": true,
          "typical_semester": "sophomore_fall",
          "description": "Statistical analysis methods for psychological research.",
          "prerequisites": ["PSY 12000", "MA 15300"]
        },
        {
          "code": "PSY 30300",
          "title": "Research Methods in Psychology",
          "credits": 3,
          "required": true,
          "typical_semester": "sophomore_spring",
          "description": "Experimental design and research methodology.",
          "prerequisites": ["PSY 20100"]
        }
      ]
    }
  },

  // =============================================
  // AGRICULTURE MAJOR (AGRONOMY)
  // =============================================
  "agronomy": {
    "degree_info": {
      "institution": "Purdue University",
      "campus": "West Lafayette Campus",
      "college": "College of Agriculture",
      "degree": "Agronomy-BS",
      "level": "Undergraduate",
      "catalog_year": "Fall 2024",
      "total_credits_required": 120,
      "minimum_gpa_required": 2.0,
      "has_tracks": true,
      "available_tracks": ["crop_science", "soil_science", "plant_breeding"]
    },
    "foundation_courses": {
      "credits_required": 15,
      "courses": [
        {
          "code": "AGRY 10000",
          "title": "Introduction to Agriculture",
          "credits": 3,
          "required": true,
          "typical_semester": "freshman_fall",
          "description": "Overview of agricultural systems and practices.",
          "prerequisites": []
        },
        {
          "code": "AGRY 25500",
          "title": "Crop Production",
          "credits": 3,
          "required": true,
          "typical_semester": "sophomore_fall",
          "description": "Principles of crop production and management.",
          "prerequisites": ["AGRY 10000", "BIOL 11000"]
        },
        {
          "code": "AGRY 27000",
          "title": "Soil Science",
          "credits": 4,
          "required": true,
          "typical_semester": "sophomore_spring",
          "description": "Physical, chemical, and biological properties of soils.",
          "prerequisites": ["CHM 11500", "BIOL 11000"]
        }
      ]
    }
  },

  // =============================================
  // ACADEMIC POLICIES AND PROCEDURES
  // =============================================
  "academic_policies": {
    "gpa_requirements": {
      "minimum_graduation_gpa": 2.0,
      "minimum_major_gpa": 2.0,
      "probation_threshold": 1.75,
      "suspension_threshold": 1.5,
      "honors_requirements": {
        "cum_laude": 3.5,
        "magna_cum_laude": 3.7,
        "summa_cum_laude": 3.9
      }
    },
    "credit_requirements": {
      "minimum_total_credits": 120,
      "minimum_residence_credits": 32,
      "maximum_transfer_credits": 88,
      "maximum_credits_per_semester": 18,
      "minimum_credits_for_fulltime": 12,
      "summer_maximum_credits": 12
    },
    "academic_standing": {
      "good_standing": {
        "description": "GPA of 2.0 or higher",
        "privileges": ["Normal registration", "Full academic privileges"]
      },
      "probation": {
        "description": "GPA between 1.5 and 1.74",
        "restrictions": ["Maximum 14 credit hours", "Academic success coaching required"],
        "duration": "One semester to improve GPA above 1.75"
      },
      "suspension": {
        "description": "GPA below 1.5 or failure to improve during probation",
        "restrictions": ["Cannot enroll for one semester", "Must petition for readmission"],
        "appeal_process": "Submit appeal to Academic Standards Committee"
      }
    },
    "graduation_requirements": {
      "general_requirements": [
        "Completion of degree-specific credit hours",
        "Minimum 2.0 cumulative GPA",
        "Minimum 2.0 major GPA",
        "At least 32 credits in residence at Purdue",
        "Completion of all core curriculum requirements",
        "Application for graduation submitted by deadline"
      ],
      "core_curriculum": {
        "written_communication": {
          "credits_required": 6,
          "courses": ["ENGL 10600", "ENGL 10800"]
        },
        "oral_communication": {
          "credits_required": 3,
          "courses": ["COM 11400", "COM 21700"]
        },
        "quantitative_reasoning": {
          "credits_required": 3,
          "description": "Mathematics course appropriate to major"
        },
        "science_technology_society": {
          "credits_required": 6,
          "description": "Two courses examining science and technology in society"
        },
        "information_literacy": {
          "credits_required": 3,
          "description": "Course focusing on information literacy skills"
        },
        "human_cultures": {
          "credits_required": 9,
          "subcategories": {
            "behavioral_social_sciences": 3,
            "humanities": 3,
            "cultural_diversity": 3
          }
        }
      }
    }
  },

  // =============================================
  // CODO (CHANGE OF DEGREE OBJECTIVE) POLICIES
  // =============================================
  "codo_policies": {
    "general_information": {
      "description": "CODO allows students to change their major/degree objective",
      "application_periods": [
        "Fall semester: March 1 - September 15",
        "Spring semester: October 1 - February 15",
        "Summer session: February 1 - June 15"
      ],
      "processing_time": "2-4 weeks after submission",
      "application_fee": 0,
      "max_attempts": "Generally 2 attempts per major"
    },
    "eligibility_requirements": {
      "general": [
        "Must be currently enrolled Purdue student",
        "Cannot be on academic probation or suspension",
        "Must meet specific major requirements",
        "Complete prerequisite courses with required grades"
      ],
      "gpa_requirements": {
        "minimum_cumulative_gpa": 2.5,
        "minimum_prerequisite_gpa": 2.5,
        "note": "Some competitive majors require higher GPAs"
      }
    },
    "major_specific_requirements": {
      "computer_science": {
        "minimum_gpa": 3.2,
        "required_courses": [
          "CS 18000 (grade of C or better)",
          "MA 16100 (grade of C or better)",
          "MA 16200 (grade of C or better)"
        ],
        "additional_requirements": [
          "Must have attempted CS 18000 at Purdue",
          "Strong performance in mathematics courses"
        ],
        "competitive_admission": true,
        "application_deadlines": {
          "fall": "March 15",
          "spring": "October 15"
        }
      },
      "data_science": {
        "minimum_gpa": 3.2,
        "required_courses": [
          "MA 16500 (grade of B- or better)",
          "MA 16600 (grade of B- or better)", 
          "CS 18000 (grade of B- or better)"
        ],
        "additional_requirements": [
          "Strong math and programming skills required"
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
        "additional_requirements": [
          "Exceptional math and CS performance required"
        ],
        "competitive_admission": true
      }
    },
    "application_process": {
      "steps": [
        "Meet with current academic advisor",
        "Research target major requirements",
        "Complete prerequisite courses",
        "Submit CODO application online",
        "Provide official transcripts if transferring credits",
        "Meet with target major advisor (if required)",
        "Wait for admission decision",
        "Accept admission and update academic plan"
      ],
      "required_documents": [
        "Completed CODO application",
        "Academic transcripts",
        "Personal statement (for some majors)",
        "Letters of recommendation (for competitive majors)"
      ]
    },
    "important_notes": [
      "CODO does not guarantee admission to desired major",
      "Some majors have limited space and competitive admission",
      "Students should have backup plans",
      "Financial aid may be affected by major changes",
      "Graduation timeline may be extended",
      "Some courses may not apply to new major"
    ]
  },

  // =============================================
  // COURSE PREREQUISITES AND POLICIES
  // =============================================
  "course_policies": {
    "prerequisite_enforcement": {
      "description": "Prerequisites are strictly enforced through the registration system",
      "exceptions": "Requires instructor and advisor approval",
      "waiver_process": "Submit petition with justification"
    },
    "grade_requirements": {
      "prerequisite_grades": {
        "default_minimum": "D",
        "major_courses": "C",
        "competitive_programs": "C+ or B-"
      },
      "repeat_policy": {
        "maximum_attempts": 3,
        "grade_replacement": "Higher grade replaces lower grade in GPA",
        "transcript_notation": "All attempts shown on transcript"
      }
    },
    "registration_policies": {
      "priority_registration": {
        "order": ["Graduate students", "Seniors", "Juniors", "Sophomores", "Freshmen"],
        "honors_students": "Early registration privileges",
        "athletes": "Special registration accommodations"
      },
      "waitlist_policy": {
        "automatic_enrollment": "If spot opens and no time conflicts",
        "maximum_waitlists": 5,
        "notification_method": "Email to Purdue account"
      },
      "add_drop_deadlines": {
        "add_deadline": "Friday of first week",
        "drop_deadline_no_grade": "Friday of first week",
        "withdraw_deadline": "Week 8 of semester",
        "withdraw_notation": "W appears on transcript"
      }
    },
    "common_prerequisites": {
      "mathematics_sequence": {
        "MA 15300": {
          "title": "College Algebra",
          "prerequisite_for": ["MA 16100", "MA 22400", "STAT 30100"]
        },
        "MA 16100": {
          "title": "Calculus I",
          "prerequisites": ["MA 15300 or placement"],
          "prerequisite_for": ["MA 16200", "PHYS 17200", "ENGR courses"]
        },
        "MA 16200": {
          "title": "Calculus II",
          "prerequisites": ["MA 16100"],
          "prerequisite_for": ["MA 26100", "PHYS 27200", "Engineering courses"]
        }
      },
      "science_sequence": {
        "CHM 11500": {
          "title": "General Chemistry",
          "prerequisite_for": ["CHM 25500", "BIOL 11000", "Engineering programs"]
        },
        "PHYS 17200": {
          "title": "Modern Mechanics",
          "prerequisites": ["MA 16100"],
          "prerequisite_for": ["PHYS 27200", "Engineering courses"]
        },
        "BIOL 11000": {
          "title": "Fundamentals of Biology I",
          "prerequisite_for": ["BIOL 11100", "Life science courses"]
        }
      }
    }
  },

  // =============================================
  // MINORS AND CERTIFICATES
  // =============================================
  "minors": {
    "computer_science_minor": {
      "title": "Computer Science Minor",
      "available_to": "Non-CS majors",
      "credits_required": 20,
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
          "code": "CS 25100",
          "title": "Data Structures",
          "credits": 3,
          "required": true
        }
      ],
      "electives": {
        "credits_required": 10,
        "choose_from": ["CS 25000", "CS 25200", "CS 30700", "CS 35200"]
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
        }
      ],
      "electives": {
        "credits_required": 8,
        "choose_from": ["CS 37300", "CS 24300", "STAT 35000"]
      }
    }
  }
};

// Helper functions for data access
const degreeRequirementsAPI = {
  // Get all available programs
  getAllPrograms() {
    return Object.keys(comprehensiveDegreeRequirements);
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
    
    // Add math requirements
    if (program.mathematics_requirements?.courses) {
      allCourses = allCourses.concat(program.mathematics_requirements.courses);
    }
    
    // Add track courses
    if (program.tracks) {
      Object.values(program.tracks).forEach(track => {
        if (track.required_courses) {
          allCourses = allCourses.concat(track.required_courses);
        }
      });
    }
    
    return allCourses;
  },

  // Search courses by code or title
  searchCourses(query, programKey = null) {
    const queryLower = query.toLowerCase();
    let coursesToSearch = [];
    
    if (programKey) {
      coursesToSearch = this.getAllCourses(programKey);
    } else {
      // Search all programs
      this.getAllPrograms().forEach(prog => {
        coursesToSearch = coursesToSearch.concat(this.getAllCourses(prog));
      });
    }
    
    return coursesToSearch.filter(course => 
      course.code.toLowerCase().includes(queryLower) ||
      course.title.toLowerCase().includes(queryLower) ||
      (course.description && course.description.toLowerCase().includes(queryLower))
    );
  },

  // Get course by exact code
  getCourseByCode(courseCode, programKey = null) {
    const courses = programKey ? this.getAllCourses(programKey) : this.getAllCourses('computer_science');
    return courses.find(course => course.code.toUpperCase() === courseCode.toUpperCase());
  },

  // Get program degree info
  getProgramInfo(programKey) {
    const program = this.getProgram(programKey);
    return program?.degree_info || null;
  },

  // Get academic policies
  getAcademicPolicies() {
    return comprehensiveDegreeRequirements.academic_policies || null;
  },

  // Get CODO policies
  getCODOPolicies() {
    return comprehensiveDegreeRequirements.codo_policies || null;
  },

  // Get CODO requirements for specific major
  getCODORequirements(majorKey) {
    const codoPolicies = this.getCODOPolicies();
    return codoPolicies?.major_specific_requirements?.[majorKey] || null;
  },

  // Get course policies
  getCoursePolicies() {
    return comprehensiveDegreeRequirements.course_policies || null;
  },

  // Get all minors
  getAllMinors() {
    return comprehensiveDegreeRequirements.minors || {};
  },

  // Get specific minor information
  getMinor(minorKey) {
    return comprehensiveDegreeRequirements.minors?.[minorKey] || null;
  },

  // Search for prerequisite information
  getPrerequisites(courseCode) {
    const coursePolicies = this.getCoursePolicies();
    const commonPrereqs = coursePolicies?.common_prerequisites;
    
    // Search through all prerequisite chains
    for (const category of Object.values(commonPrereqs || {})) {
      if (category[courseCode]) {
        return category[courseCode];
      }
    }
    
    // Search through program courses
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

  // Check if student meets CODO requirements for a major
  checkCODOEligibility(majorKey, studentData) {
    const requirements = this.getCODORequirements(majorKey);
    if (!requirements) {
      return { eligible: false, reason: "Major not found or no CODO requirements defined" };
    }

    const results = {
      eligible: true,
      requirements_met: [],
      requirements_missing: [],
      overall_gpa_requirement: requirements.minimum_gpa,
      student_gpa: studentData.gpa || 0
    };

    // Check GPA requirement
    if (studentData.gpa < requirements.minimum_gpa) {
      results.eligible = false;
      results.requirements_missing.push(`Minimum GPA of ${requirements.minimum_gpa} required (current: ${studentData.gpa})`);
    } else {
      results.requirements_met.push(`GPA requirement met (${studentData.gpa} >= ${requirements.minimum_gpa})`);
    }

    // Check required courses
    if (requirements.required_courses) {
      for (const courseReq of requirements.required_courses) {
        const courseCode = courseReq.split(' ')[0] + ' ' + courseReq.split(' ')[1];
        const studentCourse = studentData.completed_courses?.find(c => c.code === courseCode);
        
        if (!studentCourse) {
          results.eligible = false;
          results.requirements_missing.push(`Missing required course: ${courseReq}`);
        } else if (studentCourse.grade && this.isGradeBelowC(studentCourse.grade)) {
          results.eligible = false;
          results.requirements_missing.push(`${courseReq} - grade of C or better required (current: ${studentCourse.grade})`);
        } else {
          results.requirements_met.push(`Completed ${courseReq}`);
        }
      }
    }

    return results;
  },

  // Helper function to check if grade is below C
  isGradeBelowC(grade) {
    const gradePoints = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.7,
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'D-': 0.7,
      'F': 0.0
    };
    return (gradePoints[grade] || 0) < 2.0;
  },

  // Get graduation requirements for a program
  getGraduationRequirements(programKey) {
    const program = this.getProgram(programKey);
    const academicPolicies = this.getAcademicPolicies();
    
    if (!program) return null;
    
    return {
      program_specific: {
        total_credits: program.degree_info.total_credits_required,
        minimum_gpa: program.degree_info.minimum_gpa_required,
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