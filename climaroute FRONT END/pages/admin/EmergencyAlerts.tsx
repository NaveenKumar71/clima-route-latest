
import React, { useEffect, useState } from 'react';
import { Card } from '../../components/Layout';
import { AlertTriangle, MapPin, Clock, User, Truck, CheckCircle, HelpCircle, Timer } from 'lucide-react';
import { apiService } from '../../services/apiservice';


export default function EmergencyAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch both SOS and system (idle) alerts
  const loadData = async () => {
    try {
      const [sosAlerts, systemAlerts, usersData] = await Promise.all([
        apiService.getAlerts(),
        apiService.getNotifications(),
        apiService.getUsers()
      ]);

      // Filter system alerts for IDLE_ALERT only
      const idleAlerts = (systemAlerts || []).filter((a: any) => a.severity === 'IDLE_ALERT');

      // Normalize idle alerts to match SOS alert structure
      const normalizedIdleAlerts = idleAlerts.map((a: any) => ({
        id: a.id || a._id || a.timestamp || a.Timestamp || Math.random().toString(36).slice(2),
        vehicleId: a.vehicleId || a.VehicleId || (() => {
          // Try to find user's vehicleId from usersData
          const userObj = usersData?.find?.((u: any) => (u.email?.toLowerCase() === (a.userEmail || a.UserEmail || '').toLowerCase()));
          return userObj?.vehicleId || userObj?.VehicleId || 'Unknown';
        })(),
        driverEmail: a.userEmail || a.UserEmail || '',
        driverName: a.driverName || a.userName || a.userEmail || a.UserEmail || '',
        type: 'Idle Time Exceeded',
        // Try to use location if present, else fallback to 'GPS Inactive' for clarity
        location: a.location && a.location !== '-' ? a.location : 'GPS Inactive',
        isActive: true, // Always active until resolved (could add resolve logic if needed)
        createdAt: a.timestamp || a.Timestamp || a.createdAt,
        resolvedAt: null,
        // Format time for display (28 Dec 2025, 04:33 PM)
        time: (() => {
          const t = a.timestamp || a.Timestamp || a.createdAt;
          if (!t) return 'Unknown';
          try {
            const date = new Date(t);
            if (!isNaN(date.getTime())) {
              return date.toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              });
            }
          } catch {}
          return t;
        })(),
        isIdle: true,
        // Avoid duplicate description text
        description: a.description && a.description !== 'Driver stopped or idle time exceeded for more than 5 minutes.'
          ? a.description
          : 'Driver stopped or idle time exceeded for more than 5 minutes.',
      }));

      // Merge SOS and idle alerts
      const allAlerts = [
        ...(sosAlerts || []).map((a: any) => ({ ...a, isIdle: false })),
        ...normalizedIdleAlerts
      ];

      // Sort: Active alerts first, then by createdAt (most recent first)
      const sortedAlerts = allAlerts.sort((a: any, b: any) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setAlerts(sortedAlerts);
      setUsers(usersData || []);
    } catch (err) {
      console.error("Failed to load alerts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh alerts every 10 seconds
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);


  // Map driver email to name - prefer backend driverName, fallback to users lookup
  const getDriverName = (alert: any) => {
    if (alert.driverName && alert.driverName !== alert.driverEmail) {
      return alert.driverName;
    }
    if (!alert.driverEmail) return 'Unknown Driver';
    const user = users.find((u: any) => u.email?.toLowerCase() === alert.driverEmail?.toLowerCase());
    return user?.name || alert.driverEmail;
  };

  // Format time - handles both ISO strings and simple time strings
  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'Unknown';
    
    // Check if it's an ISO date string
    if (timeStr.includes('T') || timeStr.includes('-')) {
      try {
        const date = new Date(timeStr);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
        }
      } catch {
        return timeStr;
      }
    }
    
    // Return as-is if it's already formatted (like "14:30")
    return timeStr;
  };

  // Resolve/Close an alert
  const handleResolveAlert = async (alertId: number) => {
    if (!window.confirm('Mark this alert as resolved?')) return;
    try {
      await apiService.resolveAlert(alertId);
      loadData(); // Refresh the list
    } catch (err) {
      console.error('Failed to resolve alert', err);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Active SOS & Idle Time Alerts</h2>
      {loading ? (
        <div className="text-center text-gray-500">Scanning for signals...</div>
      ) : (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <Card className="text-center text-green-600 font-medium">No active emergencies reported.</Card>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id + (alert.isIdle ? '_idle' : '')} className={`border-l-4 p-6 rounded-lg shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 ${
                alert.isActive ? (alert.isIdle ? 'bg-orange-50 border-orange-500' : 'bg-red-50 border-red-500') : 'bg-gray-50 border-gray-300'
              }`}>
                {/* Left: Icon & Fleet ID */}
                <div className="flex items-center gap-4 min-w-[200px]">
                  <div className={`p-3 rounded-full ${alert.isActive ? (alert.isIdle ? 'bg-orange-100 text-orange-600 animate-pulse' : 'bg-red-100 text-red-600 animate-pulse') : 'bg-gray-200 text-gray-600'}`}>
                    {alert.isIdle ? <Timer size={28} /> : <AlertTriangle size={28} />}
                  </div>
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${alert.isActive ? (alert.isIdle ? 'text-orange-600' : 'text-red-600') : 'text-gray-600'}`}>Fleet ID</p>
                    <h3 className="text-xl font-bold text-gray-900">#{alert.vehicleId}</h3>
                  </div>
                </div>

                {/* Middle: Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1 w-full">
                  <div>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><User size={12}/> Driver Name</p>
                    <p className="font-semibold text-gray-800">{getDriverName(alert)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><MapPin size={12}/> Location</p>
                    <p className="font-semibold text-gray-800">{alert.location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">{alert.isIdle ? <Timer size={12}/> : <Truck size={12}/>} {alert.isIdle ? 'Alert Type' : 'SOS Type'}</p>
                    <p className={`font-semibold ${alert.isActive ? (alert.isIdle ? 'text-orange-600' : 'text-red-600') : 'text-gray-600'}`}>{alert.type}
                      {alert.isIdle && (
                        <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-bold">Idle Time</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Clock size={12}/> Time</p>
                    <p className="font-semibold text-gray-800">{alert.time || formatTime(alert.createdAt)}</p>
                  </div>
                </div>

                {/* Resolve Button (only for SOS, not for idle alerts) */}
                {!alert.isIdle && alert.isActive ? (
                  <button
                    onClick={() => handleResolveAlert(alert.id)}
                    className="px-4 py-2 bg-yellow-100 text-yellow-700 border border-yellow-300 rounded-lg font-bold text-sm hover:bg-yellow-200 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <HelpCircle size={16} /> Resolve?
                  </button>
                ) : !alert.isIdle && (
                  <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-bold text-sm flex items-center gap-2">
                    <CheckCircle size={16} /> Resolved
                  </div>
                )}
                {/* For idle alerts, show description if available */}
                {alert.isIdle && alert.description && (
                  <div className="mt-2 text-xs text-orange-700 font-medium max-w-md">{alert.description}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}