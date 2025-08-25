import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faRefresh,
  faUsers,
  faUserTie,
  faUserGraduate,
  faCheck,
  faTimes,
  faBell,
  faInfoCircle,
  faExclamationTriangle,
  faCheckCircle,
  faTimesCircle,
  faEye,
  faTrash,
  faDownload,
  faFilter,
  faSort,
  faCalendar,
  faClock,
  faUser,
  faEnvelope,
  faFileAlt,
  faChartBar,
  faBookOpen,
  faGraduationCap,
  faFlask,
  faCalendarAlt,
  faFileAlt as faFileAlt2,
} from "@fortawesome/free-solid-svg-icons";
import api from '../utils/api';

interface Notification {
  id: number;
  user_name: string;
  user_id: number;
  user_role: string;
  user_type: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  read_status: string;
  read_time: string;
  time_since_read: string;
  created_time: string;
  created_time_ago: string;
}

interface NotificationStats {
  total_notifications: number;
  read_notifications: number;
  unread_notifications: number;
  read_rate_percentage: number;
  recent_notifications: number;
  recent_reads: number;
  user_type_breakdown: {
    dosen: number;
    mahasiswa: number;
  };
  last_7_days: {
    notifications_sent: number;
    notifications_read: number;
  };
}

const AdminNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'dosen' | 'mahasiswa'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

  // Initial load
  useEffect(() => {
    loadNotifications();
    loadStats();
  }, []);

  // Load notifications when user type filter changes
  useEffect(() => {
    // Always reload when filter changes, including back to 'all'
    loadNotifications(true);
    loadStats();
  }, [userTypeFilter]);

  const loadNotifications = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (userTypeFilter !== 'all') params.append('user_type', userTypeFilter);
      
      const response = await api.get(`/notifications/admin/all?${params.toString()}`);
      setNotifications(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('Gagal memuat notifikasi');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const params = new URLSearchParams();
      if (userTypeFilter !== 'all') params.append('user_type', userTypeFilter);
      
      const response = await api.get(`/notifications/admin/stats?${params.toString()}`);
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadNotifications(false), loadStats()]);
    setIsRefreshing(false);
  };

  // Client-side filtering for search and read status
  const getFilteredNotifications = () => {
    let filtered = notifications;

    // Apply search filter first
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(notification => 
        notification.user_name.toLowerCase().includes(query) ||
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query) ||
        notification.user_type.toLowerCase().includes(query)
      );
    }

    // Apply read status filter
    switch (filter) {
      case 'read':
        return filtered.filter(n => n.is_read);
      case 'unread':
        return filtered.filter(n => !n.is_read);
      default:
        return filtered;
    }
  };

  // Pagination logic
  const filteredNotifications = getFilteredNotifications();
  const totalPages = Math.ceil(filteredNotifications.length / pageSize);
  const paginatedNotifications = filteredNotifications.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filter, userTypeFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (notification: Notification) => {
    if (notification.is_read) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-700">
          <FontAwesomeIcon icon={faCheck} className="w-3 h-3 mr-1" />
          Sudah Dibaca
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700">
          <FontAwesomeIcon icon={faBell} className="w-3 h-3 mr-1" />
          Belum Dibaca
        </span>
      );
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'info':
        return faInfoCircle;
      case 'success':
        return faCheckCircle;
      case 'warning':
        return faExclamationTriangle;
      case 'error':
        return faTimesCircle;
      default:
        return faBell;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info':
        return 'text-blue-500';
      case 'success':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-purple-500';
    }
  };

  if (loading) {
    return (
      <div className="w-full mx-auto">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-64 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-96 animate-pulse"></div>
        </div>

        {/* Statistics Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-white dark:bg-white/[0.03] rounded-xl shadow border border-gray-200 dark:border-white/[0.05] p-6 flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
              <div className="flex-1">
                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Section Skeleton */}
        <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.05] px-6 py-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
            <div className="w-full md:w-72">
              <div className="h-11 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto justify-end">
              <div className="w-full md:w-44 h-11 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              <div className="w-full md:w-44 h-11 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              <div className="w-full md:w-auto h-11 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Notifications List Skeleton */}
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-48 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-32 animate-pulse"></div>
            </div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-24 animate-pulse"></div>
          </div>

          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-700 rounded-xl p-4 animate-pulse">
                <div className="flex items-start gap-4">
                  {/* Avatar Skeleton */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  </div>
                  
                  {/* Content Skeleton */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-32 mb-2"></div>
                        <div className="flex items-center gap-2">
                          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
                          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-20"></div>
                        </div>
                      </div>
                      <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-48 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-lg w-full mb-1"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4"></div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-lg w-20"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-lg w-16"></div>
                      </div>
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-20"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Skeleton */}
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-32"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-48"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-20"></div>
              <div className="flex gap-1">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                ))}
              </div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-20"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <FontAwesomeIcon icon={faTimesCircle} className="text-red-500 text-6xl mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => loadNotifications(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90 mb-2">
          Notifikasi Admin
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Kelola notifikasi dan pantau status pembacaan dosen
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-white/[0.03] rounded-xl shadow border border-gray-200 dark:border-white/[0.05] p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <FontAwesomeIcon icon={faBell} className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Notifikasi</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_notifications}</div>
              </div>
            </div>
            <div className="bg-white dark:bg-white/[0.03] rounded-xl shadow border border-gray-200 dark:border-white/[0.05] p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <FontAwesomeIcon icon={faCheck} className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Sudah Dibaca</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.read_notifications}</div>
              </div>
            </div>
            <div className="bg-white dark:bg-white/[0.03] rounded-xl shadow border border-gray-200 dark:border-white/[0.05] p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <FontAwesomeIcon icon={faUserTie} className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Dosen</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.user_type_breakdown?.dosen || 0}</div>
              </div>
            </div>
            <div className="bg-white dark:bg-white/[0.03] rounded-xl shadow border border-gray-200 dark:border-white/[0.05] p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <FontAwesomeIcon icon={faUserGraduate} className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Mahasiswa</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.user_type_breakdown?.mahasiswa || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Section */}
      <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.05] px-6 py-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
          {/* Search Bar */}
          <div className="w-full md:w-72 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
              <input
                type="text"
              placeholder="Cari notifikasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-12 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
          </div>
          {/* Filter Group */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto justify-end">
            <select
              value={userTypeFilter}
              onChange={(e) => setUserTypeFilter(e.target.value as "all" | "dosen" | "mahasiswa")}
              className="w-full md:w-44 h-11 text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">Semua User</option>
              <option value="dosen">Dosen</option>
              <option value="mahasiswa">Mahasiswa</option>
            </select>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as "all" | "read" | "unread")}
              className="w-full md:w-44 h-11 text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-normal focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">Semua Status</option>
              <option value="unread">Belum Dibaca</option>
              <option value="read">Sudah Dibaca</option>
            </select>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-5 text-sm py-2 bg-brand-500 text-white rounded-lg shadow hover:bg-brand-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefreshing ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Refresh
            </button>
          </div>
        </div>
      </div>



            {/* Daftar Notifikasi */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white/90 mb-1">
              Daftar Notifikasi
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filteredNotifications.length} notifikasi tersedia
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 text-xs font-medium rounded-full">
              Halaman {page} dari {totalPages}
            </span>
          </div>
        </div>

        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
              <FontAwesomeIcon icon={faBell} className="w-10 h-10 text-orange-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Tidak ada notifikasi
              </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              {filter === 'all' 
                ? 'Belum ada notifikasi yang dikirim ke sistem'
                : filter === 'read'
                ? 'Belum ada notifikasi yang telah dibaca oleh pengguna'
                : 'Semua notifikasi telah dibaca dengan baik'
              }
              </p>
            </div>
          ) : (
          <div className="space-y-4">
                {paginatedNotifications.map((notification) => (
                            <div
                key={notification.id}
                className="group relative bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-700 rounded-xl p-4 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <FontAwesomeIcon icon={faUser} className="w-6 h-6 text-white" />
                          </div>
                        </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                            {notification.user_name}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-full">
                            {notification.user_type}
                          </span>
                          {getStatusBadge(notification)}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <FontAwesomeIcon 
                          icon={getTypeIcon(notification.type)} 
                          className={`w-5 h-5 ${getTypeColor(notification.type)}`}
                        />
                        </div>
                    </div>
                    
                    <div className="mb-3">
                      <h5 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                            {notification.title}
                      </h5>
                      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                            {notification.message}
                      </p>
                            </div>
                    
                                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                          {notification.created_time}
                        </span>
                        <span className="text-gray-400 dark:text-gray-500">
                          {notification.created_time_ago}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {filteredNotifications.length > 0 && (
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PAGE_SIZE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                    {opt} per halaman
                    </option>
                  ))}
                </select>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Menampilkan {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, filteredNotifications.length)} dari {filteredNotifications.length} notifikasi
                </span>
                      </div>
              
            <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                Sebelumnya
                </button>
                
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  if (totalPages <= 5) {
                    return (
                  <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          page === pageNum
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                  </button>
                    );
                  }
                  return null;
                })}
                {totalPages > 5 && (
                  <span className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    ...
                  </span>
                )}
              </div>
                
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                Selanjutnya
                </button>
                  </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default AdminNotifications; 