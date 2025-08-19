// Comprehensive Degree Requirements - Auto-generated from migration
// DO NOT EDIT MANUALLY - Use data migration service to update

const comprehensiveDegreeRequirements = {
  "computer_science": {
    "degree_info": {
      "institution": "Purdue University",
      "campus": "West Lafayette Campus",
      "college": "College of Science",
      "degree": "Computer Science-BS",
      "level": "Undergraduate",
      "catalog_year": "Fall 2024",
      "total_credits_required": 120,
      "minimum_gpa_required": 2,
      "has_tracks": true,
      "available_tracks": [
        "machine_intelligence",
        "software_engineering"
      ]
    },
    "core_requirements": {
      "foundation_courses": [
        "CS 18000",
        "CS 18200",
        "CS 24000",
        "CS 25000",
        "CS 25100",
        "CS 25200"
      ],
      "mathematics": [
        "MA 16100",
        "MA 16200",
        "MA 26100",
        "MA 26500",
        "STAT 35000"
      ],
      "algorithms": [
        "CS 38100"
      ]
    },
    "tracks": {
      "Machine Intelligence": {
        "required_courses": [
          "CS 37300",
          "CS 47100"
        ],
        "elective_options": [
          "CS 47300",
          "CS 48900",
          "STAT 41600"
        ],
        "career_focus": "AI/ML engineering, research"
      },
      "Software Engineering": {
        "required_courses": [
          "CS 40700",
          "CS 40800"
        ],
        "elective_options": [
          "CS 35200",
          "CS 42200",
          "CS 49000"
        ],
        "career_focus": "Software development, systems engineering"
      }
    },
    "courses": {
      "CS 18000": {
        "title": "Problem Solving and Object-Oriented Programming",
        "credits": 4,
        "description": "Introduction to Java programming, object-oriented concepts, and problem-solving techniques.",
        "prerequisites": [],
        "prerequisite_relationships": {},
        "corequisites": [
          "MA 16100"
        ],
        "typical_semester": "freshman_fall",
        "offered_semesters": [
          "fall",
          "spring",
          "summer"
        ],
        "difficulty": 4.2,
        "workload_hours": 12,
        "time_commitment": "15-20 hours per week",
        "difficulty_level": "Hard",
        "required": true,
        "is_critical": true,
        "course_type": "foundation",
        "program_usage": [
          "Computer Science",
          "Data Science",
          "Artificial Intelligence"
        ]
      },
      "CS 18200": {
        "title": "Foundations of Computer Science",
        "credits": 3,
        "description": "Mathematical foundations including discrete mathematics, logic, and proof techniques.",
        "prerequisites": [
          "CS 18000"
        ],
        "prerequisite_relationships": {
          "CS 18000": {
            "type": "required",
            "strength": 1
          }
        },
        "corequisites": [],
        "typical_semester": "freshman_spring",
        "offered_semesters": [
          "fall",
          "spring"
        ],
        "difficulty": 4,
        "workload_hours": 10,
        "time_commitment": "12-15 hours per week",
        "difficulty_level": "Hard",
        "required": true,
        "is_critical": true,
        "course_type": "foundation",
        "program_usage": [
          "Computer Science",
          "Data Science",
          "Artificial Intelligence"
        ]
      },
      "CS 25100": {
        "title": "Data Structures",
        "credits": 3,
        "description": "Linear and nonlinear data structures, algorithm analysis, and implementation.",
        "prerequisites": [
          "CS 25000",
          "CS 18200"
        ],
        "prerequisite_relationships": {
          "CS 25000": {
            "type": "required",
            "strength": 1
          },
          "CS 18200": {
            "type": "required",
            "strength": 0.9
          }
        },
        "corequisites": [],
        "typical_semester": "sophomore_fall",
        "offered_semesters": [
          "fall",
          "spring"
        ],
        "difficulty": 4.5,
        "workload_hours": 14,
        "time_commitment": "18-25 hours per week",
        "difficulty_level": "Very Hard",
        "required": true,
        "is_critical": true,
        "course_type": "foundation",
        "program_usage": [
          "Computer Science",
          "Data Science",
          "Artificial Intelligence"
        ]
      },
      "CS 37300": {
        "title": "Data Mining and Machine Learning",
        "credits": 3,
        "description": "Machine learning algorithms, data preprocessing, and model evaluation.",
        "prerequisites": [
          "CS 25100"
        ],
        "prerequisite_relationships": {
          "CS 25100": {
            "type": "required",
            "strength": 0.9
          },
          "MA 26500": {
            "type": "recommended",
            "strength": 0.7
          }
        },
        "corequisites": [],
        "typical_semester": "junior_fall",
        "offered_semesters": [
          "fall",
          "spring"
        ],
        "difficulty": 4.2,
        "workload_hours": 14,
        "time_commitment": "15-18 hours per week",
        "difficulty_level": "Hard",
        "required": false,
        "is_critical": true,
        "course_type": "track_required",
        "program_usage": [
          "Computer Science",
          "Data Science",
          "Artificial Intelligence"
        ]
      }
    }
  },
  "data_science": {
    "degree_info": {
      "institution": "Purdue University",
      "campus": "West Lafayette Campus",
      "college": "College of Science",
      "degree": "Data Science-BS",
      "level": "Undergraduate",
      "catalog_year": "Fall 2024",
      "total_credits_required": 120,
      "minimum_gpa_required": 2,
      "has_tracks": false
    },
    "type": "standalone_major",
    "tracks": null,
    "total_credits": 120,
    "core_requirements": {
      "foundation_courses": [
        {
          "code": "CS 18000",
          "title": "Problem Solving And Object-Oriented Programming",
          "credits": 4,
          "description": "Introduction to Java programming, object-oriented concepts, and problem-solving techniques.",
          "required": true,
          "typical_semester": "freshman_fall"
        },
        {
          "code": "CS 18200",
          "title": "Foundations Of Computer Science",
          "credits": 3,
          "description": "Mathematical foundations including discrete mathematics, logic, and proof techniques.",
          "required": true,
          "typical_semester": "freshman_spring",
          "prerequisites": [
            "CS 18000"
          ]
        },
        {
          "code": "CS 25300",
          "title": "Data Structures And Algorithms For DS/AI",
          "credits": 3,
          "description": "Data structures and algorithms specifically for data science and AI applications.",
          "required": true,
          "typical_semester": "sophomore_spring",
          "prerequisites": [
            "CS 18000",
            "CS 18200"
          ]
        },
        {
          "code": "CS 37300",
          "title": "Data Mining And Machine Learning",
          "credits": 3,
          "description": "Machine learning algorithms, data preprocessing, and model evaluation.",
          "required": true,
          "typical_semester": "junior_fall",
          "prerequisites": [
            "CS 25300"
          ]
        },
        {
          "code": "CS 38003",
          "title": "Python Programming",
          "credits": 1,
          "description": "Python programming fundamentals for data science applications.",
          "required": true,
          "typical_semester": "freshman_spring"
        },
        {
          "code": "CS 44000",
          "title": "Large Scale Data Analytics",
          "credits": 3,
          "description": "Big data processing, distributed computing, and scalable analytics.",
          "required": true,
          "typical_semester": "senior_fall",
          "prerequisites": [
            "CS 37300"
          ]
        },
        {
          "code": "STAT 35500",
          "title": "Statistics For Data Science",
          "credits": 3,
          "description": "Statistical methods and concepts specifically for data science applications.",
          "required": true,
          "typical_semester": "sophomore_fall"
        },
        {
          "code": "STAT 41600",
          "title": "Probability",
          "credits": 3,
          "description": "Probability theory and applications to data science.",
          "required": true,
          "typical_semester": "sophomore_spring",
          "prerequisites": [
            "STAT 35500"
          ]
        },
        {
          "code": "STAT 41700",
          "title": "Statistical Theory",
          "credits": 3,
          "description": "Advanced statistical theory and inference methods.",
          "required": true,
          "typical_semester": "junior_spring",
          "prerequisites": [
            "STAT 41600"
          ]
        }
      ],
      "mathematics": [
        {
          "code": "MA 16100",
          "title": "Plane Analytic Geometry And Calculus I",
          "credits": 5,
          "description": "First course in calculus sequence.",
          "required": true,
          "typical_semester": "freshman_fall"
        },
        {
          "code": "MA 16200",
          "title": "Plane Analytic Geometry And Calculus II",
          "credits": 5,
          "description": "Second course in calculus sequence.",
          "required": true,
          "typical_semester": "freshman_spring",
          "prerequisites": [
            "MA 16100"
          ]
        },
        {
          "code": "MA 26100",
          "title": "Multivariate Calculus",
          "credits": 4,
          "description": "Multivariable calculus including partial derivatives and multiple integrals.",
          "required": true,
          "typical_semester": "sophomore_fall",
          "prerequisites": [
            "MA 16200"
          ]
        },
        {
          "code": "MA 35100",
          "title": "Elementary Linear Algebra",
          "credits": 3,
          "description": "Linear algebra fundamentals for data science applications.",
          "required": true,
          "typical_semester": "sophomore_spring",
          "prerequisites": [
            "MA 16200"
          ]
        }
      ],
      "introduction_course": {
        "choose_one": [
          {
            "code": "CS 24200",
            "title": "Introduction To Data Science",
            "credits": 3,
            "description": "CS department introduction to data science concepts and methods.",
            "typical_semester": "sophomore_fall"
          },
          {
            "code": "STAT 24200",
            "title": "Introduction To Data Science",
            "credits": 3,
            "description": "Statistics department introduction to data science concepts and methods.",
            "typical_semester": "sophomore_fall"
          }
        ]
      }
    },
    "electives": {
      "cs_selectives": {
        "credits_required": 6,
        "choose_two": [
          {
            "code": "CS 31100 + CS 41100",
            "title": "Competitive Programming II + III",
            "credits": 4,
            "description": "Advanced competitive programming techniques.",
            "prerequisites": [
              "CS 25100"
            ]
          },
          {
            "code": "CS 31400",
            "title": "Numerical Methods",
            "credits": 3,
            "description": "Numerical analysis and computational methods.",
            "prerequisites": [
              "CS 25100",
              "MA 26100"
            ]
          },
          {
            "code": "CS 35500",
            "title": "Introduction To Cryptography",
            "credits": 3,
            "description": "Cryptographic algorithms and security protocols.",
            "prerequisites": [
              "CS 25100"
            ]
          },
          {
            "code": "CS 43900",
            "title": "Introduction To Data Visualization",
            "credits": 3,
            "description": "Data visualization techniques and tools.",
            "prerequisites": [
              "CS 25300"
            ]
          },
          {
            "code": "CS 45800",
            "title": "Introduction To Robotics",
            "credits": 3,
            "description": "Robotics fundamentals and autonomous systems.",
            "prerequisites": [
              "CS 25100"
            ]
          },
          {
            "code": "CS 47100",
            "title": "Introduction To Artificial Intelligence",
            "credits": 3,
            "description": "AI algorithms and intelligent systems.",
            "prerequisites": [
              "CS 25100"
            ]
          },
          {
            "code": "CS 47300",
            "title": "Web Information Search And Management",
            "credits": 3,
            "description": "Web search algorithms and information retrieval.",
            "prerequisites": [
              "CS 25100"
            ]
          },
          {
            "code": "CS 47500",
            "title": "Human-Computer Interaction",
            "credits": 3,
            "description": "HCI principles and interface design.",
            "prerequisites": [
              "CS 25100"
            ]
          },
          {
            "option_group_1": {
              "choose_one": [
                {
                  "code": "CS 30700",
                  "title": "Software Engineering I",
                  "credits": 3,
                  "description": "Software development lifecycle and methodologies.",
                  "prerequisites": [
                    "CS 25100"
                  ]
                },
                {
                  "code": "CS 40800",
                  "title": "Software Testing",
                  "credits": 3,
                  "description": "Software testing techniques and quality assurance.",
                  "prerequisites": [
                    "CS 25100"
                  ]
                }
              ]
            }
          },
          {
            "option_group_2": {
              "choose_one": [
                {
                  "code": "CS 34800",
                  "title": "Information Systems",
                  "credits": 3,
                  "description": "Information systems design and management.",
                  "prerequisites": [
                    "CS 25100"
                  ]
                },
                {
                  "code": "CS 44800",
                  "title": "Introduction To Relational Database Systems",
                  "credits": 3,
                  "description": "Database design and SQL programming.",
                  "prerequisites": [
                    "CS 25100"
                  ]
                }
              ]
            }
          },
          {
            "option_group_3": {
              "choose_one": [
                {
                  "code": "CS 38100",
                  "title": "Introduction To The Analysis Of Algorithms",
                  "credits": 3,
                  "description": "Algorithm analysis and complexity theory.",
                  "prerequisites": [
                    "CS 25100"
                  ]
                },
                {
                  "code": "CS 48300",
                  "title": "Introduction To The Theory Of Computation",
                  "credits": 3,
                  "description": "Computational theory and formal languages.",
                  "prerequisites": [
                    "CS 25100"
                  ]
                }
              ]
            }
          }
        ]
      },
      "ethics_selective": {
        "credits_required": 3,
        "choose_one": [
          {
            "code": "ILS 23000",
            "title": "Data Science And Society: Ethical Legal Social Issues",
            "credits": 3,
            "description": "Ethical, legal, and social implications of data science.",
            "typical_semester": "sophomore_year"
          },
          {
            "code": "PHIL 20700",
            "title": "Ethics For Technology, Engineering, And Design",
            "credits": 3,
            "description": "Ethics in technology and engineering design.",
            "typical_semester": "sophomore_year"
          },
          {
            "code": "PHIL 20800",
            "title": "Ethics Of Data Science",
            "credits": 3,
            "description": "Ethical frameworks specifically for data science.",
            "typical_semester": "sophomore_year"
          }
        ]
      },
      "statistics_selective": {
        "credits_required": 3,
        "choose_one": [
          {
            "code": "MA 43200",
            "title": "Elementary Stochastic Processes",
            "credits": 3,
            "description": "Stochastic process theory and applications.",
            "prerequisites": [
              "STAT 41600"
            ]
          },
          {
            "code": "STAT 42000",
            "title": "Introduction To Time Series",
            "credits": 3,
            "description": "Time series analysis and forecasting methods.",
            "prerequisites": [
              "STAT 41700"
            ]
          },
          {
            "code": "STAT 50600",
            "title": "Statistical Programming And Data Management",
            "credits": 3,
            "description": "Statistical programming and data manipulation.",
            "prerequisites": [
              "STAT 35500"
            ]
          },
          {
            "code": "STAT 51200",
            "title": "Applied Regression Analysis",
            "credits": 3,
            "description": "Regression modeling and analysis techniques.",
            "prerequisites": [
              "STAT 41700"
            ]
          },
          {
            "code": "STAT 51300",
            "title": "Statistical Quality Control",
            "credits": 3,
            "description": "Quality control methods and statistical monitoring.",
            "prerequisites": [
              "STAT 41700"
            ]
          },
          {
            "code": "STAT 51400",
            "title": "Design Of Experiments",
            "credits": 3,
            "description": "Experimental design and analysis of variance.",
            "prerequisites": [
              "STAT 41700"
            ]
          },
          {
            "code": "STAT 52200",
            "title": "Sampling And Survey Techniques",
            "credits": 3,
            "description": "Survey methodology and sampling theory.",
            "prerequisites": [
              "STAT 41700"
            ]
          },
          {
            "code": "STAT 52500",
            "title": "Intermediate Statistical Methodology",
            "credits": 3,
            "description": "Advanced statistical methods and applications.",
            "prerequisites": [
              "STAT 41700"
            ]
          }
        ]
      },
      "capstone_experience": {
        "credits_required": 3,
        "choose_one": [
          {
            "code": "CS 49000",
            "title": "Topics In Computer Science For Undergraduates (Individual Study)",
            "credits": 3,
            "description": "Independent research in data science under faculty supervision.",
            "prerequisites": [
              "CS 37300"
            ]
          },
          {
            "code": "CS 44100",
            "title": "Data Science Capstone",
            "credits": 3,
            "description": "Capstone project integrating data science skills and knowledge.",
            "prerequisites": [
              "CS 37300"
            ]
          }
        ]
      }
    },
    "courses": {
      "CS 18000": {
        "title": "Problem Solving and Object-Oriented Programming",
        "credits": 4,
        "description": "Introduction to Java programming, object-oriented concepts, and problem-solving techniques.",
        "prerequisites": [],
        "prerequisite_relationships": {},
        "corequisites": [
          "MA 16100"
        ],
        "typical_semester": "freshman_fall",
        "offered_semesters": [
          "fall",
          "spring",
          "summer"
        ],
        "difficulty": 4.2,
        "workload_hours": 12,
        "time_commitment": "15-20 hours per week",
        "difficulty_level": "Hard",
        "required": true,
        "is_critical": true,
        "course_type": "foundation",
        "program_usage": [
          "Computer Science",
          "Data Science",
          "Artificial Intelligence"
        ]
      },
      "CS 18200": {
        "title": "Foundations of Computer Science",
        "credits": 3,
        "description": "Mathematical foundations including discrete mathematics, logic, and proof techniques.",
        "prerequisites": [
          "CS 18000"
        ],
        "prerequisite_relationships": {
          "CS 18000": {
            "type": "required",
            "strength": 1
          }
        },
        "corequisites": [],
        "typical_semester": "freshman_spring",
        "offered_semesters": [
          "fall",
          "spring"
        ],
        "difficulty": 4,
        "workload_hours": 10,
        "time_commitment": "12-15 hours per week",
        "difficulty_level": "Hard",
        "required": true,
        "is_critical": true,
        "course_type": "foundation",
        "program_usage": [
          "Computer Science",
          "Data Science",
          "Artificial Intelligence"
        ]
      },
      "CS 25100": {
        "title": "Data Structures",
        "credits": 3,
        "description": "Linear and nonlinear data structures, algorithm analysis, and implementation.",
        "prerequisites": [
          "CS 25000",
          "CS 18200"
        ],
        "prerequisite_relationships": {
          "CS 25000": {
            "type": "required",
            "strength": 1
          },
          "CS 18200": {
            "type": "required",
            "strength": 0.9
          }
        },
        "corequisites": [],
        "typical_semester": "sophomore_fall",
        "offered_semesters": [
          "fall",
          "spring"
        ],
        "difficulty": 4.5,
        "workload_hours": 14,
        "time_commitment": "18-25 hours per week",
        "difficulty_level": "Very Hard",
        "required": true,
        "is_critical": true,
        "course_type": "foundation",
        "program_usage": [
          "Computer Science",
          "Data Science",
          "Artificial Intelligence"
        ]
      },
      "CS 37300": {
        "title": "Data Mining and Machine Learning",
        "credits": 3,
        "description": "Machine learning algorithms, data preprocessing, and model evaluation.",
        "prerequisites": [
          "CS 25100"
        ],
        "prerequisite_relationships": {
          "CS 25100": {
            "type": "required",
            "strength": 0.9
          },
          "MA 26500": {
            "type": "recommended",
            "strength": 0.7
          }
        },
        "corequisites": [],
        "typical_semester": "junior_fall",
        "offered_semesters": [
          "fall",
          "spring"
        ],
        "difficulty": 4.2,
        "workload_hours": 14,
        "time_commitment": "15-18 hours per week",
        "difficulty_level": "Hard",
        "required": false,
        "is_critical": true,
        "course_type": "track_required",
        "program_usage": [
          "Computer Science",
          "Data Science",
          "Artificial Intelligence"
        ]
      }
    }
  },
  "artificial_intelligence": {
    "degree_info": {
      "institution": "Purdue University",
      "campus": "West Lafayette Campus",
      "college": "College of Science",
      "degree": "Artificial Intelligence-BS",
      "level": "Undergraduate",
      "catalog_year": "Fall 2024",
      "total_credits_required": 120,
      "minimum_gpa_required": 2,
      "has_tracks": false
    },
    "core_requirements": {
      "foundation_courses": [
        "CS 17600",
        "CS 18000",
        "CS 18200",
        "CS 24300",
        "CS 25300"
      ],
      "mathematics": [
        "MA 16100",
        "MA 16200",
        "MA 26100",
        "MA 26500",
        "MA 41600"
      ],
      "psychology": [
        "PSY 12000",
        "PSY 20000"
      ],
      "philosophy": [
        "PHIL 20700",
        "PHIL 22100"
      ]
    },
    "courses": {
      "CS 18000": {
        "title": "Problem Solving and Object-Oriented Programming",
        "credits": 4,
        "description": "Introduction to Java programming, object-oriented concepts, and problem-solving techniques.",
        "prerequisites": [],
        "prerequisite_relationships": {},
        "corequisites": [
          "MA 16100"
        ],
        "typical_semester": "freshman_fall",
        "offered_semesters": [
          "fall",
          "spring",
          "summer"
        ],
        "difficulty": 4.2,
        "workload_hours": 12,
        "time_commitment": "15-20 hours per week",
        "difficulty_level": "Hard",
        "required": true,
        "is_critical": true,
        "course_type": "foundation",
        "program_usage": [
          "Computer Science",
          "Data Science",
          "Artificial Intelligence"
        ]
      },
      "CS 18200": {
        "title": "Foundations of Computer Science",
        "credits": 3,
        "description": "Mathematical foundations including discrete mathematics, logic, and proof techniques.",
        "prerequisites": [
          "CS 18000"
        ],
        "prerequisite_relationships": {
          "CS 18000": {
            "type": "required",
            "strength": 1
          }
        },
        "corequisites": [],
        "typical_semester": "freshman_spring",
        "offered_semesters": [
          "fall",
          "spring"
        ],
        "difficulty": 4,
        "workload_hours": 10,
        "time_commitment": "12-15 hours per week",
        "difficulty_level": "Hard",
        "required": true,
        "is_critical": true,
        "course_type": "foundation",
        "program_usage": [
          "Computer Science",
          "Data Science",
          "Artificial Intelligence"
        ]
      },
      "CS 25100": {
        "title": "Data Structures",
        "credits": 3,
        "description": "Linear and nonlinear data structures, algorithm analysis, and implementation.",
        "prerequisites": [
          "CS 25000",
          "CS 18200"
        ],
        "prerequisite_relationships": {
          "CS 25000": {
            "type": "required",
            "strength": 1
          },
          "CS 18200": {
            "type": "required",
            "strength": 0.9
          }
        },
        "corequisites": [],
        "typical_semester": "sophomore_fall",
        "offered_semesters": [
          "fall",
          "spring"
        ],
        "difficulty": 4.5,
        "workload_hours": 14,
        "time_commitment": "18-25 hours per week",
        "difficulty_level": "Very Hard",
        "required": true,
        "is_critical": true,
        "course_type": "foundation",
        "program_usage": [
          "Computer Science",
          "Data Science",
          "Artificial Intelligence"
        ]
      },
      "CS 37300": {
        "title": "Data Mining and Machine Learning",
        "credits": 3,
        "description": "Machine learning algorithms, data preprocessing, and model evaluation.",
        "prerequisites": [
          "CS 25100"
        ],
        "prerequisite_relationships": {
          "CS 25100": {
            "type": "required",
            "strength": 0.9
          },
          "MA 26500": {
            "type": "recommended",
            "strength": 0.7
          }
        },
        "corequisites": [],
        "typical_semester": "junior_fall",
        "offered_semesters": [
          "fall",
          "spring"
        ],
        "difficulty": 4.2,
        "workload_hours": 14,
        "time_commitment": "15-18 hours per week",
        "difficulty_level": "Hard",
        "required": false,
        "is_critical": true,
        "course_type": "track_required",
        "program_usage": [
          "Computer Science",
          "Data Science",
          "Artificial Intelligence"
        ]
      }
    }
  },
  "all_courses": {
    "CS 18000": {
      "title": "Problem Solving and Object-Oriented Programming",
      "credits": 4,
      "description": "Introduction to Java programming, object-oriented concepts, and problem-solving techniques.",
      "prerequisites": [],
      "prerequisite_relationships": {},
      "corequisites": [
        "MA 16100"
      ],
      "typical_semester": "freshman_fall",
      "offered_semesters": [
        "fall",
        "spring",
        "summer"
      ],
      "difficulty": 4.2,
      "workload_hours": 12,
      "time_commitment": "15-20 hours per week",
      "difficulty_level": "Hard",
      "required": true,
      "is_critical": true,
      "course_type": "foundation",
      "program_usage": [
        "Computer Science",
        "Data Science",
        "Artificial Intelligence"
      ]
    },
    "CS 18200": {
      "title": "Foundations of Computer Science",
      "credits": 3,
      "description": "Mathematical foundations including discrete mathematics, logic, and proof techniques.",
      "prerequisites": [
        "CS 18000"
      ],
      "prerequisite_relationships": {
        "CS 18000": {
          "type": "required",
          "strength": 1
        }
      },
      "corequisites": [],
      "typical_semester": "freshman_spring",
      "offered_semesters": [
        "fall",
        "spring"
      ],
      "difficulty": 4,
      "workload_hours": 10,
      "time_commitment": "12-15 hours per week",
      "difficulty_level": "Hard",
      "required": true,
      "is_critical": true,
      "course_type": "foundation",
      "program_usage": [
        "Computer Science",
        "Data Science",
        "Artificial Intelligence"
      ]
    },
    "CS 25100": {
      "title": "Data Structures",
      "credits": 3,
      "description": "Linear and nonlinear data structures, algorithm analysis, and implementation.",
      "prerequisites": [
        "CS 25000",
        "CS 18200"
      ],
      "prerequisite_relationships": {
        "CS 25000": {
          "type": "required",
          "strength": 1
        },
        "CS 18200": {
          "type": "required",
          "strength": 0.9
        }
      },
      "corequisites": [],
      "typical_semester": "sophomore_fall",
      "offered_semesters": [
        "fall",
        "spring"
      ],
      "difficulty": 4.5,
      "workload_hours": 14,
      "time_commitment": "18-25 hours per week",
      "difficulty_level": "Very Hard",
      "required": true,
      "is_critical": true,
      "course_type": "foundation",
      "program_usage": [
        "Computer Science",
        "Data Science",
        "Artificial Intelligence"
      ]
    },
    "CS 37300": {
      "title": "Data Mining and Machine Learning",
      "credits": 3,
      "description": "Machine learning algorithms, data preprocessing, and model evaluation.",
      "prerequisites": [
        "CS 25100"
      ],
      "prerequisite_relationships": {
        "CS 25100": {
          "type": "required",
          "strength": 0.9
        },
        "MA 26500": {
          "type": "recommended",
          "strength": 0.7
        }
      },
      "corequisites": [],
      "typical_semester": "junior_fall",
      "offered_semesters": [
        "fall",
        "spring"
      ],
      "difficulty": 4.2,
      "workload_hours": 14,
      "time_commitment": "15-18 hours per week",
      "difficulty_level": "Hard",
      "required": false,
      "is_critical": true,
      "course_type": "track_required",
      "program_usage": [
        "Computer Science",
        "Data Science",
        "Artificial Intelligence"
      ]
    }
  },
  "prerequisite_chains": {
    "CS_foundation_chain": [
      "CS 18000",
      "CS 18200",
      "CS 25000",
      "CS 25100",
      "CS 25200"
    ],
    "math_foundation_chain": [
      "MA 16100",
      "MA 16200",
      "MA 26100",
      "MA 26500"
    ],
    "ML_track_chain": [
      "CS 25100",
      "CS 37300",
      "CS 47100",
      "CS 47300"
    ]
  }
};

