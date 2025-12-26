// components/InfrastructureHUD.tsx - Complete Command Center

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { 
  Activity, AlertTriangle, Database, Zap, Cloud, Server,
  Shield, TrendingUp, Eye, Terminal, AlertCircle, CheckCircle,
  XCircle, Loader, ChevronRight, Play, Pause, Circle
} from 'lucide-react';
import { bus } from '@/lib/bus';
import { blackbox } from '@/lib/blackbox';
import { calculateSystemStatus, type SystemStatus, type AdapterStatus } from '@/lib/system-status';

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(r => r.json());

export default function InfrastructureHUD() {
  // Global state
  const [threatLevel, setThreatLevel] = useState(0);
  const [focusedWidget, setFocusedWidget] = useState<string | null>(null);
  const [showScanlines, setShowScanlines] = useState(true);
  const [showGlow, setShowGlow] = useState(true);
  const [incidents, setIncidents] = useState(blackbox.getRecent(20));
  const [systemPower, setSystemPower] = useState(75);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('YELLOW');

  // Live data from API
  const { data: statusData, error: statusError } = useSWR('/api/status', fetcher, {
    refreshInterval: 5000 // Poll every 5 seconds
  });

  // Calculate adapter statuses
  const adapterStatuses: AdapterStatus[] = [
    {
      name: 'Vercel',
      connected: statusData?.status?.vercel?.ok || false,
      degraded: false,
      error: statusData?.status?.vercel?.error
    },
    {
      name: 'Railway',
      connected: statusData?.status?.railway?.ok || false,
      degraded: !statusData?.status?.railway?.ok, // Currently degraded until GraphQL wired
      error: statusData?.status?.railway?.error || 'GraphQL adapter not yet bound'
    },
    {
      name: 'Disk',
      connected: statusData?.status?.disk?.ok || false,
      degraded: (statusData?.status?.disk?.data?.percent || 0) > 95,
      error: statusData?.status?.disk?.error
    }
  ];

  // Calculate system status
  useEffect(() => {
    const criticalCount = incidents.filter(i => i.severity === 'critical').length;
    const health = calculateSystemStatus(adapterStatuses, threatLevel, criticalCount);
    setSystemStatus(health.overall);
  }, [statusData, threatLevel, incidents]);

  // Subscribe to bus events
  useEffect(() => {
    const unsubs = [
      bus.on('INCIDENT_APPEND', (event) => {
        setIncidents(blackbox.getRecent(20));
      }),
      bus.on('THREAT_CHANGED', (event) => {
        setThreatLevel(event.level);
      }),
      bus.on('WIDGET_FOCUS', (event) => {
        setFocusedWidget(event.widgetId);
      })
    ];

    return () => unsubs.forEach(u => u());
  }, []);

  // Calculate system power from deployments and disk
  useEffect(() => {
    if (!statusData) return;

    const { vercel, railway, disk } = statusData.status;
    
    let power = 0;
    
    // Deployment health (50% weight)
    if (vercel?.ok && vercel.data?.latest?.state === 'READY') power += 30;
    if (railway?.ok && railway.data?.services?.length > 0) power += 20;
    
    // Disk health (30% weight)
    if (disk?.ok) {
      const diskHealth = Math.max(0, 100 - disk.data.percent);
      power += (diskHealth / 100) * 30;
    }
    
    // Incident rate (20% weight)
    const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
    const incidentPenalty = Math.min(20, criticalIncidents * 5);
    power += (20 - incidentPenalty);

    setSystemPower(Math.round(power));
  }, [statusData, incidents]);

  // Auto-adjust threat level based on conditions
  useEffect(() => {
    if (!statusData) return;

    const { disk } = statusData.status;
    let newThreat = 0;

    if (disk?.ok && disk.data.percent > 98) newThreat += 40;
    if (disk?.ok && disk.data.percent > 99) newThreat += 30;
    
    const criticalCount = incidents.filter(i => i.severity === 'critical').length;
    newThreat += Math.min(30, criticalCount * 10);

    if (newThreat !== threatLevel) {
      bus.emit('THREAT_CHANGED', {
        level: newThreat,
        reason: `Auto-adjusted: disk=${disk?.data?.percent}%, critical=${criticalCount}`
      });
    }
  }, [statusData, incidents]);

  return (
    <div className="min-h-screen bg-black text-gray-100 p-4 relative overflow-hidden">
      
      {/* Scanlines overlay */}
      {showScanlines && (
        <div 
          className="fixed inset-0 pointer-events-none z-50 opacity-10"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,255,0,0.1) 0px, transparent 2px, transparent 4px)',
            backgroundSize: '100% 4px'
          }}
        />
      )}

      {/* Glow effects */}
      {showGlow && (
        <>
          <div className="fixed top-0 left-0 w-96 h-96 bg-purple-500 rounded-full opacity-5 blur-3xl" />
          <div className="fixed bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full opacity-5 blur-3xl" />
        </>
      )}

      {/* Header */}
      <div className="relative z-10 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              ECHOFORGE // DIGFLEET
            </h1>
            <p className="text-gray-500 text-sm mt-1">JIT Command Center v3.0</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* System Status Badge */}
            <SystemStatusBadge status={systemStatus} adapters={adapterStatuses} />
            
            {/* System Power (Arc Reactor) */}
            <ArcReactor power={systemPower} />
          </div>
        </div>

        {/* Threat Level Slider */}
        <div className="mt-4 bg-gray-900/50 backdrop-blur border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">THREAT LEVEL</span>
            <span className={`text-2xl font-mono font-bold ${
              threatLevel > 70 ? 'text-red-400' :
              threatLevel > 40 ? 'text-yellow-400' : 
              'text-green-400'
            }`}>
              {threatLevel}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={threatLevel}
            onChange={(e) => {
              const level = parseInt(e.target.value);
              bus.emit('THREAT_CHANGED', {
                level,
                reason: 'Manual adjustment'
              });
            }}
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, 
                #22c55e ${Math.min(40, threatLevel)}%, 
                #eab308 ${Math.min(70, Math.max(40, threatLevel))}%, 
                #ef4444 ${Math.max(70, threatLevel)}%)`
            }}
          />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">
        
        {/* Left Column: Deployments + Agents */}
        <div className="space-y-4">
          <DeploymentStatusWidget 
            data={statusData?.status}
            focused={focusedWidget === 'deployments'}
            onFocus={() => bus.emit('WIDGET_FOCUS', { widgetId: 'deployments' })}
          />
          
          <AgentStatusWidget
            focused={focusedWidget === 'agents'}
            onFocus={() => bus.emit('WIDGET_FOCUS', { widgetId: 'agents' })}
          />
        </div>

        {/* Center Column: Telemetry + Incidents */}
        <div className="space-y-4">
          <TelemetryWidget 
            disk={statusData?.status?.disk}
            focused={focusedWidget === 'telemetry'}
            onFocus={() => bus.emit('WIDGET_FOCUS', { widgetId: 'telemetry' })}
          />
          
          <IncidentTimeline
            incidents={incidents}
            focused={focusedWidget === 'incidents'}
            onFocus={() => bus.emit('WIDGET_FOCUS', { widgetId: 'incidents' })}
          />
        </div>

        {/* Right Column: Priority Actions + Threat Rail */}
        <div className="space-y-4">
          <PriorityActionsWidget
            focused={focusedWidget === 'priorities'}
            onFocus={() => bus.emit('WIDGET_FOCUS', { widgetId: 'priorities' })}
          />
          
          <ThreatRailWidget
            threatLevel={threatLevel}
            incidents={incidents}
            focused={focusedWidget === 'threats'}
            onFocus={() => bus.emit('WIDGET_FOCUS', { widgetId: 'threats' })}
          />
        </div>
      </div>

      {/* Controls (bottom right) */}
      <div className="fixed bottom-4 right-4 space-y-2 z-20">
        <button
          onClick={() => setShowScanlines(!showScanlines)}
          className="block w-full bg-gray-900 border border-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-800 transition"
        >
          {showScanlines ? 'Hide' : 'Show'} Scanlines
        </button>
        <button
          onClick={() => setShowGlow(!showGlow)}
          className="block w-full bg-gray-900 border border-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-800 transition"
        >
          {showGlow ? 'Hide' : 'Show'} Glow
        </button>
      </div>
    </div>
  );
}

