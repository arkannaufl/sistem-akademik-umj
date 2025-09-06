import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import {
  faArrowLeft,
  faUser,
  faCalendar,
  faFolder,
  faReply,
  faBookmark as faBookmarkSolid,
  faSearch,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface BookmarkedReply {
  id: number;
  user_id: number;
  forum_reply_id: number;
  created_at: string;
  updated_at: string;
  reply: {
    id: number;
    forum_id: number;
    user_id: number;
    parent_id: number | null;
    content: string;
    attachments: string | null;
    is_anonymous: boolean;
    status: string;
    likes_count: number;
    edited_at: string | null;
    edited_by: number | null;
    created_at: string;
    updated_at: string;
    user: {
      id: number;
      name: string;
      role: string;
      avatar: string | null;
    };
    forum: {
      id: number;
      title: string;
      slug: string;
      category_id: number;
      category: {
        id: number;
        name: string;
        slug: string;
        color: string;
      };
    };
    parent: {
      id: number;
      content: string;
      user: {
        id: number;
        name: string;
      };
    } | null;
  };
}

interface BookmarkedForum {
  id: number;
  user_id: number;
  forum_id: number;
  created_at: string;
  updated_at: string;
  forum: {
    id: number;
    title: string;
    slug: string;
    user: {
      id: number;
      name: string;
      role: string;
      avatar: string | null;
    };
    category: {
      id: number;
      name: string;
      slug: string;
      color: string;
    };
  };
}

const Bookmarks: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkedReply[]>([]);
  const [forumBookmarks, setForumBookmarks] = useState<BookmarkedForum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "forum" | "reply">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchBookmarks(), fetchForumBookmarks()]);
      } catch (error) {
        console.error("Error fetching all data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const fetchBookmarks = async () => {
    try {
      console.log("=== STARTING FETCH BOOKMARKS ===");

      const token = localStorage.getItem("token");
      console.log("Token from localStorage:", token);

      if (!token) {
        console.log("No token found, redirecting to login");
        navigate("/login");
        return;
      }

      const response = await api.get("/forum/bookmarks");

      if (response.data.success) {
        setBookmarks(response.data.data.data || []);
        console.log(
          "Bookmarks state updated with:",
          response.data.data.data || []
        );
      } else {
        console.log("API response not successful:", response.data);
      }
    } catch (error: unknown) {
      console.error("=== ERROR FETCHING BOOKMARKS ===");
      console.error("Error details:", error);

      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { status?: number; data?: unknown };
        };
        console.log("Axios error status:", axiosError.response?.status);

        if (axiosError.response?.status === 401) {
          console.log("401 Unauthorized, redirecting to login");
          navigate("/login");
        } else {
          setError("Gagal mengambil data bookmark");
        }
      } else {
        setError("Gagal mengambil data bookmark");
      }
      console.log("=== FETCH BOOKMARKS COMPLETED ===");
    }
  };

  const fetchForumBookmarks = async () => {
    try {
      console.log("=== STARTING FETCH FORUM BOOKMARKS ===");

      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found for forum bookmarks");
        return;
      }

      const response = await api.get("/forum/bookmarks/forums/simple");

      if (response.data.success) {
        const forumBookmarksData = response.data.data || [];
        setForumBookmarks(forumBookmarksData);
        console.log("Forum bookmarks state updated with:", forumBookmarksData);
      } else {
        console.log(
          "Forum bookmarks API response not successful:",
          response.data
        );
      }
    } catch (error: unknown) {
      console.error("=== ERROR FETCHING FORUM BOOKMARKS ===");
      console.error("Error details:", error);
    }
  };

  const removeForumBookmark = async (bookmarkId: number) => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      // Find the forum ID from the bookmark
      const bookmark = forumBookmarks.find((b) => b.id === bookmarkId);
      if (!bookmark) return;

      await api.post(
        `/forum/${bookmark.forum_id}/bookmark`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Remove from local state
      setForumBookmarks((prev) =>
        prev.filter((bookmark) => bookmark.id !== bookmarkId)
      );
    } catch (error: unknown) {
      console.error("Error removing forum bookmark:", error);
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 401) {
          navigate("/login");
        }
      }
    }
  };

  const removeBookmark = async (replyId: number) => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      await api.post(
        `/replies/${replyId}/bookmark`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Remove from local state
      setBookmarks((prev) =>
        prev.filter((bookmark) => bookmark.id !== replyId)
      );
    } catch (error: unknown) {
      console.error("Error removing bookmark:", error);
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 401) {
          navigate("/login");
        }
      }
    }
  };

  const goToForum = (slug: string) => {
    navigate(`/forum/${slug}`);
  };

  // Filter bookmarks based on search query and active filter
  const filteredBookmarks = bookmarks.filter((bookmark) => {
    const matchesSearch =
      searchQuery === "" ||
      bookmark.reply.content
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      bookmark.reply.forum.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      bookmark.reply.forum.category.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      bookmark.reply.user.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesFilter = activeFilter === "all" || activeFilter === "reply";

    return matchesSearch && matchesFilter;
  });

  const filteredForumBookmarks = forumBookmarks.filter((bookmark) => {
    const matchesSearch =
      searchQuery === "" ||
      bookmark.forum.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.forum.category.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      bookmark.forum.user.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesFilter = activeFilter === "all" || activeFilter === "forum";

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat bookmark...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchBookmarks}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FontAwesomeIcon
                  icon={faArrowLeft}
                  className="w-5 h-5 text-gray-600"
                />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Bookmarks
                </h1>
                <p className="text-sm text-gray-500">
                  {filteredBookmarks.length + filteredForumBookmarks.length}{" "}
                  bookmark yang disimpan
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {bookmarks.length === 0 && forumBookmarks.length === 0 ? (
          <div className="text-center py-12">
            <FontAwesomeIcon
              icon={faBookmarkSolid}
              className="w-16 h-16 text-yellow-400 mx-auto mb-4"
            />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Belum ada bookmark
            </h3>
            <p className="text-gray-500 mb-6">
              Mulai bookmark forum atau reply yang menarik untuk disimpan nanti
            </p>
            <button
              onClick={() => navigate("/forum-diskusi")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Jelajahi Forum
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon
                  icon={faSearch}
                  className="h-5 w-5 text-gray-400"
                />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Cari bookmark berdasarkan judul, konten, kategori, atau nama user..."
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                All ({filteredBookmarks.length + filteredForumBookmarks.length})
              </button>
              <button
                onClick={() => setActiveFilter("forum")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === "forum"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Forum ({filteredForumBookmarks.length})
              </button>
              <button
                onClick={() => setActiveFilter("reply")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === "reply"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Reply ({filteredBookmarks.length})
              </button>
            </div>

            {/* Search Results Info */}
            {searchQuery && (
              <div className="text-sm text-gray-600 mb-4">
                Hasil pencarian untuk "{searchQuery}":{" "}
                {filteredBookmarks.length + filteredForumBookmarks.length}{" "}
                bookmark ditemukan
              </div>
            )}

            {/* Forum Bookmarks */}
            {activeFilter !== "reply" && filteredForumBookmarks.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">
                  Forum Bookmarks
                </h4>
                {filteredForumBookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-all duration-200"
                  >
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <div className="flex items-center space-x-3 mb-2">
                        <FontAwesomeIcon
                          icon={faFolder}
                          className="w-4 h-4 text-gray-400"
                        />
                        <span
                          className="text-sm font-medium text-gray-600 cursor-pointer hover:text-blue-600 transition-colors duration-200"
                          onClick={() => goToForum(bookmark.forum.slug)}
                        >
                          {bookmark.forum.category.name}
                        </span>
                      </div>
                      <h3
                        className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors duration-200"
                        onClick={() => goToForum(bookmark.forum.slug)}
                      >
                        {bookmark.forum.title}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <FontAwesomeIcon icon={faUser} className="w-4 h-4" />
                          <span className="font-medium">
                            {bookmark.forum.user.name}
                          </span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                            {bookmark.forum.user.role}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FontAwesomeIcon
                            icon={faCalendar}
                            className="w-4 h-4"
                          />
                          <span>
                            {formatDistanceToNow(
                              new Date(bookmark.created_at),
                              {
                                addSuffix: true,
                                locale: id,
                              }
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => goToForum(bookmark.forum.slug)}
                          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Lihat Forum
                        </button>
                        <button
                          onClick={() => removeForumBookmark(bookmark.id)}
                          className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Hapus Bookmark
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Bookmarks */}
            {activeFilter !== "forum" &&
              filteredBookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-all duration-200"
                >
                  {/* Forum Info */}
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3 mb-2">
                      <FontAwesomeIcon
                        icon={faFolder}
                        className="w-4 h-4 text-gray-400"
                      />
                      <span
                        className="text-sm font-medium text-gray-600 cursor-pointer hover:text-blue-600 transition-colors duration-200"
                        onClick={() => goToForum(bookmark.reply.forum.slug)}
                      >
                        {bookmark.reply.forum.category.name}
                      </span>
                    </div>
                    <h3
                      className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors duration-200"
                      onClick={() => goToForum(bookmark.reply.forum.slug)}
                    >
                      {bookmark.reply.forum.title}
                    </h3>
                  </div>

                  {/* Reply Content */}
                  <div className="mb-4">
                    {bookmark.reply.parent && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg border-l-4 border-l-blue-400">
                        <p className="text-sm text-gray-600 mb-1">
                          <FontAwesomeIcon
                            icon={faReply}
                            className="w-3 h-3 mr-1"
                          />
                          Balasan untuk:{" "}
                          <span className="font-medium">
                            {bookmark.reply.parent.user.name}
                          </span>
                        </p>
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {bookmark.reply.parent.content}
                        </p>
                      </div>
                    )}

                    <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-l-blue-400">
                      <p className="text-gray-800">{bookmark.reply.content}</p>
                    </div>
                  </div>

                  {/* Reply Meta */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <FontAwesomeIcon icon={faUser} className="w-4 h-4" />
                        <span className="font-medium">
                          {bookmark.reply.user.name}
                        </span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                          {bookmark.reply.user.role}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FontAwesomeIcon
                          icon={faCalendar}
                          className="w-4 h-4"
                        />
                        <span>
                          {formatDistanceToNow(
                            new Date(bookmark.reply.created_at),
                            {
                              addSuffix: true,
                              locale: id,
                            }
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => goToForum(bookmark.reply.forum.slug)}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Lihat Forum
                      </button>
                      <button
                        onClick={() => removeBookmark(bookmark.id)}
                        className="p-2 text-yellow-500 hover:bg-yellow-50 rounded-lg transition-colors"
                        title="Hapus bookmark"
                      >
                        <FontAwesomeIcon
                          icon={faBookmarkSolid}
                          className="w-4 h-4"
                        />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

            {/* No Results Message */}
            {searchQuery &&
              filteredBookmarks.length === 0 &&
              filteredForumBookmarks.length === 0 && (
                <div className="text-center py-12">
                  <FontAwesomeIcon
                    icon={faSearch}
                    className="w-16 h-16 text-gray-300 mx-auto mb-4"
                  />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Tidak ada hasil ditemukan
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Coba ubah kata kunci pencarian Anda
                  </p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Hapus Pencarian
                  </button>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookmarks;