class DegreeRequirementsService {
  // Get all available programs
  getAllPrograms() {
    return ["computer_science", "data_science", "artificial_intelligence"];
  }

  // Get program information
  getProgram(programKey) {
    return comprehensiveDegreeRequirements[programKey] || null;
  }

  // Get all courses for a program
  getAllCourses(programKey) {
    const program = this.getProgram(programKey);
    return program ? program.courses : {};
  }

  // Get foundation courses
  getFoundationCourses(programKey) {
    const program = this.getProgram(programKey);
    if (!program?.core_requirements?.foundation_courses) return [];
    
    return Array.isArray(program.core_requirements.foundation_courses) 
      ? program.core_requirements.foundation_courses 
      : program.core_requirements.foundation_courses;
  }

  // Get electives for Data Science
  getDataScienceElectives() {
    const program = this.getProgram('data_science');
    return program?.electives || {};
  }

  // Get tracks for Computer Science
  getComputerScienceTracks() {
    const program = this.getProgram('computer_science');
    return program?.tracks || {};
  }

  // Search courses by keyword
  searchCourses(keyword, programKey = null) {
    const results = [];
    const searchData = programKey ? 
      this.getAllCourses(programKey) : 
      comprehensiveDegreeRequirements.all_courses;

    for (const [code, course] of Object.entries(searchData)) {
      if (code.toLowerCase().includes(keyword.toLowerCase()) ||
          course.title?.toLowerCase().includes(keyword.toLowerCase()) ||
          course.description?.toLowerCase().includes(keyword.toLowerCase())) {
        results.push({ code, ...course });
      }
    }

    return results;
  }