// System Status Badge (GREEN | YELLOW | RED)
function SystemStatusBadge({ status, adapters }: { status: SystemStatus; adapters: AdapterStatus[] }) {
  const config = {
    GREEN: { 
      color: 'text-green-400 border-green-500', 
      bg: 'bg-green-950/30',
      label: 'OPERATIONAL' 
    },
    YELLOW: { 
      color: 'text-yellow-400 border-yellow-500', 
      bg: 'bg-yellow-950/30',
      label: 'DEGRADED' 
    },
    RED: { 
      color: 'text-red-400 border-red-500', 
      bg: 'bg-red-950/30',
      label: 'CRITICAL' 
    }
  };

  const { color, bg, label } = config[status];
  
  const disconnected = adapters.filter(a => !a.connected);
  const degraded = adapters.filter(a => a.degraded && a.connected);

  return (
    <div className={`${bg} border ${color} rounded-lg px-4 py-2 min-w-[140px]`}>
      <div className="flex items-center gap-2 mb-1">
        <Circle className="w-3 h-3 fill-current animate-pulse" />
        <span className="text-xs font-mono font-bold tracking-wider">{label}</span>
      </div>
      <div className="text-[10px] text-gray-500 space-y-0.5">
        {disconnected.length > 0 && (
          <div>⚠ {disconnected.length} disconnected</div>
        )}
        {degraded.length > 0 && (
          <div>⚡ {degraded.length} degraded</div>
        )}
        {disconnected.length === 0 && degraded.length === 0 && status === 'GREEN' && (
          <div>✓ All systems nominal</div>
        )}
      </div>
    </div>
  );
}

