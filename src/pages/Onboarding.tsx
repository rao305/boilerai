import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useMicrosoftAuth } from '@/contexts/MicrosoftAuthContext';
import { Card, PurdueButton, PurdueInput } from '@/components/PurdueUI';
import { BoilerAILogo } from '@/components/BoilerAILogo';
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle, 
  GraduationCap, 
  BookOpen, 
  Calendar,
  FileText,
  Bot,
  Sparkles
} from 'lucide-react';

interface OnboardingData {
  major: string;
  year: string;
  graduationYear: string;
  interests: string[];
  goals: string[];
  hasTranscript: boolean;
  notifications: boolean;
  theme: 'light' | 'dark' | 'system';
}

const MAJORS = [
  'Computer Science',
  'Data Science',
  'Artificial Intelligence'
];

const YEARS = [
  'Freshman (1st year)',
  'Sophomore (2nd year)', 
  'Junior (3rd year)',
  'Senior (4th year)'
];

const GRADUATION_YEARS = [2025, 2026, 2027, 2028, 2029];

const INTERESTS = [
  'Software Development',
  'Data Science & Analytics',
  'Artificial Intelligence',
  'Cybersecurity',
  'Web Development',
  'Mobile App Development',
  'Machine Learning',
  'Research',
  'Internships',
  'Career Planning',
  'Study Groups',
  'Academic Support'
];