  // Get prerequisite chain for a course
  getPrerequisiteChain(courseCode) {
    const chains = comprehensiveDegreeRequirements.prerequisite_chains;
    for (const [chainName, courses] of Object.entries(chains)) {
      if (courses.includes(courseCode)) {
        return { chain: chainName, courses };
      }
    }
    return null;
  }

  // Get course by code
  getCourseByCode(courseCode) {
    return comprehensiveDegreeRequirements.all_courses[courseCode] || null;
  }

  // Get program info (for backward compatibility)
  getProgramInfo(programKey) {
    const program = this.getProgram(programKey);
    return program ? program.degree_info : null;
  }

  // Get prerequisites for a course
  getPrerequisites(courseCode) {
    const course = this.getCourseByCode(courseCode);
    if (!course) return null;
    
    return {
      title: course.title,
      prerequisites: course.prerequisites || [],
      corequisites: course.corequisites || []
    };
  }

  // Get CODO policies (placeholder - can be enhanced later)
  getCODOPolicies() {
    return {
      eligibility_requirements: {
        gpa_requirements: {
          minimum_cumulative_gpa: 2.0,
          minimum_prerequisite_gpa: 2.5,
          note: "Requirements vary by program"
        }
      },
      major_specific_requirements: {
        computer_science: { minimum_gpa: 3.0, competitive_admission: true, required_courses: ["CS 18000", "MA 16100", "MA 16200"] },
        data_science: { minimum_gpa: 3.2, competitive_admission: true, required_courses: ["CS 18000", "STAT 35500", "MA 16100"] },
        artificial_intelligence: { minimum_gpa: 3.3, competitive_admission: true, required_courses: ["CS 18000", "MA 16500", "MA 16600"] }
      }
    };
  }

