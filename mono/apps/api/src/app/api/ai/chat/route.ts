import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { OpenAI } from 'openai'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { authOptions, setOrgContext } from '@/lib/auth'
import { redactText, hashIntent, isContentSafe } from '@/lib/redact'
import { getTracer, getMeter } from '@/lib/otel'

const prisma = new PrismaClient()
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const tracer = getTracer('ai-chat')
const meter = getMeter('ai-chat')

const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })),
  model: z.string().optional().default('gpt-4'),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  max_tokens: z.number().min(1).max(4000).optional().default(1000),
})

const requestCounter = meter.createCounter('ai_chat_requests_total', {
  description: 'Total AI chat requests',
})

const latencyHistogram = meter.createHistogram('ai_chat_duration_ms', {
  description: 'AI chat request duration in milliseconds',
})

const tokenCounter = meter.createCounter('ai_chat_tokens_total', {
  description: 'Total tokens used in AI chat',
})

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let span;
  
  try {
    span = tracer.startSpan('ai_chat_request');
    
    // Get authentication token
    const token = await getToken({ req: request });
    if (!token?.orgId || !token?.userId) {
      span?.setStatus({ code: SpanStatusCode.ERROR, message: 'Unauthorized' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = token.orgId as string;
    const userId = token.userId as string;

    // Set org context for RLS
    await prisma.$executeRaw`SELECT set_config('app.org_id', ${orgId}, true);`;

    // Parse and validate request
    const body = await request.json();
    const { messages, model = 'gpt-3.5-turbo', topicKey = 'general' } = body;

    if (!messages || !Array.isArray(messages)) {
      span?.setStatus({ code: SpanStatusCode.ERROR, message: 'Invalid messages format' });
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    // Redact messages for logging (do not store full content)
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    const intentHash = hashIntent(lastUserMessage);
    
    // Log sanitized request metadata only
    console.log('AI Chat Request', sanitizeLogData({
      userId,
      orgId,
      model,
      topicKey,
      intentHash,
      messageCount: messages.length,
      timestamp: new Date().toISOString(),
    }));

    span?.setAttributes({
      'user.id': userId,
      'org.id': orgId,
      'chat.model': model,
      'chat.topic': topicKey,
      'chat.message_count': messages.length,
    });

    let status: OutcomeStatus = 'success';
    let response;
    let tokensIn = 0;
    let tokensOut = 0;

    try {
      // Call OpenAI API with server-side key
      const completion = await openai.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      response = completion.choices[0]?.message;
      tokensIn = completion.usage?.prompt_tokens || 0;
      tokensOut = completion.usage?.completion_tokens || 0;

      // Check for no-answer scenarios
      if (!response?.content || response.content.trim().length === 0) {
        status = 'no_answer';
      }

    } catch (error: any) {
      console.error('OpenAI API Error:', sanitizeLogData({
        error: error.message,
        userId,
        topicKey,
        timestamp: new Date().toISOString(),
      }));

      if (error.code === 'content_policy_violation') {
        status = 'policy_block';
        response = { 
          role: 'assistant', 
          content: 'I cannot provide a response to that request due to content policy restrictions.' 
        };
      } else {
        status = 'fallback';
        response = { 
          role: 'assistant', 
          content: 'I apologize, but I encountered an issue processing your request. Please try again.' 
        };
      }

      span?.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    }

    const latencyMs = Date.now() - startTime;

    // Store outcome metrics (no content)
    try {
      await prisma.outcome.create({
        data: {
          orgId,
          userId,
          topicKey,
          status,
          latencyMs,
          tokensIn,
          tokensOut,
        },
      });

      // Update intent statistics
      await prisma.intentStats.upsert({
        where: {
          orgId_intentHash_topicKey: {
            orgId,
            intentHash,
            topicKey,
          },
        },
        update: {
          count: { increment: 1 },
          lastSeenAt: new Date(),
        },
        create: {
          orgId,
          intentHash,
          topicKey,
          count: 1,
        },
      });

      // Store redacted example if needed (for quality monitoring)
      if (status === 'no_answer' || status === 'policy_block') {
        const redactedSnippet = redactText(lastUserMessage.substring(0, 200), {
          preserveStructure: false,
        });
        
        await prisma.redactedExample.create({
          data: {
            orgId,
            snippet: redactedSnippet,
          },
        });
      }

    } catch (dbError) {
      console.error('Database Error:', sanitizeLogData({
        error: dbError,
        userId,
        topicKey,
        timestamp: new Date().toISOString(),
      }));
      
      // Continue serving the response even if metrics storage fails
    }

    span?.setAttributes({
      'chat.status': status,
      'chat.latency_ms': latencyMs,
      'chat.tokens_in': tokensIn,
      'chat.tokens_out': tokensOut,
    });

    span?.setStatus({ code: SpanStatusCode.OK });

    return NextResponse.json({
      message: response,
      usage: {
        prompt_tokens: tokensIn,
        completion_tokens: tokensOut,
        total_tokens: tokensIn + tokensOut,
      },
      model,
    });

  } catch (error: any) {
    console.error('Chat API Error:', sanitizeLogData({
      error: error.message,
      timestamp: new Date().toISOString(),
    }));

    span?.setStatus({ code: SpanStatusCode.ERROR, message: error.message });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    span?.end();
  }
}

// CORS configuration
export async function OPTIONS(request: NextRequest) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  const origin = request.headers.get('origin');
  
  if (origin && allowedOrigins.includes(origin)) {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  
  return new NextResponse(null, { status: 404 });
}