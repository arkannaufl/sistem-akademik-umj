import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DocumentChartBarIcon,
  GroupIcon,
  UserIcon,
  CalenderIcon,
  TimeIcon,
  AlertIcon,
  CheckCircleIcon,
  ErrorIcon,
  InfoIcon,
  DocsIcon,
  TaskIcon,
  PieChartIcon,
  BoltIcon,
} from "../icons";
import api from "../utils/api";

// Interfaces
interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
  location: string;
  humidity: number;
  windSpeed: number;
}

interface DashboardStats {
  totalMataKuliah: number;
  totalKelas: number;
  totalRuangan: number;
  totalDosen: number;
  totalMahasiswa: number;
  totalJadwalAktif: number;
  attendanceStats: AttendanceStats;
  assessmentStats: AssessmentStats;
  todaySchedule: TodayScheduleItem[];
  recentActivities: Activity[];
  academicNotifications: AcademicNotification[];
  academicOverview: AcademicOverview;
  scheduleStats: ScheduleStats;
  lowAttendanceAlerts: LowAttendanceAlert[];
}

interface AttendanceStats {
  overall_rate: number;
  pbl_rate: number;
  journal_rate: number;
  csr_rate: number;
  total_students: number;
  total_sessions: number;
  attended_sessions: number;
}

interface AssessmentStats {
  total_pbl_assessments: number;
  total_journal_assessments: number;
  pending_pbl: number;
  pending_journal: number;
  completion_rate: number;
  average_score: number;
  total_assessments: number;
  completed_assessments: number;
}

interface TodayScheduleItem {
  type: string;
  mata_kuliah: string;
  dosen: string;
  ruangan: string;
  waktu: string;
  topik: string;
}

interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  type: 'create' | 'update' | 'delete' | 'login' | 'export';
}

interface AcademicNotification {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  action: string;
}

interface AcademicOverview {
  current_semester: string;
  current_tahun_ajaran: string;
  semester_progress: number;
  active_blocks: string[];
  upcoming_deadlines: Array<{
    title: string;
    date: string;
  }>;
}

interface ScheduleStats {
  kuliah_besar: number;
  pbl: number;
  jurnal_reading: number;
  csr: number;
  non_blok_non_csr: number;
  praktikum: number;
  agenda_khusus: number;
}

interface LowAttendanceAlert {
  student_nim: string;
  student_name: string;
  attendance_rate: number;
  type: string;
}

