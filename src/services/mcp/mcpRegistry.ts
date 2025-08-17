/**
 * MCP Server Registry
 * 
 * Central registry for all SuperClaude MCP-compatible servers
 * Provides tool discovery, routing, and execution coordination
 */

import { catalogMCPServer } from './catalogMCPServer';
import { eligibilityMCPServer } from './eligibilityMCPServer';
import { schedulerMCPServer } from './schedulerMCPServer';
import { logger } from '@/utils/logger';

interface MCPServer {
  name: string;
  description: string;
  version: string;
  server_instance: any;
  capabilities: string[];
  status: 'active' | 'inactive' | 'error';
}

interface MCPManifest {
  registry_version: string;
  servers: MCPServer[];
  total_tools: number;
  last_updated: Date;
}

interface ToolExecutionContext {
  user_id: string;
  session_id: string;
  reasoning_step?: string;
  privacy_level: 'minimal' | 'standard' | 'aggressive';
}

class MCPRegistry {
  private servers: Map<string, MCPServer>;
  private tool_routing: Map<string, string>; // tool_name -> server_name
  private execution_history: Array<{
    timestamp: Date;
    tool_name: string;
    server_name: string;
    user_id: string;
    success: boolean;
    execution_time_ms: number;
  }>;

  constructor() {
    this.servers = new Map();
    this.tool_routing = new Map();
    this.execution_history = [];
    
    this.registerServers();
    this.buildToolRouting();
    
    logger.info('MCP Registry initialized', 'MCP_REGISTRY', {
      servers_count: this.servers.size,
      tools_count: this.tool_routing.size
    });
  }

  /**
   * Get the complete MCP manifest
   */
  getManifest(): MCPManifest {
    const servers = Array.from(this.servers.values());
    const active_servers = servers.filter(s => s.status === 'active');
    
    return {
      registry_version: '1.0.0',
      servers: active_servers,
      total_tools: this.tool_routing.size,
      last_updated: new Date()
    };
  }

  /**
   * Execute a tool through the appropriate MCP server
   */
  async executeTool(
    tool_name: string,
    args: any,
    context: ToolExecutionContext
  ): Promise<{
    success: boolean;
    result?: any;
    error?: string;
    execution_time_ms: number;
    server_used: string;
  }> {
    const start_time = Date.now();
    
    try {
      // Route to appropriate server
      const server_name = this.tool_routing.get(tool_name);
      if (!server_name) {
        return {
          success: false,
          error: `Tool '${tool_name}' not found in registry`,
          execution_time_ms: Date.now() - start_time,
          server_used: 'none'
        };
      }

      const server = this.servers.get(server_name);
      if (!server || server.status !== 'active') {
        return {
          success: false,
          error: `Server '${server_name}' not available`,
          execution_time_ms: Date.now() - start_time,
          server_used: server_name
        };
      }

      // Execute the tool
      const result = await server.server_instance.executeTool(tool_name, args);
      const execution_time_ms = Date.now() - start_time;
      
      // Record execution history
      this.execution_history.push({
        timestamp: new Date(),
        tool_name,
        server_name,
        user_id: context.user_id,
        success: !result.isError,
        execution_time_ms
      });

      logger.info('MCP tool executed', 'MCP_REGISTRY', {
        tool_name,
        server_name,
        success: !result.isError,
        execution_time_ms,
        user_id: context.user_id.substring(0, 8) + '...'
      });

      return {
        success: !result.isError,
        result: result.isError ? undefined : result,
        error: result.isError ? result.content[0]?.text : undefined,
        execution_time_ms,
        server_used: server_name
      };

    } catch (error) {
      const execution_time_ms = Date.now() - start_time;
      
      logger.error('MCP tool execution failed', 'MCP_REGISTRY', {
        tool_name,
        error: error.toString(),
        execution_time_ms
      });

      return {
        success: false,
        error: `Tool execution failed: ${error}`,
        execution_time_ms,
        server_used: this.tool_routing.get(tool_name) || 'unknown'
      };
    }
  }

