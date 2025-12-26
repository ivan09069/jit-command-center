'use client';

import { useEffect, useState } from 'react';
import CircularGauge from './CircularGauge';

interface TelemetryData {
  disk: { percent: number };
  cpu: number;
  memory: number;
  network: number;
}

export default function InfrastructureHUD() {
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    disk: { percent: 99.5 },
    cpu: 67,
    memory: 82,
    network: 45
  });

  const [threatLevel, setThreatLevel] = useState(70);
  const [systemStatus, setSystemStatus] = useState<'GREEN' | 'YELLOW' | 'RED'>('RED');

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry(prev => ({
        ...prev,
        cpu: Math.min(100, Math.max(0, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.min(100, Math.max(0, prev.memory + (Math.random() - 0.5) * 5)),
        network: Math.min(100, Math.max(0, prev.network + (Math.random() - 0.5) * 15))
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getGaugeStatus = (value: number): 'ok' | 'warn' | 'critical' => {
    if (value >= 80) return 'critical';
    if (value >= 60) return 'warn';
    return 'ok';
  };

  return (
    <>
      {/* CRT Effects */}
      <div className="crt-grid" />
      <div className="crt-scanlines" />
      
      {/* Main Container */}
      <div className="crt-container min-h-screen p-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="text-sm uppercase tracking-wider text-green-400">
              ━ SYS ONLINE ━
            </div>
            <h1 className="text-4xl font-bold tracking-wider" style={{ 
              color: '#8b5cf6',
              textShadow: '0 0 20px rgba(139, 92, 246, 0.5)'
            }}>
              ECHOFORGE COMMAND CENTER
            </h1>
            <div className="text-sm uppercase tracking-wider text-green-400">
              ━ ACTIVE ━
            </div>
          </div>
          
          {/* System Status Badge */}
          <div className={`status-badge ${systemStatus === 'RED' ? 'red' : systemStatus === 'YELLOW' ? 'yellow' : 'green'}`}>
            {systemStatus === 'RED' ? '⚠ CRITICAL' : systemStatus === 'YELLOW' ? '⚠ DEGRADED' : '✓ OPERATIONAL'}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Panel - Telemetry */}
          <div className="terminal-panel">
            <h2 className="text-xl mb-6 uppercase tracking-wider flex items-center gap-2">
              <span className="text-cyan-400">▸</span> Telemetry Core
            </h2>
            
            <div className="flex justify-center mb-6">
              <CircularGauge 
                value={telemetry.disk.percent} 
                label="DISK: WARN"
                status={getGaugeStatus(telemetry.disk.percent)}
              />
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">• usedPct:</span>
                <span className="text-cyan-400">{telemetry.disk.percent.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">• freeGb:</span>
                <span className="text-cyan-400">26.4 / totalGb: 94.3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">• mount:</span>
                <span className="text-cyan-400 text-xs">/data/data/com.termux</span>
              </div>
            </div>
          </div>

          {/* Center Panel - Threat Level */}
          <div className="terminal-panel">
            <h2 className="text-xl mb-6 uppercase tracking-wider flex items-center gap-2">
              <span className="text-cyan-400">▸</span> Threat Level
            </h2>

            {/* Threat Bar */}
            <div className="mb-8">
              <div className="relative h-8 bg-gray-900 rounded-lg overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full transition-all duration-1000"
                  style={{
                    width: `${threatLevel}%`,
                    background: `linear-gradient(90deg, 
                      #10b981 0%, 
                      #fbbf24 50%, 
                      #ef4444 100%)`
                  }}
                />
                <div 
                  className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-gray-900"
                  style={{ left: `${threatLevel}%`, marginLeft: '-8px' }}
                />
              </div>
              <div className="text-right mt-2 text-2xl font-bold" style={{ color: '#fb923c' }}>
                {threatLevel}%
              </div>
            </div>

            {/* Threshold Indicators */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-orange-500/10 border border-orange-500 rounded px-4 py-2">
                <div className="text-xs text-gray-400 mb-1">WARN @ 60%</div>
                <div className="text-orange-500 font-bold">WARN @ 60%</div>
              </div>
              <div className="bg-red-500/10 border border-red-500 rounded px-4 py-2">
                <div className="text-xs text-gray-400 mb-1">CRIT @ 80%</div>
                <div className="text-red-500 font-bold">CRIT @ 80%</div>
              </div>
            </div>

            <p className="text-center text-sm text-gray-400 mt-4">
              Higher = more sensitive alerts.
            </p>
          </div>

          {/* Right Panel - Notes */}
          <div className="terminal-panel">
            <h2 className="text-xl mb-6 uppercase tracking-wider flex items-center gap-2">
              <span className="text-cyan-400">▸</span> EchoForge HUD Notes
            </h2>
            
            <div className="space-y-4 font-mono text-sm">
              <div className="text-green-400">
                We can borrow CRT<br/>
                scanlines + glitch effects<br/>
                from your Whale Matrix<br/>
                project.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur border-t border-purple-500/30 px-8 py-4 z-20">
          <div className="flex items-center justify-between text-sm uppercase tracking-wider">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400">LIVE</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                <span className="text-cyan-400">SECURE</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                <span className="text-orange-400">THREAT: MODERATE</span>
              </div>
            </div>
            
            <div className="text-gray-500">
              {new Date().toLocaleTimeString()} | 12/26/2025
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