// Arc Reactor Power Gauge
function ArcReactor({ power }: { power: number }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (power / 100) * circumference;

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full transform -rotate-90">
        {/* Background ring */}
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="rgba(59,130,246,0.1)"
          strokeWidth="8"
          fill="none"
        />
        {/* Power ring */}
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="url(#powerGradient)"
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id="powerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <Zap className="w-6 h-6 text-blue-400 mb-1" />
        <span className="text-2xl font-bold text-blue-400">{power}%</span>
      </div>
    </div>
  );
}

// Deployment Status Widget
function DeploymentStatusWidget({ data, focused, onFocus }: any) {
  const railwayStatus = data?.railway?.ok ? 'STAGING' : 'DEGRADED';
  const railwayTooltip = data?.railway?.ok 
    ? 'Railway connected' 
    : 'Railway adapter not yet bound (GraphQL stub)';
  
  const deployments = [
    { 
      name: 'EchoForge', 
      platform: 'Vercel', 
      status: data?.vercel?.data?.latest?.state || 'UNKNOWN',
      tooltip: data?.vercel?.ok ? 'Live data from Vercel API' : 'Vercel API error'
    },
    { 
      name: 'SwarmSentinel', 
      platform: 'Railway', 
      status: railwayStatus,
      tooltip: railwayTooltip
    },
    { 
      name: 'Base Sniper', 
      platform: 'Render', 
      status: 'READY',
      tooltip: 'Ready for deployment'
    }
  ];

  return (
    <Widget title="DEPLOYMENTS" icon={Cloud} focused={focused} onFocus={onFocus}>
      <div className="space-y-2">
        {deployments.map((dep, i) => (
          <div 
            key={i} 
            className="flex items-center justify-between bg-gray-900/50 p-3 rounded border border-gray-800"
            title={dep.tooltip}
          >
            <div>
              <div className="font-semibold text-sm">{dep.name}</div>
              <div className="text-xs text-gray-500">{dep.platform}</div>
            </div>
            <StatusBadge status={dep.status} />
          </div>
        ))}
      </div>
    </Widget>
  );
}

// Agent Status Widget
function AgentStatusWidget({ focused, onFocus }: any) {
  const agents = [
    { name: 'Security Recon', status: 'active', findings: 12 },
    { name: 'Wallet Recovery', status: 'active', findings: 8 },
    { name: 'Trading Swarm', status: 'active', findings: 47 },
    { name: 'Infrastructure', status: 'active', findings: 96 },
    { name: 'Research', status: 'active', findings: 6 },
    { name: 'Archive Intel', status: 'active', findings: 23 }
  ];

  return (
    <Widget title="DIGFLEET AGENTS" icon={Shield} focused={focused} onFocus={onFocus}>
      <div className="space-y-1">
        {agents.map((agent, i) => (
          <div key={i} className="flex items-center justify-between text-sm py-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>{agent.name}</span>
            </div>
            <span className="text-gray-500">{agent.findings}</span>
          </div>
        ))}
      </div>
    </Widget>
  );
}

// Telemetry Widget
function TelemetryWidget({ disk, focused, onFocus }: any) {
  const diskPercent = disk?.data?.percent || 0;

  return (
    <Widget title="TELEMETRY" icon={Activity} focused={focused} onFocus={onFocus}>
      <div className="space-y-3">
        <MetricBar label="DISK" value={diskPercent} max={100} danger={diskPercent > 95} />
        <MetricBar label="CPU" value={67} max={100} />
        <MetricBar label="MEMORY" value={82} max={100} />
        <MetricBar label="NETWORK" value={45} max={100} />
      </div>
    </Widget>
  );
}

