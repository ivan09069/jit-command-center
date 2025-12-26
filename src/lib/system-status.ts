// lib/system-status.ts - System-wide health indicator

export type SystemStatus = 'GREEN' | 'YELLOW' | 'RED';

export interface AdapterStatus {
  name: string;
  connected: boolean;
  degraded: boolean;
  error?: string;
}

export interface SystemHealthReport {
  overall: SystemStatus;
  adapters: AdapterStatus[];
  threatLevel: number;
  criticalIncidents: number;
  reasons: string[];
}

/**
 * Calculate overall system status from adapter states and threat level
 */
export function calculateSystemStatus(
  adapters: AdapterStatus[],
  threatLevel: number,
  criticalIncidents: number
): SystemHealthReport {
  const reasons: string[] = [];
  
  // Check adapter health
  const disconnected = adapters.filter(a => !a.connected);
  const degraded = adapters.filter(a => a.degraded);
  
  if (disconnected.length > 0) {
    reasons.push(`${disconnected.length} adapter(s) disconnected`);
  }
  if (degraded.length > 0) {
    reasons.push(`${degraded.length} adapter(s) degraded`);
  }
  
  // Check threat level
  if (threatLevel >= 70) {
    reasons.push('Threat level CRITICAL (≥70%)');
  } else if (threatLevel >= 40) {
    reasons.push('Threat level ELEVATED (≥40%)');
  }
  
  // Check incidents
  if (criticalIncidents > 0) {
    reasons.push(`${criticalIncidents} critical incident(s)`);
  }
  
  // Determine overall status
  let overall: SystemStatus = 'GREEN';
  
  if (
    disconnected.length > 1 || 
    threatLevel >= 70 || 
    criticalIncidents >= 3
  ) {
    overall = 'RED';
  } else if (
    disconnected.length > 0 || 
    degraded.length > 0 || 
    threatLevel >= 40 || 
    criticalIncidents > 0
  ) {
    overall = 'YELLOW';
  }
  
  return {
    overall,
    adapters,
    threatLevel,
    criticalIncidents,
    reasons
  };
}
