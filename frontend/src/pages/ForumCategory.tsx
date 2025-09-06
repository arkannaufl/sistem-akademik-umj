import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faPlus,
  faComments,
  faEye,
  faReply,
  faClock,
  faUser,
  faSearch,
  faFire,
  faGraduationCap,
  faUsers,
  faHeart,
  faBookmark,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import api from "../utils/api";
import { useNavigate, useParams } from "react-router-dom";
import QuillEditor from "../components/QuillEditor";

interface ForumCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  permissions: string[];
}

interface Forum {
  id: number;
  title: string;
  content: string;
  slug: string;
  status: "active" | "closed" | "pinned" | "archived";
  views_count: number;
  replies_count: number;
  likes_count: number;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  is_edited?: boolean;
  is_new?: boolean;
  last_activity_at: string;
  created_at: string;
  access_type?: "public" | "private";
  allowed_users?: number[];
  user: {
    id: number;
    name: string;
    role: string;
  };
  last_reply_user?: {
    id: number;
    name: string;
  };
}

interface User {
  id: number;
  name: string;
  role: string;
}

interface SearchableUser {
  id: number;
  name: string;
  role: string;
  email?: string;
}

interface FormData {
  title: string;
  content: string;
  access_type: "public" | "private";
  selected_users: number[];
}