  // Get academic policies (placeholder - can be enhanced later)
  getAcademicPolicies() {
    return {
      graduation_requirements: {
        general_requirements: [
          "Complete all required courses with grades of C or better",
          "Maintain minimum 2.0 cumulative GPA", 
          "Complete at least 120 credit hours",
          "Complete residency requirements"
        ]
      }
    };
  }

  // Get all minors (placeholder - can be enhanced later)
  getAllMinors() {
    return {
      computer_science_minor: {
        title: "Computer Science Minor",
        credits: 15,
        requirements: ["CS 18000", "CS 18200", "CS 25000"]
      },
      data_science_minor: {
        title: "Data Science Minor", 
        credits: 15,
        requirements: ["CS 18000", "STAT 35500", "CS 24200"]
      }
    };
  }

  // Get graduation requirements
  getGraduationRequirements(programKey) {
    const program = this.getProgram(programKey);
    if (!program) return null;

    return {
      program_specific: {
        total_credits: program.degree_info.total_credits_required,
        minimum_gpa: program.degree_info.minimum_gpa_required,
        major_courses: Object.keys(program.courses || {}).length
      }
    };
  }

  // Validate data completeness
  validateDataCompleteness() {
    const validation = {
      complete: true,
      issues: []
    };

    // Check Data Science electives
    const dsProgram = this.getProgram('data_science');
    if (!dsProgram?.electives?.cs_selectives) {
      validation.complete = false;
      validation.issues.push('Data Science missing CS electives');
    }
    if (!dsProgram?.electives?.statistics_selective) {
      validation.complete = false;
      validation.issues.push('Data Science missing statistics electives');
    }
    if (!dsProgram?.electives?.ethics_selective) {
      validation.complete = false;
      validation.issues.push('Data Science missing ethics electives');
    }

    // Check Computer Science tracks
    const csProgram = this.getProgram('computer_science');
    if (!csProgram?.tracks?.["Machine Intelligence"]) {
      validation.complete = false;
      validation.issues.push('Computer Science missing Machine Intelligence track');
    }

    // Check AI requirements
    const aiProgram = this.getProgram('artificial_intelligence');
    if (!aiProgram?.core_requirements?.psychology) {
      validation.complete = false;
      validation.issues.push('Artificial Intelligence missing psychology requirements');
    }

    return validation;
  }
}

module.exports = {
  DegreeRequirementsService,
  comprehensiveDegreeRequirements
};
