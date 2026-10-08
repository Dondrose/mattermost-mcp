import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MonitoringConfig {
  enabled: boolean;
  schedule: string;  // Cron format
  channels: string[];  // Channel names to monitor
  topics: string[];  // Topics to look for
  messageLimit: number;  // Number of recent messages to analyze per check
  notificationChannelId?: string;  // Where to send notifications (optional, will use DM if not provided)
  userId?: string;  // User ID for mentions (optional, will be auto-detected if not provided)
}

export interface Config {
  mattermostUrl: string;
  token: string;
  teamId: string;
  monitoring?: MonitoringConfig;
}

// Environment variables (e.g. set by the MCP client's "env" block) take precedence over the
// config files, so credentials don't have to live on disk next to the build.
function applyEnvOverrides(config: Partial<Config>): Config {
  return {
    ...config,
    mattermostUrl: process.env.MATTERMOST_URL || config.mattermostUrl || '',
    token: process.env.MATTERMOST_TOKEN || config.token || '',
    teamId: process.env.MATTERMOST_TEAM_ID || config.teamId || '',
  } as Config;
}

export function loadConfig(): Config {
  if (process.env.MATTERMOST_URL && process.env.MATTERMOST_TOKEN && process.env.MATTERMOST_TEAM_ID) {
    const localConfigPath = path.resolve(__dirname, '../config.local.json');
    const fileConfig = fs.existsSync(localConfigPath)
      ? (JSON.parse(fs.readFileSync(localConfigPath, 'utf8')) as Partial<Config>)
      : {};
    const config = applyEnvOverrides(fileConfig);
    validateConfig(config);
    return config;
  }

  try {
    // First try to load from config.local.json
    const localConfigPath = path.resolve(__dirname, '../config.local.json');
    
    // Check if local config exists
    if (fs.existsSync(localConfigPath)) {
      const configData = fs.readFileSync(localConfigPath, 'utf8');
      const config = applyEnvOverrides(JSON.parse(configData) as Partial<Config>);
      
      // Validate required fields
      validateConfig(config);
      return config;
    }
    
    // Fall back to config.json
    const configPath = path.resolve(__dirname, '../config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = applyEnvOverrides(JSON.parse(configData) as Partial<Config>);
    
    // Validate required fields
    validateConfig(config);
    return config;
  } catch (error) {
    console.error('Error loading configuration:', error);
    throw new Error('Failed to load configuration. Please ensure config.json or config.local.json exists and contains valid data.');
  }
}

// Helper function to validate config
function validateConfig(config: Config): void {
  if (!config.mattermostUrl) {
    throw new Error('Missing mattermostUrl in configuration');
  }
  if (!config.token) {
    throw new Error('Missing token in configuration');
  }
  if (!config.teamId) {
    throw new Error('Missing teamId in configuration');
  }
  
  // Validate monitoring config if enabled
  if (config.monitoring?.enabled) {
    if (!config.monitoring.schedule) {
      throw new Error('Missing schedule in monitoring configuration');
    }
    if (!config.monitoring.channels || config.monitoring.channels.length === 0) {
      throw new Error('No channels specified in monitoring configuration');
    }
    if (!config.monitoring.topics || config.monitoring.topics.length === 0) {
      throw new Error('No topics specified in monitoring configuration');
    }
    // userId and notificationChannelId are now optional
  }
}
