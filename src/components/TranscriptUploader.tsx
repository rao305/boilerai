import React, { useState, useCallback } from 'react';
import { Card, PurdueButton } from '@/components/PurdueUI';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Settings, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { processTranscript } from '@/services/aiTranscriptParser';
import { testTranscriptParsing, testActualTranscriptParsing } from '@/services/transcriptParser';
import { useAcademicPlan } from '@/contexts/AcademicPlanContext';
import { useApiKey } from '@/contexts/ApiKeyContext';
import { useToast } from '@/hooks/use-toast';
import TranscriptProcessorWrapper from './TranscriptProcessorWrapper';
import ErrorBoundary from './ErrorBoundary';

interface TranscriptUploaderProps {
  onUploadComplete?: () => void;
}

const TranscriptUploaderContent: React.FC<TranscriptUploaderProps> = ({ onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [processingStatus, setProcessingStatus] = useState('');
  
  const { setTranscriptData, transferCoursesToPlanner } = useAcademicPlan();
  const { isApiKeyValid, setApiKeyValid } = useApiKey();
  const { toast } = useToast();

  // Process transcript text directly
  const processTranscriptText = async () => {
    let progressInterval: NodeJS.Timeout | null = null;
    try {
      console.log('🚀 Starting text transcript processing...');
      
      if (!transcriptText.trim()) {
        setErrorMessage('Please enter transcript text');
        return;
      }

      if (transcriptText.trim().length < 50) {
        setErrorMessage('Transcript text seems too short. Please enter more complete transcript information.');
        return;
      }

      // Reset state with defensive programming
      setIsProcessing(true);
      setUploadStatus('processing');
      setUploadProgress(0);
      setErrorMessage('');
      setProcessingStatus('Initializing transcript processing...');

      
      // Add safety checks for required dependencies
      if (!window || typeof window === 'undefined') {
        throw new Error('Browser environment not available');
      }
      
      if (!setTranscriptData || typeof setTranscriptData !== 'function') {
        throw new Error('Transcript context not properly initialized');
      }

      console.log('🔄 Processing REAL transcript text with AI (NO MOCK DATA)...', {
        textLength: transcriptText.length,
        hasStudentInfo: transcriptText.toLowerCase().includes('student') || transcriptText.toLowerCase().includes('name'),
        hasCourses: /[A-Z]{2,4}\s*\d{3,4}/.test(transcriptText)
      });

      // Start progress simulation with better status updates
      let progressStep = 0;
      const statusUpdates = [
        'Initializing offline processing...',
        'Analyzing transcript structure...',
        'Extracting student information...',
        'Identifying course data...',
        'Processing course grades...',
        'Validating extracted data...',
        'Finalizing results...'
      ];
      
      progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            if (progressInterval) clearInterval(progressInterval);
            return 90;
          }
          const newProgress = prev + 8;
          const statusIndex = Math.floor(newProgress / 15);
          if (statusIndex < statusUpdates.length) {
            setProcessingStatus(statusUpdates[statusIndex]);
          }
          return newProgress;
        });
      }, 400);

      // Get OpenAI API key from environment or localStorage  
      const openaiApiKey = localStorage.getItem('openai_api_key') || import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!openaiApiKey || openaiApiKey === 'your_openai_api_key_here' || openaiApiKey.length < 10) {
        console.log('🔧 No valid OpenAI API key found - using offline processing');
      } else {
        console.log('🔑 Valid OpenAI API key found - enabling AI processing');
        
        // Force reinitialize AI services with current API key to ensure fresh connection
        try {
          const { aiTranscriptParser } = await import('@/services/aiTranscriptParser');
          if (aiTranscriptParser.updateApiKey) {
            const success = aiTranscriptParser.updateApiKey(openaiApiKey);
            console.log(success ? '✅ AI transcript parser updated' : '⚠️ AI transcript parser update failed');
          }
        } catch (error) {
          console.warn('⚠️ Could not update AI transcript parser:', error);
        }
      }
      
      // Process with backend API instead of client-side OpenAI
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Text processing timeout - please try again')), 90000); // 90 second timeout
      });

      let transcriptData: any;
      let retryCount = 0;
      const maxRetries = 1; // Reduced retries for faster feedback

      while (retryCount <= maxRetries) {
        try {
          if (retryCount > 0) {
            setProcessingStatus(`Retry attempt ${retryCount}/${maxRetries}...`);
          }
          
          // Use backend API for processing
          const requestBody: any = {
            transcriptText: transcriptText
          };
          
          if (openaiApiKey && openaiApiKey !== 'your_openai_api_key_here') {
            requestBody.apiKey = openaiApiKey;
          } else {
            // Still send request without API key for offline processing
            console.log('🔧 Sending request for offline processing');
          }
          
          const transcriptPromise = (async () => {
            try {
              const response = await window.fetch('/api/transcript/process-text', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
                throw new Error(errorData.error || `Server error: ${response.status}`);
              }
              
              const result = await response.json();
              if (!result.success) {
                throw new Error(result.error || 'Processing failed');
              }
              
              return result.data;
            } catch (error) {
              // Handle fetch-related errors specifically
              if (error.message?.includes('Illegal invocation')) {
                console.error('❌ Fetch binding error detected:', error);
                throw new Error('Connection error: Browser security issue detected. Please refresh the page and try again.');
              }
              
              // Handle network errors
              if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                throw new Error('Network error: Unable to connect to server. Please check if the backend is running on port 5002.');
              }
              
              // Handle timeout errors
              if (error.name === 'AbortError') {
                throw new Error('Request timeout: The server took too long to respond. Please try again.');
              }
              
              throw error;
            }
          })();
          
          transcriptData = await Promise.race([transcriptPromise, timeoutPromise]) as any;
          console.log('✅ Text processing successful on attempt', retryCount + 1);
          break; // Success, exit retry loop
        } catch (error) {
          retryCount++;
          console.log(`🔄 Text processing attempt ${retryCount} failed:`, error);
          
          if (retryCount > maxRetries) {
            console.error('❌ All retry attempts exhausted');
            throw error; // All retries exhausted
          }
          
          // Show retry message to user
          setProcessingStatus(`Attempt failed, retrying in 2 seconds...`);
          toast({
            title: `Processing attempt failed`,
            description: `Retrying... (${retryCount}/${maxRetries} attempts)`,
            variant: "default"
          });
          
          // Wait 2 seconds before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Reset progress to show retry
          setUploadProgress(15);
          setProcessingStatus(`Retrying...`);
        }
      }
      
      // Validate response
      if (!transcriptData) {
        throw new Error('No data received from transcript processing');
      }

      if (!transcriptData.studentInfo) {
        throw new Error('Invalid transcript data structure');
      }

      console.log('✅ Text transcript processed successfully!', {
        studentName: transcriptData.studentInfo?.name,
        completedCourses: Object.keys(transcriptData.completedCourses || {}).length,
        inProgressCourses: (transcriptData.coursesInProgress || []).length
      });
      
      // Complete the progress
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      setUploadProgress(100);
      setProcessingStatus('Processing completed successfully');
      
      // Update context with parsed data with additional safety checks
      try {
        console.log('🔄 Setting transcript data in context...');
        setProcessingStatus('Saving transcript data...');
        
        // Validate context function exists
        if (!setTranscriptData) {
          throw new Error('Transcript context not available');
        }
        
        // Validate transcript data structure
        if (!transcriptData || typeof transcriptData !== 'object') {
          throw new Error('Invalid transcript data structure received');
        }
        
        setTranscriptData(transcriptData);
        console.log('✅ Transcript data set successfully');
        setProcessingStatus('Transcript data saved successfully');
      } catch (contextError) {
        console.error('❌ Error setting transcript data:', contextError);
        throw new Error(`Failed to save transcript data: ${contextError instanceof Error ? contextError.message : 'Context error'}`);
      }
      
      // Safely extract courses
      const completedCourses = transcriptData.completedCourses 
        ? Object.values(transcriptData.completedCourses).flatMap((sem: any) => sem.courses || [])
        : [];
      const inProgressCourses = transcriptData.coursesInProgress || [];
      const allCourses = [...completedCourses, ...inProgressCourses];
      
      if (allCourses.length > 0) {
        console.log('🔄 Automatically transferring courses to planner...');
        console.log(`📊 Found ${completedCourses.length} completed courses and ${inProgressCourses.length} in-progress courses`);
        
        try {
          console.log('🔄 Transferring courses to planner...', allCourses.length, 'courses');
          transferCoursesToPlanner(allCourses);
          console.log('✅ Courses transferred successfully');
          
          toast({
            title: "Transcript Processed Successfully!",
            description: `${completedCourses.length} completed and ${inProgressCourses.length} future courses from your transcript have been added to your Academic Planner.`,
          });
        } catch (transferError) {
          console.warn('⚠️ Course transfer failed, but transcript was processed:', transferError);
          toast({
            title: "Transcript Processed!",
            description: "Transcript was processed successfully, but course transfer encountered an issue. You can manually add courses from the Academic Planner.",
            variant: "default"
          });
        }
      } else {
        toast({
          title: "Transcript Processed!",
          description: "Transcript was processed but no courses were found. Please check the format or add courses manually.",
          variant: "default"
        });
      }
      
      setUploadStatus('success');
      setIsProcessing(false);
      
      // Call completion callback
      if (onUploadComplete) {
        try {
          onUploadComplete();
        } catch (callbackError) {
          console.warn('⚠️ Upload completion callback failed:', callbackError);
        }
      }

    } catch (error) {
      console.error('❌ Text transcript processing failed:', error);
      
      // Ensure UI doesn't hang in loading state - clean up all intervals
      try {
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
      } catch (intervalError) {
        console.warn('Warning: Could not clear progress interval:', intervalError);
      }
      
      // Reset all loading states to prevent blank screen
      try {
        setUploadStatus('error');
        setIsProcessing(false);
        setUploadProgress(0);
        setProcessingStatus('');
      } catch (stateError) {
        console.error('Critical: Could not reset component state:', stateError);
        // Force page reload as last resort
        window.location.reload();
        return;
      }
      
      // Provide user-friendly error messages
      let userMessage = 'Failed to process transcript text';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          userMessage = 'Processing took too long. Please try with shorter text or try again later.';
        } else if (error.message.includes('API') || error.message.includes('Gemini')) {
          userMessage = 'AI service is temporarily unavailable. Please try again in a few minutes.';
        } else if (error.message.includes('format') || error.message.includes('structure')) {
          userMessage = 'The transcript format was not recognized. Please check the text format and try again.';
        } else if (error.message.includes('Context') || error.message.includes('context')) {
          userMessage = 'Application context error. Please refresh the page and try again.';
        } else {
          userMessage = `Processing error: ${error.message}`;
        }
      }
      
      try {
        setErrorMessage(userMessage);
        
        // Show error toast with retry suggestion
        toast({
          title: "Processing Failed",
          description: userMessage + " If this persists, try refreshing the page.",
          variant: "destructive"
        });
      } catch (toastError) {
        console.error('Could not show error message:', toastError);
        // Fallback to alert if toast fails
        alert(`Processing failed: ${userMessage}`);
      }
    }
  };

  // Removed all API testing functions - now using offline parser

  const validateFile = (file: File): boolean => {
    const validTypes = ['application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      setErrorMessage('Please upload a PDF file only.');
      return false;
    }

    if (file.size > maxSize) {
      setErrorMessage('File size must be less than 10MB.');
      return false;
    }

    return true;
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!validateFile(file)) {
      setUploadStatus('error');
      return;
    }

    setSelectedFile(file);
    setErrorMessage('');
    setUploadStatus('idle');
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const processUploadedFile = async () => {
    if (!selectedFile) {
      setErrorMessage('No file selected');
      return;
    }

    // Reset state
    setIsProcessing(true);
    setUploadStatus('processing');
    setUploadProgress(0);
    setErrorMessage('');

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      // Validate file before processing
      if (!validateFile(selectedFile)) {
        setUploadStatus('error');
        setIsProcessing(false);
        return;
      }

      console.log('🔄 Starting transcript processing...', {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      });

      // Start progress simulation with status updates
      let currentStep = 'Initializing...';
      const updateProgress = () => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            if (progressInterval) clearInterval(progressInterval);
            return 90;
          }
          
          // Update status based on progress
          if (prev < 20) {
            currentStep = 'Reading PDF file...';
          } else if (prev < 40) {
            currentStep = 'Extracting text offline...';
          } else if (prev < 60) {
            currentStep = 'Analyzing transcript structure...';
          } else if (prev < 80) {
            currentStep = 'Parsing course data...';
          } else {
            currentStep = 'Finalizing results...';
          }
          
          setProcessingStatus(currentStep);
          console.log(`📊 Progress: ${prev + 3}% - ${currentStep}`);
          return prev + 3; // Slower progress updates
        });
      };
      
      progressInterval = setInterval(updateProgress, 800);

      // Get OpenAI API key and validate it properly
      const openaiApiKey = localStorage.getItem('openai_api_key');
      const validationStatus = localStorage.getItem('api_key_validation_status');
      
      console.log('🔍 API Key Check:', {
        storedKey: openaiApiKey ? `${openaiApiKey.substring(0, 8)}...` : 'not found',
        keyLength: openaiApiKey?.length,
        validationStatus: validationStatus
      });
      
      // Check for API key existence and basic format
      if (!openaiApiKey || openaiApiKey.length < 20 || !openaiApiKey.startsWith('sk-')) {
        throw new Error('Valid OpenAI API key required for transcript processing. Please go to Settings and add your API key.');
      }
      
      // Check validation status - ensure it's actually validated
      let isValidated = false;
      if (validationStatus) {
        try {
          const status = JSON.parse(validationStatus);
          isValidated = status.openai === true && status.timestamp && (Date.now() - status.timestamp < 3600000); // 1 hour cache
        } catch {
          isValidated = false;
        }
      }
      
      if (!isValidated) {
        throw new Error('API key validation required. Please go to Settings to validate your OpenAI API key before processing transcripts.');
      }
      
      console.log('🔑 Valid and verified OpenAI API key found - using AI processing');
      
      // Process the transcript with timeout and single retry using OpenAI
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Processing timeout - please try again')), 90000); // 90 second timeout
      });

      let transcriptData: any;
      let retryCount = 0;
      const maxRetries = 1; // Reduced retries for faster feedback

      while (retryCount <= maxRetries) {
        try {
          // Use backend API for AI-powered processing
          const formData = new FormData();
          formData.append('transcript', selectedFile);
          formData.append('apiKey', openaiApiKey);
          console.log('🔧 Sending file upload for AI processing');
          
          const transcriptPromise = (async () => {
            try {
              const response = await window.fetch('/api/transcript/upload', {
                method: 'POST',
                body: formData
              });

              if (!response.ok) {
                let errorMessage = 'Server error occurred';
                try {
                  const errorData = await response.json();
                  errorMessage = errorData.error || errorData.message || `Server error: ${response.status}`;
                } catch (parseError) {
                  // Failed to parse JSON error response
                  if (response.status === 502) {
                    errorMessage = 'Backend service unavailable. Please check if the server is running.';
                  } else if (response.status === 404) {
                    errorMessage = 'Upload endpoint not found. Please check server configuration.';
                  } else if (response.status === 500) {
                    errorMessage = 'Internal server error. Please check server logs for details.';
                  } else {
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                  }
                }
                throw new Error(errorMessage);
              }
              
              const result = await response.json();
              if (!result.success) {
                throw new Error(result.error || 'Processing failed');
              }
              
              return result.data;
            } catch (error) {
              // Handle fetch-related errors specifically
              if (error.message?.includes('Illegal invocation')) {
                console.error('❌ Fetch binding error detected:', error);
                throw new Error('Connection error: Browser security issue detected. Please refresh the page and try again.');
              }
              
              // Handle network errors
              if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                throw new Error('Network error: Unable to connect to server. Please check if the backend is running on port 5002.');
              }
              
              // Handle timeout errors
              if (error.name === 'AbortError') {
                throw new Error('Request timeout: The server took too long to respond. Please try again.');
              }
              
              throw error;
            }
          })();
          
          transcriptData = await Promise.race([transcriptPromise, timeoutPromise]) as any;
          break; // Success, exit retry loop
        } catch (error) {
          retryCount++;
          console.log(`🔄 Attempt ${retryCount} failed, retrying...`);
          
          if (retryCount > maxRetries) {
            throw error; // All retries exhausted
          }
          
          // Show retry message to user
          toast({
            title: `Processing attempt failed`,
            description: `Retrying... (${retryCount}/${maxRetries} attempts)`,
            variant: "default"
          });
          
          // Wait 2 seconds before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Reset progress to show retry
          setUploadProgress(15);
        }
      }
      
      // Validate the response
      if (!transcriptData) {
        throw new Error('No data received from transcript processing');
      }

      if (!transcriptData.studentInfo) {
        throw new Error('Invalid transcript data structure');
      }

      console.log('✅ Transcript parsed successfully!', {
        studentName: transcriptData.studentInfo?.name,
        completedCourses: Object.keys(transcriptData.completedCourses || {}).length,
        inProgressCourses: (transcriptData.coursesInProgress || []).length
      });
      
      // Complete the progress
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      setUploadProgress(100);
      
      // Update context with parsed data
      try {
        console.log('🔄 Setting transcript data in context...');
        setTranscriptData(transcriptData);
        console.log('✅ Transcript data set successfully');
      } catch (contextError) {
        console.error('❌ Error setting transcript data:', contextError);
        throw new Error(`Failed to save transcript data: ${contextError instanceof Error ? contextError.message : 'Unknown error'}`);
      }
      
      // Safely extract courses
      const completedCourses = transcriptData.completedCourses 
        ? Object.values(transcriptData.completedCourses).flatMap((sem: any) => sem.courses || [])
        : [];
      const inProgressCourses = transcriptData.coursesInProgress || [];
      const allCourses = [...completedCourses, ...inProgressCourses];
      
      if (allCourses.length > 0) {
        console.log('🔄 Automatically transferring courses to planner...');
        console.log(`📊 Found ${completedCourses.length} completed courses and ${inProgressCourses.length} in-progress courses`);
        
        try {
          console.log('🔄 Transferring courses to planner...', allCourses.length, 'courses');
          transferCoursesToPlanner(allCourses);
          console.log('✅ Courses transferred successfully');
          
          toast({
            title: "Transcript Processed Successfully!",
            description: `${completedCourses.length} completed and ${inProgressCourses.length} future courses from your transcript have been added to your Academic Planner.`,
          });
        } catch (transferError) {
          console.warn('⚠️ Course transfer failed, but transcript was processed:', transferError);
          toast({
            title: "Transcript Processed!",
            description: "Transcript was processed successfully, but course transfer encountered an issue. You can manually add courses from the Academic Planner.",
            variant: "default"
          });
        }
      } else {
        toast({
          title: "Transcript Processed!",
          description: "Transcript was processed but no courses were found. Please check the transcript format or add courses manually.",
          variant: "default"
        });
      }
      
      setUploadStatus('success');
      setIsProcessing(false);
      
      // Call completion callback
      if (onUploadComplete) {
        try {
          onUploadComplete();
        } catch (callbackError) {
          console.warn('⚠️ Upload completion callback failed:', callbackError);
        }
      }

    } catch (error) {
      console.error('❌ Transcript processing failed:', error);
      
      // Ensure UI doesn't hang in loading state - clean up all intervals
      try {
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
      } catch (intervalError) {
        console.warn('Warning: Could not clear progress interval:', intervalError);
      }
      
      // Reset all loading states to prevent blank screen
      try {
        setUploadStatus('error');
        setIsProcessing(false);
        setUploadProgress(0);
        setProcessingStatus('');
      } catch (stateError) {
        console.error('Critical: Could not reset component state:', stateError);
        // Force page reload as last resort
        window.location.reload();
        return;
      }
      
      // Provide user-friendly error messages
      let userMessage = 'Failed to process transcript';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          userMessage = 'Processing took too long. Please try with a smaller file or try again later.';
        } else if (error.message.includes('API') || error.message.includes('Gemini')) {
          userMessage = 'AI service is temporarily unavailable. Please try again in a few minutes.';
        } else if (error.message.includes('extract')) {
          userMessage = 'Could not read the file. Please ensure it\'s a valid PDF or DOCX transcript.';
        } else if (error.message.includes('format') || error.message.includes('structure')) {
          userMessage = 'The transcript format was not recognized. Please try a different file or contact support.';
        } else if (error.message.includes('Context') || error.message.includes('context')) {
          userMessage = 'Application context error. Please refresh the page and try again.';
        } else {
          userMessage = `Processing error: ${error.message}`;
        }
      }
      
      try {
        setErrorMessage(userMessage);
        
        // Show error toast with retry suggestion
        toast({
          title: "Processing Failed",
          description: userMessage + " If this persists, try refreshing the page.",
          variant: "destructive"
        });
      } catch (toastError) {
        console.error('Could not show error message:', toastError);
        // Fallback to alert if toast fails
        alert(`Processing failed: ${userMessage}`);
      }
    }
  };

  const resetUploader = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
    setIsProcessing(false);
    setShowTextInput(false);
    setTranscriptText('');
    setProcessingStatus('');
  };

  const handleReset = () => {
    console.log('🔄 Resetting transcript uploader...');
    resetUploader();
  };

  return (
    <TranscriptProcessorWrapper onReset={handleReset}>
      <div className="space-y-4">


        <Card title="Upload Purdue Transcript">
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-neutral-400">
                Upload your official Purdue transcript (PDF) or paste transcript text. 
                {isApiKeyValid ? 'Using AI-powered parsing for best accuracy.' : 'Configure OpenAI API key in Settings to enable AI file processing.'}
              </p>
              <div className="flex gap-2 justify-center mt-2">
                <PurdueButton 
                  variant="secondary" 
                  size="small" 
                  onClick={() => setShowTextInput(!showTextInput)}
                  disabled={isProcessing}
                >
                  📝 Paste Transcript Text
                </PurdueButton>
              </div>
            </div>

        {showTextInput && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Paste your transcript text here:
              </label>
              <textarea
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                placeholder="Paste your Purdue transcript content here...&#10;&#10;Expected format:&#10;Purdue Production Instance&#10;Unofficial Academic Transcript&#10;&#10;STUDENT INFORMATION&#10;Name: [Your Full Name]&#10;Program: [Your Program]-BS&#10;College: [Your College]&#10;&#10;Period: [Semester] [Year]&#10;[SUBJ] [COURSE] [Course Title] [GRADE] [CREDITS]&#10;&#10;COURSE(S) IN PROGRESS&#10;Period: [Future Semester] [Year]&#10;[SUBJ] [COURSE] [Course Title] [CREDITS]"
                className="w-full h-32 p-3 border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex space-x-2">
              <PurdueButton 
                onClick={processTranscriptText} 
                className="flex-1" 
                disabled={!transcriptText.trim() || isProcessing || uploadStatus === 'processing'}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Loader2 className="h-4 w-4 mr-2" />
                )}
                {isProcessing ? 'Processing...' : 'Process Transcript Text'}
              </PurdueButton>
              <PurdueButton 
                variant="secondary" 
                onClick={() => setShowTextInput(false)}
                disabled={isProcessing}
              >
                Cancel
              </PurdueButton>
            </div>
          </div>
        )}

        {uploadStatus === 'idle' && !selectedFile && !showTextInput && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/60'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Drop your transcript here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                {isApiKeyValid ? 'Supports PDF files up to 10MB - AI processing enabled' : 'PDF files up to 10MB - AI processing requires API key setup in Settings'}
              </p>
            </div>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileInputChange}
              className="hidden"
              id="transcript-upload"
            />
            <PurdueButton 
              variant="secondary" 
              className="mt-4"
              onClick={() => document.getElementById('transcript-upload')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Browse Files
            </PurdueButton>
          </div>
        )}

        {selectedFile && uploadStatus === 'idle' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <PurdueButton 
                onClick={processUploadedFile} 
                className="flex-1"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Loader2 className="h-4 w-4 mr-2" />
                )}
                {isProcessing ? 'Processing...' : 'Process Transcript'}
              </PurdueButton>
              <PurdueButton 
                variant="secondary" 
                onClick={resetUploader}
                disabled={isProcessing}
              >
                Cancel
              </PurdueButton>
            </div>
          </div>
        )}

        {uploadStatus === 'processing' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Processing transcript...</p>
                <p className="text-xs text-muted-foreground">
                  {processingStatus || 'Extracting text and matching courses'}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Progress</span>
                <span className="text-neutral-100">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-2">
                <div className="h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: '#CFB991' }} />
              </div>
              {uploadProgress > 60 && (
                <p className="text-xs text-neutral-400 italic">
                  Processing may take up to 3 minutes for large files. Please be patient...
                </p>
              )}
            </div>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="p-3 rounded-lg bg-green-900/20 border border-green-800 text-sm text-green-200">
            <CheckCircle className="h-4 w-4 inline mr-2" /> Transcript processed successfully! Your academic history has been updated.
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="p-3 rounded-lg bg-red-900/20 border border-red-800 text-sm text-red-200">
            <AlertCircle className="h-4 w-4 inline mr-2" /> {errorMessage}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center space-x-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>FERPA compliant storage</span>
          </div>
          <p>Supported formats: PDF only</p>
          <div className="flex items-center space-x-1 mt-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>AI-powered transcript parsing for maximum accuracy</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span>Intelligent course recognition and matching</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span>Configure OpenAI API key in Settings for best results</span>
          </div>
        </div>
          </div>
        </Card>
      </div>
    </TranscriptProcessorWrapper>
  );
};

export const TranscriptUploader: React.FC<TranscriptUploaderProps> = ({ onUploadComplete }) => {
  return (
    <ErrorBoundary>
      <TranscriptUploaderContent onUploadComplete={onUploadComplete} />
    </ErrorBoundary>
  );
}; 