  /**
   * Get all available tools organized by server
   */
  getAllTools(): Record<string, Array<{
    name: string;
    description: string;
    server: string;
    input_schema: any;
  }>> {
    const tools_by_server: Record<string, any[]> = {};
    
    for (const [server_name, server] of this.servers) {
      if (server.status === 'active') {
        try {
          const server_tools = server.server_instance.getTools();
          tools_by_server[server_name] = server_tools.map((tool: any) => ({
            name: tool.name,
            description: tool.description,
            server: server_name,
            input_schema: tool.inputSchema
          }));
        } catch (error) {
          logger.error(`Failed to get tools from server ${server_name}`, 'MCP_REGISTRY', error);
          tools_by_server[server_name] = [];
        }
      }
    }
    
    return tools_by_server;
  }

  /**
   * Get tools relevant to a specific academic query
   */
  getRelevantTools(query: string): Array<{
    tool_name: string;
    server_name: string;
    relevance_score: number;
    description: string;
  }> {
    const query_lower = query.toLowerCase();
    const relevant_tools: any[] = [];
    
    // Course-related queries
    if (/course|class|schedule|section|prerequisite|catalog/.test(query_lower)) {
      relevant_tools.push(
        { tool_name: 'query_courses', server_name: 'catalog', relevance_score: 0.9 },
        { tool_name: 'get_course_details', server_name: 'catalog', relevance_score: 0.8 },
        { tool_name: 'search_prerequisites', server_name: 'catalog', relevance_score: 0.7 }
      );
    }
    
    // Scheduling queries
    if (/schedule|conflict|time|semester.*plan|when.*take/.test(query_lower)) {
      relevant_tools.push(
        { tool_name: 'check_schedule_conflicts', server_name: 'scheduler', relevance_score: 0.9 },
        { tool_name: 'plan_semester_schedule', server_name: 'scheduler', relevance_score: 0.8 },
        { tool_name: 'find_alternative_sections', server_name: 'scheduler', relevance_score: 0.7 }
      );
    }
    
    // CODO/Eligibility queries
    if (/codo|change.*major|transfer|eligible|requirement|gpa/.test(query_lower)) {
      relevant_tools.push(
        { tool_name: 'evaluate_codo_eligibility', server_name: 'eligibility', relevance_score: 0.9 },
        { tool_name: 'check_prerequisites', server_name: 'eligibility', relevance_score: 0.7 },
        { tool_name: 'verify_graduation_requirements', server_name: 'eligibility', relevance_score: 0.6 }
      );
    }
    
    // Graduation/progress queries
    if (/graduate|graduation|progress|requirement|degree.*audit/.test(query_lower)) {
      relevant_tools.push(
        { tool_name: 'verify_graduation_requirements', server_name: 'eligibility', relevance_score: 0.9 },
        { tool_name: 'validate_course_sequence', server_name: 'scheduler', relevance_score: 0.7 }
      );
    }
    
    // Workload/planning queries
    if (/workload|difficult|overload|credit.*hour|balance/.test(query_lower)) {
      relevant_tools.push(
        { tool_name: 'assess_course_load', server_name: 'eligibility', relevance_score: 0.8 },
        { tool_name: 'analyze_workload_distribution', server_name: 'scheduler', relevance_score: 0.8 }
      );
    }
    
    // Add descriptions
    const all_tools = this.getAllTools();
    relevant_tools.forEach(tool => {
      const server_tools = all_tools[tool.server_name] || [];
      const tool_info = server_tools.find(t => t.name === tool.tool_name);
      tool.description = tool_info?.description || 'No description available';
    });
    
    return relevant_tools.sort((a, b) => b.relevance_score - a.relevance_score);
  }

