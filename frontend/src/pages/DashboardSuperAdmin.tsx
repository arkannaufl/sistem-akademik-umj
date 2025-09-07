import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  exportToExcel, 
  exportToPDF, 
  generateAttendanceReport, 
  generateAssessmentReport, 
  generateAcademicReport 
} from '../utils/exportUtils';
import api, { BASE_URL } from '../utils/api';

interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
  location: string;
  humidity: number;
  windSpeed: number;
}

// Add new interfaces for system monitoring
interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    threads: number;
    temperature: number;
    frequency: number;
  };
  memory: {
    total: number;
    used: number;
    available: number;
    usage: number;
  };
  storage: {
    total: number;
    used: number;
    available: number;
    usage: number;
  };
  network: {
    upload: number;
    download: number;
    connections: number;
  };
  // Academic-specific metrics
  database: {
    responseTime: number;
    connections: number;
    size: number;
    lastBackup: string;
  };
  application: {
    activeUsers: number;
    activeStudents: number;
    activeLecturers: number;
    apiResponseTime: number;
    errorRate: number;
  };
  security: {
    failedLogins: number;
    sslStatus: 'valid' | 'expired' | 'invalid';
    firewallStatus: 'active' | 'inactive';
    lastSecurityScan: string;
  };
}

interface ChartDataPoint {
  timestamp: number;
  value: number;
}

interface SystemChartData {
  cpu: ChartDataPoint[];
  memory: ChartDataPoint[];
  storage: ChartDataPoint[];
  network: ChartDataPoint[];
  database: ChartDataPoint[];
  application: ChartDataPoint[];
  security: ChartDataPoint[];
}

interface DashboardStats {
  totalUsers: number;
  totalMahasiswa: number;
  totalDosen: number;
  totalTimAkademik: number;
  totalMataKuliah: number;
  totalKelas: number;
  totalRuangan: number;
  totalJadwalAktif: number;
  recentActivities: Activity[];
  systemHealth: SystemHealth;
  attendanceStats: SemesterAttendanceStats;
  todaySchedule: TodayScheduleItem[];
  assessmentStats: AssessmentStats;
  systemNotifications: SystemNotification[];
  academicOverview: AcademicOverview;
  // Growth percentages
  usersGrowth?: number;
  mahasiswaGrowth?: number;
  dosenGrowth?: number;
  mataKuliahGrowth?: number;
}

interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  type: 'create' | 'update' | 'delete' | 'login' | 'export';
}

interface SystemHealth {
  database: 'healthy' | 'warning' | 'error';
  storage: 'healthy' | 'warning' | 'error';
  server: 'healthy' | 'warning' | 'error';
  lastBackup: string;
}

interface AttendanceStats {
  overall_rate: number;
  pbl_rate: number;
  journal_rate: number;
  csr_rate: number;
  total_students: number;
  low_attendance_students: number;
}

interface SemesterAttendanceStats {
  regular: AttendanceStats;
  antara: AttendanceStats;
}

interface TodayScheduleItem {
  type: string;
  mata_kuliah: string;
  dosen: string;
  ruangan: string;
  waktu: string;
  topik: string;
}

interface AssessmentStats {
  total_pbl_assessments: number;
  total_journal_assessments: number;
  pending_pbl: number;
  pending_journal: number;
  completion_rate: number;
  average_score: number;
}

interface SystemNotification {
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

const DashboardSuperAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  
  // Get current user data
  const [user, setUser] = useState<any>(() => {
    return JSON.parse(localStorage.getItem("user") || "{}");
  });