const ForumCategory: React.FC = () => {
  const navigate = useNavigate();
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [forums, setForums] = useState<Forum[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    content: "",
    access_type: "public",
    selected_users: [],
  });

  // State untuk like tracking
  const [forumLikes, setForumLikes] = useState<{ [key: number]: boolean }>({});

  // State untuk bookmark tracking
  const [forumBookmarks, setForumBookmarks] = useState<{
    [key: number]: boolean;
  }>({});

  // State untuk delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [forumToDelete, setForumToDelete] = useState<Forum | null>(null);
  const [deletingForum, setDeletingForum] = useState(false);

  // State untuk real-time update waktu
  const [currentTime, setCurrentTime] = useState(new Date());

  // State untuk upload progress
  const [uploading, setUploading] = useState(false);

  // State untuk access control
  const [searchableUsers, setSearchableUsers] = useState<SearchableUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectAllDosen, setSelectAllDosen] = useState(false);

  useEffect(() => {
    if (categorySlug) {
      fetchCategoryData();
    }
  }, [categorySlug, currentPage]);

  // Real-time update waktu setiap menit
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update setiap 1 menit (60000ms)

    return () => clearInterval(interval);
  }, []);

  // Auto-load users saat private mode dipilih
  useEffect(() => {
    if (formData.access_type === "private" && searchableUsers.length === 0) {
      loadAllUsers();
    }
  }, [formData.access_type]);

  // Debug searchableUsers state changes
  useEffect(() => {
    console.log("🔍 DEBUG: searchableUsers state changed:", searchableUsers);
  }, [searchableUsers]);

  // Fungsi untuk handle access type change
  const handleAccessTypeChange = (accessType: "public" | "private") => {
    setFormData((prev) => ({
      ...prev,
      access_type: accessType,
      selected_users: [],
    }));
    setUserSearchQuery("");

    if (accessType === "private") {
      loadAllUsers();
    } else {
      setSearchableUsers([]);
    }
  };

  const fetchCategoryData = async () => {
    try {
      setLoading(true);

      const [categoryResponse, userResponse] = await Promise.all([
        api.get(`/forum/categories/${categorySlug}/forums?page=${currentPage}`),
        api.get("/me"),
      ]);

      const categoryData = categoryResponse.data.data.category;
      const userData = userResponse.data;

      setCategory(categoryData);
      setForums(categoryResponse.data.data.forums.data);
      setTotalPages(categoryResponse.data.data.forums.last_page);
      setUser(userData);

      // Debug: Log forum data untuk access control
      console.log("🔍 DEBUG: Forum data from API:", categoryResponse.data.data.forums.data);
      categoryResponse.data.data.forums.data.forEach((forum: Forum) => {
        console.log(`🔍 DEBUG: Forum ${forum.id} (${forum.title}):`, {
          access_type: forum.access_type,
          allowed_users: forum.allowed_users,
          user_id: forum.user?.id,
          current_user_id: userData?.id
        });
      });

      // Set forum likes state - convert null to false
      const likesMap: { [key: number]: boolean } = {};
      const bookmarksMap: { [key: number]: boolean } = {};
      categoryResponse.data.data.forums.data.forEach((forum: Forum) => {
        likesMap[forum.id] = Boolean(forum.is_liked);
        bookmarksMap[forum.id] = Boolean(forum.is_bookmarked);
      });
      setForumLikes(likesMap);
      setForumBookmarks(bookmarksMap);
    } catch (error) {
      console.error("Error fetching category data:", error);
      navigate("/forum-diskusi");
    } finally {
      setLoading(false);
    }
  };

  const getIconForCategory = (slug: string) => {
    switch (slug) {
      case "forum-diskusi-dosen":
        return faGraduationCap;
      case "forum-diskusi-mahasiswa":
        return faUsers;
      default:
        return faComments;
    }
  };

  const canCreateForumInCategory = (): boolean => {
    if (!user || !category) {
      return false;
    }

    return category.permissions.includes(user.role);
  };

  const canDeleteForum = (forum: Forum): boolean => {
    if (!user) return false;

    // Admin dan tim akademik bisa hapus forum kapan saja
    if (["tim_akademik", "super_admin"].includes(user.role)) {
      return true;
    }

    // User biasa hanya bisa hapus forum sendiri dalam 2 menit
    if (forum.user.id === user.id) {
      const forumTime = new Date(forum.created_at);
      const timeDiff = currentTime.getTime() - forumTime.getTime();
      const minutesDiff = Math.floor(timeDiff / (1000 * 60));
      return minutesDiff < 2;
    }

    return false;
  };

  const handleDeleteForum = async (forum: Forum) => {
    setForumToDelete(forum);
    setShowDeleteModal(true);
  };

  const confirmDeleteForum = async () => {
    if (!forumToDelete) return;

    try {
      setDeletingForum(true);

      await api.delete(`/forum/${forumToDelete.id}`);

      // Remove from local state
      setForums((prev) => prev.filter((f) => f.id !== forumToDelete.id));

      // Close modal
      setShowDeleteModal(false);
      setForumToDelete(null);

      // Show success message (you can add toast notification here)
      alert("Forum berhasil dihapus!");
    } catch (error) {
      console.error("Error deleting forum:", error);
      alert("Gagal menghapus forum. Silakan coba lagi.");
    } finally {
      setDeletingForum(false);
    }
  };

  const navigateToForum = (forum: Forum) => {
    navigate(`/forum/${forum.slug}`);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const diffMs = currentTime.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return `${diffDays} hari yang lalu`;
    } else if (diffHours > 0) {
      return `${diffHours} jam yang lalu`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} menit yang lalu`;
    } else {
      return "Baru saja";
    }
  };

  const handleCreateForum = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim() || !category) return;

    try {
      setUploading(true);
      await api.post("/forum", {
        title: formData.title,
        content: formData.content,
        category_id: category.id,
        access_type: formData.access_type,
        selected_users:
          formData.access_type === "private" ? formData.selected_users : [],
      });

      // Reset form dan tutup modal
      setFormData({
        title: "",
        content: "",
        access_type: "public",
        selected_users: [],
      });
      setShowCreateModal(false);

      // Refresh data
      await fetchCategoryData();
    } catch (error: unknown) {
      console.error("Error creating forum:", error);

      // Log detailed error
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { message?: string }; status?: number };
        };
        console.error("Error response:", axiosError.response?.data);
        console.error("Error status:", axiosError.response?.status);
        alert(
          `Gagal membuat forum: ${
            axiosError.response?.data?.message || "Unknown error"
          }`
        );
      } else {
        alert(
          `Gagal membuat forum: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    } finally {
      setUploading(false);
    }
  };

  // Fungsi untuk search users
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchableUsers([]);
      return;
    }

    try {
      setSearchingUsers(true);
      console.log("🔍 DEBUG: Searching for query:", query);
      console.log("🔍 DEBUG: Current user object:", user);
      console.log("🔍 DEBUG: Current user ID:", user?.id);
      console.log("🔍 DEBUG: User type:", typeof user);
      console.log("🔍 DEBUG: User keys:", user ? Object.keys(user) : "null");
      console.log(
        "🔍 DEBUG: User from localStorage:",
        localStorage.getItem("user")
      );
      console.log(
        "🔍 DEBUG: API Base URL:",
        import.meta.env.VITE_API_URL || "http://localhost:8000"
      );
      console.log("🔍 DEBUG: Token exists:", !!localStorage.getItem("token"));
      console.log(
        "🔍 DEBUG: Token value:",
        localStorage.getItem("token")?.substring(0, 20) + "..."
      );

      const response = await api.get(
        `/users/search?q=${encodeURIComponent(query)}`
      );
      console.log("🔍 DEBUG: Search API response:", response.data);
      console.log("🔍 DEBUG: Response structure:", {
        hasData: !!response.data,
        hasDataData: !!response.data?.data,
        dataType: typeof response.data,
        dataDataType: typeof response.data?.data,
        dataLength: response.data?.data?.length || 0,
      });

      // Handle different response structures
      let users = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        users = response.data.data;
      } else if (Array.isArray(response.data)) {
        users = response.data;
      } else {
        console.warn(
          "🔍 WARNING: Unexpected response structure:",
          response.data
        );
        users = [];
      }

      console.log("🔍 DEBUG: Extracted users:", users);

      // Filter out current user (author) dari search results
      console.log("🔍 DEBUG: Before filtering - users count:", users.length);
      console.log(
        "🔍 DEBUG: Before filtering - first few users:",
        users.slice(0, 3)
      );
      console.log("🔍 DEBUG: Filtering with user ID:", user?.id || 0);

      const filteredUsers = users.filter((userItem: User) => {
        const isNotAuthor = userItem.id !== (user?.id || 0);
        console.log(
          `🔍 DEBUG: User ${userItem.id} (${userItem.name}) - isNotAuthor: ${isNotAuthor}`
        );
        return isNotAuthor;
      });
      console.log("🔍 DEBUG: After filtering author:", filteredUsers);
      console.log(
        "🔍 DEBUG: After filtering - users count:",
        filteredUsers.length
      );

      setSearchableUsers(filteredUsers || []);
    } catch (error: unknown) {
      console.error("Error searching users:", error);
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: {
            status?: number;
            statusText?: string;
            data?: unknown;
          };
          message?: string;
          config?: {
            url?: string;
            method?: string;
            headers?: Record<string, unknown>;
          };
        };
        console.error("🔍 DEBUG: Error details:", {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          message: axiosError.message,
          config: {
            url: axiosError.config?.url,
            method: axiosError.config?.method,
            headers: axiosError.config?.headers,
          },
        });
      }
      setSearchableUsers([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Fungsi untuk load semua users
  const loadAllUsers = async () => {
    try {
      setSearchingUsers(true);
      console.log("🔍 DEBUG: Loading all users...");
      console.log("🔍 DEBUG: Current user for filtering:", user);

      const response = await api.get("/users");
      console.log("🔍 DEBUG: All users response:", response.data);

      // Filter out current user (author) dari all users
      const filteredUsers = (response.data || []).filter(
        (userItem: User) => userItem.id !== (user?.id || 0)
      );
      console.log(
        "🔍 DEBUG: After filtering author from all users:",
        filteredUsers
      );

      setSearchableUsers(filteredUsers);
    } catch (error) {
      console.error("Error loading all users:", error);
      setSearchableUsers([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Fungsi untuk handle user search
  const handleUserSearch = (query: string) => {
    setUserSearchQuery(query);
    if (query.trim()) {
      searchUsers(query);
    } else {
      // Jika search kosong, load semua user
      loadAllUsers();
    }
  };

  // Debounced search untuk performance
  const debouncedSearch = React.useCallback(
    React.useMemo(() => {
      let timeoutId: NodeJS.Timeout;
      return (query: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (query.trim()) {
            searchUsers(query);
          } else {
            loadAllUsers();
          }
        }, 300);
      };
    }, []),
    []
  );

  // Handle search input change dengan debounce
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setUserSearchQuery(query);
    debouncedSearch(query);
  };

  // Fungsi untuk select/deselect user
  const toggleUserSelection = (userId: number) => {
    setFormData((prev) => ({
      ...prev,
      selected_users: prev.selected_users.includes(userId)
        ? prev.selected_users.filter((id) => id !== userId)
        : [...prev.selected_users, userId],
    }));
  };

  // Fungsi untuk select all dosen
  const handleSelectAllDosen = () => {
    if (selectAllDosen) {
      // Deselect all dosen
      setFormData((prev) => ({
        ...prev,
        selected_users: prev.selected_users.filter((userId) => {
          const user = searchableUsers.find((u) => u.id === userId);
          return user && user.role !== "Dosen";
        }),
      }));
      setSelectAllDosen(false);
    } else {
      // Select all dosen
      const dosenIds = searchableUsers
        .filter((user) => user.role === "Dosen")
        .map((user) => user.id);

      setFormData((prev) => ({
        ...prev,
        selected_users: [...new Set([...prev.selected_users, ...dosenIds])],
      }));
      setSelectAllDosen(true);
    }
  };

  const handleLike = async (forumId: number) => {
    if (!user) return;

    try {
      const response = await api.post(`/forum/${forumId}/like`);
      if (response.data.success) {
        // Update local state
        setForumLikes((prev) => ({
          ...prev,
          [forumId]: response.data.data.is_liked,
        }));

        // Update forum likes count
        setForums((prev) =>
          prev.map((forum) =>
            forum.id === forumId
              ? { ...forum, likes_count: response.data.data.likes_count }
              : forum
          )
        );
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleBookmark = async (forumId: number) => {
    if (!user) return;

    try {
      const response = await api.post(`/forum/${forumId}/bookmark`);
      if (response.data.success) {
        // Update local state
        setForumBookmarks((prev) => ({
          ...prev,
          [forumId]: response.data.data.is_bookmarked,
        }));
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
    }
  };

  const filteredForums = forums.filter(
    (forum) =>
      searchQuery === "" ||
      forum.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      forum.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Memuat forum kategori...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FontAwesomeIcon
            icon={faComments}
            className="text-6xl text-gray-300 dark:text-gray-600 mb-4"
          />
          <p className="text-gray-600 dark:text-gray-400">Kategori forum tidak ditemukan</p>
          <button
            onClick={() => navigate("/forum-diskusi")}
            className="mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
          >
            Kembali ke Forum Diskusi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/forum-diskusi")}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Kembali ke Forum Diskusi
          </button>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mr-6"
                style={{ backgroundColor: `${category.color}20` }}
              >
                <FontAwesomeIcon
                  icon={getIconForCategory(category.slug)}
                  className="text-2xl"
                  style={{ color: category.color }}
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {category.name}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">{category.description}</p>
                <div className="flex items-center mt-3 space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>{forums.length} forum</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Create Forum Row */}
          <div className="flex items-center justify-between mb-6">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md mr-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faSearch} className="text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Cari forum diskusi"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Create Forum Button */}
            {canCreateForumInCategory() && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Buat Forum Baru
              </button>
            )}
          </div>
        </div>

        {/* Forums List */}
        {filteredForums.length > 0 ? (
          <div className="space-y-4">
            {filteredForums.map((forum) => (
              <motion.div
                key={forum.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative rounded-lg p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  forum.is_new
                    ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-400 dark:border-l-blue-500 shadow-sm"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
                onClick={() => navigateToForum(forum)}
              >
                {/* Simple Badge untuk forum baru */}
                {forum.is_new && (
                  <div className="absolute top-4 right-12">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  </div>
                )}

                {/* Delete Button - Pojok kanan atas */}
                {canDeleteForum(forum) && (
                  <div className="absolute top-4 right-4 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteForum(forum);
                      }}
                      className="p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Hapus forum"
                    >
                      <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {forum.status === "pinned" && (
                        <FontAwesomeIcon
                          icon={faFire}
                          className="text-orange-500 text-sm"
                        />
                      )}
                      {forum.access_type === "private" && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full">
                          🔒 Private
                        </span>
                      )}
                      <h3 className="text-xl font-semibold hover:text-blue-600 dark:hover:text-blue-400 text-gray-900 dark:text-white">
                        {forum.title}
                      </h3>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 mb-4">
                      {/* Clean content preview with subtle image indicator */}
                      <div className="flex items-center space-x-2 mb-3">
                        {/* Small image indicator */}
                        {forum.content.includes("<img") && (
                          <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-2.5 py-1.5 rounded-full shadow-sm transition-all duration-200 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700">
                            <svg
                              className="w-3.5 h-3.5 mr-1.5 text-blue-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="font-medium">
                              {(forum.content.match(/<img/g) || []).length}{" "}
                              gambar
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Clean text content */}
                      <div className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                        {forum.content
                          .replace(/<img[^>]*>/g, "") // Remove img tags
                          .replace(/<[^>]*>/g, "") // Remove all HTML tags
                          .trim()}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center">
                          <FontAwesomeIcon icon={faUser} className="mr-1" />
                          {forum.user.name}
                        </span>
                        <span className="flex items-center">
                          <FontAwesomeIcon icon={faEye} className="mr-1" />
                          {forum.views_count > 0 ? forum.views_count : ""}
                        </span>
                        <span className="flex items-center">
                          <FontAwesomeIcon icon={faReply} className="mr-1" />
                          {forum.replies_count}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLike(forum.id);
                          }}
                          className={`flex items-center space-x-1 transition-colors ${
                            forumLikes[forum.id]
                              ? "text-red-500 dark:text-red-400"
                              : "text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                          }`}
                          title={
                            forumLikes[forum.id] ? "Unlike forum" : "Like forum"
                          }
                        >
                          <FontAwesomeIcon icon={faHeart} className="mr-1" />
                          <span>{forum.likes_count}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBookmark(forum.id);
                          }}
                          className={`transition-colors ${
                            forumBookmarks[forum.id]
                              ? "text-yellow-500 dark:text-yellow-400"
                              : "text-gray-500 dark:text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400"
                          }`}
                          title={
                            forumBookmarks[forum.id]
                              ? "Hapus bookmark"
                              : "Bookmark forum"
                          }
                        >
                          <FontAwesomeIcon
                            icon={faBookmark}
                            className={`w-4 h-4 ${
                              forumBookmarks[forum.id] ? "fill-current" : ""
                            }`}
                          />
                        </button>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <FontAwesomeIcon icon={faClock} className="mr-1" />
                        {formatTimeAgo(forum.last_activity_at)}
                        {Boolean(forum.is_edited) && (
                          <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                            • diedit
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <FontAwesomeIcon
              icon={faComments}
              className="text-6xl text-gray-300 dark:text-gray-600 mb-4"
            />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery
                ? "Tidak ada forum yang cocok dengan pencarian"
                : "Belum ada forum di kategori ini"}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="flex space-x-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      currentPage === page
                        ? "bg-blue-600 dark:bg-blue-700 text-white"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Forum Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            {/* Overlay */}
            <div
              className="fixed inset-0 z-[100000] bg-gray-500/30 dark:bg-gray-500/50 backdrop-blur-md"
              onClick={() => setShowCreateModal(false)}
            ></div>
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-[100001]"
            >
              <form onSubmit={handleCreateForum}>
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Buat Forum Baru di {category?.name}
                  </h3>
                </div>

                <div className="px-6 py-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Judul Forum
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Masukkan judul forum yang menarik..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Konten/Deskripsi
                    </label>
                    <QuillEditor
                      value={formData.content}
                      onChange={(content) =>
                        setFormData({ ...formData, content })
                      }
                      placeholder="Jelaskan topik diskusi, pertanyaan, atau ide yang ingin Anda bagikan..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tipe Akses
                    </label>
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center text-gray-700 dark:text-gray-300">
                        <input
                          type="radio"
                          value="public"
                          checked={formData.access_type === "public"}
                          onChange={() => handleAccessTypeChange("public")}
                          className="mr-2 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                        />
                        Publik
                      </label>
                      <label className="flex items-center text-gray-700 dark:text-gray-300">
                        <input
                          type="radio"
                          value="private"
                          checked={formData.access_type === "private"}
                          onChange={() => handleAccessTypeChange("private")}
                          className="mr-2 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                        />
                        Privat
                      </label>
                    </div>
                  </div>

                  {formData.access_type === "private" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Pilih Pengguna yang Berhak Akses
                      </label>
                      <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="text-blue-800 dark:text-blue-300 text-sm font-medium mb-1">
                          ℹ️ Info Forum Private
                        </div>
                        <div className="text-blue-700 dark:text-blue-400 text-xs">
                          Forum private hanya bisa diakses oleh Anda (sebagai pembuat) dan pengguna yang dipilih. 
                          Pengguna lain tidak akan bisa melihat atau mengakses forum ini.
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <input
                          type="text"
                          placeholder="Cari pengguna (opsional)..."
                          value={userSearchQuery}
                          onChange={handleSearchInputChange}
                          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => handleUserSearch(userSearchQuery)}
                          className="ml-2 px-3 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          disabled={searchingUsers}
                        >
                          {searchingUsers ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Mencari...</span>
                            </div>
                          ) : (
                            <FontAwesomeIcon icon={faSearch} />
                          )}
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="selectAllDosen"
                              checked={selectAllDosen}
                              onChange={handleSelectAllDosen}
                              className="mr-2"
                            />
                            <label
                              htmlFor="selectAllDosen"
                              className="text-sm text-gray-700 dark:text-gray-300"
                            >
                              Pilih Semua Dosen
                            </label>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Total: {searchableUsers.length} pengguna
                          </span>
                        </div>

                        {searchingUsers ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-gray-600 dark:text-gray-400">
                              Memuat pengguna...
                            </span>
                          </div>
                        ) : (
                          <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                            {searchableUsers.length > 0 ? (
                              searchableUsers.map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                                >
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={formData.selected_users.includes(
                                        user.id
                                      )}
                                      onChange={() =>
                                        toggleUserSelection(user.id)
                                      }
                                      className="mr-3"
                                    />
                                    <div>
                                      <span className="font-medium text-gray-900 dark:text-white">
                                        {user.name}
                                      </span>
                                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                        ({user.role})
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                {userSearchQuery
                                  ? "Tidak ada pengguna yang cocok"
                                  : "Memuat daftar pengguna..."}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {formData.selected_users.length > 0 && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Pengguna yang Dipilih (
                            {formData.selected_users.length})
                          </label>
                          <div className="flex flex-wrap gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            {formData.selected_users.map((userId) => {
                              const user = searchableUsers.find(
                                (u) => u.id === userId
                              );
                              return user ? (
                                <div
                                  key={user.id}
                                  className="flex items-center bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-sm"
                                >
                                  <FontAwesomeIcon
                                    icon={faUser}
                                    className="mr-1"
                                  />
                                  {user.name}
                                  <button
                                    type="button"
                                    onClick={() => toggleUserSelection(user.id)}
                                    className="ml-2 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({
                        title: "",
                        content: "",
                        access_type: "public",
                        selected_users: [],
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={
                      uploading ||
                      !formData.title.trim() ||
                      !formData.content.trim()
                    }
                    className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? "Mengupload..." : "Buat Forum"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Forum Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && forumToDelete && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            {/* Overlay */}
            <div
              className="fixed inset-0 z-[100000] bg-gray-500/30 dark:bg-gray-500/50 backdrop-blur-md"
              onClick={() => setShowDeleteModal(false)}
            ></div>

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full z-[100001]"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <FontAwesomeIcon
                      icon={faTrash}
                      className="text-red-600 dark:text-red-400 text-lg"
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Hapus Forum
                  </h3>
                </div>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div className="space-y-3">
                  <p className="text-gray-700 dark:text-gray-300">
                    Apakah Anda yakin ingin menghapus forum ini?
                  </p>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border-l-4 border-l-red-400 dark:border-l-red-500">
                    <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                      "{forumToDelete.title}"
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Oleh: {forumToDelete.user.name}
                    </p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-red-700 dark:text-red-300 text-sm font-medium">
                      ⚠️ PERINGATAN!
                    </p>
                    <p className="text-red-600 dark:text-red-400 text-sm">
                      SEMUA {forumToDelete.replies_count} BALASAN DI DALAMNYA
                      AKAN HILANG PERMANEN!
                    </p>
                    <p className="text-red-600 dark:text-red-400 text-sm mt-2">
                      Tindakan ini tidak dapat dibatalkan.
                    </p>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">
                    Apakah Anda yakin ingin melanjutkan?
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteForum}
                  disabled={deletingForum}
                  className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingForum ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Menghapus...</span>
                    </div>
                  ) : (
                    <span>Ya, Hapus Forum</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ForumCategory;
