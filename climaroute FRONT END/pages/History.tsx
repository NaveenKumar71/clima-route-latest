import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, AlertCircle, Loader, Calendar, Download, Filter, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { apiService, getCurrentUser } from '../services/apiservice';
import { useLanguage } from '../contexts/LanguageContext';
import { Card, Button, Select } from '../components/Layout';
import { useSettings } from '../contexts/SettingsContext';

export function History() {
  const { settings } = useSettings();
  const { t, language } = useLanguage();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredHistory, setFilteredHistory] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch data on mount - SECURE: Backend filtering by user
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user credentials for backend filtering
        const { email, role } = getCurrentUser();
        
        // Fetch history with user credentials - backend handles filtering
        const data = await apiService.getDeliveryHistory(email, role);
        const userHistory = Array.isArray(data) ? data : [];
        
        setHistory(userHistory);
        setFilteredHistory(userHistory);
      } catch (err) {
        console.error("Failed to load history", err);
        setHistory([]);
        setFilteredHistory([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...history];

    // Filter by status
    if (filterStatus !== 'All') {
      filtered = filtered.filter(h => h.status?.toLowerCase() === filterStatus.toLowerCase());
    }

    // Filter by search query (origin or destination)
    if (searchQuery) {
      filtered = filtered.filter(h => 
        h.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.destination?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    if (sortBy === 'date-desc') {
      filtered.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    } else if (sortBy === 'date-asc') {
      filtered.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
    } else if (sortBy === 'distance') {
      filtered.sort((a, b) => {
        const distA = parseFloat(a.distance) || 0;
        const distB = parseFloat(b.distance) || 0;
        return distB - distA;
      });
    }

    setFilteredHistory(filtered);
  }, [history, filterStatus, sortBy, searchQuery]);

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('completed') || s.includes(t('completed').toLowerCase())) return 'bg-green-100 text-green-700 border-green-200';
    if (s.includes('progress') || s.includes(t('in_progress').toLowerCase())) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (s.includes('cancelled') || s.includes(t('cancelled').toLowerCase())) return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getWeatherColor = (rainProb: number) => {
    if (rainProb >= 70) return 'bg-red-50 text-red-700 border-red-200';
    if (rainProb >= 40) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-green-50 text-green-700 border-green-200';
  };

  const getSafetyColor = (score: string) => {
    if (score?.toLowerCase().includes('safe')) return 'text-green-600';
    if (score?.toLowerCase().includes('warning')) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Calculate daily delivery counts for chart
  const calculateDailyStats = () => {
    const dailyMap: { [key: string]: number } = {};
    history.forEach(h => {
      const date = h.date || 'Unknown';
      if (h.status?.toLowerCase() === 'completed') {
        dailyMap[date] = (dailyMap[date] || 0) + 1;
      }
    });
    return Object.keys(dailyMap)
      .sort()
      .map(date => ({ date, count: dailyMap[date] }));
  };

  const dailyDeliveryData = calculateDailyStats();

  // Calculate statistics
  const totalTrips = history.length;
  const completedTrips = history.filter(h => h.status?.toLowerCase().includes('completed')).length;
  const totalDistanceKm = history.reduce((sum, h) => sum + (parseFloat(h.distance) || 0), 0);
  const totalDistance = settings.distanceUnit === 'km' ? totalDistanceKm : totalDistanceKm * 0.621371;
  const avgRainProb = history.length > 0 ? parseFloat((history.reduce((sum, h) => sum + (h.rainProbability || 0), 0) / history.length).toFixed(1)) : 0;

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      {/* HEADER (White Box with Black Text) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="text-blue-600"/> {t('history')}
        </h1>
        <p className="text-sm text-slate-500 mt-1">{t('view_delivery_records')}</p>
      </div>

      {/* Simple Table */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 p-12 flex flex-col items-center justify-center text-gray-400">
            <Loader size={32} className="animate-spin mb-4 text-blue-500" />
            <p>{t('loading_trip_records')}</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex-1 p-12 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-xl">
            <Calendar size={48} className="mb-4 opacity-30" />
            <p className="font-bold text-lg">{t('no_trips')}</p>
            <p className="text-sm mt-2">{t('start_delivery')}</p>
          </div>
        ) : (
          <div className="overflow-y-auto border border-gray-200 rounded-lg shadow-sm bg-white">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-800 text-white sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">{t('date')}</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">{t('start_time')}</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">{t('end_time')}</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">{t('source')}</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">{t('destination')}</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">{t('weather_conditions')}</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredHistory.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700">{row.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.startTime}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.endTime || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{row.origin}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{row.destination}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.weatherCondition || row.weather || t('sunny_weather')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(row.status)}`}>
                        {row.status === 'Completed' || row.status === t('completed') ? <CheckCircle size={12} /> : <Clock size={12} />}
                        {t(row.status?.toLowerCase().replace(/ /g, '_')) || row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}