const GOALS = [
  'Improve my GPA',
  'Plan my course schedule',
  'Find internship opportunities',
  'Graduate on time',
  'Explore research opportunities',
  'Build technical skills',
  'Network with peers',
  'Get career guidance',
  'Track degree progress',
  'Optimize study habits'
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    major: '',
    year: '',
    graduationYear: '',
    interests: [],
    goals: [],
    hasTranscript: false,
    notifications: true,
    theme: 'dark'
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const { user, updateProfile } = useAuth();
  const { completeOnboarding } = useMicrosoftAuth();
  const navigate = useNavigate();

  // Apply theme changes in real-time
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    if (data.theme === 'light') {
      root.classList.remove('dark');
      body.classList.remove('dark');
      root.classList.add('light');
      body.classList.add('light');
    } else if (data.theme === 'dark') {
      root.classList.remove('light');
      body.classList.remove('light');
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      // System theme
      root.classList.remove('light', 'dark');
      body.classList.remove('light', 'dark');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = prefersDark ? 'dark' : 'light';
      root.classList.add(theme);
      body.classList.add(theme);
    }
  }, [data.theme]);

  // Step Components
  const WelcomeStep = () => (
    <Card className="text-center">
      <div className="space-y-6">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#CFB991] to-[#B8A082] rounded-full flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Welcome to BoilerAI!</h2>
          <p className="text-neutral-400">Your AI-powered academic assistant at Purdue</p>
        </div>
        <p className="text-sm text-neutral-500">
          Let's get you set up with a personalized experience tailored to your academic journey.
        </p>
      </div>
    </Card>
  );

  const AcademicStep = () => (
    <Card>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Academic Information</h2>
          <p className="text-neutral-400">Tell us about your studies</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Major</label>
            <select 
              value={data.major}
              onChange={(e) => updateData({ major: e.target.value })}
              className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg"
            >
              <option value="">Select your major</option>
              {MAJORS.map(major => (
                <option key={major} value={major}>{major}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Current Year</label>
            <select 
              value={data.year}
              onChange={(e) => updateData({ year: e.target.value })}
              className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg"
            >
              <option value="">Select your year</option>
              {YEARS.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Expected Graduation</label>
            <select 
              value={data.graduationYear}
              onChange={(e) => updateData({ graduationYear: e.target.value })}
              className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg"
            >
              <option value="">Select graduation year</option>
              {GRADUATION_YEARS.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </Card>
  );

  const InterestsStep = () => (
    <Card>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Your Interests</h2>
          <p className="text-neutral-400">What areas are you most interested in?</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {INTERESTS.map(interest => (
            <button
              key={interest}
              onClick={() => {
                const newInterests = data.interests.includes(interest)
                  ? data.interests.filter(i => i !== interest)
                  : [...data.interests, interest];
                updateData({ interests: newInterests });
              }}
              className={`p-3 rounded-lg border text-left transition-colors ${
                data.interests.includes(interest)
                  ? 'bg-[#CFB991] text-black border-[#CFB991]'
                  : 'bg-neutral-800 border-neutral-700 hover:border-[#CFB991]'
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );

  const GoalsStep = () => (
    <Card>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Your Goals</h2>
          <p className="text-neutral-400">What do you want to achieve this semester?</p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {GOALS.map(goal => (
            <button
              key={goal}
              onClick={() => {
                const newGoals = data.goals.includes(goal)
                  ? data.goals.filter(g => g !== goal)
                  : [...data.goals, goal];
                updateData({ goals: newGoals });
              }}
              className={`p-3 rounded-lg border text-left transition-colors ${
                data.goals.includes(goal)
                  ? 'bg-[#CFB991] text-black border-[#CFB991]'
                  : 'bg-neutral-800 border-neutral-700 hover:border-[#CFB991]'
              }`}
            >
              {goal}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );

  const PreferencesStep = () => (
    <Card>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Setup Preferences</h2>
          <p className="text-neutral-400">Customize your BoilerAI experience</p>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-neutral-800 rounded-lg">
            <div>
              <h3 className="font-medium">Email Notifications</h3>
              <p className="text-sm text-neutral-400">Get updates about your academic progress</p>
            </div>
            <button
              onClick={() => updateData({ notifications: !data.notifications })}
              className={`w-12 h-6 rounded-full transition-colors ${
                data.notifications ? 'bg-[#CFB991]' : 'bg-neutral-600'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                data.notifications ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          <div className="p-4 bg-neutral-800 rounded-lg">
            <h3 className="font-medium mb-3">Theme Preference</h3>
            <div className="grid grid-cols-3 gap-2">
              {['light', 'dark', 'system'].map(theme => (
                <button
                  key={theme}
                  onClick={() => updateData({ theme: theme as any })}
                  onMouseEnter={() => {
                    // Preview theme on hover
                    const root = document.documentElement;
                    const body = document.body;
                    
                    if (theme === 'light') {
                      root.classList.remove('dark');
                      body.classList.remove('dark');
                      root.classList.add('light');
                      body.classList.add('light');
                    } else if (theme === 'dark') {
                      root.classList.remove('light');
                      body.classList.remove('light');
                      root.classList.add('dark');
                      body.classList.add('dark');
                    } else {
                      // System theme
                      root.classList.remove('light', 'dark');
                      body.classList.remove('light', 'dark');
                      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                      const systemTheme = prefersDark ? 'dark' : 'light';
                      root.classList.add(systemTheme);
                      body.classList.add(systemTheme);
                    }
                  }}
                  onMouseLeave={() => {
                    // Restore current theme when mouse leaves
                    const root = document.documentElement;
                    const body = document.body;
                    
                    if (data.theme === 'light') {
                      root.classList.remove('dark');
                      body.classList.remove('dark');
                      root.classList.add('light');
                      body.classList.add('light');
                    } else if (data.theme === 'dark') {
                      root.classList.remove('light');
                      body.classList.remove('light');
                      root.classList.add('dark');
                      body.classList.add('dark');
                    } else {
                      // System theme
                      root.classList.remove('light', 'dark');
                      body.classList.remove('light', 'dark');
                      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                      const systemTheme = prefersDark ? 'dark' : 'light';
                      root.classList.add(systemTheme);
                      body.classList.add(systemTheme);
                    }
                  }}
                  className={`p-2 rounded-lg capitalize transition-colors ${
                    data.theme === theme
                      ? 'bg-[#CFB991] text-black'
                      : 'bg-neutral-700 hover:bg-neutral-600'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  const CompletionStep = () => (
    <Card className="text-center">
      <div className="space-y-6">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#CFB991] to-[#B8A082] rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">All Set!</h2>
          <p className="text-neutral-400">You're ready to start using BoilerAI</p>
        </div>
        <div className="text-sm text-neutral-500 space-y-2">
          <p>✓ Academic profile configured</p>
          <p>✓ Interests and goals saved</p>
          <p>✓ Preferences customized</p>
        </div>
        <PurdueButton
          onClick={handleComplete}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Setting up your account...
            </span>
          ) : (
            'Go to Dashboard'
          )}
        </PurdueButton>
      </div>
    </Card>
  );

  const steps = [
    {
      title: 'Welcome to BoilerAI!',
      subtitle: 'Your AI-powered academic assistant at Purdue',
      icon: Sparkles,
      component: WelcomeStep
    },
    {
      title: 'Academic Information',
      subtitle: 'Tell us about your studies',
      icon: GraduationCap,
      component: AcademicStep
    },
    {
      title: 'Your Interests',
      subtitle: 'What areas are you most interested in?',
      icon: BookOpen,
      component: InterestsStep
    },
    {
      title: 'Your Goals',
      subtitle: 'What do you want to achieve this semester?',
      icon: Calendar,
      component: GoalsStep
    },
    {
      title: 'Setup Preferences',
      subtitle: 'Customize your BoilerAI experience',
      icon: Bot,
      component: PreferencesStep
    },
    {
      title: 'All Set!',
      subtitle: 'You\'re ready to start using BoilerAI',
      icon: CheckCircle,
      component: CompletionStep
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      console.log('🎯 Starting onboarding completion...');
      
      // Collect onboarding data
      const onboardingData = {
        theme: data.theme,
        notifications: data.notifications,
        major: data.major,
        year: data.year,
        graduationYear: data.graduationYear,
        interests: data.interests,
        goals: data.goals,
        hasTranscript: data.hasTranscript,
        onboardingCompleted: true
      };
      
      console.log('📝 Onboarding data collected:', onboardingData);
      
      // Try to update user profile if available
      if (updateProfile) {
        try {
          await updateProfile({
            preferences: {
              ...onboardingData
            }
          });
          console.log('✅ User profile updated in legacy auth system');
        } catch (err) {
          console.warn('⚠️ Could not update legacy auth profile:', err);
        }
      }
      
      // Mark onboarding as completed in Microsoft auth context
      await completeOnboarding();
      
      console.log('🎉 Onboarding completed successfully!');
      
      // Navigate to main app
      setTimeout(() => {
        navigate('/main', { replace: true });
      }, 500);
      
    } catch (error) {
      console.error('❌ Failed to complete onboarding:', error);
      alert('Failed to complete setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0: return true; // Welcome step
      case 1: return data.major && data.year && data.graduationYear; // Academic info
      case 2: return data.interests.length > 0; // Interests
      case 3: return data.goals.length > 0; // Goals
      case 4: return true; // Preferences
      case 5: return true; // Completion
      default: return false;
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Progress Bar */}
      <div className="sticky top-0 z-50 bg-neutral-950/95 backdrop-blur border-b border-neutral-800">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BoilerAILogo size="sm" showText={false} variant="default" />
              <span className="text-lg font-semibold">Setup</span>
            </div>
            <span className="text-sm text-neutral-400">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          
          <div className="w-full bg-neutral-800 rounded-full h-2">
            <motion.div
              className="h-2 rounded-full bg-[--purdue-gold]"
              style={{ '--purdue-gold': '#CFB991' } as any}
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="p-4 rounded-2xl bg-[--purdue-gold]/10 text-[--purdue-gold]" 
                 style={{ '--purdue-gold': '#CFB991' } as any}>
              {React.createElement(steps[currentStep].icon, { size: 32 })}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">{steps[currentStep].title}</h1>
              <p className="text-neutral-400 text-lg">{steps[currentStep].subtitle}</p>
            </div>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <CurrentStepComponent 
              data={data} 
              updateData={updateData}
              onNext={handleNext}
              onComplete={handleComplete}
              isLoading={isLoading}
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {currentStep < steps.length - 1 && (
          <div className="flex justify-between mt-12">
            <PurdueButton
              variant="secondary"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft size={16} />
              Previous
            </PurdueButton>
            
            <PurdueButton
              onClick={handleNext}
              disabled={!isStepValid()}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight size={16} />
            </PurdueButton>
          </div>
        )}
      </div>
    </div>
  );
}

// Step Components
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <Card className="max-w-2xl mx-auto text-center">
      <div className="space-y-6">
        <div className="text-6xl">🎓</div>
        <div>
          <h2 className="text-2xl font-semibold mb-4">Welcome to BoilerAI!</h2>
          <p className="text-neutral-400 leading-relaxed">
            BoilerAI is your personal AI assistant designed specifically for Purdue students. 
            We'll help you plan your courses, track your academic progress, and achieve your goals.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="p-4 rounded-lg bg-neutral-900/50">
            <Calendar className="mx-auto mb-2 text-[--purdue-gold]" size={24} />
            <h3 className="font-medium">Course Planning</h3>
            <p className="text-sm text-neutral-400">Smart scheduling and degree planning</p>
          </div>
          <div className="p-4 rounded-lg bg-neutral-900/50">
            <Bot className="mx-auto mb-2 text-[--purdue-gold]" size={24} />
            <h3 className="font-medium">AI Assistant</h3>
            <p className="text-sm text-neutral-400">Get instant help with academics</p>
          </div>
          <div className="p-4 rounded-lg bg-neutral-900/50">
            <FileText className="mx-auto mb-2 text-[--purdue-gold]" size={24} />
            <h3 className="font-medium">Progress Tracking</h3>
            <p className="text-sm text-neutral-400">Monitor your degree completion</p>
          </div>
        </div>
        
        <PurdueButton onClick={onNext} className="w-full">
          Let's Get Started
        </PurdueButton>
      </div>
    </Card>
  );
}

function AcademicStep({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
  const currentYear = new Date().getFullYear();
  const graduationYears = Array.from({ length: 8 }, (_, i) => currentYear + i);

  return (
    <Card className="max-w-2xl mx-auto">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            What's your major?
          </label>
          <select
            value={data.major}
            onChange={(e) => updateData({ major: e.target.value })}
            className="w-full p-3 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-100"
          >
            <option value="">Select your major</option>
            {MAJORS.map((major) => (
              <option key={major} value={major}>{major}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            What year are you?
          </label>
          <select
            value={data.year}
            onChange={(e) => updateData({ year: e.target.value })}
            className="w-full p-3 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-100"
          >
            <option value="">Select your year</option>
            {YEARS.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            When do you plan to graduate?
          </label>
          <select
            value={data.graduationYear}
            onChange={(e) => updateData({ graduationYear: e.target.value })}
            className="w-full p-3 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-100"
          >
            <option value="">Select graduation year</option>
            {graduationYears.map((year) => (
              <option key={year} value={year.toString()}>{year}</option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  );
}

function InterestsStep({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
  const toggleInterest = (interest: string) => {
    const newInterests = data.interests.includes(interest)
      ? data.interests.filter(i => i !== interest)
      : [...data.interests, interest];
    updateData({ interests: newInterests });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <div className="space-y-6">
        <p className="text-neutral-400">
          Select the areas you're most interested in. This helps us personalize your experience.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {INTERESTS.map((interest) => (
            <button
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                data.interests.includes(interest)
                  ? 'bg-[--purdue-gold]/10 border-[--purdue-gold] text-[--purdue-gold]'
                  : 'bg-neutral-900/50 border-neutral-700 hover:border-neutral-600'
              }`}
              style={{ '--purdue-gold': '#CFB991' } as any}
            >
              <div className="flex items-center justify-between">
                <span>{interest}</span>
                {data.interests.includes(interest) && (
                  <CheckCircle size={16} className="text-[--purdue-gold]" />
                )}
              </div>
            </button>
          ))}
        </div>
        
        <p className="text-sm text-neutral-500">
          Selected {data.interests.length} interests
        </p>
      </div>
    </Card>
  );
}

function GoalsStep({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
  const toggleGoal = (goal: string) => {
    const newGoals = data.goals.includes(goal)
      ? data.goals.filter(g => g !== goal)
      : [...data.goals, goal];
    updateData({ goals: newGoals });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <div className="space-y-6">
        <p className="text-neutral-400">
          What are your main academic goals? We'll help you achieve them.
        </p>
        
        <div className="grid grid-cols-1 gap-3">
          {GOALS.map((goal) => (
            <button
              key={goal}
              onClick={() => toggleGoal(goal)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                data.goals.includes(goal)
                  ? 'bg-[--purdue-gold]/10 border-[--purdue-gold] text-[--purdue-gold]'
                  : 'bg-neutral-900/50 border-neutral-700 hover:border-neutral-600'
              }`}
              style={{ '--purdue-gold': '#CFB991' } as any}
            >
              <div className="flex items-center justify-between">
                <span>{goal}</span>
                {data.goals.includes(goal) && (
                  <CheckCircle size={16} className="text-[--purdue-gold]" />
                )}
              </div>
            </button>
          ))}
        </div>
        
        <p className="text-sm text-neutral-500">
          Selected {data.goals.length} goals
        </p>
      </div>
    </Card>
  );
}

function PreferencesStep({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
  return (
    <Card className="max-w-2xl mx-auto">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-3">
            Theme Preference
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['light', 'dark', 'system'] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => updateData({ theme })}
                className={`p-3 rounded-lg border capitalize transition-colors ${
                  data.theme === theme
                    ? 'bg-[--purdue-gold]/10 border-[--purdue-gold] text-[--purdue-gold]'
                    : 'bg-neutral-900/50 border-neutral-700 hover:border-neutral-600'
                }`}
                style={{ '--purdue-gold': '#CFB991' } as any}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-900/50">
          <div>
            <h3 className="font-medium">Email Notifications</h3>
            <p className="text-sm text-neutral-400">Get updates about your academic progress</p>
          </div>
          <button
            onClick={() => updateData({ notifications: !data.notifications })}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              data.notifications ? 'bg-[--purdue-gold]' : 'bg-neutral-700'
            }`}
            style={{ '--purdue-gold': '#CFB991' } as any}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              data.notifications ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-900/50">
          <div>
            <h3 className="font-medium">Upload Transcript Later</h3>
            <p className="text-sm text-neutral-400">You can upload your transcript anytime to get personalized advice</p>
          </div>
          <button
            onClick={() => updateData({ hasTranscript: !data.hasTranscript })}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              data.hasTranscript ? 'bg-[--purdue-gold]' : 'bg-neutral-700'
            }`}
            style={{ '--purdue-gold': '#CFB991' } as any}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              data.hasTranscript ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>
    </Card>
  );
}

function CompletionStep({ onComplete, isLoading }: { onComplete: () => void; isLoading: boolean }) {
  return (
    <Card className="max-w-2xl mx-auto text-center">
      <div className="space-y-6">
        <div className="text-6xl">🎉</div>
        <div>
          <h2 className="text-2xl font-semibold mb-4">You're All Set!</h2>
          <p className="text-neutral-400 leading-relaxed">
            Your BoilerAI account is now configured and ready to help you succeed at Purdue. 
            Let's start your academic journey!
          </p>
        </div>
        
        <div className="bg-neutral-900/50 rounded-lg p-4">
          <h3 className="font-medium mb-2">What's Next?</h3>
          <ul className="text-sm text-neutral-400 space-y-1">
            <li>• Explore your personalized dashboard</li>
            <li>• Upload your transcript for detailed analysis</li>
            <li>• Start planning your next semester</li>
            <li>• Chat with your AI assistant</li>
          </ul>
        </div>
        
        <PurdueButton 
          onClick={onComplete} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Setting up your account...
            </span>
          ) : (
            'Go to Dashboard'
          )}
        </PurdueButton>
      </div>
    </Card>
  );
}