const DashboardTimAkademik: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [activeAttendanceSemester, setActiveAttendanceSemester] = useState<'reguler' | 'antara'>('reguler');
  const [activeAssessmentSemester, setActiveAssessmentSemester] = useState<'reguler' | 'antara'>('reguler');
  const [activeScheduleSemester, setActiveScheduleSemester] = useState<'reguler' | 'antara'>('reguler');
  const [stats, setStats] = useState<DashboardStats>({
    totalMataKuliah: 0,
    totalKelas: 0,
    totalRuangan: 0,
    totalDosen: 0,
    totalMahasiswa: 0,
    totalJadwalAktif: 0,
    attendanceStats: {
      overall_rate: 0,
      pbl_rate: 0,
      journal_rate: 0,
      csr_rate: 0,
      total_students: 0,
      total_sessions: 0,
      attended_sessions: 0
    },
    assessmentStats: {
      total_pbl_assessments: 0,
      total_journal_assessments: 0,
      pending_pbl: 0,
      pending_journal: 0,
      completion_rate: 0,
      average_score: 0,
      total_assessments: 0,
      completed_assessments: 0
    },
    todaySchedule: [],
    recentActivities: [],
    academicNotifications: [],
    academicOverview: {
      current_semester: '',
      current_tahun_ajaran: '',
      semester_progress: 0,
      active_blocks: [],
      upcoming_deadlines: []
    },
    scheduleStats: {
      kuliah_besar: 0,
      pbl: 0,
      jurnal_reading: 0,
      csr: 0,
      non_blok_non_csr: 0,
      praktikum: 0,
      agenda_khusus: 0
    },
    lowAttendanceAlerts: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Update time every second for real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Cache untuk menyimpan data yang sudah pernah di-fetch
  const [dataCache, setDataCache] = useState<{[key: string]: any}>({});
  const [isTabLoading, setIsTabLoading] = useState(false);

  // Fetch dashboard data
  const fetchDashboardData = async (attendanceSemester: 'reguler' | 'antara' = 'reguler', assessmentSemester: 'reguler' | 'antara' = 'reguler', scheduleSemester: 'reguler' | 'antara' = 'reguler', isInitialLoad = false) => {
    const cacheKey = `${attendanceSemester}-${assessmentSemester}-${scheduleSemester}`;
    
    // Jika data sudah ada di cache dan bukan initial load, gunakan cache
    if (dataCache[cacheKey] && !isInitialLoad) {
      setStats(dataCache[cacheKey]);
      return;
    }

    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setIsTabLoading(true);
      }
      
      const response = await api.get(`/dashboard-tim-akademik?attendance_semester=${attendanceSemester}&assessment_semester=${assessmentSemester}&schedule_semester=${scheduleSemester}`);
      
      // Simpan ke cache
      setDataCache(prev => ({
        ...prev,
        [cacheKey]: response.data
      }));
      
      setStats(response.data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal memuat data dashboard');
      console.error('Error fetching dashboard data:', err);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setIsTabLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchDashboardData('reguler', 'reguler', 'reguler', true);
    fetchWeatherData();
  }, []);

  // Refetch data when semester tabs change
  useEffect(() => {
    fetchDashboardData(activeAttendanceSemester, activeAssessmentSemester, activeScheduleSemester, false);
  }, [activeAttendanceSemester, activeAssessmentSemester, activeScheduleSemester]);

  // Get user's location and fetch weather
  const fetchWeatherData = async () => {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            // Try to get weather data from multiple sources
            
            // Option 1: Try a free weather API without API key
            try {
              const response = await fetch(
                `https://wttr.in/${latitude},${longitude}?format=j1`
              );
              
              if (response.ok) {
                const data = await response.json();
                const current = data.current_condition[0];
                const location = data.nearest_area[0];
                
                setWeather({
                  temperature: Math.round(parseInt(current.temp_C)),
                  description: current.weatherDesc[0].value.toLowerCase(),
                  icon: getWeatherIcon(current.weatherCode),
                  location: `${location.areaName[0].value}, ${location.country[0].value}`,
                  humidity: parseInt(current.humidity),
                  windSpeed: parseFloat(current.windspeedKmph) / 3.6 // Convert to m/s
                });
                setWeatherLoading(false);
                return;
              }
            } catch (error) {
              console.log('wttr.in failed');
            }

            // Option 2: Try OpenWeatherMap with environment variable API key
            const API_KEY = process.env.REACT_APP_WEATHER_API_KEY || 'demo_key';
            if (API_KEY !== 'demo_key') {
              try {
                const response = await fetch(
                  `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=id`
                );
                
                if (response.ok) {
                  const data = await response.json();
                  setWeather({
                    temperature: Math.round(data.main.temp),
                    description: data.weather[0].description,
                    icon: data.weather[0].icon,
                    location: `${data.name}, ${data.sys.country}`,
                    humidity: data.main.humidity,
                    windSpeed: data.wind.speed
                  });
                  setWeatherLoading(false);
                  return;
                }
              } catch (error) {
                console.log('OpenWeatherMap failed');
              }
            }

            // Option 3: Use location-based fallback data
            const locationWeather = getLocationBasedWeather(latitude, longitude);
            setWeather(locationWeather);
            setWeatherLoading(false);
          },
          () => {
            // Location permission denied - use default Jakarta location
            console.warn('Location permission denied - using default location');
            const defaultWeather = getLocationBasedWeather(-6.2088, 106.8456); // Jakarta coordinates
            setWeather(defaultWeather);
            setWeatherLoading(false);
          }
        );
      } else {
        // Geolocation not supported - use default Jakarta location
        console.warn('Geolocation not supported - using default location');
        const defaultWeather = getLocationBasedWeather(-6.2088, 106.8456); // Jakarta coordinates
        setWeather(defaultWeather);
        setWeatherLoading(false);
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
      // Use default Jakarta location as fallback
      const defaultWeather = getLocationBasedWeather(-6.2088, 106.8456);
      setWeather(defaultWeather);
      setWeatherLoading(false);
    }
  };

  // Auto-clear success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Helper functions
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'create': return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'update': return <DocsIcon className="w-4 h-4 text-blue-500" />;
      case 'delete': return <ErrorIcon className="w-4 h-4 text-red-500" />;
      case 'login': return <GroupIcon className="w-4 h-4 text-purple-500" />;
      case 'export': return <DocsIcon className="w-4 h-4 text-orange-500" />;
      default: return <InfoIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertIcon className="w-5 h-5 text-yellow-500" />;
      case 'error': return <ErrorIcon className="w-5 h-5 text-red-500" />;
      case 'info': return <InfoIcon className="w-5 h-5 text-blue-500" />;
      default: return <BoltIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'info': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAssessmentColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Helper function to convert weather code to icon
  const getWeatherIcon = (weatherCode: string): string => {
    const code = parseInt(weatherCode);
    
    // wttr.in weather codes to emoji mapping
    if (code >= 200 && code < 300) return '11d'; // thunderstorm
    if (code >= 300 && code < 400) return '09d'; // drizzle
    if (code >= 500 && code < 600) return '10d'; // rain
    if (code >= 600 && code < 700) return '13d'; // snow
    if (code >= 700 && code < 800) return '50d'; // atmosphere (mist, fog, etc)
    if (code === 800) return '01d'; // clear sky
    if (code === 801) return '02d'; // few clouds
    if (code === 802) return '03d'; // scattered clouds
    if (code === 803 || code === 804) return '04d'; // broken/overcast clouds
    
    // Additional specific codes
    const codeMap: { [key: string]: string } = {
      '113': '01d', // clear
      '116': '02d', // partly cloudy
      '119': '04d', // overcast
      '122': '04d', // overcast
      '143': '50d', // mist
      '176': '10d', // patchy rain possible
      '179': '13d', // patchy snow possible
      '182': '13d', // patchy sleet possible
      '185': '13d', // patchy freezing drizzle possible
      '200': '11d', // thundery outbreaks possible
      '227': '13d', // blowing snow
      '230': '13d', // blizzard
      '248': '50d', // fog
      '260': '50d', // freezing fog
      '263': '09d', // patchy light drizzle
      '266': '09d', // light drizzle
      '281': '13d', // freezing drizzle
      '284': '13d', // heavy freezing drizzle
      '293': '10d', // patchy light rain
      '296': '10d', // light rain
      '299': '10d', // moderate rain at times
      '302': '10d', // moderate rain
      '305': '10d', // heavy rain at times
      '308': '10d', // heavy rain
      '311': '13d', // light freezing rain
      '314': '13d', // moderate or heavy freezing rain
      '317': '13d', // light sleet
      '320': '13d', // moderate or heavy sleet
      '323': '13d', // patchy light snow
      '326': '13d', // light snow
      '329': '13d', // patchy moderate snow
      '332': '13d', // moderate snow
      '335': '13d', // patchy heavy snow
      '338': '13d', // heavy snow
      '350': '13d', // ice pellets
      '353': '10d', // light rain shower
      '356': '10d', // moderate or heavy rain shower
      '359': '10d', // torrential rain shower
      '362': '13d', // light sleet showers
      '365': '13d', // moderate or heavy sleet showers
      '368': '13d', // light snow showers
      '371': '13d', // moderate or heavy snow showers
      '374': '13d', // light showers of ice pellets
      '377': '13d', // moderate or heavy showers of ice pellets
      '386': '11d', // patchy light rain with thunder
      '389': '11d', // moderate or heavy rain with thunder
      '392': '11d', // patchy light snow with thunder
      '395': '11d', // moderate or heavy snow with thunder
    };
    
    return codeMap[weatherCode] || '01d';
  };

  // Location-based weather fallback
  const getLocationBasedWeather = (lat: number, _lng: number): WeatherData => {
    // Simple logic based on latitude for temperature estimation
    let baseTemp = 30; // Default tropical temperature
    
    // Adjust based on latitude (rough estimation)
    if (Math.abs(lat) > 60) baseTemp = 5; // Arctic/Antarctic
    else if (Math.abs(lat) > 45) baseTemp = 15; // Temperate
    else if (Math.abs(lat) > 30) baseTemp = 25; // Subtropical
    else if (Math.abs(lat) > 15) baseTemp = 30; // Tropical
    
    // Adjust based on longitude for time of day (rough estimation)
    const hour = new Date().getHours();
    const timeAdjustment = Math.sin((hour - 6) * Math.PI / 12) * 5; // ±5°C variation
    const finalTemp = Math.round(baseTemp + timeAdjustment);
    
    // Determine weather based on location and time
    let description = 'cerah';
    let icon = '01d';
    
    if (Math.abs(lat) < 10) { // Tropical region
      if (hour >= 6 && hour <= 18) {
        description = 'cerah';
        icon = '01d';
      } else {
        description = 'berawan';
        icon = '02n';
      }
    } else if (Math.abs(lat) < 30) { // Subtropical
      description = 'berawan';
      icon = '03d';
    } else { // Temperate
      description = 'mendung';
      icon = '04d';
    }
    
    return {
      temperature: finalTemp,
      description,
      icon,
      location: 'Jakarta, Indonesia',
      humidity: 70,
      windSpeed: 2.5
    };
  };

  // Weather icon component
  const WeatherIcon = ({ iconCode }: { iconCode: string }) => {
    const iconMap: { [key: string]: string } = {
      '01d': '☀️', '01n': '🌙',
      '02d': '⛅', '02n': '☁️',
      '03d': '☁️', '03n': '☁️',
      '04d': '☁️', '04n': '☁️',
      '09d': '🌦️', '09n': '🌧️',
      '10d': '🌧️', '10n': '🌧️',
      '11d': '⛈️', '11n': '⛈️',
      '13d': '❄️', '13n': '❄️',
      '50d': '🌫️', '50n': '🌫️'
    };
    
    return <span className="text-lg">{iconMap[iconCode] || '☀️'}</span>;
  };

  // Loading skeleton
  const SkeletonCard = ({ className = "", children }: { className?: string; children?: React.ReactNode }) => (
    <div className={`rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 ${className}`}>
      {children}
    </div>
  );

  const SkeletonLine = ({ width = "w-full", height = "h-4" }: { width?: string; height?: string }) => (
    <div className={`${width} ${height} bg-gray-200 dark:bg-gray-700 rounded animate-pulse`}></div>
  );

  const SkeletonCircle = ({ size = "w-12 h-12" }: { size?: string }) => (
    <div className={`${size} bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse`}></div>
  );

  if (loading) {
    return (
      <>
        <style>{`
          @keyframes progressFill {
            from { width: 0%; }
            to { width: 100%; }
          }
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          .notification-enter {
            animation: slideInRight 0.5s ease-out forwards;
          }
        `}</style>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="grid grid-cols-12 gap-4 md:gap-6 p-4 md:p-6">
            {/* Header Skeleton */}
            <div className="col-span-12 mb-6">
              <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <SkeletonLine width="w-64" height="h-8" />
                    <div className="mt-2">
                      <SkeletonLine width="w-96" height="h-4" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4 sm:mt-0">
                    <SkeletonLine width="w-24" height="h-6" />
                    <SkeletonLine width="w-16" height="h-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Stats Cards Skeleton */}
            <div className="col-span-12">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 md:gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <SkeletonCard key={i}>
                    <div className="flex items-center justify-between mb-4">
                      <SkeletonCircle />
                      <SkeletonLine width="w-16" height="h-6" />
                    </div>
                    <SkeletonLine width="w-20" height="h-4" />
                    <SkeletonLine width="w-16" height="h-8" />
                  </SkeletonCard>
                ))}
              </div>
            </div>

            {/* Analytics Cards Skeleton */}
            <div className="col-span-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                {[1, 2, 3].map((i) => (
                  <SkeletonCard key={i}>
                    <div className="flex items-center justify-between mb-6">
                      <SkeletonLine width="w-32" height="h-6" />
                      <SkeletonLine width="w-16" height="h-6" />
                    </div>
                    <div className="space-y-4">
                      {[1, 2, 3].map((j) => (
                        <div key={j}>
                          <div className="flex justify-between mb-2">
                            <SkeletonLine width="w-20" height="h-4" />
                            <SkeletonLine width="w-12" height="h-4" />
                          </div>
                          <SkeletonLine width="w-full" height="h-2" />
                        </div>
                      ))}
                    </div>
                  </SkeletonCard>
                ))}
              </div>
            </div>

            {/* Bottom Cards Skeleton */}
            <div className="col-span-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {[1, 2].map((i) => (
                  <SkeletonCard key={i}>
                    <SkeletonLine width="w-40" height="h-6" />
                    <div className="mt-4 space-y-3">
                      {[1, 2, 3, 4].map((j) => (
                        <div key={j} className="flex items-center space-x-3">
                          <SkeletonCircle size="w-8 h-8" />
                          <div className="flex-1">
                            <SkeletonLine width="w-3/4" height="h-4" />
                            <SkeletonLine width="w-1/2" height="h-3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </SkeletonCard>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ErrorIcon className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => fetchDashboardData(activeAttendanceSemester, activeAssessmentSemester, activeScheduleSemester, true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes progressFill {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .notification-enter {
          animation: slideInRight 0.5s ease-out forwards;
        }
      `}</style>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-12 gap-4 md:gap-6 p-4 md:p-6">
          {/* Page Header */}
          <div className="col-span-12 mb-6">
            <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <DocsIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Dashboard Tim Akademik
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Sistem Akademik Universitas Muhammadiyah Jakarta
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-0">
                  {/* Left side - Status */}
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                      System Online
                    </span>
                  </div>



                  {/* Right side - Time & Academic Info */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Real-time Clock */}
                    <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                      <TimeIcon className="w-3 h-3 mr-2" />
                      {formatTime(currentTime)}
                    </span>

                    {/* Weather & Location Combined */}
                    {weatherLoading ? (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
                        <div className="w-3 h-3 animate-spin rounded-full border border-gray-400 border-t-transparent mr-2"></div>
                        Loading weather...
                      </span>
                    ) : weather ? (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
                        <WeatherIcon iconCode={weather.icon} />
                        <span className="ml-1 mr-2">{weather.temperature}°C</span>
                        <span className="capitalize mr-2">{weather.description}</span>
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {weather.location}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                        <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        Weather unavailable
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Success Messages */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="col-span-12"
              >
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                        Berhasil
                      </h3>
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1 whitespace-pre-line">
                        {success}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Stats Cards */}
          <div className="col-span-12">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 md:gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-white/[0.03] rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
                    <DocsIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Mata Kuliah</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalMataKuliah}</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-white/[0.03] rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-2xl flex items-center justify-center">
                    <GroupIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Mahasiswa</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalMahasiswa}</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-white/[0.03] rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Dosen</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalDosen}</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white dark:bg-white/[0.03] rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center">
                    <CalenderIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Aktif</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Jadwal</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalJadwalAktif}</p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Analytics Cards */}
          <div className="col-span-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {/* Attendance Statistics */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="group bg-white dark:bg-white/[0.03] rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-md transition-all duration-300"
              >
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl flex items-center justify-center">
                        <DocumentChartBarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Statistik Kehadiran</h3>
                    </div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                  
                  {/* Semester Tabs - Improved Design */}
                  <div className="flex bg-gray-50 dark:bg-gray-800/50 rounded-xl p-1 relative">
                    {isTabLoading && (
                      <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 rounded-xl flex items-center justify-center z-10">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                    <button
                      onClick={() => setActiveAttendanceSemester('reguler')}
                      disabled={isTabLoading}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 ${
                        activeAttendanceSemester === 'reguler'
                          ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      Reguler
                    </button>
                    <button
                      onClick={() => setActiveAttendanceSemester('antara')}
                      disabled={isTabLoading}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 ${
                        activeAttendanceSemester === 'antara'
                          ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      Antara
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-all duration-300 hover:scale-[1.02]">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Keseluruhan</span>
                      <span className={`font-bold text-lg ${getAttendanceColor(stats.attendanceStats.overall_rate)}`}>
                        {stats.attendanceStats.overall_rate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          stats.attendanceStats.overall_rate >= 80 ? 'bg-green-500' :
                          stats.attendanceStats.overall_rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(stats.attendanceStats.overall_rate, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-all duration-300 hover:scale-[1.02]">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">PBL</span>
                      <span className={`font-bold text-lg ${getAttendanceColor(stats.attendanceStats.pbl_rate)}`}>
                        {stats.attendanceStats.pbl_rate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          stats.attendanceStats.pbl_rate >= 80 ? 'bg-green-500' :
                          stats.attendanceStats.pbl_rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(stats.attendanceStats.pbl_rate, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-all duration-300 hover:scale-[1.02]">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Journal Reading</span>
                      <span className={`font-bold text-lg ${getAttendanceColor(stats.attendanceStats.journal_rate)}`}>
                        {stats.attendanceStats.journal_rate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          stats.attendanceStats.journal_rate >= 80 ? 'bg-green-500' :
                          stats.attendanceStats.journal_rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(stats.attendanceStats.journal_rate, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-all duration-300 hover:scale-[1.02]">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">CSR</span>
                      <span className={`font-bold text-lg ${getAttendanceColor(stats.attendanceStats.csr_rate)}`}>
                        {stats.attendanceStats.csr_rate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          stats.attendanceStats.csr_rate >= 80 ? 'bg-green-500' :
                          stats.attendanceStats.csr_rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(stats.attendanceStats.csr_rate, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Assessment Statistics */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="group bg-white dark:bg-white/[0.03] rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-md transition-all duration-300"
              >
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/20 dark:to-green-800/20 rounded-xl flex items-center justify-center">
                        <TaskIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Statistik Penilaian</h3>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  
                  {/* Semester Tabs - Improved Design */}
                  <div className="flex bg-gray-50 dark:bg-gray-800/50 rounded-xl p-1 relative">
                    {isTabLoading && (
                      <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 rounded-xl flex items-center justify-center z-10">
                        <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                    <button
                      onClick={() => setActiveAssessmentSemester('reguler')}
                      disabled={isTabLoading}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 ${
                        activeAssessmentSemester === 'reguler'
                          ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      Reguler
                    </button>
                    <button
                      onClick={() => setActiveAssessmentSemester('antara')}
                      disabled={isTabLoading}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 ${
                        activeAssessmentSemester === 'antara'
                          ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      Antara
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-all duration-300 hover:scale-[1.02]">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Penyelesaian</span>
                      <span className={`font-bold text-lg ${getAssessmentColor(stats.assessmentStats.completion_rate)}`}>
                        {stats.assessmentStats.completion_rate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          stats.assessmentStats.completion_rate >= 80 ? 'bg-green-500' :
                          stats.assessmentStats.completion_rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(stats.assessmentStats.completion_rate, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-all duration-300 hover:scale-[1.02]">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Nilai Rata-rata</span>
                      <span className="font-bold text-lg text-gray-900 dark:text-white">
                        {stats.assessmentStats.average_score.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          stats.assessmentStats.average_score >= 3.0 ? 'bg-green-500' :
                          stats.assessmentStats.average_score >= 2.0 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min((stats.assessmentStats.average_score / 4.0) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg transition-all duration-300 hover:scale-[1.02] border border-orange-200 dark:border-orange-800">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-orange-700 dark:text-orange-300">PBL Tertunda</span>
                      <span className="font-bold text-lg text-orange-600 dark:text-orange-400">
                        {stats.assessmentStats.pending_pbl}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg transition-all duration-300 hover:scale-[1.02] border border-orange-200 dark:border-orange-800">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Journal Tertunda</span>
                      <span className="font-bold text-lg text-orange-600 dark:text-orange-400">
                        {stats.assessmentStats.pending_journal}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Schedule Statistics */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="group bg-white dark:bg-white/[0.03] rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-md transition-all duration-300"
              >
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl flex items-center justify-center">
                        <CalenderIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Statistik Jadwal</h3>
                    </div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  </div>
                  
                  {/* Semester Tabs - Improved Design */}
                  <div className="flex bg-gray-50 dark:bg-gray-800/50 rounded-xl p-1 relative">
                    {isTabLoading && (
                      <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 rounded-xl flex items-center justify-center z-10">
                        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                    <button
                      onClick={() => setActiveScheduleSemester('reguler')}
                      disabled={isTabLoading}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 ${
                        activeScheduleSemester === 'reguler'
                          ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      Reguler
                    </button>
                    <button
                      onClick={() => setActiveScheduleSemester('antara')}
                      disabled={isTabLoading}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 ${
                        activeScheduleSemester === 'antara'
                          ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      Antara
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-all duration-300 hover:scale-[1.02]">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Kuliah Besar</span>
                      <span className="font-bold text-lg text-gray-900 dark:text-white">{stats.scheduleStats.kuliah_besar}</span>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-all duration-300 hover:scale-[1.02]">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">PBL</span>
                      <span className="font-bold text-lg text-gray-900 dark:text-white">{stats.scheduleStats.pbl}</span>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-all duration-300 hover:scale-[1.02]">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Journal Reading</span>
                      <span className="font-bold text-lg text-gray-900 dark:text-white">{stats.scheduleStats.jurnal_reading}</span>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-all duration-300 hover:scale-[1.02]">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">CSR</span>
                      <span className="font-bold text-lg text-gray-900 dark:text-white">{stats.scheduleStats.csr}</span>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-all duration-300 hover:scale-[1.02]">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Praktikum</span>
                      <span className="font-bold text-lg text-gray-900 dark:text-white">{stats.scheduleStats.praktikum}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Notifications and Alerts */}
          <div className="col-span-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* Academic Notifications */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-white dark:bg-white/[0.03] rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifikasi Akademik</h3>
                  <BoltIcon className="w-5 h-5 text-gray-400" />
                </div>
                
                <div className="space-y-3">
                  {stats.academicNotifications.length > 0 ? (
                    stats.academicNotifications.slice(0, 4).map((notification, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${getNotificationColor(notification.type)}`}
                      >
                        <div className="flex items-start">
                          {getNotificationIcon(notification.type)}
                          <div className="ml-2 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{notification.message}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Tidak ada notifikasi</p>
                  )}
                </div>
              </motion.div>

              {/* Low Attendance Alerts */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="bg-white dark:bg-white/[0.03] rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Peringatan Kehadiran</h3>
                  <AlertIcon className="w-5 h-5 text-gray-400" />
                </div>
                
                <div className="space-y-3">
                  {stats.lowAttendanceAlerts.length > 0 ? (
                    stats.lowAttendanceAlerts.slice(0, 4).map((alert, index) => (
                      <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{alert.student_name}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{alert.student_nim}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-red-600">{alert.attendance_rate}%</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{alert.type}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Tidak ada peringatan</p>
                  )}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Bottom Cards */}
          <div className="col-span-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* Today's Schedule */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
                className="group bg-white dark:bg-white/[0.03] rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl flex items-center justify-center">
                      <TimeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Jadwal Hari Ini</h3>
                  </div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
                
                <div className="space-y-3">
                  {stats.todaySchedule.length > 0 ? (
                    stats.todaySchedule.map((schedule, index) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-all duration-300 hover:scale-[1.02]">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{schedule.mata_kuliah}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{schedule.type}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">{schedule.dosen}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{schedule.waktu}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">{schedule.ruangan}</p>
                          </div>
                        </div>
                        {schedule.topik && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">{schedule.topik}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                        <TimeIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Tidak ada jadwal hari ini</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Recent Activities */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="group bg-white dark:bg-white/[0.03] rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/20 dark:to-green-800/20 rounded-xl flex items-center justify-center">
                      <DocsIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Aktivitas Terbaru</h3>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
                
                <div className="space-y-3">
                  {stats.recentActivities.length > 0 ? (
                    stats.recentActivities.slice(0, 6).map((activity, index) => (
                      <div key={index} className="flex items-start space-x-3 p-2 rounded-lg transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        {getActivityIcon(activity.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-white">
                            <span className="font-medium">{activity.user}</span> {activity.action} {activity.target}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{activity.timestamp}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                        <DocsIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Tidak ada aktivitas terbaru</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>

                {/* Academic Overview */}
          <div className="col-span-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="group bg-white dark:bg-white/[0.03] rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl flex items-center justify-center">
                    <PieChartIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ringkasan Akademik</h3>
                </div>
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Progress Semester</h4>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${stats.academicOverview.semester_progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stats.academicOverview.semester_progress}% selesai</p>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Blok Aktif</h4>
                  <div className="flex flex-wrap gap-2">
                    {stats.academicOverview.active_blocks.map((block, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 text-blue-800 dark:text-blue-400 text-xs rounded-full font-medium"
                      >
                        Blok {block}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Deadline Mendatang</h4>
                  <div className="space-y-2">
                    {stats.academicOverview.upcoming_deadlines.slice(0, 3).map((deadline, index) => (
                      <div key={index} className="text-sm p-2 bg-white dark:bg-gray-700 rounded-lg">
                        <p className="text-gray-900 dark:text-white font-medium">{deadline.title}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">{new Date(deadline.date).toLocaleDateString('id-ID')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardTimAkademik;