// Incident Timeline
function IncidentTimeline({ incidents, focused, onFocus }: any) {
  return (
    <Widget title="INCIDENT LOG" icon={Terminal} focused={focused} onFocus={onFocus}>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {incidents.length === 0 ? (
          <div className="text-center text-gray-600 py-4 text-sm">No incidents recorded</div>
        ) : (
          incidents.map((inc: any) => (
            <div key={inc.id} className="text-xs font-mono bg-gray-900/50 p-2 rounded border-l-2 border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <SeverityIcon severity={inc.severity} />
                <span className="text-gray-500">
                  {new Date(inc.ts).toLocaleTimeString()}
                </span>
                <span className="text-gray-600">[{inc.category}]</span>
              </div>
              <div>{inc.msg}</div>
            </div>
          ))
        )}
      </div>
    </Widget>
  );
}

// Priority Actions Widget
function PriorityActionsWidget({ focused, onFocus }: any) {
  const actions = [
    { id: 1, title: 'Storage Cleanup', severity: 'critical', metric: '99.5% full' },
    { id: 2, title: 'Deploy SwarmSentinel', severity: 'warning', metric: 'Ready' },
    { id: 3, title: 'Connect Backend', severity: 'info', metric: 'Pending' }
  ];

  return (
    <Widget title="PRIORITY ACTIONS" icon={AlertCircle} focused={focused} onFocus={onFocus}>
      <div className="space-y-2">
        {actions.map(action => (
          <div 
            key={action.id}
            className={`p-3 rounded border-l-4 cursor-pointer hover:bg-gray-900/50 transition ${
              action.severity === 'critical' ? 'border-red-500 bg-red-950/20' :
              action.severity === 'warning' ? 'border-yellow-500 bg-yellow-950/20' :
              'border-blue-500 bg-blue-950/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">{action.title}</span>
              <span className="text-xs text-gray-500">{action.metric}</span>
            </div>
          </div>
        ))}
      </div>
    </Widget>
  );
}

// Threat Rail Widget
function ThreatRailWidget({ threatLevel, incidents, focused, onFocus }: any) {
  const critical = incidents.filter((i: any) => i.severity === 'critical').length;
  const warnings = incidents.filter((i: any) => i.severity === 'warning').length;

  return (
    <Widget title="THREAT RAIL" icon={Eye} focused={focused} onFocus={onFocus}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Overall</span>
          <span className={`text-2xl font-bold ${
            threatLevel > 70 ? 'text-red-400' :
            threatLevel > 40 ? 'text-yellow-400' :
            'text-green-400'
          }`}>
            {threatLevel}%
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-red-400">Critical</span>
            <span>{critical}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-yellow-400">Warnings</span>
            <span>{warnings}</span>
          </div>
        </div>
      </div>
    </Widget>
  );
}

// Reusable Widget Container
function Widget({ title, icon: Icon, children, focused, onFocus }: any) {
  return (
    <motion.div
      onClick={onFocus}
      className={`bg-gray-900/80 backdrop-blur border rounded-lg p-4 relative cursor-pointer transition ${
        focused ? 'border-purple-500' : 'border-gray-800'
      }`}
      whileHover={{ scale: 1.02 }}
    >
      {/* Animated reticle when focused */}
      <AnimatePresence>
        {focused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, rotate: 360 }}
            exit={{ opacity: 0 }}
            transition={{ rotate: { duration: 10, repeat: Infinity, ease: 'linear' } }}
            className="absolute inset-0 border-2 border-purple-500 rounded-lg pointer-events-none"
            style={{
              boxShadow: '0 0 20px rgba(168,85,247,0.5)',
            }}
          />
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5 text-purple-400" />
        <h3 className="font-bold text-sm tracking-wider">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

// Utility Components
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: any }> = {
    READY: { color: 'text-green-400', icon: CheckCircle },
    BUILDING: { color: 'text-yellow-400', icon: Loader },
    ERROR: { color: 'text-red-400', icon: XCircle },
    STAGING: { color: 'text-blue-400', icon: Play },
    DEGRADED: { color: 'text-yellow-400', icon: AlertCircle },
    UNKNOWN: { color: 'text-gray-400', icon: AlertCircle }
  };

  const { color, icon: Icon } = config[status] || config.UNKNOWN;
  
  return (
    <div className={`flex items-center gap-1 ${color}`}>
      <Icon className="w-4 h-4" />
      <span className="text-xs font-mono">{status}</span>
    </div>
  );
}

function MetricBar({ label, value, max, danger }: any) {
  const percent = (value / max) * 100;

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className={danger ? 'text-red-400' : 'text-gray-300'}>{value}%</span>
      </div>
      <div className="h-2 bg-gray-800 rounded overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${
            danger ? 'bg-red-500' : 'bg-blue-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === 'critical') return <AlertTriangle className="w-3 h-3 text-red-400" />;
  if (severity === 'warning') return <AlertCircle className="w-3 h-3 text-yellow-400" />;
  return <CheckCircle className="w-3 h-3 text-green-400" />;
}