  // Update user data when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const newUser = JSON.parse(localStorage.getItem("user") || "{}");
      setUser(newUser);
    };

    // Listen for custom event
    window.addEventListener("user-updated", handleStorageChange);
    
    // Also listen for storage event (in case localStorage is modified directly)
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("user-updated", handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);
  
  // Modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedReportTypes, setSelectedReportTypes] = useState<string[]>([]);
  const [selectedExportFormats, setSelectedExportFormats] = useState<string[]>(['excel']);
  const [isExporting, setIsExporting] = useState(false);
  const [isBacking, setIsBacking] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Backup and Import states
  const [selectedBackupFile, setSelectedBackupFile] = useState<File | null>(null);
  const [backupType, setBackupType] = useState<string>('full');
  const [importProgress, setImportProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importTypeWarning, setImportTypeWarning] = useState<string | null>(null);
  
  // Reset states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmationText, setResetConfirmationText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  
  // System monitoring states
  const [activeTab, setActiveTab] = useState<'cpu' | 'memory' | 'storage' | 'network' | 'database' | 'application' | 'security'>('cpu');
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    cpu: { usage: 0, cores: 8, threads: 16, temperature: 45, frequency: 2.4 },
    memory: { total: 16, used: 8, available: 8, usage: 50 },
    storage: { total: 512, used: 256, available: 256, usage: 50 },
    network: { upload: 0, download: 0, connections: 0 },
    database: { responseTime: 0, connections: 0, size: 0, lastBackup: '' },
    application: { activeUsers: 0, activeStudents: 0, activeLecturers: 0, apiResponseTime: 0, errorRate: 0 },
    security: { failedLogins: 0, sslStatus: 'valid', firewallStatus: 'active', lastSecurityScan: '' }
  });
  const [chartData, setChartData] = useState<SystemChartData>({
    cpu: [],
    memory: [],
    storage: [],
    network: [],
    database: [],
    application: [],
    security: []
  });
  
  // Initialize chart data with some initial points
  useEffect(() => {
    const now = Date.now();
    const initialMetrics = generateSystemMetrics();
    
    const initialData: SystemChartData = {
      cpu: Array.from({ length: 10 }, (_, i) => ({
        timestamp: now - (10 - i) * 1000,
        value: initialMetrics.cpu.usage + Math.random() * 10 - 5
      })),
      memory: Array.from({ length: 10 }, (_, i) => ({
        timestamp: now - (10 - i) * 1000,
        value: initialMetrics.memory.usage + Math.random() * 10 - 5
      })),
      storage: Array.from({ length: 10 }, (_, i) => ({
        timestamp: now - (10 - i) * 1000,
        value: initialMetrics.storage.usage + Math.random() * 10 - 5
      })),
      network: Array.from({ length: 10 }, (_, i) => ({
        timestamp: now - (10 - i) * 1000,
        value: (initialMetrics.network.upload + initialMetrics.network.download) + Math.random() * 5
      })),
      database: Array.from({ length: 10 }, (_, i) => ({
        timestamp: now - (10 - i) * 1000,
        value: initialMetrics.database.responseTime + Math.random() * 20 - 10
      })),
      application: Array.from({ length: 10 }, (_, i) => ({
        timestamp: now - (10 - i) * 1000,
        value: initialMetrics.application.apiResponseTime + Math.random() * 30 - 15
      })),
      security: Array.from({ length: 10 }, (_, i) => ({
        timestamp: now - (10 - i) * 1000,
        value: initialMetrics.security.failedLogins + Math.random() * 2
      }))
    };
    
    setChartData(initialData);
  }, []); // Empty dependency array - only run once on mount
  const [isMonitoring, setIsMonitoring] = useState(false); // Start with monitoring stopped
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Attendance semester state
  // const [activeAttendanceSemester, setActiveAttendanceSemester] = useState<'regular' | 'antara'>('regular');
  
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalMahasiswa: 0,
    totalDosen: 0,
    totalTimAkademik: 0,
    totalMataKuliah: 0,
    totalKelas: 0,
    totalRuangan: 0,
    totalJadwalAktif: 0,
    recentActivities: [],
    systemHealth: {
      database: 'healthy',
      storage: 'healthy',
      server: 'healthy',
      lastBackup: ''
    },
    attendanceStats: {
      regular: {
      overall_rate: 0,
      pbl_rate: 0,
      journal_rate: 0,
      csr_rate: 0,
      total_students: 0,
      low_attendance_students: 0
      },
      antara: {
        overall_rate: 0,
        pbl_rate: 0,
        journal_rate: 0,
        csr_rate: 0,
        total_students: 0,
        low_attendance_students: 0
      }
    },
    todaySchedule: [],
    assessmentStats: {
      total_pbl_assessments: 0,
      total_journal_assessments: 0,
      pending_pbl: 0,
      pending_journal: 0,
      completion_rate: 0,
      average_score: 0
    },
    systemNotifications: [],
    academicOverview: {
      current_semester: '',
      current_tahun_ajaran: '',
      semester_progress: 0,
      active_blocks: [],
      upcoming_deadlines: []
    },
    // Initialize growth percentages
    usersGrowth: 0,
    mahasiswaGrowth: 0,
    dosenGrowth: 0,
    mataKuliahGrowth: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Helper function to format growth percentage
  const formatGrowthPercentage = (growth: number | undefined): { 
    value: string, 
    isPositive: boolean,
    colorClass: string 
  } => {
    if (growth === undefined || growth === null || isNaN(growth)) {
      return {
        value: '0%',
        isPositive: true,
        colorClass: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800'
      };
    }
    
    const isPositive = growth >= 0;
    const formattedValue = `${isPositive ? '+' : ''}${growth.toFixed(1)}%`;
    
    const colorClass = isPositive 
      ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
      : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
    
    return {
      value: formattedValue,
      isPositive,
      colorClass
    };
  };

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
              // wttr.in failed, trying alternative...
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
                // OpenWeatherMap failed
              }
            }

            // Option 3: Use location-based fallback data
            const locationWeather = getLocationBasedWeather(latitude, longitude);
            setWeather(locationWeather);
            setWeatherLoading(false);
          },
          () => {
            // Location permission denied - use default Jakarta location
            // Location permission denied - using default location
            const defaultWeather = getLocationBasedWeather(-6.2088, 106.8456); // Jakarta coordinates
            setWeather(defaultWeather);
            setWeatherLoading(false);
          }
        );
      } else {
        // Geolocation not supported - use default Jakarta location
        // Geolocation not supported - using default location
        const defaultWeather = getLocationBasedWeather(-6.2088, 106.8456); // Jakarta coordinates
        setWeather(defaultWeather);
        setWeatherLoading(false);
      }
    } catch (error) {
      // Use default Jakarta location as fallback
      const defaultWeather = getLocationBasedWeather(-6.2088, 106.8456);
      setWeather(defaultWeather);
      setWeatherLoading(false);
    }
  };

  // Quick Action Handlers
  const handleImportMahasiswa = () => {
    navigate('/mahasiswa');
  };

  const handleGenerateKelompok = () => {
    navigate('/generate/kelompok');
  };

  const handleExportReports = () => {
    setShowExportModal(true);
  };



  const handleConfirmExport = async () => {
    if (selectedReportTypes.length === 0) return;
    
    setIsExporting(true);
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Call API for each selected report type and format
      for (const reportType of selectedReportTypes) {
        const response = await fetch(`${BASE_URL}/api/reports/export/${reportType}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            format: 'json', // Always get JSON data from backend
            semester: '2023/2024' // Default semester
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to export ${reportType} report`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.message || `Export ${reportType} failed`);
        }

        // Transform data using export utilities
        let exportData;
        const config = {
          filename: `${reportType}_report_${currentDate}`,
          sheetName: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
          orientation: 'landscape' as const,
          includeSummary: true
        };

        if (reportType === 'attendance') {
          exportData = generateAttendanceReport(result.data);
        } else if (reportType === 'assessment') {
          exportData = generateAssessmentReport(result.data);
        } else if (reportType === 'academic') {
          exportData = generateAcademicReport(result.data);
        }

        if (exportData) {
          // Export to selected format (only 1 format can be selected)
          const selectedFormat = selectedExportFormats[0];
          if (selectedFormat === 'excel') {
            await exportToExcel(exportData, config);
          } else if (selectedFormat === 'pdf') {
            exportToPDF(exportData, config);
          } else if (selectedFormat === 'both') {
            // Export both Excel and PDF
            await exportToExcel(exportData, config);
            exportToPDF(exportData, config);
          }
        }
      }
      
      setSuccess(`Successfully exported ${selectedReportTypes.join(', ')} reports in ${selectedExportFormats[0]} format!`);
      setTimeout(() => setSuccess(null), 3000);
      
      setShowExportModal(false);
      setSelectedReportTypes([]);
      setSelectedExportFormats(['excel']);
    } catch (error) {
      setError('Export failed. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleBackupSystem = () => {
    setShowBackupModal(true);
  };

  const handleResetSystem = () => {
    setShowResetModal(true);
  };

  const handleConfirmReset = async () => {
    if (resetConfirmationText.toLowerCase() !== 'reset') {
      setError('Konfirmasi tidak valid. Ketik "reset" untuk melanjutkan.');
      return;
    }

    setIsResetting(true);
    try {
      const response = await fetch(`${BASE_URL}/api/system/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setShowResetModal(false);
        setResetConfirmationText('');
        setSuccess('Sistem berhasil di-reset! Semua data telah dihapus kecuali akun Super Admin.');
        // Refresh dashboard data
        fetchDashboardData();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Reset failed');
      }
    } catch (error: any) {
      setError(`Reset failed: ${error.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  // Helper functions for file type detection and warnings
  const detectFileBackupType = (filename: string): string | null => {
    const lowerName = filename.toLowerCase();
    if (lowerName.includes('data_only') || lowerName.includes('dataonly')) {
      return 'data_only';
    } else if (lowerName.includes('structure_only') || lowerName.includes('structureonly')) {
      return 'structure_only';
    } else if (lowerName.includes('full')) {
      return 'full';
    }
    return null;
  };

  const checkImportTypeCompatibility = (file: File, selectedType: string) => {
    const detectedType = detectFileBackupType(file.name);
    
    if (detectedType && detectedType !== selectedType) {
      const warnings = [];
      
      if (detectedType === 'data_only' && selectedType === 'full') {
        warnings.push(`🔄 File appears to be "Data Only" backup but "Full Restore" is selected`);
        warnings.push(`✅ System will auto-correct to "Data Only" import`);
      } else if (detectedType === 'full' && selectedType === 'data_only') {
        warnings.push(`🔄 File appears to be "Full" backup but "Data Only" is selected`);
        warnings.push(`✅ System will import data portion only as requested`);
      } else if (detectedType === 'structure_only') {
        warnings.push(`🔄 File appears to be "Structure Only" backup`);
        warnings.push(`✅ System will auto-correct to "Structure Only" import`);
      }
      
      setImportTypeWarning(warnings.join('\n'));
    } else {
      setImportTypeWarning(null);
    }
  };

  const handleFileSelection = (file: File | null) => {
    setSelectedBackupFile(file);
    if (file) {
      checkImportTypeCompatibility(file, backupType || 'full');
    } else {
      setImportTypeWarning(null);
    }
  };

  const handleConfirmBackup = async () => {
    if (!backupType) return;
    
    setIsBacking(true);
    try {
      const response = await fetch(`${BASE_URL}/api/system/backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          type: backupType,
          include_files: backupType === 'full' // Only include files for full backup
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup_${backupType}_${new Date().toISOString().split('T')[0]}.sql`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        setShowBackupModal(false);
        // Show success message
        setSuccess(`Backup berhasil dibuat dan di-download! Backup ${backupType} telah dibuat.`);
        // Refresh dashboard to update last backup time
        fetchDashboardData();
        // Reset selection
        setBackupType('full');
      } else {
        throw new Error(`Backup ${backupType} failed`);
      }
    } catch (error) {
      setError('Backup failed. Please try again.');
    } finally {
      setIsBacking(false);
    }
  };



  const handleImportBackup = async () => {
    if (!selectedBackupFile) return;
    
    setIsImporting(true);
    setImportProgress(0);
    
    const formData = new FormData();
    formData.append('backup_file', selectedBackupFile);
    formData.append('type', backupType || 'full'); // Use selected type or default to full
    
    try {
      const response = await fetch(`${BASE_URL}/api/system/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        setShowImportModal(false);
        setSelectedBackupFile(null);
        setImportProgress(100);
        
        // Build comprehensive success message
        let successMessage = result.message || 'Database restored successfully';
        
        // Add type correction info if applicable
        if (result.original_requested_type && result.backup_type !== result.original_requested_type) {
          successMessage += `\n\n🔄 Auto-Correction Applied:\n`;
          successMessage += `• You selected: "${result.original_requested_type}" restore\n`;
          successMessage += `• File detected as: "${result.detected_file_type}" backup\n`;
          successMessage += `• System auto-corrected to: "${result.backup_type}" import`;
        }
        
        // Add warnings if any
        if (result.warnings && result.warnings.length > 0) {
          successMessage += `\n\n⚠️ Important Notes:\n`;
          result.warnings.forEach((warning: string) => {
            successMessage += `• ${warning}\n`;
          });
        }
        
        // Add additional context info
        if (result.backup_type === 'data_only') {
          successMessage += '\n✅ Data has been restored to your database.';
        } else if (result.backup_type === 'full') {
          successMessage += '\n✅ Complete database structure and data have been restored.';
        }
        
        if (result.pre_import_backup) {
          successMessage += `\n🛡️ Safety backup created: ${result.pre_import_backup}`;
        }
        
        setSuccess(successMessage);
        
        // Refresh dashboard data
        fetchDashboardData();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Import failed');
      }
    } catch (error: any) {
      if (error.message && error.message !== 'Import failed') {
        setError(`Import failed: ${error.message}`);
      } else {
        setError('Import failed. Please check the backup file and try again.');
      }
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  // System monitoring functions
  const generateSystemMetrics = (): SystemMetrics => {
    // For development, generate realistic simulated data
    const now = Date.now();
    const baseUsage = 20 + Math.sin(now / 10000) * 30; // Oscillating base usage
    
    return {
      cpu: {
        usage: Math.max(0, Math.min(100, baseUsage + Math.random() * 20)),
        cores: 8,
        threads: 16,
        temperature: 40 + Math.random() * 20,
        frequency: 2.4 + Math.random() * 1.2
      },
      memory: {
        total: 16,
        used: 8 + Math.random() * 4,
        available: 16 - (8 + Math.random() * 4),
        usage: 50 + Math.random() * 30
      },
      storage: {
        total: 512,
        used: 256 + Math.random() * 50,
        available: 512 - (256 + Math.random() * 50),
        usage: 50 + Math.random() * 20
      },
      network: {
        upload: Math.random() * 10,
        download: Math.random() * 15,
        connections: Math.floor(Math.random() * 100)
      },
      database: {
        responseTime: 50 + Math.random() * 100,
        connections: 10 + Math.floor(Math.random() * 50),
        size: 2.5 + Math.random() * 1.5,
        lastBackup: new Date(Date.now() - Math.random() * 86400000).toISOString()
      },
      application: {
        activeUsers: 20 + Math.floor(Math.random() * 30),
        activeStudents: 15 + Math.floor(Math.random() * 25),
        activeLecturers: 5 + Math.floor(Math.random() * 10),
        apiResponseTime: 100 + Math.random() * 200,
        errorRate: Math.random() * 2
      },
      security: {
        failedLogins: Math.floor(Math.random() * 5),
        sslStatus: 'valid' as const,
        firewallStatus: 'active' as const,
        lastSecurityScan: new Date(Date.now() - Math.random() * 604800000).toISOString()
      }
    };
  };

  const updateChartData = (metrics: SystemMetrics) => {
    const now = Date.now();
    
    setChartData(prev => {
      const newData = { ...prev };
      
      // Update all chart data simultaneously, not just the active tab
      const cpuDataPoint: ChartDataPoint = { timestamp: now, value: metrics.cpu.usage };
      const memoryDataPoint: ChartDataPoint = { timestamp: now, value: metrics.memory.usage };
      const storageDataPoint: ChartDataPoint = { timestamp: now, value: metrics.storage.usage };
      const networkDataPoint: ChartDataPoint = { timestamp: now, value: metrics.network.upload + metrics.network.download };
      const databaseDataPoint: ChartDataPoint = { timestamp: now, value: metrics.database.responseTime };
      const applicationDataPoint: ChartDataPoint = { timestamp: now, value: metrics.application.apiResponseTime };
      const securityDataPoint: ChartDataPoint = { timestamp: now, value: metrics.security.failedLogins };
      
      // Update all charts with new data points
      newData.cpu = [...prev.cpu, cpuDataPoint].slice(-60); // Keep last 60 points
      newData.memory = [...prev.memory, memoryDataPoint].slice(-60);
      newData.storage = [...prev.storage, storageDataPoint].slice(-60);
      newData.network = [...prev.network, networkDataPoint].slice(-60);
      newData.database = [...prev.database, databaseDataPoint].slice(-60);
      newData.application = [...prev.application, applicationDataPoint].slice(-60);
      newData.security = [...prev.security, securityDataPoint].slice(-60);
      
      return newData;
    });
  };

  const startSystemMonitoring = () => {
    // Clear any existing interval first
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
    
    setIsMonitoring(true);
    const interval = setInterval(() => {
      const metrics = generateSystemMetrics();
      setSystemMetrics(metrics);
      updateChartData(metrics);
    }, 1000); // Update every second

    monitoringIntervalRef.current = interval;
  };

  const stopSystemMonitoring = () => {
    setIsMonitoring(false);
    
    // Clear the interval
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
    
    // Force stop any ongoing updates
    setSystemMetrics(prev => ({ ...prev }));
  };

  // Helper function to get user initials from name
  const getUserInitials = (userName: string): string => {
    if (!userName) return '?';
    const names = userName.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  // Helper function to get user role (simulated based on name patterns)
  const getUserRole = (userName: string): string => {
    if (!userName) return 'Unknown';
    
    // Simulate role detection based on name patterns
    const lowerName = userName.toLowerCase();
    
    if (lowerName.includes('dr.') || lowerName.includes('prof.') || lowerName.includes('dr ')) {
      return 'Dosen';
    } else if (lowerName.includes('tim') || lowerName.includes('akademik')) {
      return 'Tim Akademik';
    } else if (lowerName.includes('admin') || lowerName.includes('super')) {
      return 'Super Admin';
    } else {
      return 'Mahasiswa';
    }
  };

  // Helper function to get role color for avatar
  const getRoleColor = (role: string): string => {
    switch (role) {
      case 'Dosen':
        return 'bg-blue-500 dark:bg-blue-600';
      case 'Tim Akademik':
        return 'bg-purple-500 dark:bg-purple-600';
      case 'Super Admin':
        return 'bg-red-500 dark:bg-red-600';
      case 'Mahasiswa':
        return 'bg-green-500 dark:bg-green-600';
      default:
        return 'bg-gray-300 dark:bg-gray-600';
    }
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
    if (code === 800) return '01d'; // clear
    if (code > 800) return '02d'; // clouds
    
    // Fallback mapping for wttr.in specific codes
    const codeMap: { [key: string]: string } = {
      '113': '01d', // clear/sunny
      '116': '02d', // partly cloudy
      '119': '03d', // cloudy
      '122': '04d', // overcast
      '143': '50d', // mist
      '176': '10d', // patchy rain
      '179': '13d', // patchy snow
      '182': '09d', // patchy sleet
      '185': '09d', // patchy freezing drizzle
      '200': '11d', // thundery outbreaks
      '227': '13d', // blowing snow
      '230': '13d', // blizzard
      '248': '50d', // fog
      '260': '50d', // freezing fog
      '263': '09d', // patchy light drizzle
      '266': '09d', // light drizzle
      '281': '09d', // freezing drizzle
      '284': '09d', // heavy freezing drizzle
      '293': '10d', // patchy light rain
      '296': '10d', // light rain
      '299': '10d', // moderate rain at times
      '302': '10d', // moderate rain
      '305': '10d', // heavy rain at times
      '308': '10d', // heavy rain
      '311': '09d', // light freezing rain
      '314': '09d', // moderate or heavy freezing rain
      '317': '09d', // light sleet
      '320': '09d', // moderate or heavy sleet
      '323': '13d', // patchy light snow
      '326': '13d', // light snow
      '329': '13d', // patchy moderate snow
      '332': '13d', // moderate snow
      '335': '13d', // patchy heavy snow
      '338': '13d', // heavy snow
      '350': '09d', // ice pellets
      '353': '10d', // light rain shower
      '356': '10d', // moderate or heavy rain shower
      '359': '10d', // torrential rain shower
      '362': '09d', // light sleet showers
      '365': '09d', // moderate or heavy sleet showers
      '368': '13d', // light snow showers
      '371': '13d', // moderate or heavy snow showers
      '374': '09d', // light showers of ice pellets
      '377': '09d', // moderate or heavy showers of ice pellets
      '386': '11d', // patchy light rain with thunder
      '389': '11d', // moderate or heavy rain with thunder
      '392': '11d', // patchy light snow with thunder
      '395': '11d', // moderate or heavy snow with thunder
    };
    
    return codeMap[weatherCode] || '01d';
  };

  // Location-based weather fallback
  const getLocationBasedWeather = (lat: number, lng: number): WeatherData => {
    // Simple logic based on latitude for temperature estimation
    let baseTemp = 30; // Default tropical temperature
    
    // Adjust based on latitude (rough estimation)
    if (Math.abs(lat) > 60) baseTemp = 5; // Arctic/Antarctic
    else if (Math.abs(lat) > 45) baseTemp = 15; // Temperate
    else if (Math.abs(lat) > 23.5) baseTemp = 25; // Subtropical
    
    // Add some random variation
    const variation = Math.random() * 10 - 5; // -5 to +5 degrees
    const temperature = Math.round(baseTemp + variation);
    
    // Determine location name based on coordinates (very basic)
    let locationName = 'Unknown Location';
    
    // Indonesia region detection
    if (lat >= -11 && lat <= 6 && lng >= 95 && lng <= 141) {
      if (lat >= -6.5 && lat <= -6 && lng >= 106.5 && lng <= 107) {
        locationName = 'Jakarta, ID';
      } else if (lat >= -7 && lat <= -6.5 && lng >= 110 && lng <= 111) {
        locationName = 'Semarang, ID';
      } else if (lat >= -8 && lat <= -7.5 && lng >= 112 && lng <= 113) {
        locationName = 'Surabaya, ID';
      } else {
        locationName = 'Indonesia';
      }
    }
    
    return {
      temperature,
      description: temperature > 25 ? 'cerah' : temperature > 15 ? 'berawan' : 'sejuk',
      icon: temperature > 25 ? '01d' : temperature > 15 ? '02d' : '03d',
      location: locationName,
      humidity: Math.round(60 + Math.random() * 30), // 60-90%
      windSpeed: Math.round((Math.random() * 5 + 1) * 10) / 10 // 1-6 m/s
    };
  };

  // Chart component for system monitoring
  const SystemChart = ({ data, title, color }: { data: ChartDataPoint[], title: string, color: string }) => {
    if (data.length === 0) {
      return (
        <div className="w-full h-48 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{title}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">Loading chart data...</div>
          </div>
        </div>
      );
    }
    
    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue || 1;
    
    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((point.value - minValue) / range) * 100;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <div className="w-full h-48 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">{title}</div>
        <svg className="w-full h-40" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            points={points}
            vectorEffect="non-scaling-stroke"
          />
          <polygon
            fill={`${color}20`}
            points={`0,100 ${points} 100,100`}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    );
  };

  // Weather icon component
  const WeatherIcon = ({ iconCode }: { iconCode: string }) => {
    const iconMap: { [key: string]: string } = {
      '01d': '☀️', '01n': '🌙', // clear
      '02d': '⛅', '02n': '☁️', // few clouds
      '03d': '☁️', '03n': '☁️', // scattered clouds
      '04d': '☁️', '04n': '☁️', // broken clouds
      '09d': '🌧️', '09n': '🌧️', // shower rain
      '10d': '🌦️', '10n': '🌧️', // rain
      '11d': '⛈️', '11n': '⛈️', // thunderstorm
      '13d': '❄️', '13n': '❄️', // snow
      '50d': '🌫️', '50n': '🌫️', // mist
    };
    
    return <span className="text-lg">{iconMap[iconCode] || '☀️'}</span>;
  };

  useEffect(() => {
    fetchDashboardData();
    fetchWeatherData();
    
    // Auto-start monitoring on component mount
    startSystemMonitoring();
    
    // No cleanup needed since monitoring is user-controlled
    // return () => {
    //   stopSystemMonitoring();
    // };
  }, []);

  // Auto-clear success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Cleanup monitoring only when component unmounts
  useEffect(() => {
    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
        monitoringIntervalRef.current = null;
      }
    };
  }, []);



  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Check if we have a token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      // Use centralized BASE_URL
      const baseURL = BASE_URL;
      
      // Try main endpoint first, fallback to test endpoint for debugging
      let endpoint = `${baseURL}/api/dashboard/super-admin`;
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setError('Session expired. Please login again.');
          window.location.href = '/signin';
          return;
        }
        
        // For development, try test endpoint if main endpoint fails
        if (process.env.NODE_ENV === 'development' && endpoint.includes('/dashboard/super-admin')) {
          const testResponse = await fetch(`${baseURL}/api/test/dashboard-data`, {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          });
          
          if (testResponse.ok) {
            const testData = await testResponse.json();
            setStats(testData);
            setError('Using test data - authentication may not be working properly');
            return;
          }
        }
        
        // Try to get error message from response
        let errorMessage = 'Failed to fetch dashboard data';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If response is not JSON, get text
          await response.text();
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        await response.text();
        throw new Error('Server returned non-JSON response. Check if Laravel server is running on port 8000.');
      }

      const data = await response.json();
      
            // Ensure data has the required structure with fallbacks
      const safeData: DashboardStats = {
        ...data,
        attendanceStats: {
          regular: {
            overall_rate: data.attendanceStats?.overall_rate || 0,
            pbl_rate: data.attendanceStats?.pbl_rate || 0,
            journal_rate: data.attendanceStats?.journal_rate || 0,
            csr_rate: data.attendanceStats?.csr_rate || 0,
            total_students: data.attendanceStats?.total_students || 0,
            low_attendance_students: data.attendanceStats?.low_attendance_students || 0
          },
          antara: {
            overall_rate: data.attendanceStatsAntara?.overall_rate || 0,
            pbl_rate: data.attendanceStatsAntara?.pbl_rate || 0,
            journal_rate: data.attendanceStatsAntara?.journal_rate || 0,
            csr_rate: 0, // Semester antara tidak ada CSR
            total_students: data.attendanceStatsAntara?.total_students || 0,
            low_attendance_students: data.attendanceStatsAntara?.low_attendance_students || 0
          }
        },
        assessmentStats: {
          ...data.assessmentStats,
          // Ensure completion rate doesn't exceed 100%
          completion_rate: Math.min((data.assessmentStats && data.assessmentStats.completion_rate) || 0, 100)
        }
      };
      
      setStats(safeData);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      // Keep this section commented out - no more demo data
      /*if (process.env.NODE_ENV === 'development') {
        // Setting demo data for development
        const demoData: DashboardStats = {
          totalUsers: 150,
          totalMahasiswa: 120,
          totalDosen: 25,
          totalTimAkademik: 5,
          totalMataKuliah: 45,
          totalKelas: 12,
          totalRuangan: 15,
          totalJadwalAktif: 85,
          recentActivities: [
            {
              id: '1',
              user: 'Dr. Ahmad Fauzi',
              action: 'membuat',
              target: 'Mata Kuliah Baru',
              timestamp: '2 menit yang lalu',
              type: 'create' as const
            },
            {
              id: '2',
              user: 'Tim Akademik',
              action: 'mengupdate',
              target: 'Jadwal PBL',
              timestamp: '15 menit yang lalu',
              type: 'update' as const
            },
            {
              id: '3',
              user: 'Prof. Siti Aisyah',
              action: 'mengekspor',
              target: 'Data Penilaian',
              timestamp: '1 jam yang lalu',
              type: 'export' as const
            }
          ],
          systemHealth: {
            database: 'healthy' as const,
            storage: 'healthy' as const,
            server: 'healthy' as const,
            lastBackup: '2 jam yang lalu'
          },
          attendanceStats: {
              regular: {
            overall_rate: 85.5,
            pbl_rate: 87.2,
            journal_rate: 83.1,
            csr_rate: 86.3,
            total_students: 120,
            low_attendance_students: 8
              },
              antara: {
                overall_rate: 77.5,
                pbl_rate: 80.0,
                journal_rate: 75.0,
                csr_rate: 0, // Semester antara tidak ada CSR
                total_students: 45,
                low_attendance_students: 12
              }
          },
          todaySchedule: [
            {
              type: 'Kuliah Besar',
              mata_kuliah: 'Anatomi Dasar',
              dosen: 'Dr. Ahmad Fauzi',
              ruangan: 'Aula Utama',
              waktu: '08:00 - 10:00',
              topik: 'Sistem Muskuloskeletal'
            },
            {
              type: 'PBL',
              mata_kuliah: 'Blok Kardiovaskular',
              dosen: 'Prof. Siti Aisyah',
              ruangan: 'Ruang PBL 1',
              waktu: '10:30 - 12:30',
              topik: 'Kasus Hipertensi'
            },
            {
              type: 'Journal Reading',
              mata_kuliah: 'Blok Respirasi',
              dosen: 'Dr. Budi Santoso',
              ruangan: 'Ruang Seminar',
              waktu: '13:30 - 15:00',
              topik: 'COVID-19 Research Update'
            }
          ],
          assessmentStats: {
            total_pbl_assessments: 245,
            total_journal_assessments: 189,
            pending_pbl: 23,
            pending_journal: 17,
              completion_rate: 87.5, // (434-40)/434 * 100 = 90.8%
            average_score: 78.3
          },
          systemNotifications: [
            {
              type: 'info' as const,
              title: 'System Update Available',
              message: 'Version 2.4.1 is available with bug fixes',
              action: 'Update Now'
            },
            {
              type: 'warning' as const,
              title: 'Backup Reminder',
              message: 'Last backup was 3 days ago',
              action: 'Backup Now'
            }
          ],
          academicOverview: {
            current_semester: 'Ganjil 2024/2025',
            current_tahun_ajaran: '2024/2025',
            semester_progress: 67,
            active_blocks: ['Blok 1', 'Blok 2'],
            upcoming_deadlines: [
              { title: 'PBL Assessment Deadline', date: '2024-12-15' },
              { title: 'Semester Exam Period', date: '2024-12-20' }
            ]
          }
        };
        
        setStats(demoData);
        setError(`Demo Mode: ${errorMessage}`);
      }*/
    } finally {
      setLoading(false);
    }
  };



  // Skeleton Loading Components
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
        <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Header Skeleton */}
        <div className="col-span-12 mb-6">
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

        {/* Main Stats Cards Skeleton */}
        <div className="col-span-12">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            {[1, 2, 3].map((i) => (
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
          
        {/* Academic Stats Skeleton */}
        <div className="col-span-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i}>
                <SkeletonCircle />
                <div className="mt-4">
                  <SkeletonLine width="w-24" height="h-4" />
                  <SkeletonLine width="w-16" height="h-8" />
                </div>
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
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <SkeletonLine width="w-full" height="h-4" />
                      <div className="mt-2">
                        <SkeletonLine width="w-3/4" height="h-3" />
                      </div>
                    </div>
                  ))}
                </div>
              </SkeletonCard>
            ))}
          </div>
        </div>

        {/* Recent Activities Table Skeleton */}
        <div className="col-span-12">
          <SkeletonCard>
            <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <SkeletonLine width="w-40" height="h-6" />
              <div className="flex items-center gap-3">
                <SkeletonLine width="w-24" height="h-10" />
              </div>
            </div>
            <div className="max-w-full overflow-x-auto hide-scroll">
              <table className="min-w-full">
                <thead className="border-gray-100 dark:border-gray-800 border-y">
                  <tr>
                    {['User', 'Role', 'Action', 'Target', 'Time', 'Status'].map((_, idx) => (
                      <th key={idx} className="py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                        <SkeletonLine width="w-16" height="h-4" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[1, 2, 3, 4, 5].map((row) => (
                    <tr key={row}>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <SkeletonCircle size="w-8 h-8" />
                          <SkeletonLine width="w-24" height="h-4" />
                        </div>
                      </td>
                      <td className="py-3">
                        <SkeletonLine width="w-16" height="h-4" />
                      </td>
                      <td className="py-3">
                        <SkeletonLine width="w-20" height="h-4" />
                      </td>
                      <td className="py-3">
                        <SkeletonLine width="w-16" height="h-4" />
                      </td>
                      <td className="py-3">
                        <SkeletonLine width="w-20" height="h-4" />
                      </td>
                      <td className="py-3">
                        <SkeletonLine width="w-16" height="h-6" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SkeletonCard>
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
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition"
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
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
           >
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
               <div className="flex items-center space-x-4">
                 <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                   <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                   </svg>
                 </div>
                 <div>
                   <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard Super Admin
        </h1>
                   <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                     Sistem Akademik Universitas Muhammadiyah Jakarta
        </p>
                   {user && user.name && (
                     <p className="mt-1 text-sm text-blue-600 dark:text-blue-400 font-medium">
                       Logged in as: {user.name} ({user.username})
        </p>
                   )}
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

                 {/* Right side - Time & Weather */}
                 <div className="flex items-center gap-3 flex-wrap">
                   {/* Real-time Clock */}
                   <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                     <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                     {currentTime.toLocaleTimeString('id-ID', { 
                       hour: '2-digit', 
                       minute: '2-digit', 
                       second: '2-digit',
                       hour12: false 
                     })}
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
           </motion.div>
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

         {error && (
           <div className="col-span-12">
             <div className="relative overflow-hidden bg-gradient-to-r from-red-500 to-red-600 rounded-2xl shadow-lg border border-red-200 dark:border-red-700 notification-enter">
               {/* Background Pattern */}
               <div className="absolute inset-0 bg-red-600 opacity-10">
                 <div className="absolute inset-0" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M30 0l4 8h8l-6 6 2 8-8-4-8 4 2-8-6-6h8z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}}></div>
               </div>
               
               {/* Content */}
               <div className="relative p-6">
                 <div className="flex items-start space-x-4">
                   {/* Error Icon with Animation */}
                   <div className="flex-shrink-0">
                     <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                       <svg className="w-7 h-7 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                       </svg>
                     </div>
                   </div>
                   
                   {/* Content */}
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center space-x-2 mb-2">
                       <h3 className="text-lg font-bold text-white">⚠️ Operation Failed</h3>
                       <div className="flex space-x-1">
                         <div className="w-2 h-2 bg-white/60 rounded-full animate-ping"></div>
                       </div>
                     </div>
                     <p className="text-red-50 text-sm leading-relaxed">{error}</p>
                     
                     {/* Additional Info Tags */}
                     <div className="flex flex-wrap gap-2 mt-3">
                       <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                         <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                         Safe to Retry
                       </span>
                       <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                         <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                         Check Logs
                       </span>
                     </div>
                   </div>
                   
                   {/* Close Button */}
                   <button
                     onClick={() => setError(null)}
                     className="flex-shrink-0 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-all duration-200 hover:scale-105"
                   >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                   </button>
                 </div>
               </div>
             </div>
           </div>
         )}

                 {/* Main Statistics Cards - 2 Rows of 3 Cards Each */}
         <div className="col-span-12">
           <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6 mb-6">
             {/* Total Users Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 hover:shadow-md transition-all duration-300 hover:-translate-y-1"
             >
               <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full -mr-10 -mt-10"></div>
               <div className="relative">
                 <div className="flex items-center justify-between mb-4">
                   <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                     <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                     </svg>
            </div>
                   <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${formatGrowthPercentage(stats.usersGrowth).colorClass}`}>
                     <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={formatGrowthPercentage(stats.usersGrowth).isPositive ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"} />
                     </svg>
                     {formatGrowthPercentage(stats.usersGrowth).value}
                   </span>
                 </div>
            <div>
                   <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Users</p>
                   <h4 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalUsers.toLocaleString()}</h4>
                   <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Active system users</p>
            </div>
          </div>
        </motion.div>

             {/* Mahasiswa Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 hover:shadow-md transition-all duration-300 hover:-translate-y-1"
             >
               <div className="absolute top-0 right-0 w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full -mr-10 -mt-10"></div>
               <div className="relative">
                 <div className="flex items-center justify-between mb-4">
                   <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                     <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                     </svg>
                   </div>
                   <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${formatGrowthPercentage(stats.mahasiswaGrowth).colorClass}`}>
                     <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={formatGrowthPercentage(stats.mahasiswaGrowth).isPositive ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"} />
                     </svg>
                     {formatGrowthPercentage(stats.mahasiswaGrowth).value}
                   </span>
                 </div>
            <div>
                   <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Mahasiswa</p>
                   <h4 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalMahasiswa.toLocaleString()}</h4>
                   <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Registered students</p>
            </div>
               </div>
             </motion.div>

             {/* Dosen Card */}
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.3 }}
               className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 hover:shadow-md transition-all duration-300 hover:-translate-y-1"
             >
               <div className="absolute top-0 right-0 w-20 h-20 bg-purple-50 dark:bg-purple-900/20 rounded-full -mr-10 -mt-10"></div>
               <div className="relative">
                 <div className="flex items-center justify-between mb-4">
                   <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                     <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                     </svg>
                   </div>
                   <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${formatGrowthPercentage(stats.dosenGrowth).colorClass}`}>
                     <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={formatGrowthPercentage(stats.dosenGrowth).isPositive ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"} />
                     </svg>
                     {formatGrowthPercentage(stats.dosenGrowth).value}
                   </span>
                 </div>
                 <div>
                   <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Dosen</p>
                   <h4 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalDosen.toLocaleString()}</h4>
                   <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Faculty members</p>
            </div>
          </div>
        </motion.div>
           </div>
         </div>

               {/* Academic Statistics Grid */}
         <div className="col-span-12">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
             {/* Mata Kuliah Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.4 }}
               className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 hover:shadow-md transition-all duration-300 hover:-translate-y-1 md:p-6"
             >
               <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full -mr-8 -mt-8"></div>
               <div className="relative">
                 <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                   <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                   </svg>
                 </div>
            <div>
                   <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Mata Kuliah</p>
                   <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalMataKuliah.toLocaleString()}</h4>
            </div>
               </div>
             </motion.div>

             {/* Kelas Aktif Card */}
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.5 }}
               className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 hover:shadow-md transition-all duration-300 hover:-translate-y-1 md:p-6"
             >
               <div className="absolute top-0 right-0 w-16 h-16 bg-teal-50 dark:bg-teal-900/20 rounded-full -mr-8 -mt-8"></div>
               <div className="relative">
                 <div className="w-12 h-12 bg-teal-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                   <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                   </svg>
                 </div>
                 <div>
                   <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Kelas Aktif</p>
                   <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalKelas.toLocaleString()}</h4>
            </div>
          </div>
        </motion.div>

             {/* Ruangan Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.6 }}
               className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 hover:shadow-md transition-all duration-300 hover:-translate-y-1 md:p-6"
             >
               <div className="absolute top-0 right-0 w-16 h-16 bg-pink-50 dark:bg-pink-900/20 rounded-full -mr-8 -mt-8"></div>
               <div className="relative">
                 <div className="w-12 h-12 bg-pink-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                   <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2V5zM9 7h6M9 11h6" />
                   </svg>
                 </div>
            <div>
                   <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ruangan</p>
                   <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalRuangan.toLocaleString()}</h4>
            </div>
               </div>
             </motion.div>

             {/* Jadwal Aktif Card */}
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.7 }}
               className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 hover:shadow-md transition-all duration-300 hover:-translate-y-1 md:p-6"
             >
               <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-50 dark:bg-cyan-900/20 rounded-full -mr-8 -mt-8"></div>
               <div className="relative">
                 <div className="w-12 h-12 bg-cyan-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                   <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                   </svg>
                 </div>
                 <div>
                   <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Jadwal Aktif</p>
                   <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalJadwalAktif.toLocaleString()}</h4>
            </div>
          </div>
        </motion.div>
           </div>
      </div>




      {/* Second Row - System Monitor & Quick Actions */}
      <div className="col-span-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* System Monitor & Health - Takes 2 columns */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="md:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">System Monitor</h3>
              <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></div>
                Online
            </span>
                <button
                  onClick={() => {
                    if (isMonitoring) {
                      stopSystemMonitoring();
                    } else {
                      startSystemMonitoring();
                    }
                  }}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    isMonitoring 
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' 
                      : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  }`}
                >
                  {isMonitoring ? 'Stop' : 'Start'} Monitoring
                </button>
              </div>
          </div>
          
            {/* System Resource Tabs */}
            <div className="flex space-x-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto hide-scroll">
              {[
                { key: 'cpu', label: 'CPU', icon: '🔵', color: 'text-blue-600' },
                { key: 'memory', label: 'RAM', icon: '🟢', color: 'text-green-600' },
                { key: 'storage', label: 'Storage', icon: '🟡', color: 'text-yellow-600' },
                { key: 'network', label: 'Network', icon: '🟣', color: 'text-purple-600' },
                { key: 'database', label: 'Database', icon: '🗄️', color: 'text-indigo-600' },
                { key: 'application', label: 'App', icon: '📱', color: 'text-pink-600' },
                { key: 'security', label: 'Security', icon: '🔒', color: 'text-red-600' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
              </div>

            {/* Resource Details and Chart */}
            <div className="flex-1 space-y-4">
              {/* Current Resource Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {activeTab === 'cpu' && (
                  <>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {systemMetrics.cpu.usage.toFixed(1)}%
                    </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">CPU Usage</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {systemMetrics.cpu.frequency.toFixed(1)} GHz
                  </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Frequency</div>
                </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {systemMetrics.cpu.temperature.toFixed(0)}°C
                  </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Temperature</div>
                      </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {systemMetrics.cpu.cores}/{systemMetrics.cpu.threads}
                    </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Cores/Threads</div>
                  </div>
                  </>
                )}
                
                {activeTab === 'memory' && (
                  <>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {systemMetrics.memory.usage.toFixed(1)}%
                </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Memory Usage</div>
              </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {systemMetrics.memory.used.toFixed(1)} GB
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Used</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {systemMetrics.memory.available.toFixed(1)} GB
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Available</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {systemMetrics.memory.total} GB
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                    </div>
                  </>
                )}
                
                {activeTab === 'storage' && (
                  <>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {systemMetrics.storage.usage.toFixed(1)}%
                    </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Storage Usage</div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {systemMetrics.storage.used.toFixed(0)} GB
                  </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Used</div>
                  </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {systemMetrics.storage.available.toFixed(0)} GB
                </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Available</div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {systemMetrics.storage.total} GB
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                    </div>
                  </>
                )}
                
                                 {activeTab === 'network' && (
                   <>
                     <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                       <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                         {(systemMetrics.network.upload + systemMetrics.network.download).toFixed(1)} MB/s
                    </div>
                       <div className="text-xs text-gray-600 dark:text-gray-400">Total Traffic</div>
                    </div>
                     <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                       <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                         {systemMetrics.network.upload.toFixed(1)} MB/s
                  </div>
                       <div className="text-xs text-gray-600 dark:text-gray-400">Upload</div>
                  </div>
                     <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                       <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                         {systemMetrics.network.download.toFixed(1)} MB/s
                </div>
                       <div className="text-xs text-gray-600 dark:text-gray-400">Download</div>
                     </div>
                     <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                       <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                         {systemMetrics.network.connections}
                       </div>
                       <div className="text-xs text-gray-600 dark:text-gray-400">Connections</div>
                     </div>
                   </>
                 )}
                 
                 {activeTab === 'database' && (
                   <>
                     <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                       <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                         {systemMetrics.database.responseTime.toFixed(0)} ms
                    </div>
                       <div className="text-xs text-gray-600 dark:text-gray-400">Response Time</div>
                    </div>
                     <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                       <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                         {systemMetrics.database.connections}
                  </div>
                       <div className="text-xs text-gray-600 dark:text-gray-400">Connections</div>
                  </div>
                     <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                       <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                         {systemMetrics.database.size.toFixed(1)} GB
                </div>
                       <div className="text-xs text-gray-600 dark:text-gray-400">Database Size</div>
              </div>
                     <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                       <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                         {new Date(systemMetrics.database.lastBackup).toLocaleDateString()}
                       </div>
                       <div className="text-xs text-gray-600 dark:text-gray-400">Last Backup</div>
                     </div>
                   </>
                 )}
                 
                 {activeTab === 'application' && (
                   <>
                     <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3">
                       <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                         {systemMetrics.application.activeUsers}
                       </div>
                       <div className="text-xs text-gray-600 dark:text-gray-400">Active Users</div>
                     </div>
                     <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3">
                       <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                         {systemMetrics.application.activeStudents}
                       </div>
                       <div className="text-xs text-gray-600 dark:text-gray-400">Active Students</div>
                     </div>
                     <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3">
                       <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                         {systemMetrics.application.apiResponseTime.toFixed(0)} ms
                       </div>
                       <div className="text-xs text-gray-600 dark:text-gray-400">API Response</div>
                     </div>
                     <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3">
                       <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                         {systemMetrics.application.errorRate.toFixed(2)}%
                       </div>
                       <div className="text-xs text-gray-600 dark:text-gray-400">Error Rate</div>
                     </div>
                   </>
                 )}
                 
                 {activeTab === 'security' && (
                   <>
                     <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                       <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                         {systemMetrics.security.failedLogins}
                       </div>
                       <div className="text-xs text-gray-600 dark:text-gray-400">Failed Logins</div>
                     </div>
                     <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                       <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                         {systemMetrics.security.sslStatus}
                       </div>
                       <div className="text-xs text-gray-600 dark:text-gray-400">SSL Status</div>
                     </div>
                     <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                       <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                         {systemMetrics.security.firewallStatus}
                       </div>
                       <div className="text-xs text-gray-600 dark:text-gray-400">Firewall</div>
                     </div>
                     <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                       <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                         {new Date(systemMetrics.security.lastSecurityScan).toLocaleDateString()}
                       </div>
                       <div className="text-xs text-gray-600 dark:text-gray-400">Last Scan</div>
                     </div>
                   </>
                 )}
              </div>

              {/* Real-time Chart */}
              <div className="flex-1">
                {activeTab === 'cpu' && (
                  <SystemChart 
                    data={chartData.cpu} 
                    title="CPU Usage (%)" 
                    color="#3B82F6" 
                  />
                )}
                {activeTab === 'memory' && (
                  <SystemChart 
                    data={chartData.memory} 
                    title="Memory Usage (%)" 
                    color="#10B981" 
                  />
                )}
                {activeTab === 'storage' && (
                  <SystemChart 
                    data={chartData.storage} 
                    title="Storage Usage (%)" 
                    color="#F59E0B" 
                  />
                )}
                {activeTab === 'network' && (
                  <SystemChart 
                    data={chartData.network} 
                    title="Network Traffic (MB/s)" 
                    color="#8B5CF6" 
                  />
                )}
                {activeTab === 'database' && (
                  <SystemChart 
                    data={chartData.database} 
                    title="Database Response Time (ms)" 
                    color="#6366F1" 
                  />
                )}
                {activeTab === 'application' && (
                  <SystemChart 
                    data={chartData.application} 
                    title="API Response Time (ms)" 
                    color="#EC4899" 
                  />
                )}
                {activeTab === 'security' && (
                  <SystemChart 
                    data={chartData.security} 
                    title="Failed Login Attempts" 
                    color="#EF4444" 
                  />
                )}
              </div>
            </div>
            
            {/* System Status Footer */}
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Last updated: {new Date().toLocaleTimeString()}
                </span>
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  {isMonitoring ? 'Monitoring Active' : 'Monitoring Stopped'}
                </span>
              </div>
          </div>
        </motion.div>
          
          {/* Quick Actions - Takes 1 column */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] md:p-5 flex flex-col"
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Quick Actions</h3>
            <div className="space-y-3 flex-1">
              <button 
                onClick={handleImportMahasiswa}
                className="w-full flex items-center space-x-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition text-left"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
            <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Import Mahasiswa</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Upload data mahasiswa baru</p>
            </div>
              </button>
              
              <button 
                onClick={handleGenerateKelompok}
                className="w-full flex items-center space-x-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition text-left"
              >
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
            </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Generate Kelompok</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Buat kelompok mahasiswa baru</p>
          </div>
              </button>
              
              <button 
                onClick={handleExportReports}
                className="w-full flex items-center space-x-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition text-left"
              >
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
      </div>
            <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Export Reports</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Download laporan sistem</p>
            </div>
              </button>
              
              <button 
                onClick={handleBackupSystem}
                className="w-full flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/20 hover:bg-gray-100 dark:hover:bg-gray-900/30 transition text-left"
              >
                <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
            </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Backup System</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Download backup ke komputer Anda</p>
          </div>
              </button>
              
              <button 
                onClick={() => setShowImportModal(true)}
                className="w-full flex items-center space-x-3 p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/30 transition text-left"
              >
                <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
            </div>
            <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Import System</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Restore dari backup file</p>
            </div>
              </button>
              
              <button 
                onClick={handleResetSystem}
                className="w-full flex items-center space-x-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition text-left"
              >
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
            </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Reset System</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Hapus semua data kecuali Super Admin</p>
          </div>
              </button>
            </div>
          </motion.div>
        </div>
      </div>

        {/* Today's Schedule */}
      {stats.todaySchedule.length > 0 && (
        <div className="col-span-12">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
        >
          <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Today's Schedule</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">{new Date().toLocaleDateString('id-ID')}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.todaySchedule.map((schedule, index) => (
                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      schedule.type === 'PBL' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                      schedule.type === 'Journal Reading' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                    }`}>
                      {schedule.type}
            </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{schedule.waktu}</span>
          </div>
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">{schedule.mata_kuliah}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Dosen: {schedule.dosen}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Ruangan: {schedule.ruangan}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">{schedule.topik}</p>
              </div>
              ))}
                    </div>
          </motion.div>
        </div>
      )}

      {/* System Notifications */}
      {stats.systemNotifications.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="col-span-12 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
        >
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">System Notifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.systemNotifications.map((notification, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                notification.type === 'warning' ? 'bg-yellow-50 border-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-600' :
                notification.type === 'error' ? 'bg-red-50 border-red-400 dark:bg-red-900/20 dark:border-red-600' :
                notification.type === 'success' ? 'bg-green-50 border-green-400 dark:bg-green-900/20 dark:border-green-600' :
                'bg-blue-50 border-blue-400 dark:bg-blue-900/20 dark:border-blue-600'
              }`}>
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      notification.type === 'warning' ? 'text-yellow-800 dark:text-yellow-200' :
                      notification.type === 'error' ? 'text-red-800 dark:text-red-200' :
                      notification.type === 'success' ? 'text-green-800 dark:text-green-200' :
                      'text-blue-800 dark:text-blue-200'
                    }`}>
                      {notification.title}
                    </p>
                    <p className={`text-xs mt-1 ${
                      notification.type === 'warning' ? 'text-yellow-700 dark:text-yellow-300' :
                      notification.type === 'error' ? 'text-red-700 dark:text-red-300' :
                      notification.type === 'success' ? 'text-green-700 dark:text-green-300' :
                      'text-blue-700 dark:text-blue-300'
                    }`}>
                      {notification.message}
                      </p>
              </div>
                  <button className={`text-xs font-medium ml-3 ${
                    notification.type === 'warning' ? 'text-yellow-800 hover:text-yellow-900 dark:text-yellow-200' :
                    notification.type === 'error' ? 'text-red-800 hover:text-red-900 dark:text-red-200' :
                    notification.type === 'success' ? 'text-green-800 hover:text-green-900 dark:text-green-200' :
                    'text-blue-800 hover:text-blue-900 dark:text-blue-200'
                  }`}>
                    {notification.action}
                  </button>
                    </div>
                </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Activities Table */}
      <div className="col-span-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6"
        >
          <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Recent Activities
                      </h3>
                    </div>
            <div className="flex items-center gap-3">
                              <button 
                 onClick={() => navigate('/reporting/histori')}
                 className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 transition-colors"
               >
                 View All
               </button>
                  </div>
                  </div>
          <div className="max-w-full overflow-x-auto hide-scroll">
            <table className="min-w-full">
              <thead className="border-gray-100 dark:border-gray-800 border-y">
                <tr>
                  <th className="py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">User</th>
                   <th className="py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Role</th>
                  <th className="py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Action</th>
                  <th className="py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Target</th>
                  <th className="py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Time</th>
                  <th className="py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {stats.recentActivities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                      No recent activities
                    </td>
                  </tr>
              ) : (
                stats.recentActivities.map((activity) => (
                    <tr key={activity.id}>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getRoleColor(getUserRole(activity.user))}`}>
                            <span className="text-sm font-semibold text-white">
                              {getUserInitials(activity.user)}
                            </span>
                </div>

                    </div>
                      </td>
                      <td className="py-3 text-sm text-gray-500 dark:text-gray-400">{getUserRole(activity.user)}</td>
                      <td className="py-3 text-sm text-gray-500 dark:text-gray-400">{activity.action}</td>
                      <td className="py-3 text-sm text-gray-500 dark:text-gray-400">{activity.target}</td>
                      <td className="py-3 text-sm text-gray-500 dark:text-gray-400">{activity.timestamp}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          activity.type === 'create' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          activity.type === 'update' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                          activity.type === 'delete' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                        }`}>
                          {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
      </div>

      {/* Export Reports Modal */}
      <AnimatePresence>
      {showExportModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center">
          {/* Overlay */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] bg-gray-500/30 dark:bg-gray-500/50 backdrop-blur-md"
            onClick={() => setShowExportModal(false)}
          ></motion.div>
          {/* Modal Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-3xl px-8 py-8 shadow-lg z-[100001] max-h-[90vh] overflow-y-auto hide-scroll"
          >
            {/* Close Button */}
            <button
              onClick={() => setShowExportModal(false)}
              className="absolute z-20 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white right-6 top-6 h-11 w-11"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" className="w-6 h-6">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <div>
              <div className="flex items-center justify-between pb-4 sm:pb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                  Export Reports
            </h2>
          </div>
          
              <div>
                <div className="mb-3 sm:mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Pilih jenis laporan yang ingin didownload
                    </label>
                    {selectedReportTypes.length > 0 && (
                      <span className="text-xs text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded-full">
                        {selectedReportTypes.length} laporan dipilih
                      </span>
                    )}
                  </div>
          <div className="space-y-3">
                    <div
                      className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 ${
                        selectedReportTypes.includes('attendance') ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-600' : ''
                      }`}
                      onClick={() => {
                        if (selectedReportTypes.includes('attendance')) {
                          setSelectedReportTypes(prev => prev.filter(type => type !== 'attendance'));
                        } else {
                          setSelectedReportTypes(prev => [...prev, 'attendance']);
                        }
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selectedReportTypes.includes('attendance')
                            ? 'bg-brand-500 border-brand-500' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {selectedReportTypes.includes('attendance') && (
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
              </div>
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                    </div>
                    <div>
                          <p className="font-medium text-gray-900 dark:text-white">Attendance Report</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Laporan kehadiran mahasiswa</p>
                    </div>
                  </div>
            </div>
            
                    <div
                      className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 ${
                        selectedReportTypes.includes('assessment') ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-600' : ''
                      }`}
                      onClick={() => {
                        if (selectedReportTypes.includes('assessment')) {
                          setSelectedReportTypes(prev => prev.filter(type => type !== 'assessment'));
                        } else {
                          setSelectedReportTypes(prev => [...prev, 'assessment']);
                        }
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selectedReportTypes.includes('assessment')
                            ? 'bg-brand-500 border-brand-500' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {selectedReportTypes.includes('assessment') && (
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                </div>
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Assessment Report</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Laporan penilaian mahasiswa</p>
                        </div>
                      </div>
            </div>
            
                    <div
                      className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 ${
                        selectedReportTypes.includes('academic') ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-600' : ''
                      }`}
                      onClick={() => {
                        if (selectedReportTypes.includes('academic')) {
                          setSelectedReportTypes(prev => prev.filter(type => type !== 'academic'));
                        } else {
                          setSelectedReportTypes(prev => [...prev, 'academic']);
                        }
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selectedReportTypes.includes('academic')
                            ? 'bg-brand-500 border-brand-500' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {selectedReportTypes.includes('academic') && (
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Academic Report</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Laporan akademik lengkap</p>
                        </div>
                      </div>
                    </div>
                  </div>
            </div>
            
                {/* Format Selection */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Pilih Format Export
                    </label>
                    {selectedExportFormats.length > 0 && (
                      <span className="text-xs text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded-full">
                        Format: {selectedExportFormats[0]}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'excel', label: 'Excel', icon: '📊' },
                      { value: 'pdf', label: 'PDF', icon: '📄' },
                      { value: 'both', label: 'Both', icon: '📁' }
                    ].map((format) => {
                      const isSelected = selectedExportFormats.includes(format.value);
                      return (
                        <div
                          key={format.value}
                          className={`p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 ${
                            isSelected ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-600' : ''
                          }`}
                          onClick={() => {
                            // Hanya bisa pilih 1 format
                            setSelectedExportFormats([format.value]);
                          }}
                        >
                          <div className="flex items-center space-x-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              isSelected 
                                ? 'bg-brand-500 border-brand-500' 
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {isSelected && (
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div className="text-center flex-1">
                              <div className="text-2xl mb-1">{format.icon}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">{format.label}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
            
                <div 
                  className="flex justify-end gap-2 pt-2 relative z-20"
                >
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="px-3 sm:px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 ease-in-out"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmExport}
                    disabled={selectedReportTypes.length === 0 || isExporting}
                    className="px-3 sm:px-4 py-2 rounded-lg bg-brand-500 text-white text-xs sm:text-sm font-medium shadow-theme-xs hover:bg-brand-600 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
                  >
                    {isExporting ? (
                      <>
                        <svg className="w-5 h-5 mr-2 animate-spin text-white inline-block align-middle" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        Downloading...
                      </>
                    ) : (
                      'Download'
                    )}
                  </button>
                </div>
            </div>
          </div>
        </motion.div>
      </div>
      )}
      </AnimatePresence>

      {/* Backup System Modal */}
      <AnimatePresence>
      {showBackupModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center">
          {/* Overlay */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] bg-gray-500/30 dark:bg-gray-500/50 backdrop-blur-md"
            onClick={() => setShowBackupModal(false)}
          ></motion.div>
          {/* Modal Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-3xl px-8 py-8 shadow-lg z-[100001] max-h-[90vh] overflow-y-auto hide-scroll"
          >
            {/* Close Button */}
            <button
              onClick={() => setShowBackupModal(false)}
              className="absolute z-20 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white right-6 top-6 h-11 w-11"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" className="w-6 h-6">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <div>
              <div className="flex items-center justify-between pb-4 sm:pb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                  Backup System
            </h2>
          </div>
          
              <div>
                <div className="mb-3 sm:mb-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Konfirmasi Backup</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Proses ini akan memakan waktu beberapa menit</p>
                    </div>
            </div>
            
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Info</p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">File backup akan langsung di-download ke komputer Anda. Anda bisa memilih lokasi penyimpanan sesuai keinginan.</p>
                      </div>
                    </div>
            </div>
            
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Pilih jenis backup yang ingin Anda buat:
                    </p>
                    {backupType && (
                      <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-full">
                        1 jenis backup dipilih
                      </span>
                    )}
            </div>
            
                  <div className="space-y-3 mb-6">
                    {[
                      {
                        value: 'full',
                        label: 'Full Backup',
                        description: 'Database + struktur + files',
                        badge: 'Rekomendasi',
                        badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
                        icon: '💾'
                      },
                      {
                        value: 'data_only',
                        label: 'Data Only',
                        description: 'Hanya data (tanpa struktur tabel)',
                        icon: '📊'
                      },
                      {
                        value: 'structure_only',
                        label: 'Structure Only',
                        description: 'Hanya struktur tabel (tanpa data)',
                        icon: '🏗️'
                      }
                    ].map((backup) => {
                      const isSelected = backupType === backup.value;
                      return (
                        <div
                          key={backup.value}
                          className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 ${
                            isSelected ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-600' : ''
                          }`}
                          onClick={() => {
                            setBackupType(backup.value);
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              isSelected 
                                ? 'bg-orange-500 border-orange-500' 
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {isSelected && (
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              )}
                            </div>
                            <div className="text-2xl">{backup.icon}</div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900 dark:text-white">{backup.label}</span>
                                {backup.badge && (
                                  <span className={`text-xs px-2 py-1 rounded ${backup.badgeColor}`}>
                                    {backup.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{backup.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
            
                <div 
                  className="flex justify-end gap-2 pt-2 relative z-20"
                >
                  <button
                    onClick={() => setShowBackupModal(false)}
                    className="px-3 sm:px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 ease-in-out"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBackup}
                    disabled={!backupType || isBacking}
                    className="px-3 sm:px-4 py-2 rounded-lg bg-orange-600 text-white text-xs sm:text-sm font-medium shadow-theme-xs hover:bg-orange-700 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
                  >
                    {isBacking ? (
                      <>
                        <svg className="w-5 h-5 mr-2 animate-spin text-white inline-block align-middle" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        Creating & Downloading...
                      </>
                    ) : (
                      'Create & Download Backup'
                    )}
            </button>
                </div>
            </div>
          </div>
        </motion.div>
      </div>
      )}
      </AnimatePresence>

      {/* Import System Modal */}
      <AnimatePresence>
      {showImportModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center">
          {/* Overlay */}
      <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] bg-gray-500/30 dark:bg-gray-500/50 backdrop-blur-md"
            onClick={() => setShowImportModal(false)}
          ></motion.div>
          {/* Modal Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-3xl px-8 py-8 shadow-lg z-[100001] max-h-[90vh] overflow-y-auto hide-scroll"
          >
            {/* Close Button */}
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute z-20 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white right-6 top-6 h-11 w-11"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" className="w-6 h-6">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <div>
              <div className="flex items-center justify-between pb-4 sm:pb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                  Import System
          </h2>
        </div>
        
              <div>
                <div className="mb-3 sm:mb-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
            </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Restore Database</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Hati-hati! Ini akan mengganti data yang ada</p>
                    </div>
          </div>
          
                  <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Peringatan!</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">Proses import akan mengganti semua data yang ada. Pastikan Anda telah membuat backup terlebih dahulu.</p>
            </div>
                    </div>
          </div>
          
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Upload Backup File
                      </label>
                      <div className="relative">
                        <input 
                          type="file" 
                          accept=".sql,.zip" 
                          onChange={(e) => {
                            const file = e.target.files && e.target.files[0];
                            if (file) {
                              // Validasi ukuran file (100MB)
                              if (file.size <= 100 * 1024 * 1024) {
                                handleFileSelection(file);
                              } else {
                                setError('Ukuran file terlalu besar. Maksimal 100MB.');
                                handleFileSelection(null);
                              }
                            } else {
                              handleFileSelection(null);
                            }
                          }} 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          id="backup-file-upload"
                        />
                        <div 
                          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ease-in-out transform ${
                            isDragOver 
                              ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20 scale-105 shadow-lg' 
                              : 'border-gray-300 dark:border-gray-600 hover:border-red-500 dark:hover:border-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 bg-gray-50 dark:bg-gray-800 hover:scale-102'
                          }`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragOver(true);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            setIsDragOver(false);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragOver(false);
                            const files = e.dataTransfer.files;
                            if (files.length > 0) {
                              const file = files[0];
                              // Validasi tipe file
                              const allowedTypes = ['.sql', '.zip'];
                              const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
                              if (allowedTypes.includes(fileExtension)) {
                                // Validasi ukuran file (100MB)
                                if (file.size <= 100 * 1024 * 1024) {
                                  handleFileSelection(file);
                                } else {
                                  setError('Ukuran file terlalu besar. Maksimal 100MB.');
                                  handleFileSelection(null);
                                }
                              } else {
                                setError('Tipe file tidak didukung. Gunakan SQL atau ZIP.');
                                handleFileSelection(null);
                              }
                            }
                          }}
                        >
                          <div className="flex flex-col items-center space-y-2">
                            {selectedBackupFile ? (
                              <div className="w-full max-w-sm bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0">
                                      <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
            </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-green-800 dark:text-green-200 truncate">
                                        {selectedBackupFile.name.length > 28 ? selectedBackupFile.name.substring(0, 28) + '...' : selectedBackupFile.name}
                                      </p>
                                      <p className="text-xs text-green-600 dark:text-green-400 text-left w-full">
                                        {(selectedBackupFile.size / 1024 / 1024).toFixed(2)} MB
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleFileSelection(null);
                                    }}
                                    className="flex-shrink-0 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors duration-200"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
            </button>
          </div>
                              </div>
                            ) : (
                              <>
                                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <div>
                                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                    Click to upload atau drag and drop
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    SQL, ZIP (MAX. 100MB)
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
          </div>
          
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Jenis Import
                        </label>
                        {backupType && (
                          <span className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full">
                            1 jenis import dipilih
                          </span>
                        )}
            </div>
        
                      {[
                        {
                          value: 'full',
                          label: 'Full Restore',
                          description: 'Restore struktur + data lengkap',
                          badge: 'Hati-hati',
                          badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
                          icon: '⚠️'
                        },
                        {
                          value: 'data_only',
                          label: 'Data Only',
                          description: 'Hanya import data (tabel harus sudah ada)',
                          icon: '📊'
                        }
                                            ].map((importType) => {
                        const isSelected = backupType === importType.value;
                        return (
                          <div
                            key={importType.value}
                            className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 ${
                              isSelected ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-600' : ''
                            }`}
                            onClick={() => {
                              const newType = importType.value as 'full' | 'data_only' | 'structure_only';
                              setBackupType(newType);
                              if (selectedBackupFile) {
                                checkImportTypeCompatibility(selectedBackupFile, newType);
                              }
                            }}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                isSelected 
                                  ? 'bg-red-500 border-red-500' 
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {isSelected && (
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                                )}
                              </div>
                              <div className="text-2xl">{importType.icon}</div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-900 dark:text-white">{importType.label}</span>
                                  {importType.badge && (
                                    <span className={`text-xs px-2 py-1 rounded ${importType.badgeColor}`}>
                                      {importType.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{importType.description}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
          </div>
          
                    {isImporting && (
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div 
                          className="bg-red-600 dark:bg-red-500 h-2.5 rounded-full transition-all duration-300" 
                          style={{ width: `${importProgress}%` }}
                        ></div>
            </div>
                    )}
                  </div>
          </div>
          
                {/* Type Mismatch Warning */}
                {importTypeWarning && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          Type Mismatch Detected
                        </h4>
                        <div className="mt-1">
                          {importTypeWarning.split('\n').map((line, index) => (
                            <p key={index} className="text-sm text-amber-700 dark:text-amber-300">
                              {line}
                            </p>
                          ))}
            </div>
          </div>
                    </div>
                  </div>
                )}
            
                <div 
                  className="flex justify-end gap-2 pt-2 relative z-20"
                >
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-3 sm:px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 ease-in-out"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleImportBackup}
                    disabled={isImporting || !selectedBackupFile}
                    className="px-3 sm:px-4 py-2 rounded-lg bg-red-600 text-white text-xs sm:text-sm font-medium shadow-theme-xs hover:bg-red-700 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
                  >
                    {isImporting ? (
                      <>
                        <svg className="w-5 h-5 mr-2 animate-spin text-white inline-block align-middle" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        Importing...
                      </>
                    ) : (
                      'Start Import'
                    )}
                  </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
      )}

      {/* Reset System Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center">
          {/* Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] bg-gray-500/30 dark:bg-gray-500/50 backdrop-blur-md"
            onClick={() => setShowResetModal(false)}
          ></motion.div>
          {/* Modal Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md mx-auto bg-white dark:bg-gray-900 rounded-3xl px-8 py-8 shadow-lg z-[100001] max-h-[90vh] overflow-y-auto hide-scroll"
          >
            {/* Close Button */}
            <button
              onClick={() => setShowResetModal(false)}
              className="absolute z-20 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white right-6 top-6 h-11 w-11"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" className="w-6 h-6">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"
                  fill="currentColor"
                />
              </svg>
            </button>
            
            <div>
              <div className="flex items-center justify-between pb-4 sm:pb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                  Reset System
                </h2>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Konfirmasi Reset</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tindakan ini tidak dapat dibatalkan!</p>
                  </div>
                </div>
                
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">Peringatan Kritis!</p>
                      <p className="text-sm text-red-700 dark:text-red-300">Reset akan menghapus SEMUA data kecuali akun Super Admin yang sedang login. Pastikan Anda telah membuat backup terlebih dahulu.</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Ketik "reset" untuk konfirmasi:
                    </label>
                    <input
                      type="text"
                      value={resetConfirmationText}
                      onChange={(e) => setResetConfirmationText(e.target.value)}
                      placeholder="Ketik 'reset' di sini..."
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-800 dark:text-white transition-colors"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-2 relative z-20">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="px-3 sm:px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 ease-in-out"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  disabled={isResetting || resetConfirmationText.toLowerCase() !== 'reset'}
                  className="px-3 sm:px-4 py-2 rounded-lg bg-red-600 text-white text-xs sm:text-sm font-medium shadow-theme-xs hover:bg-red-700 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
                >
                  {isResetting ? (
                    <>
                      <svg className="w-5 h-5 mr-2 animate-spin text-white inline-block align-middle" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Resetting...
                    </>
                  ) : (
                    'Konfirmasi Reset'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>


       </div>
    </>
  );
};

export default DashboardSuperAdmin;