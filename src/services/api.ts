import { supabase } from '@/lib/supabase';

class ApiService {
  constructor() {
    // Supabase client handles authentication automatically
  }

  private handleSupabaseResponse<T>(response: { data: T; error: any }) {
    if (response.error) {
      console.error('Supabase error:', response.error);
      throw new Error(response.error.message || 'Database operation failed');
    }
    return response.data;
  }

  // Transcript processing
  async processTranscript(file: File, apiKey?: string, model?: string): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Upload file to Supabase Storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('transcripts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Process transcript with AI (you can integrate with OpenAI here)
      const transcriptText = await this.extractTextFromFile(file);
      const parsedData = await this.parseTranscriptWithAI(transcriptText, apiKey, model);

      // Save transcript record to database
      const { data, error } = await supabase
        .from('transcripts')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: uploadData.path,
          parsed_data: parsedData
        })
        .select()
        .single();

      return this.handleSupabaseResponse({ data, error });
    } catch (error) {
      console.error('Transcript processing error:', error);
      throw error;
    }
  }

  async processTranscriptText(
    transcriptText: string,
    apiKey?: string,
    model?: string
  ): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const parsedData = await this.parseTranscriptWithAI(transcriptText, apiKey, model);

      // Save transcript record to database
      const { data, error } = await supabase
        .from('transcripts')
        .insert({
          user_id: user.id,
          file_name: 'text_input.txt',
          parsed_data: parsedData
        })
        .select()
        .single();

      return this.handleSupabaseResponse({ data, error });
    } catch (error) {
      console.error('Transcript text processing error:', error);
      throw error;
    }
  }

  private async extractTextFromFile(file: File): Promise<string> {
    // Basic text extraction - enhance with PDF parsing if needed
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  private async parseTranscriptWithAI(text: string, apiKey?: string, model?: string): Promise<any> {
    // Integrate with your existing AI parsing logic here
    // For now, return a basic structure
    return {
      courses: [],
      gpa: null,
      credits: 0,
      parsed_at: new Date().toISOString(),
      raw_text: text
    };
  }

  // Courses
  async getCourses(): Promise<any> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('course_code');
    
    return this.handleSupabaseResponse({ data, error });
  }

  async searchCourses(query: string, filters?: any): Promise<any> {
    let supabaseQuery = supabase
      .from('courses')
      .select('*');

    if (query) {
      supabaseQuery = supabaseQuery.or(`course_code.ilike.%${query}%,title.ilike.%${query}%,description.ilike.%${query}%`);
    }

    if (filters?.department) {
      supabaseQuery = supabaseQuery.eq('department', filters.department);
    }

    if (filters?.level) {
      supabaseQuery = supabaseQuery.gte('level', filters.level).lt('level', filters.level + 100);
    }

    const { data, error } = await supabaseQuery.order('course_code');
    return this.handleSupabaseResponse({ data, error });
  }

  // Academic Planner
  async getAcademicPlan(): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('academic_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    return this.handleSupabaseResponse({ data, error });
  }

  async saveAcademicPlan(plan: any): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const planData = {
      user_id: user.id,
      plan_name: plan.name || 'Academic Plan',
      major: plan.major,
      concentration: plan.concentration || null,
      graduation_date: plan.graduationDate || null,
      semesters: plan.semesters || []
    };

    let result;
    if (plan.id) {
      // Update existing plan
      const { data, error } = await supabase
        .from('academic_plans')
        .update(planData)
        .eq('id', plan.id)
        .eq('user_id', user.id)
        .select()
        .single();
      result = { data, error };
    } else {
      // Create new plan
      const { data, error } = await supabase
        .from('academic_plans')
        .insert(planData)
        .select()
        .single();
      result = { data, error };
    }

    return this.handleSupabaseResponse(result);
  }

  // Authentication (now handled by Supabase Auth)
  async login(email: string, password: string): Promise<any> {
    console.log('🌐 Supabase login attempt:', { email });
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('🌐 Supabase login error:', error);
      throw new Error(error.message);
    }

    console.log('🌐 Supabase login success');
    return {
      success: true,
      user: data.user,
      session: data.session
    };
  }

  async register(email: string, password: string, name: string): Promise<any> {
    console.log('🌐 Supabase registration attempt:', { email, name });
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name
        }
      }
    });

    if (error) {
      console.error('🌐 Supabase registration error:', error);
      throw new Error(error.message);
    }

    console.log('🌐 Supabase registration success');
    return {
      success: true,
      user: data.user,
      session: data.session,
      needsVerification: !data.session // If no session, needs email verification
    };
  }

  async getProfile(): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    return this.handleSupabaseResponse({ data, error });
  }

  // Email verification (now handled by Supabase Auth)
  async verifyEmail(token: string): Promise<any> {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email'
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      user: data.user,
      session: data.session
    };
  }

  async resendVerification(email: string): Promise<any> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      message: 'Verification email sent'
    };
  }

  async checkVerificationStatus(email: string): Promise<any> {
    // In Supabase, we check the current user's email verification status
    const { data: { user } } = await supabase.auth.getUser();
    
    return {
      success: true,
      emailVerified: user?.email_confirmed_at ? true : false
    };
  }

  // Health check (now checks Supabase connection)
  async healthCheck(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      
      return {
        success: true,
        status: 'Supabase connection healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error('Supabase connection failed');
    }
  }

  // User profile updates
  async updateProfile(updates: any): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    return this.handleSupabaseResponse({ data, error });
  }

  // Logout
  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      throw new Error(error.message);
    }
  }
}

export const apiService = new ApiService(); 