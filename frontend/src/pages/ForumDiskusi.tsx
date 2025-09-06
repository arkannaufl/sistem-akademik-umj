import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faComments,
  faUsers,
  faUser,
  faGraduationCap,
  faSearch,
  faEye,
  faReply,
  faClock,
  faFire,
  faHeart,
} from "@fortawesome/free-solid-svg-icons";
import * as faSolid from "@fortawesome/free-solid-svg-icons";
import * as faRegular from "@fortawesome/free-regular-svg-icons";
import * as faBrands from "@fortawesome/free-brands-svg-icons";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";
import IconPicker from "../components/IconPicker";

interface ForumCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  is_default: boolean;
  is_active: boolean;
  permissions: string[];
  sort_order: number;
  forums_count: number;
  active_forums_count: number;
  forums: Forum[];
}

interface Forum {
  id: number;
  title: string;
  content: string;
  slug: string;
  category_id: number;
  user_id: number;
  status: "active" | "closed" | "pinned" | "archived";
  views_count: number;
  replies_count: number;
  likes_count: number;
  is_liked?: boolean;
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
  category: {
    id: number;
    name: string;
    slug: string;
    color: string;
  };
}

interface User {
  id: number;
  name: string;
  role: string;
}

const ForumDiskusi: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<ForumCategory | null>(null);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // State untuk real-time update waktu
  const [currentTime, setCurrentTime] = useState(new Date());

  // State untuk like tracking
  const [forumLikes, setForumLikes] = useState<{ [key: number]: boolean }>({});

  // Form states
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category_id: "",
  });

  // Form state untuk create category
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
    icon: "solid:faComments",
    color: "#3B82F6",
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time update waktu setiap menit
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update setiap 1 menit (60000ms)

    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Debug logging
      console.log("🔍 DEBUG: Starting fetchData");
      console.log("🔍 DEBUG: API base URL:", api.defaults.baseURL);
      console.log("🔍 DEBUG: Token exists:", !!localStorage.getItem("token"));

      // Fetch categories dan user info secara parallel
      const [categoriesResponse, userResponse] = await Promise.all([
        api.get("/forum/categories"),
        api.get("/me"),
      ]);

      setCategories(categoriesResponse.data.data);
      setUser(userResponse.data);

      // Debug: Log forum data untuk access control
      console.log(
        "🔍 DEBUG: Categories data from API:",
        categoriesResponse.data.data
      );
      categoriesResponse.data.data.forEach((category: ForumCategory) => {
        if (category.forums) {
          console.log(
            `🔍 DEBUG: Category ${category.name} forums:`,
            category.forums
          );
          category.forums.forEach((forum: Forum) => {
            console.log(`🔍 DEBUG: Forum ${forum.id} (${forum.title}):`, {
              access_type: forum.access_type,
              allowed_users: forum.allowed_users,
              user_id: forum.user?.id,
              current_user_id: userResponse.data?.id,
            });
          });
        }
      });

      // Set forum likes state - convert null to false
      const likesMap: { [key: number]: boolean } = {};
      categoriesResponse.data.data.forEach((category: ForumCategory) => {
        if (category.forums) {
          category.forums.forEach((forum: Forum) => {
            likesMap[forum.id] = Boolean(forum.is_liked);
          });
        }
      });
      setForumLikes(likesMap);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      console.error("🔍 DEBUG: Error details:", {
        message: error?.message,
        response: error?.response,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        config: error?.config
      });
      setError("Gagal memuat data forum");
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

  const getIconFromCategory = (category: ForumCategory) => {
    if (category.icon && category.icon.includes(":")) {
      return getIconFromString(category.icon);
    }
    // Fallback untuk icon lama
    return getIconForCategory(category.slug);
  };

  const canCreateForumInCategory = (category: ForumCategory): boolean => {
    if (!user) {
      return false;
    }

    return category.permissions.includes(user.role);
  };

  const canCreateNewCategory = (): boolean => {
    if (!user) return false;
    // Hanya Super Admin dan Tim Akademik yang bisa buat kategori baru
    return user.role === "super_admin" || user.role === "tim_akademik";
  };

  // Helper functions untuk icon
  const getIconFromString = (iconString: string) => {
    try {
      const [category, iconName] = iconString.split(":");
      if (category === "solid" && faSolid[iconName as keyof typeof faSolid]) {
        return faSolid[iconName as keyof typeof faSolid];
      } else if (
        category === "regular" &&
        faRegular[iconName as keyof typeof faRegular]
      ) {
        return faRegular[iconName as keyof typeof faRegular];
      } else if (
        category === "brands" &&
        faBrands[iconName as keyof typeof faBrands]
      ) {
        return faBrands[iconName as keyof typeof faBrands];
      }
      return faSolid.faComments; // fallback
    } catch {
      return faSolid.faComments; // fallback
    }
  };

  const getIconDisplayName = (iconString: string) => {
    try {
      const [, iconName] = iconString.split(":");
      return iconName
        .replace(/^fa/, "")
        .replace(/([A-Z])/g, " $1")
        .trim();
    } catch {
      return "Comments";
    }
  };

  const handleCreateForum = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post("/forum", formData);

      // Reset form dan tutup modal
      setFormData({ title: "", content: "", category_id: "" });
      setShowCreateModal(false);
      setSelectedCategory(null);

      // Refresh data
      fetchData();
    } catch (error) {
      console.error("Error creating forum:", error);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post("/forum/categories", categoryFormData);

      // Reset form dan tutup modal
      setCategoryFormData({
        name: "",
        description: "",
        icon: "comments",
        color: "#3B82F6",
      });
      setShowCreateCategoryModal(false);

      // Refresh data
      fetchData();
    } catch (error) {
      console.error("Error creating category:", error);
    }
  };

  const openCreateModal = (category: ForumCategory) => {
    if (!canCreateForumInCategory(category)) return;

    setSelectedCategory(category);
    setFormData({ ...formData, category_id: category.id.toString() });
    setShowCreateModal(true);
  };

  const navigateToForum = (forum: Forum) => {
    navigate(`/forum/${forum.slug}`);
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

        // Update forum likes count in categories
        setCategories((prev) =>
          prev.map((category) => ({
            ...category,
            forums: category.forums?.map((forum) =>
              forum.id === forumId
                ? { ...forum, likes_count: response.data.data.likes_count }
                : forum
            ),
          }))
        );
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Memuat forum diskusi...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Terjadi Kesalahan</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchData();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <FontAwesomeIcon
                  icon={faComments}
                  className="mr-3 text-blue-600"
                />
                Forum Diskusi
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Ruang diskusi untuk berbagi ide, pertanyaan, dan solusi
              </p>
            </div>
          </div>

          {/* Search Bar dan Tombol Buat Kategori */}
          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FontAwesomeIcon icon={faSearch} className="text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  placeholder="Cari forum diskusi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Tombol Buat Kategori Forum Baru */}
            {canCreateNewCategory() && (
              <button
                onClick={() => setShowCreateCategoryModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors flex-shrink-0"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Buat Kategori Forum Baru
              </button>
            )}
          </div>
        </div>

        {/* Forum Categories */}
        <div className="space-y-6">
          {categories.map((category) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/forum/category/${category.slug}`)}
            >
              {/* Category Header */}
              <div
                className="px-6 py-4 border-b border-gray-200 dark:border-gray-700"
                style={{
                  borderLeftColor: category.color,
                  borderLeftWidth: "4px",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mr-4"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <FontAwesomeIcon
                        icon={getIconFromCategory(category) as IconDefinition}
                        className="text-xl"
                        style={{ color: category.color }}
                      />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {category.name}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                        {category.description}
                      </p>
                      <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>{category.active_forums_count} forum aktif</span>
                        <span>•</span>
                        <span>{category.forums?.length || 0} total forum</span>
                      </div>
                    </div>
                  </div>

                  {canCreateForumInCategory(category) && (
                    <button
                      onClick={() => openCreateModal(category)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      <FontAwesomeIcon icon={faPlus} className="mr-2" />
                      Buat Forum Baru
                    </button>
                  )}
                </div>
              </div>

              {/* Forum List */}
              <div className="p-6">
                {category.forums && category.forums.length > 0 ? (
                  <div className="space-y-4">
                    {category.forums
                      .filter(
                        (forum) =>
                          searchQuery === "" ||
                          forum.title
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                          forum.content
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())
                      )
                      .slice(0, 3) // Show only first 3 forums (reduced from 5)
                      .map((forum) => (
                        <motion.div
                          key={forum.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`relative rounded-lg p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
                            forum.is_new
                              ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-400 shadow-sm"
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
                                  <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                                    🔒 Private
                                  </span>
                                )}
                                <h3 className="text-xl font-semibold hover:text-blue-600 text-gray-900 dark:text-white dark:hover:text-blue-400">
                                  {forum.title}
                                </h3>
                              </div>
                              <div className="text-gray-600 dark:text-gray-300 mb-4">
                                {/* Clean content preview with subtle image indicator */}
                                <div className="flex items-center space-x-2 mb-3">
                                  {/* Small image indicator */}
                                  {forum.content.includes("<img") && (
                                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-2.5 py-1.5 rounded-full shadow-sm transition-all duration-200 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700">
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
                                        {
                                          (forum.content.match(/<img/g) || [])
                                            .length
                                        }{" "}
                                        gambar
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Clean text content */}
                                <div className="text-gray-600 leading-relaxed text-sm">
                                  {forum.content
                                    .replace(/<img[^>]*>/g, "") // Remove img tags
                                    .replace(/<[^>]*>/g, "") // Remove all HTML tags
                                    .trim()}
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                  <span className="flex items-center">
                                    <FontAwesomeIcon
                                      icon={faUser}
                                      className="mr-1"
                                    />
                                    {forum.user.name}
                                  </span>
                                  <span className="flex items-center">
                                    <FontAwesomeIcon
                                      icon={faEye}
                                      className="mr-1"
                                    />
                                    {forum.views_count > 0
                                      ? forum.views_count
                                      : ""}
                                  </span>
                                  <span className="flex items-center">
                                    <FontAwesomeIcon
                                      icon={faReply}
                                      className="mr-1"
                                    />
                                    {forum.replies_count}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleLike(forum.id);
                                    }}
                                    className={`flex items-center space-x-1 transition-colors ${
                                      forumLikes[forum.id]
                                        ? "text-red-500"
                                        : "text-gray-500 dark:text-gray-400 hover:text-red-500"
                                    }`}
                                    title={
                                      forumLikes[forum.id]
                                        ? "Unlike forum"
                                        : "Like forum"
                                    }
                                  >
                                    <FontAwesomeIcon
                                      icon={faHeart}
                                      className="mr-1"
                                    />
                                    <span>{forum.likes_count}</span>
                                  </button>
                                </div>
                                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                  <FontAwesomeIcon
                                    icon={faClock}
                                    className="mr-1"
                                  />
                                  {formatTimeAgo(forum.last_activity_at)}
                                  {Boolean(forum.is_edited) && (
                                    <span className="text-gray-400 text-xs ml-2">
                                      • diedit
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}

                    {category.forums.length > 3 && (
                      <div className="text-center pt-4">
                        <button
                          onClick={() =>
                            navigate(`/forum/category/${category.slug}`)
                          }
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          Lihat semua forum di {category.name} →
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <FontAwesomeIcon
                      icon={faComments}
                      className="text-6xl text-gray-300 mb-4"
                    />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      Belum ada forum di kategori ini
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Create Category Modal */}
      <AnimatePresence>
        {showCreateCategoryModal && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            {/* Overlay */}
            <div
              className="fixed inset-0 z-[100000] bg-gray-500/30 dark:bg-gray-500/50 backdrop-blur-md"
              onClick={() => setShowCreateCategoryModal(false)}
            ></div>
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-[100001]"
            >
              <form onSubmit={handleCreateCategory}>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Buat Kategori Forum Baru
                  </h3>
                </div>

                <div className="px-6 py-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Kategori
                    </label>
                    <input
                      type="text"
                      required
                      value={categoryFormData.name}
                      onChange={(e) =>
                        setCategoryFormData({
                          ...categoryFormData,
                          name: e.target.value,
                        })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Contoh: Forum Diskusi Tim Akademik"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deskripsi
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={categoryFormData.description}
                      onChange={(e) =>
                        setCategoryFormData({
                          ...categoryFormData,
                          description: e.target.value,
                        })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Jelaskan tujuan dan target audience kategori ini..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Icon
                      </label>
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowIconPicker(true)}
                          className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                        >
                          <FontAwesomeIcon
                            icon={
                              getIconFromString(
                                categoryFormData.icon
                              ) as IconDefinition
                            }
                            className="text-lg"
                          />
                          <span className="text-sm text-gray-700">
                            {getIconDisplayName(categoryFormData.icon)}
                          </span>
                          <FontAwesomeIcon
                            icon={faPlus}
                            className="text-xs text-gray-500 dark:text-gray-400"
                          />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Warna Tema
                      </label>
                      <input
                        type="color"
                        value={categoryFormData.color}
                        onChange={(e) =>
                          setCategoryFormData({
                            ...categoryFormData,
                            color: e.target.value,
                          })
                        }
                        className="block w-full h-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateCategoryModal(false);
                      setCategoryFormData({
                        name: "",
                        description: "",
                        icon: "solid:faComments",
                        color: "#3B82F6",
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  >
                    Buat Kategori
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Icon Picker Modal */}
      {showIconPicker && (
        <IconPicker
          value={categoryFormData.icon}
          onChange={(iconName) =>
            setCategoryFormData({ ...categoryFormData, icon: iconName })
          }
          onClose={() => setShowIconPicker(false)}
        />
      )}

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
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Buat Forum Baru di {selectedCategory?.name}
                  </h3>
                </div>

                <div className="px-6 py-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Judul Forum
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Masukkan judul forum yang menarik..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Konten/Deskripsi
                    </label>
                    <textarea
                      required
                      rows={6}
                      value={formData.content}
                      onChange={(e) =>
                        setFormData({ ...formData, content: e.target.value })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Jelaskan topik diskusi, pertanyaan, atau ide yang ingin Anda bagikan..."
                    />
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedCategory(null);
                      setFormData({ title: "", content: "", category_id: "" });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Buat Forum
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ForumDiskusi;