  /**
   * Get server health status
   */
  getServerHealth(): Record<string, {
    status: string;
    uptime_hours: number;
    tools_count: number;
    recent_success_rate: number;
    avg_response_time_ms: number;
  }> {
    const health: Record<string, any> = {};
    const one_hour_ago = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const [server_name, server] of this.servers) {
      const recent_executions = this.execution_history.filter(
        entry => entry.server_name === server_name && entry.timestamp > one_hour_ago
      );
      
      const success_count = recent_executions.filter(e => e.success).length;
      const success_rate = recent_executions.length > 0 ? success_count / recent_executions.length : 1.0;
      
      const avg_response_time = recent_executions.length > 0 
        ? recent_executions.reduce((sum, e) => sum + e.execution_time_ms, 0) / recent_executions.length
        : 0;
      
      health[server_name] = {
        status: server.status,
        uptime_hours: 24, // Mock value - would track actual uptime
        tools_count: server.server_instance.getTools().length,
        recent_success_rate: success_rate,
        avg_response_time_ms: avg_response_time
      };
    }
    
    return health;
  }

  /**
   * Get usage statistics for admin dashboard
   */
  getUsageStatistics(time_period: 'hour' | 'day' | 'week' = 'day'): {
    total_executions: number;
    success_rate: number;
    top_tools: Array<{ tool_name: string; usage_count: number }>;
    server_utilization: Record<string, number>;
  } {
    const cutoff_time = this.getCutoffTime(time_period);
    const recent_executions = this.execution_history.filter(
      entry => entry.timestamp > cutoff_time
    );
    
    const total_executions = recent_executions.length;
    const successful_executions = recent_executions.filter(e => e.success).length;
    const success_rate = total_executions > 0 ? successful_executions / total_executions : 0;
    
    // Top tools by usage
    const tool_usage = new Map<string, number>();
    recent_executions.forEach(entry => {
      tool_usage.set(entry.tool_name, (tool_usage.get(entry.tool_name) || 0) + 1);
    });
    
    const top_tools = Array.from(tool_usage.entries())
      .map(([tool_name, usage_count]) => ({ tool_name, usage_count }))
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 10);
    
    // Server utilization
    const server_utilization: Record<string, number> = {};
    const server_usage = new Map<string, number>();
    recent_executions.forEach(entry => {
      server_usage.set(entry.server_name, (server_usage.get(entry.server_name) || 0) + 1);
    });
    
    for (const [server_name] of this.servers) {
      const usage = server_usage.get(server_name) || 0;
      server_utilization[server_name] = total_executions > 0 ? usage / total_executions : 0;
    }
    
    return {
      total_executions,
      success_rate,
      top_tools,
      server_utilization
    };
  }

  // Private methods

  private registerServers(): void {
    // Register Catalog MCP Server
    this.servers.set('catalog', {
      name: 'catalog',
      description: 'Course catalog and academic information retrieval',
      version: '1.0.0',
      server_instance: catalogMCPServer,
      capabilities: ['course_search', 'prerequisite_analysis', 'catalog_lookup'],
      status: 'active'
    });

    // Register Eligibility MCP Server
    this.servers.set('eligibility', {
      name: 'eligibility',
      description: 'Academic eligibility and policy compliance checking',
      version: '1.0.0',
      server_instance: eligibilityMCPServer,
      capabilities: ['codo_evaluation', 'prerequisite_checking', 'policy_compliance'],
      status: 'active'
    });

    // Register Scheduler MCP Server
    this.servers.set('scheduler', {
      name: 'scheduler',
      description: 'Course scheduling and conflict resolution',
      version: '1.0.0',
      server_instance: schedulerMCPServer,
      capabilities: ['schedule_planning', 'conflict_detection', 'workload_analysis'],
      status: 'active'
    });
  }

  private buildToolRouting(): void {
    for (const [server_name, server] of this.servers) {
      if (server.status === 'active') {
        try {
          const tools = server.server_instance.getTools();
          tools.forEach((tool: any) => {
            this.tool_routing.set(tool.name, server_name);
          });
        } catch (error) {
          logger.error(`Failed to build routing for server ${server_name}`, 'MCP_REGISTRY', error);
        }
      }
    }
  }

  private getCutoffTime(time_period: 'hour' | 'day' | 'week'): Date {
    const now = Date.now();
    switch (time_period) {
      case 'hour':
        return new Date(now - 60 * 60 * 1000);
      case 'day':
        return new Date(now - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now - 24 * 60 * 60 * 1000);
    }
  }
}

export const mcpRegistry = new MCPRegistry();
export default mcpRegistry;