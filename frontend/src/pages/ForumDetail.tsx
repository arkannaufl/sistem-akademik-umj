import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faEye,
  faEyeSlash,
  faReply,
  faClock,
  faUser,
  faHeart,
  faBookmark,
  faPaperPlane,
  faComments,
  faSearch,
  faPlus,
  faImage,
  faFile,
  faTimes,
  faEdit,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import api from "../utils/api";
import { useNavigate, useParams } from "react-router-dom";
import QuillViewer from "../components/QuillViewer";
import QuillEditor from "../components/QuillEditor";

interface Forum {
  id: number;
  title: string;
  content: string;
  slug: string;
  status: "active" | "closed" | "pinned" | "archived";
  views_count: number;
  replies_count: number;
  likes_count: number;
  last_activity_at: string;
  created_at: string;
  edited_at?: string;
  is_edited?: boolean;
  is_new?: boolean;
  deadline?: string;
  access_type?: "public" | "private";
  allowed_users?: number[];
  attachments?: Array<{
    id: number;
    filename: string;
    original_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
  }>;
  user: {
    id: number;
    name: string;
    role: string;
  };
  category: {
    id: number;
    name: string;
    slug: string;
    color: string;
  };
}

interface ForumReply {
  id: number;
  content: string;
  created_at: string;
  edited_at?: string;
  likes_count: number;
  is_edited: boolean;
  nested_level: number;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  parent_id?: number;
  parent?: {
    id: number;
    user: {
      id: number;
      name: string;
      role: string;
    };
    content: string;
  };
  user: {
    id: number;
    name: string;
    role: string;
  };
  editor?: {
    id: number;
    name: string;
  };
  children: ForumReply[];
  attachments?: Array<{
    id: number;
    filename: string;
    original_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
  }>;
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

// Recursive Reply Component untuk Unlimited Nesting
interface RecursiveReplyProps {
  reply: ForumReply;
  level: number;
  onLike: (replyId: number) => void;
  likedReplies: Set<number>;
  onReply: (replyId: number) => void;
  replyingTo: number | null;
  onCancelReply: () => void;
  onSubmitReply: (e: React.FormEvent) => void;
  uploadedFiles: File[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  replyContent: string;
  setReplyContent: React.Dispatch<React.SetStateAction<string>>;
  submittingReply: boolean;
  showUploadDropdown: boolean;
  setShowUploadDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeUploadedFile: (index: number) => void;
  formatFileSize: (bytes: number) => string;
  // Edit & Delete props
  onEdit: (reply: ForumReply) => void;
  onDelete: (reply: ForumReply) => void;
  canEdit: (reply: ForumReply) => boolean;
  canDelete: (reply: ForumReply) => boolean;
  // Bookmark props
  handleReplyBookmark: (replyId: number) => void;
}

const RecursiveReplyComponent: React.FC<RecursiveReplyProps> = ({
  reply,
  level,
  onLike,
  likedReplies,
  onReply,
  replyingTo,
  onCancelReply,
  onSubmitReply,
  uploadedFiles,
  setUploadedFiles,
  replyContent,
  setReplyContent,
  submittingReply,
  showUploadDropdown,
  setShowUploadDropdown,
  handleImageUpload,
  handleFileUpload,
  removeUploadedFile,
  formatFileSize,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  handleReplyBookmark,
}) => {
  // Format time ago function - menggunakan currentTime dari parent
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date(); // Fallback jika currentTime tidak tersedia
    const diffMs = now.getTime() - date.getTime();
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

  // No margin left for all levels - all comments aligned
  const marginLeft = 0;

  return (
    <div style={{ marginLeft: `${marginLeft}px` }}>
      {/* Reply Content */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
          <div
            className={`${
              level === 1 ? "w-8 h-8" : "w-6 h-6"
            } bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm`}
          >
            {reply.user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white text-sm">
              {reply.user.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {reply.is_edited && reply.edited_at
                ? formatTimeAgo(reply.edited_at)
                : formatTimeAgo(reply.created_at)}
              {reply.is_edited && (
                <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">• diedit</span>
              )}
            </div>
            {/* Reply Context - Tampilkan "Balasan untuk komentar [nama user]" */}
            {reply.parent && (
              <div className="flex items-center mt-1 text-blue-600 dark:text-blue-400 text-xs">
                <FontAwesomeIcon icon={faReply} className="mr-1 w-3 h-3" />
                Balasan untuk komentar {reply.parent.user.name}
              </div>
            )}
          </div>
        </div>

        {/* Edit & Bookmark Buttons di Kanan Atas */}
        <div className="flex items-center space-x-1">
          {canEdit && canEdit(reply) && (
            <button
              onClick={() => onEdit && onEdit(reply)}
              className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
              title="Edit komentar"
            >
              <FontAwesomeIcon icon={faEdit} className="w-3 h-3" />
            </button>
          )}

          {/* Icon Bookmark di Pojok Kanan Atas */}
          <button
            onClick={() => handleReplyBookmark(reply.id)}
            className={`p-1 rounded transition-colors ${
              reply.is_bookmarked
                ? "text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                : "text-gray-400 dark:text-gray-500 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
            }`}
            title={reply.is_bookmarked ? "Hapus bookmark" : "Bookmark komentar"}
          >
            <FontAwesomeIcon
              icon={faBookmark}
              className={`w-3 h-3 ${reply.is_bookmarked ? "fill-current" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Reply Content */}
      <div className="prose max-w-none mb-3 text-sm">
        <QuillViewer content={reply.content} />

        {/* Display attachments */}
        {reply.attachments && reply.attachments.length > 0 && (
          <div className="mt-2">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Attachments ({reply.attachments.length}):
            </div>
            <div className="flex flex-wrap gap-2">
              {reply.attachments.map((attachment, index) => (
                <div
                  key={`recursive-reply-${reply.id}-attachment-${index}-${
                    attachment.original_name || "unknown"
                  }`}
                  className="inline-block p-1 bg-white dark:bg-gray-600 rounded border dark:border-gray-500"
                >
                  {attachment.file_type &&
                  attachment.file_type.startsWith("image/") ? (
                    <img
                      src={attachment.file_path}
                      alt={attachment.original_name}
                      className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() =>
                        window.open(attachment.file_path, "_blank")
                      }
                      title="Klik untuk lihat gambar penuh"
                    />
                  ) : (
                    <div className="text-center">
                      <FontAwesomeIcon
                        icon={faFile}
                        className="w-16 h-16 text-gray-500 mb-1"
                      />
                      <div className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate max-w-20 mb-1">
                        {attachment.original_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {attachment.file_size
                          ? formatFileSize(attachment.file_size)
                          : "Unknown size"}
                      </div>
                      <div className="flex justify-center">
                        <button
                          onClick={() =>
                            window.open(attachment.file_path, "_blank")
                          }
                          className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                          title="Buka file di tab baru"
                        >
                          Buka File
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => onLike(reply.id)}
          className={`flex items-center space-x-1 p-1 rounded-lg transition-colors ${
            likedReplies.has(reply.id)
              ? "text-red-500 bg-red-50 dark:bg-red-900/20"
              : "text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          }`}
          title={likedReplies.has(reply.id) ? "Unlike reply" : "Like reply"}
        >
          <FontAwesomeIcon icon={faHeart} className="w-3 h-3" />
          <span className="text-xs font-medium">{reply.likes_count || 0}</span>
        </button>

        <button
          onClick={() => onReply(reply.id)}
          className={`flex items-center space-x-1 p-1 rounded-lg transition-colors text-xs ${
            replyingTo === reply.id
              ? "text-blue-600 bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700"
              : "text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          }`}
          title={
            replyingTo === reply.id
              ? "Sedang reply ke komentar ini"
              : "Balas komentar ini"
          }
        >
          <FontAwesomeIcon icon={faReply} className="w-3 h-3" />
          <span className="text-xs font-medium">
            {replyingTo === reply.id ? "Sedang Reply..." : "Balas"}
          </span>
        </button>
      </div>

      {/* Icon Delete di Pojok Bawah */}
      {canDelete && canDelete(reply) && (
        <div className="flex justify-end mt-2">
          <button
            onClick={() => onDelete && onDelete(reply)}
            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="Hapus komentar"
          >
            <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Reply Form untuk Reply Ini */}
      {replyingTo === reply.id && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-blue-800">
              Balas ke komentar {reply.user.name}
            </h4>
            <button
              onClick={onCancelReply}
              className="text-blue-600 hover:text-blue-800 transition-colors p-1 rounded-full hover:bg-blue-100"
            >
              <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={onSubmitReply}>
            <div className="mb-3">
              <div className="flex items-center space-x-3">
                {/* Upload Button */}
                <div className="upload-dropdown-container">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowUploadDropdown(!showUploadDropdown)}
                      className="flex items-center justify-center w-10 h-10 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-600 hover:text-white transition-colors"
                      title="Upload file"
                    >
                      <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                    </button>

                    {/* Upload Dropdown */}
                    {showUploadDropdown && (
                      <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => {
                              const imageInput =
                                document.getElementById("image-upload-reply");
                              if (imageInput) {
                                imageInput.click();
                                console.log("🔍 DEBUG: Image input clicked");
                              } else {
                                console.error(
                                  "🔍 DEBUG: Image input not found!"
                                );
                              }
                              setShowUploadDropdown(false);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <FontAwesomeIcon
                              icon={faFile}
                              className="mr-3 w-4 h-4 text-green-600"
                            />
                            Images
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const fileInput =
                                document.getElementById("file-upload-reply");
                              if (fileInput) {
                                fileInput.click();
                                console.log("🔍 DEBUG: File input clicked");
                              } else {
                                console.error(
                                  "🔍 DEBUG: File input not found!"
                                );
                              }
                              setShowUploadDropdown(false);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <FontAwesomeIcon
                              icon={faFile}
                              className="mr-3 w-4 h-4 text-blue-600"
                            />
                            Files
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Textarea */}
                <div className="flex-1">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={2}
                                          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                    placeholder="Tulis balasan Anda..."
                    required
                  />
                </div>
              </div>
            </div>

            {/* Hidden file inputs */}
            <input
              id="image-upload-reply"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            <input
              id="file-upload-reply"
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Uploaded files preview */}
            {uploadedFiles.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">
                  File ({uploadedFiles.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="inline-block p-2 bg-white dark:bg-gray-600 rounded border dark:border-gray-500 relative"
                    >
                      {file.type.startsWith("image/") ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-24 h-24 object-cover rounded border"
                        />
                      ) : (
                        <div className="text-center">
                          <FontAwesomeIcon
                            icon={faFile}
                            className="w-16 h-16 text-gray-500 mb-2"
                          />
                          <div className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate max-w-20">
                            {file.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(file.size)}
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeUploadedFile(index)}
                        className="absolute -top-2 -right-2 text-red-500 hover:text-red-700 bg-white rounded-full p-1 hover:bg-red-50 border shadow-sm"
                      >
                        <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onCancelReply}
                                        className="px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/20 text-sm"
              >
                Selesai
              </button>
              <button
                type="submit"
                disabled={submittingReply || !replyContent.trim()}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {submittingReply ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                ) : (
                  <FontAwesomeIcon
                    icon={faPaperPlane}
                    className="mr-2 w-3 h-3"
                  />
                )}
                {submittingReply ? "Mengirim..." : "Kirim Balasan"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Recursive Children - Unlimited Nesting */}
      {reply.children && reply.children.length > 0 && (
        <div className="mt-4 space-y-3">
          {reply.children.map((childReply) => (
            <RecursiveReplyComponent
              key={childReply.id}
              reply={childReply}
              level={level + 1}
              onLike={onLike}
              likedReplies={likedReplies}
              onReply={onReply}
              replyingTo={replyingTo}
              onCancelReply={onCancelReply}
              onSubmitReply={onSubmitReply}
              uploadedFiles={uploadedFiles}
              setUploadedFiles={setUploadedFiles}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              submittingReply={submittingReply}
              showUploadDropdown={showUploadDropdown}
              setShowUploadDropdown={setShowUploadDropdown}
              handleImageUpload={handleImageUpload}
              handleFileUpload={handleFileUpload}
              removeUploadedFile={removeUploadedFile}
              formatFileSize={formatFileSize}
              onEdit={onEdit}
              onDelete={onDelete}
              canEdit={canEdit}
              canDelete={canDelete}
              handleReplyBookmark={handleReplyBookmark}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ForumDetail: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [forum, setForum] = useState<Forum | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [user, setUser] = useState<User | null>(null);
  // State untuk bookmark tracking (seperti ForumCategory.tsx)
  const [forumBookmarks, setForumBookmarks] = useState<{
    [key: number]: boolean;
  }>({});
  const [searchQuery, setSearchQuery] = useState("");

  // Reply form states
  const [replyContent, setReplyContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);

  // Upload states
  const [showUploadDropdown, setShowUploadDropdown] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // State untuk hide/show balasan per komentar
  const [hiddenReplies, setHiddenReplies] = useState<Set<number>>(new Set());

  // State untuk like
  const [likesCount, setLikesCount] = useState(0);
  const [isForumLiked, setIsForumLiked] = useState(false);
  const [likedReplies, setLikedReplies] = useState<Set<number>>(new Set());

  // State untuk edit mode
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [replyToDelete, setReplyToDelete] = useState<ForumReply | null>(null);
  const [replyToDeleteInfo, setReplyToDeleteInfo] = useState<{
    reply: ForumReply;
    totalReplies: number;
  } | null>(null);

  // State untuk auto-hide edit buttons untuk role Super Admin, Tim Akademik, Dosen setelah 2 menit
  const [hiddenEditButtons, setHiddenEditButtons] = useState<Set<number>>(
    new Set()
  );

  // State untuk modal delete forum utama
  const [showDeleteForumModal, setShowDeleteForumModal] = useState(false);

  // State untuk modal edit forum utama
  const [showEditForumModal, setShowEditForumModal] = useState(false);
  const [editForumTitle, setEditForumTitle] = useState("");
  const [editForumContent, setEditForumContent] = useState("");
  const [editForumAccessType, setEditForumAccessType] = useState<
    "public" | "private"
  >("public");
  const [editForumSelectedUsers, setEditForumSelectedUsers] = useState<
    number[]
  >([]);

  // State untuk access control di edit modal
  const [editSearchableUsers, setEditSearchableUsers] = useState<
    SearchableUser[]
  >([]);
  const [editSearchingUsers, setEditSearchingUsers] = useState(false);
  const [editUserSearchQuery, setEditUserSearchQuery] = useState("");
  const [editSelectAllDosen, setEditSelectAllDosen] = useState(false);

  // State untuk modal popup gambar forum
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // State untuk mode preview gambar forum
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // State untuk real-time update waktu
  const [currentTime, setCurrentTime] = useState(new Date());

  // Toast notification state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "warning" | "error">(
    "success"
  );

  useEffect(() => {
    if (slug) {
      fetchForumData();
    }
  }, [slug]);

  // Real-time update waktu setiap menit
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update setiap 1 menit (60000ms)

    return () => clearInterval(interval);
  }, []);

  // Close upload dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".upload-dropdown-container")) {
        setShowUploadDropdown(false);
      }
    };

    if (showUploadDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUploadDropdown]);

  // Auto-hide edit buttons untuk role Super Admin, Tim Akademik, Dosen setelah 2 menit
  useEffect(() => {
    if (!user || !["super_admin", "tim_akademik", "dosen"].includes(user.role))
      return;

    const checkAndHideButtons = () => {
      const now = new Date();
      const newHiddenButtons = new Set<number>();

      // Check semua replies untuk timing
      const checkReplies = (replies: ForumReply[]) => {
        replies.forEach((reply) => {
          const replyTime = new Date(reply.created_at);
          const diffInMinutes =
            (now.getTime() - replyTime.getTime()) / (1000 * 60);

          // Jika sudah lebih dari 2 menit, hide EDIT buttons (bukan delete)
          if (diffInMinutes > 2) {
            newHiddenButtons.add(reply.id);
          }

          // Check children replies juga
          if (reply.children && reply.children.length > 0) {
            checkReplies(reply.children);
          }
        });
      };

      checkReplies(replies);
      setHiddenEditButtons(newHiddenButtons);
    };

    // Check setiap 30 detik
    const interval = setInterval(checkAndHideButtons, 30000);

    // Initial check
    checkAndHideButtons();

    return () => clearInterval(interval);
  }, [user, replies]);

  const fetchForumData = async () => {
    try {
      setLoading(true);

      // Debug logging
      console.log("🔍 DEBUG: Fetching forum data for slug:", slug);
      console.log("🔍 DEBUG: API base URL:", api.defaults.baseURL);

      const [forumResponse, userResponse] = await Promise.all([
        api.get(`/forum/${slug}`),
        api.get("/me"),
      ]);

      console.log("🔍 DEBUG: Full forum response:", forumResponse.data);
      console.log(
        "🔍 DEBUG: Response data structure:",
        forumResponse.data.data
      );

      const forumData = forumResponse.data.data.forum;
      const repliesData = forumResponse.data.data.replies;

      // Load attachments for each reply
      console.log("🔍 DEBUG: Raw replies data:", repliesData);
      if (Array.isArray(repliesData)) {
        repliesData.forEach((reply, index) => {
          console.log(`🔍 DEBUG: Reply ${index} (ID: ${reply.id}):`, {
            content: reply.content?.substring(0, 50) + "...",
            attachments: reply.attachments,
            attachmentsType: typeof reply.attachments,
            attachmentsLength: reply.attachments?.length,
            is_liked: reply.is_liked,
            likes_count: reply.likes_count,
          });

          if (reply.attachments) {
            reply.attachments = Array.isArray(reply.attachments)
              ? reply.attachments
              : [];
          }
        });
      }

      setForum(forumData);
      setReplies(Array.isArray(repliesData) ? repliesData : []);

      setUser(userResponse.data);

      // Set likes state
      setLikesCount(forumData.likes_count || 0);
      setIsForumLiked(Boolean(forumResponse.data.data.is_liked));

      // Set forum bookmark state - langsung dari backend data (seperti ForumCategory.tsx)
      console.log("🔍 DEBUG: Forum data from backend:", {
        forumId: forumData.id,
        forumTitle: forumData.title,
        is_bookmarked: forumData.is_bookmarked,
        type: typeof forumData.is_bookmarked,
        rawData: forumData,
      });

      console.log("🔍 DEBUG: Response level data:", {
        is_liked: forumResponse.data.data.is_liked,
        is_new: forumResponse.data.data.is_new,
        is_bookmarked: forumResponse.data.data.is_bookmarked, // ✅ ADA DI LEVEL INI!
      });

      const bookmarksMap: { [key: number]: boolean } = {};
      // Gunakan is_bookmarked dari response level, bukan dari forum object
      bookmarksMap[forumData.id] = Boolean(
        forumResponse.data.data.is_bookmarked
      );
      setForumBookmarks(bookmarksMap);

      console.log("🔍 DEBUG: Set forum bookmarks state:", bookmarksMap);

      // Set liked replies state - Check semua level secara recursive
      if (Array.isArray(repliesData)) {
        const likedRepliesSet = new Set<number>();

        // Helper function untuk check like status secara recursive
        const checkReplyLikes = (replies: ForumReply[]) => {
          replies.forEach((reply) => {
            if (reply.is_liked) {
              likedRepliesSet.add(reply.id);
            }
            // Recursively check children replies untuk unlimited levels
            if (reply.children && Array.isArray(reply.children)) {
              checkReplyLikes(reply.children);
            }
          });
        };

        checkReplyLikes(repliesData);
        setLikedReplies(likedRepliesSet);

        console.log(
          "🔍 DEBUG: Loaded liked replies:",
          Array.from(likedRepliesSet)
        );
      }

      // Fetch bookmark status for each reply if user is authenticated
      if (userResponse.data && Array.isArray(repliesData)) {
        await fetchBookmarkStatuses(repliesData);
      }
    } catch (error: any) {
      console.error("Error fetching forum data:", error);
      console.error("🔍 DEBUG: Error details:", {
        message: error?.message,
        response: error?.response,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        config: error?.config
      });
      
      // Handle specific error cases
      if (error?.response?.status === 404) {
        console.error("🔍 DEBUG: Forum not found, redirecting to forum list");
        navigate("/forum-diskusi");
      } else if (error?.code === 'ERR_NETWORK_CHANGED' || error?.message?.includes('Network Error')) {
        console.error("🔍 DEBUG: Network error, retrying in 2 seconds...");
        setTimeout(() => {
          fetchForumData();
        }, 2000);
      } else {
        navigate("/forum-diskusi");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBookmarkStatuses = async (repliesList: ForumReply[]) => {
    if (!user) return;

    if (!repliesList || !Array.isArray(repliesList)) {
      console.warn("fetchBookmarkStatuses: invalid repliesList:", repliesList);
      return;
    }

    try {
      const updateBookmarkStatuses = async (replies: ForumReply[]) => {
        if (!replies || !Array.isArray(replies)) {
          console.warn("updateBookmarkStatuses: invalid replies:", replies);
          return;
        }

        for (const reply of replies) {
          if (!reply || typeof reply !== "object" || !reply.id) {
            console.warn(
              "Skipping invalid reply in fetchBookmarkStatuses:",
              reply
            );
            continue;
          }

          try {
            const response = await api.get(
              `/forum/replies/${reply.id}/bookmark-status`
            );
            if (response.data.success) {
              reply.is_bookmarked = response.data.is_bookmarked;
            }
          } catch (error) {
            console.error(
              `Error fetching bookmark status for reply ${reply.id}:`,
              error
            );
          }

          if (
            reply.children &&
            Array.isArray(reply.children) &&
            reply.children.length > 0
          ) {
            await updateBookmarkStatuses(reply.children);
          }
        }
      };

      await updateBookmarkStatuses(repliesList);

      setReplies([...repliesList]);
      console.log("Replies state updated");
    } catch (error) {
      console.error("Error fetching bookmark statuses:", error);
    }
  };

  // Helper function untuk update likes di nested replies
  const updateChildrenLikes = (
    children: ForumReply[],
    targetId: number,
    newLikesCount: number
  ): ForumReply[] => {
    return children.map((child) => {
      if (child.id === targetId) {
        return { ...child, likes_count: newLikesCount };
      }

      // Recursively update deeper nested replies
      if (child.children && child.children.length > 0) {
        const updatedGrandChildren = updateChildrenLikes(
          child.children,
          targetId,
          newLikesCount
        );
        if (updatedGrandChildren !== child.children) {
          return { ...child, children: updatedGrandChildren };
        }
      }

      return child;
    });
  };

  const handleLikeForum = async () => {
    if (!user || !forum) {
      showToastMessage("Anda harus login untuk like forum", "warning");
      return;
    }

    try {
      const response = await api.post(`/forum/${forum.id}/like`);

      if (response.data.success) {
        const isLiked = response.data.data.is_liked;
        const newLikesCount = response.data.data.likes_count;

        // Update forum like state
        setIsForumLiked(isLiked);
        setLikesCount(newLikesCount);

        showToastMessage(response.data.message, "success");
      }
    } catch (error) {
      console.error("Error toggling forum like:", error);
      showToastMessage("Gagal like forum", "error");
    }
  };

  const handleLikeReply = async (replyId: number) => {
    if (!user) {
      showToastMessage("Anda harus login untuk like reply", "warning");
      return;
    }

    try {
      const response = await api.post(`/forum/replies/${replyId}/like`);

      if (response.data.success) {
        const isLiked = response.data.data.is_liked;
        const newLikesCount = response.data.data.likes_count;

        // Update likedReplies state
        setLikedReplies((prev) => {
          const newSet = new Set(prev);
          if (isLiked) {
            newSet.add(replyId);
          } else {
            newSet.delete(replyId);
          }
          return newSet;
        });

        // Update replies state dengan likes_count yang baru (termasuk nested replies)
        setReplies((prev) =>
          prev.map((reply) => {
            // Update main reply
            if (reply.id === replyId) {
              return { ...reply, likes_count: newLikesCount };
            }

            // Update children replies recursively
            if (reply.children && reply.children.length > 0) {
              const updatedChildren = updateChildrenLikes(
                reply.children,
                replyId,
                newLikesCount
              );
              if (updatedChildren !== reply.children) {
                return { ...reply, children: updatedChildren };
              }
            }

            return reply;
          })
        );

        showToastMessage(response.data.message, "success");
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      showToastMessage("Gagal like reply", "error");
    }
  };

  const handleForumBookmark = async () => {
    if (!user || !forum) return;

    try {
      console.log(
        "🔍 DEBUG: Sending bookmark toggle request to:",
        `/forum/${forum.id}/bookmark`
      );
      const response = await api.post(`/forum/${forum.id}/bookmark`);
      console.log("🔍 DEBUG: Bookmark toggle response:", response.data);

      if (response.data.success) {
        // Update local state langsung dari response (seperti ForumCategory.tsx)
        const newBookmarkStatus = response.data.data.is_bookmarked;
        console.log("🔍 DEBUG: New bookmark status:", newBookmarkStatus);

        setForumBookmarks((prev) => ({
          ...prev,
          [forum.id]: newBookmarkStatus,
        }));

        showToastMessage(
          newBookmarkStatus
            ? "Forum berhasil di-bookmark!"
            : "Bookmark forum dihapus!",
          "success"
        );
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      showToastMessage("Gagal mengubah bookmark forum", "error");
    }
  };

  const handleReplyBookmark = async (replyId: number) => {
    try {
      console.log(
        "🔍 DEBUG: Sending reply bookmark toggle request to:",
        `/forum/replies/${replyId}/bookmark`
      );
      const response = await api.post(`/forum/replies/${replyId}/bookmark`);
      console.log("🔍 DEBUG: Reply bookmark toggle response:", response.data);
      console.log("🔍 DEBUG: Response data structure:", {
        hasData: !!response.data,
        hasDataData: !!response.data?.data,
        dataType: typeof response.data,
        dataDataType: typeof response.data?.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        dataDataKeys: response.data?.data
          ? Object.keys(response.data.data)
          : [],
      });

      if (response.data.success) {
        // Handle different response structures
        let newBookmarkStatus;
        if (response.data.data && typeof response.data.data === "object") {
          newBookmarkStatus = response.data.data.is_bookmarked;
        } else if (typeof response.data.data === "boolean") {
          newBookmarkStatus = response.data.data;
        } else {
          // Fallback: try to get from response.data directly
          newBookmarkStatus = response.data.is_bookmarked;
        }

        console.log("🔍 DEBUG: New reply bookmark status:", newBookmarkStatus);

        // Update reply bookmark status in state
        const updateReplyBookmark = (replies: ForumReply[]): ForumReply[] => {
          return replies.map((reply) => {
            if (reply.id === replyId) {
              return { ...reply, is_bookmarked: newBookmarkStatus };
            }
            if (reply.children && reply.children.length > 0) {
              return {
                ...reply,
                children: updateReplyBookmark(reply.children),
              };
            }
            return reply;
          });
        };

        setReplies(updateReplyBookmark);

        showToastMessage(
          newBookmarkStatus
            ? "Komentar berhasil di-bookmark!"
            : "Bookmark komentar dihapus!",
          "success"
        );
      }
    } catch (error) {
      console.error("Error toggling reply bookmark:", error);
      showToastMessage("Gagal mengubah bookmark komentar", "error");
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyContent.trim() || !forum) return;

    if (!user) {
      showToastMessage(
        "Anda harus login terlebih dahulu untuk membalas komentar",
        "warning"
      );
      return;
    }

    try {
      setSubmittingReply(true);

      // Create FormData for file uploads
      const formData = new FormData();
      formData.append("content", replyContent);
      if (replyingTo) {
        formData.append("parent_id", replyingTo.toString());
      }

      // Add uploaded files
      console.log("🔍 DEBUG: Uploaded files before submit:", uploadedFiles);
      console.log("🔍 DEBUG: Files count:", uploadedFiles.length);

      uploadedFiles.forEach((file, index) => {
        console.log(`🔍 DEBUG: Adding file ${index}:`, {
          name: file.name,
          type: file.type,
          size: file.size,
        });
        formData.append("attachments[]", file);
      });

      // Log FormData contents
      console.log("🔍 DEBUG: FormData entries:");
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value);
      }

      console.log(
        "🔍 DEBUG: Sending request to:",
        `/forum/${forum.id}/replies`
      );

      const response = await api.post(`/forum/${forum.id}/replies`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("🔍 DEBUG: Response received:", response.data);

      if (response.data.success) {
        showToastMessage("Balasan berhasil dikirim!", "success");
        setReplyContent("");
        // Reset replyingTo agar button kembali ke "Balas" (bukan "Sedang Reply...")
        setReplyingTo(null);
        setUploadedFiles([]); // Reset uploaded files
        // Update currentTime untuk real-time update
        setCurrentTime(new Date());

        // Refresh forum data dengan delay untuk memastikan backend sudah selesai
        setTimeout(async () => {
          console.log("🔍 DEBUG: Refreshing forum data after reply...");
          await fetchForumData();
          console.log(
            "🔍 DEBUG: Forum data refreshed, replies count:",
            replies.length
          );
        }, 500);
      } else {
        showToastMessage(
          response.data.message || "Gagal mengirim balasan",
          "error"
        );
      }
    } catch (error: any) {
      console.error("Error submitting reply:", error);
      console.error("🔍 DEBUG: Reply submit error details:", {
        message: error?.message,
        response: error?.response,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        config: error?.config
      });

      if (error?.response?.status === 401) {
        showToastMessage(
          "Sesi Anda telah berakhir. Silakan login ulang.",
          "warning"
        );
        navigate("/login");
      } else if (error?.response?.status === 404) {
        showToastMessage(
          "Forum tidak ditemukan atau endpoint tidak tersedia",
          "error"
        );
      } else if (error?.response?.status === 422) {
        // Validation error
        const errorData = error.response.data as {
          errors?: Record<string, string[]>;
          message?: string;
        };
        if (errorData.errors) {
          const errorMessages = Object.values(errorData.errors).flat();
          showToastMessage(
            `Error validasi: ${errorMessages.join(", ")}`,
            "error"
          );
        } else {
          showToastMessage(errorData.message || "Error validasi", "error");
        }
      } else if (error?.code === 'ERR_NETWORK_CHANGED' || error?.message?.includes('Network Error')) {
        showToastMessage(
          "Koneksi bermasalah. Silakan coba lagi.",
          "error"
        );
      } else {
        showToastMessage(
          "Gagal mengirim balasan. Silakan coba lagi.",
          "error"
        );
      }
    } finally {
      setSubmittingReply(false);
    }
  };

  const startReply = (parentId?: number) => {
    console.log("🔍 DEBUG: Starting reply to:", parentId);

    // Jika sudah reply ke komentar yang sama, cancel
    if (replyingTo === parentId) {
      cancelReply();
      return;
    }

    // Set reply state
    setReplyingTo(parentId || null);
    setReplyContent("");
    setUploadedFiles([]);
    setShowUploadDropdown(false); // Close upload dropdown if open

    // Scroll ke form reply jika ada
    setTimeout(() => {
      if (parentId) {
        const replyElement = document.getElementById(`reply-${parentId}`);
        if (replyElement) {
          replyElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }
    }, 100);
  };

  const cancelReply = () => {
    console.log("🔍 DEBUG: Canceling reply");
    setReplyingTo(null);
    setReplyContent("");
    setUploadedFiles([]);
    setShowUploadDropdown(false); // Close upload dropdown if open
  };

  // Function untuk format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Function untuk menghitung total semua reply (termasuk nested)
  const countTotalReplies = (replies: ForumReply[]): number => {
    let total = 0;
    replies.forEach((reply) => {
      total += 1; // Hitung reply ini
      if (reply.children && reply.children.length > 0) {
        total += countTotalReplies(reply.children); // Hitung children juga
      }
    });
    return total;
  };

  // Function untuk close modal gambar
  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  // Function untuk handle preview gambar forum
  const handleImagePreview = (imageSrc: string) => {
    setPreviewImage(imageSrc);
    setShowImagePreview(true);
  };

  // Function untuk close preview gambar
  const closeImagePreview = () => {
    setShowImagePreview(false);
    setPreviewImage(null);
  };

  // Function untuk handle delete forum utama
  const handleDeleteForum = async () => {
    if (!forum) return;

    try {
      const response = await api.delete(`/forum/${forum.id}`);

      if (response.data.success) {
        showToastMessage("Forum berhasil dihapus!", "success");
        navigate("/forum"); // Redirect ke halaman forum
      } else {
        showToastMessage("Gagal menghapus forum", "error");
      }
    } catch (error) {
      console.error("Error deleting forum:", error);
      showToastMessage("Gagal menghapus forum. Silakan coba lagi.", "error");
    } finally {
      setShowDeleteForumModal(false);
    }
  };

  // Function untuk handle edit forum utama
  const handleEditForum = async () => {
    if (!forum) return;

    try {
      const response = await api.put(`/forum/${forum.id}`, {
        title: editForumTitle,
        content: editForumContent,
        access_type: editForumAccessType,
        selected_users:
          editForumAccessType === "private" ? editForumSelectedUsers : [],
      });

      if (response.data.success) {
        showToastMessage("Forum berhasil diedit!", "success");
        setShowEditForumModal(false);
        setEditForumTitle("");
        setEditForumContent("");
        setEditForumAccessType("public");
        setEditForumSelectedUsers([]);
        // Update currentTime untuk real-time update
        setCurrentTime(new Date());
        // Refresh forum data
        await fetchForumData();
      } else {
        showToastMessage("Gagal mengedit forum", "error");
      }
    } catch (error) {
      console.error("Error editing forum:", error);
      showToastMessage("Gagal mengedit forum. Silakan coba lagi.", "error");
    }
  };

  // Function untuk open edit forum modal
  const openEditForumModal = () => {
    if (!forum) return;

    setEditForumTitle(forum.title);
    setEditForumContent(forum.content);
    setEditForumAccessType(forum.access_type || "public");
    setEditForumSelectedUsers(forum.allowed_users || []);
    setShowEditForumModal(true);

    // Load users jika private
    if (forum.access_type === "private") {
      loadEditAllUsers();
    }
  };

  // Fungsi untuk search users di edit modal
  const searchEditUsers = async (query: string) => {
    if (!query.trim()) {
      setEditSearchableUsers([]);
      return;
    }

    try {
      setEditSearchingUsers(true);
      const response = await api.get(
        `/users/search?q=${encodeURIComponent(query)}`
      );

      let users = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        users = response.data.data;
      } else if (Array.isArray(response.data)) {
        users = response.data;
      } else {
        users = [];
      }

      // Filter out current user (author) dari search results
      const filteredUsers = users.filter(
        (userItem: User) => userItem.id !== (user?.id || 0)
      );

      setEditSearchableUsers(filteredUsers || []);
    } catch (error) {
      console.error("Error searching users:", error);
      setEditSearchableUsers([]);
    } finally {
      setEditSearchingUsers(false);
    }
  };

  // Fungsi untuk load semua users di edit modal
  const loadEditAllUsers = async () => {
    try {
      setEditSearchingUsers(true);
      const response = await api.get("/users");

      // Filter out current user (author) dari all users
      const filteredUsers = (response.data || []).filter(
        (userItem: User) => userItem.id !== (user?.id || 0)
      );

      setEditSearchableUsers(filteredUsers);
    } catch (error) {
      console.error("Error loading all users:", error);
      setEditSearchableUsers([]);
    } finally {
      setEditSearchingUsers(false);
    }
  };

  // Fungsi untuk handle user search di edit modal
  const handleEditUserSearch = (query: string) => {
    setEditUserSearchQuery(query);
    if (query.trim()) {
      searchEditUsers(query);
    } else {
      loadEditAllUsers();
    }
  };

  // Debounced search untuk edit modal
  const debouncedEditSearch = React.useCallback(
    React.useMemo(() => {
      let timeoutId: NodeJS.Timeout;
      return (query: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (query.trim()) {
            searchEditUsers(query);
          } else {
            loadEditAllUsers();
          }
        }, 300);
      };
    }, []),
    []
  );

  // Handle search input change dengan debounce di edit modal
  const handleEditSearchInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const query = e.target.value;
    setEditUserSearchQuery(query);
    debouncedEditSearch(query);
  };

  // Fungsi untuk select/deselect user di edit modal
  const toggleEditUserSelection = (userId: number) => {
    setEditForumSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Fungsi untuk select all dosen di edit modal
  const handleEditSelectAllDosen = () => {
    if (editSelectAllDosen) {
      // Deselect all dosen
      setEditForumSelectedUsers((prev) =>
        prev.filter((userId) => {
          const user = editSearchableUsers.find((u) => u.id === userId);
          return user && user.role !== "Dosen";
        })
      );
      setEditSelectAllDosen(false);
    } else {
      // Select all dosen
      const dosenIds = editSearchableUsers
        .filter((user) => user.role === "Dosen")
        .map((user) => user.id);

      setEditForumSelectedUsers((prev) => [...new Set([...prev, ...dosenIds])]);
      setEditSelectAllDosen(true);
    }
  };

  // Fungsi untuk handle access type change di edit modal
  const handleEditAccessTypeChange = (accessType: "public" | "private") => {
    setEditForumAccessType(accessType);
    setEditForumSelectedUsers([]);
    setEditUserSearchQuery("");

    if (accessType === "private") {
      loadEditAllUsers();
    } else {
      setEditSearchableUsers([]);
    }
  };

  // Upload functions
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    setUploadedFiles((prev) => [...prev, ...imageFiles]);
    e.target.value = ""; // Reset input
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles((prev) => [...prev, ...files]);
    e.target.value = ""; // Reset input
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Function untuk edit reply
  const startEditReply = (reply: ForumReply) => {
    setEditingReplyId(reply.id);
    setEditContent(reply.content);
  };

  const cancelEditReply = () => {
    setEditingReplyId(null);
    setEditContent("");
  };

  const handleEditReply = async (replyId: number) => {
    try {
      const response = await api.put(`/forum/replies/${replyId}`, {
        content: editContent,
      });

      if (response.data.success) {
        // Update reply content in state
        const updateReplyContent = (replies: ForumReply[]): ForumReply[] => {
          return replies.map((reply) => {
            if (reply.id === replyId) {
              return {
                ...reply,
                content: editContent,
                is_edited: true,
                edited_at: new Date().toISOString(),
              };
            }
            if (reply.children && reply.children.length > 0) {
              return {
                ...reply,
                children: updateReplyContent(reply.children),
              };
            }
            return reply;
          });
        };

        setReplies(updateReplyContent);
        setEditingReplyId(null);
        setEditContent("");
        // Update currentTime untuk real-time update
        setCurrentTime(new Date());
        showToastMessage("Reply berhasil diedit!", "success");
      }
    } catch (error) {
      console.error("Error editing reply:", error);
      showToastMessage("Gagal mengedit reply. Silakan coba lagi.", "error");
    }
  };

  // Function untuk delete reply
  const showDeleteConfirmation = (reply: ForumReply) => {
    // Hitung total balasan yang akan dihapus (termasuk nested)
    const totalReplies = countTotalReplies(reply.children || []);

    setReplyToDelete(reply);
    setReplyToDeleteInfo({
      reply,
      totalReplies,
    });
    setShowDeleteModal(true);
  };

  const handleDeleteReply = async (replyId: number) => {
    try {
      const response = await api.delete(`/forum/replies/${replyId}`);

      if (response.data.success) {
        // Remove reply from state
        const removeReplyFromState = (replies: ForumReply[]): ForumReply[] => {
          return replies.filter((reply) => reply.id !== replyId);
        };

        setReplies(removeReplyFromState);
        setShowDeleteModal(false);
        setReplyToDelete(null);
        showToastMessage("Reply berhasil dihapus!", "success");
      }
    } catch (error) {
      console.error("Error deleting reply:", error);
      showToastMessage("Gagal menghapus reply. Silakan coba lagi.", "error");
    }
  };

  // Function untuk check timing (2 menit rule)
  const isWithin2Minutes = (createdAt: string) => {
    const now = new Date();
    const replyTime = new Date(createdAt);
    const diffInMinutes = (now.getTime() - replyTime.getTime()) / (1000 * 60);
    return diffInMinutes <= 2;
  };

  // Function untuk check permissions dengan timing
  const canEditReply = (reply: ForumReply) => {
    // Super Admin, Tim Akademik, Dosen: Bisa edit komen SENDIRI dalam 2 menit
    if (
      user?.role === "super_admin" ||
      user?.role === "tim_akademik" ||
      user?.role === "dosen"
    ) {
      return (
        reply.user.id === user?.id && // Hanya komen sendiri
        isWithin2Minutes(reply.created_at) &&
        !hiddenEditButtons.has(reply.id)
      );
    }

    // User biasa: Bisa edit komen sendiri
    return reply.user.id === user?.id;
  };

  const canDeleteReply = (reply: ForumReply) => {
    // Super Admin, Tim Akademik: Bisa delete komen siapa saja kapan saja
    if (user?.role === "super_admin" || user?.role === "tim_akademik") {
      return true; // Selalu bisa delete
    }

    // User biasa (termasuk dosen): Bisa delete komen sendiri saja
    return reply.user.id === user?.id;
  };

  // Function untuk check permission edit forum
  const canEditForum = () => {
    if (!user || !forum) return false;
    // Super Admin: Bisa edit forum siapa saja
    if (user.role === "super_admin") {
      return true;
    }
    // Author: Bisa edit forum sendiri
    return forum.user.id === user.id;
  };

  // Function untuk check permission delete forum
  const canDeleteForum = () => {
    if (!user || !forum) return false;
    // Super Admin: Bisa delete forum siapa saja
    if (user.role === "super_admin") {
      return true;
    }
    // Author: Bisa delete forum sendiri
    return forum.user.id === user.id;
  };

  const showToastMessage = (
    message: string,
    type: "success" | "warning" | "error"
  ) => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 5000);
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

  // Filter replies berdasarkan search query
  const filteredReplies = replies.filter((reply) =>
    reply.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Memuat forum...</p>
        </div>
      </div>
    );
  }

  if (!forum) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300">Forum tidak ditemukan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      {/* Toast Notification */}
      {showToast && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium ${
            toastType === "success"
              ? "bg-green-500 text-white"
              : toastType === "warning"
              ? "bg-yellow-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toastMessage}
        </motion.div>
      )}

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate(-1)}
        className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-6 transition-colors"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
        Kembali
      </motion.button>

      {/* Forum Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span
                className="px-3 py-1 text-xs font-medium text-white rounded-full"
                style={{ backgroundColor: forum.category.color }}
              >
                {forum.category.name}
              </span>
              {forum.status === "pinned" && (
                <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                  Disematkan
                </span>
              )}
            </div>
          </div>

          {/* Edit & Delete Forum Buttons - Hanya untuk Super Admin dan Author */}
          {(canEditForum() || canDeleteForum()) && (
            <div className="flex items-center space-x-2">
              {/* Edit Forum Button */}
              {canEditForum() && (
                <button
                  onClick={openEditForumModal}
                  className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit forum"
                >
                  <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                </button>
              )}

              {/* Delete Forum Button */}
              {canDeleteForum() && (
                <button
                  onClick={() => setShowDeleteForumModal(true)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Hapus forum"
                >
                  <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{forum.title}</h1>
        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center">
            <FontAwesomeIcon icon={faUser} className="mr-1" />
            {forum.user.name}
          </span>
          {forum.views_count > 0 && (
            <span className="flex items-center">
              <FontAwesomeIcon icon={faEye} className="mr-1" />
              {forum.views_count}
            </span>
          )}
          {forum.replies_count > 0 && (
            <span className="flex items-center">
              <FontAwesomeIcon icon={faReply} className="mr-1" />
              {forum.replies_count}
            </span>
          )}
          <button
            onClick={handleLikeForum}
            className={`flex items-center transition-colors ${
              isForumLiked
                ? "text-red-500"
                : "text-gray-500 hover:text-red-500"
            }`}
            title={isForumLiked ? "Unlike forum" : "Like forum"}
          >
            <FontAwesomeIcon
              icon={faHeart}
              className={`w-4 h-4 mr-1 ${isForumLiked ? "fill-current" : ""}`}
            />
            {likesCount}
          </button>
          <button
            onClick={handleForumBookmark}
            className={`flex items-center transition-colors ${
              forumBookmarks[forum.id]
                ? "text-yellow-500"
                : "text-gray-500 hover:text-yellow-500"
            }`}
            title={
              forumBookmarks[forum.id] ? "Hapus bookmark" : "Bookmark forum"
            }
          >
            <FontAwesomeIcon
              icon={faBookmark}
              className={`w-4 h-4 mr-1 ${
                forumBookmarks[forum.id] ? "fill-current" : ""
              }`}
            />
          </button>
          <span className="flex items-center">
            <FontAwesomeIcon icon={faClock} className="mr-1" />
            {forum.is_edited && forum.edited_at
              ? formatTimeAgo(forum.edited_at)
              : formatTimeAgo(forum.created_at)}
            {forum.is_edited && (
              <span className="text-gray-400 text-xs ml-2">• diedit</span>
            )}
          </span>
        </div>

        {/* Forum Content */}
        <div className="prose max-w-none bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <QuillViewer
            content={forum.content}
            onImageClick={handleImagePreview}
          />
        </div>
      </motion.div>

      {/* Reply Form untuk Forum Utama */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        {replyingTo === null ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <form onSubmit={handleSubmitReply}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Balasan langsung ke forum
                </label>
                <div className="flex items-center space-x-3">
                  {/* Upload Button - Now on the LEFT */}
                  <div className="upload-dropdown-container">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setShowUploadDropdown(!showUploadDropdown)
                        }
                        className="p-3 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-600 hover:text-white rounded-lg transition-colors"
                        title="Upload file"
                      >
                        <FontAwesomeIcon icon={faPlus} className="w-5 h-5" />
                      </button>

                      {/* Upload Dropdown */}
                      {showUploadDropdown && (
                        <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => {
                                console.log(
                                  "🔍 DEBUG: Clicking image upload button (main form)"
                                );
                                const imageInput =
                                  document.getElementById("image-upload-main");
                                if (imageInput) {
                                  imageInput.click();
                                  console.log(
                                    "🔍 DEBUG: Image input clicked (main form)"
                                  );
                                } else {
                                  console.error(
                                    "🔍 DEBUG: Image input not found! (main form)"
                                  );
                                }
                                setShowUploadDropdown(false);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <FontAwesomeIcon
                                icon={faImage}
                                className="mr-3 w-4 h-4 text-green-600"
                              />
                              Images
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                console.log(
                                  "🔍 DEBUG: Clicking file upload button (main form)"
                                );
                                const fileInput =
                                  document.getElementById("file-upload-main");
                                if (fileInput) {
                                  fileInput.click();
                                  console.log(
                                    "🔍 DEBUG: File input clicked (main form)"
                                  );
                                } else {
                                  console.error(
                                    "🔍 DEBUG: File input not found! (main form)"
                                  );
                                }
                                setShowUploadDropdown(false);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <FontAwesomeIcon
                                icon={faFile}
                                className="mr-3 w-4 h-4 text-blue-600"
                              />
                              Files
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Textarea */}
                  <div className="flex-1">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={2}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                      placeholder="Tulis balasan Anda..."
                      required
                    />
                  </div>
                </div>

                {/* Hidden file inputs untuk form utama */}
                <input
                  id="image-upload-main"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <input
                  id="file-upload-main"
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* Uploaded files preview */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                      File ({uploadedFiles.length}):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="inline-block p-2 bg-white dark:bg-gray-600 rounded border dark:border-gray-500 relative"
                        >
                          {file.type.startsWith("image/") ? (
                            // Image preview - container seukuran gambar
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-32 h-32 object-cover rounded border"
                            />
                          ) : (
                            // File icon for non-images - container seukuran icon + nama + size
                            <div className="text-center">
                              <FontAwesomeIcon
                                icon={faFile}
                                className="w-20 h-20 text-gray-500 mb-2"
                              />
                              <div className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate max-w-24">
                                {file.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {formatFileSize(file.size)}
                              </div>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeUploadedFile(index)}
                            className="absolute -top-2 -right-2 text-red-500 hover:text-red-700 bg-white dark:bg-gray-600 rounded-full p-1 hover:bg-red-50 dark:hover:bg-red-900 border dark:border-gray-500 shadow-sm"
                          >
                            <FontAwesomeIcon
                              icon={faTimes}
                              className="w-4 h-4"
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelReply}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingReply || !replyContent.trim()}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submittingReply ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
                  )}
                  {submittingReply ? "Mengirim..." : "Kirim Balasan"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button
            onClick={() => startReply()}
            className="w-full bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-gray-500 dark:text-gray-400 hover:border-blue-300 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <FontAwesomeIcon icon={faReply} className="mr-2" />
            Tulis balasan langsung ke forum...
          </button>
        )}
      </motion.div>

      {/* Replies Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm mr-3">
              <FontAwesomeIcon icon={faReply} className="w-4 h-4" />
            </div>
            Balasan ({countTotalReplies(replies)})
          </h2>

          {/* Search Replies */}
          <div className="relative w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FontAwesomeIcon
                icon={faSearch}
                className="h-4 w-4 text-gray-400"
              />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Cari komentar..."
            />
          </div>
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            Hasil pencarian untuk "{searchQuery}": {filteredReplies.length}{" "}
            komentar ditemukan
            <button
              onClick={() => setSearchQuery("")}
              className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
            >
              Hapus pencarian
            </button>
          </div>
        )}

        {filteredReplies &&
        Array.isArray(filteredReplies) &&
        filteredReplies.length > 0 ? (
          <div className="space-y-4">
            {filteredReplies.map((reply) => (
              <motion.div
                key={reply.id}
                id={`reply-${reply.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow"
              >
                {/* Main Reply */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm">
                      {reply.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {reply.user.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {reply.is_edited && reply.edited_at
                          ? formatTimeAgo(reply.edited_at)
                          : formatTimeAgo(reply.created_at)}
                        {reply.is_edited && (
                          <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                            • diedit
                          </span>
                        )}
                      </div>
                      {/* Reply Context - Tampilkan "Balasan untuk komentar [nama user]" */}
                      {reply.parent && (
                        <div className="flex items-center mt-1 text-blue-600 dark:text-blue-400 text-xs">
                          <FontAwesomeIcon
                            icon={faReply}
                            className="mr-1 w-3 h-3"
                          />
                          Balasan untuk komentar {reply.parent.user.name}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Edit Button di Kanan Atas */}
                  <div className="flex items-center space-x-1">
                    {canEditReply(reply) && (
                      <button
                        onClick={() => startEditReply(reply)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit komentar"
                      >
                        <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                      </button>
                    )}

                    {/* Icon Bookmark di Pojok Kanan Atas */}
                    <button
                      onClick={() => handleReplyBookmark(reply.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        reply.is_bookmarked
                          ? "text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50"
                          : "text-gray-400 hover:text-yellow-500 hover:bg-yellow-50"
                      }`}
                      title={
                        reply.is_bookmarked
                          ? "Hapus bookmark"
                          : "Bookmark komentar"
                      }
                    >
                      <FontAwesomeIcon
                        icon={faBookmark}
                        className={`w-4 h-4 ${
                          reply.is_bookmarked ? "fill-current" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="prose max-w-none mb-3">
                  <QuillViewer content={reply.content} />

                  {/* Display attachments if any */}
                  {reply.attachments && reply.attachments.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Attachments ({reply.attachments.length}):
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {reply.attachments.map((attachment, index) => (
                          <div
                            key={`reply-${reply.id}-attachment-${index}-${
                              attachment.original_name || "unknown"
                            }`}
                            className="inline-block p-2 bg-gray-50 dark:bg-gray-600 rounded-lg border dark:border-gray-500"
                          >
                            {attachment.file_type &&
                            attachment.file_type.startsWith("image/") ? (
                              // Image preview - LEBIH BESAR & BISA DIKLIK
                              <img
                                src={attachment.file_path}
                                alt={attachment.original_name}
                                className="w-32 h-32 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() =>
                                  window.open(attachment.file_path, "_blank")
                                }
                                title="Klik untuk lihat gambar penuh"
                              />
                            ) : (
                              // File preview dengan nama, size, dan action buttons
                              <div className="text-center">
                                <FontAwesomeIcon
                                  icon={faFile}
                                  className="w-20 h-20 text-gray-500 mb-2"
                                />
                                <div className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate max-w-24 mb-1">
                                  {attachment.original_name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                  {attachment.file_size
                                    ? formatFileSize(attachment.file_size)
                                    : "Unknown size"}
                                </div>
                                <div className="flex justify-center">
                                  <button
                                    onClick={() =>
                                      window.open(
                                        attachment.file_path,
                                        "_blank"
                                      )
                                    }
                                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                    title="Buka file di tab baru"
                                  >
                                    Buka File
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleLikeReply(reply.id)}
                                className={`flex items-center space-x-1 p-2 rounded-lg transition-colors ${
            likedReplies.has(reply.id)
              ? "text-red-500 bg-red-50 dark:bg-red-900/20"
              : "text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          }`}
                      title={
                        likedReplies.has(reply.id)
                          ? "Unlike reply"
                          : "Like reply"
                      }
                    >
                      <FontAwesomeIcon icon={faHeart} className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {reply.likes_count || 0}
                      </span>
                    </button>

                    <button
                      onClick={() => startReply(reply.id)}
                      className={`flex items-center space-x-1 p-2 rounded-lg transition-colors ${
                        replyingTo === reply.id
                          ? "text-blue-600 bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700"
                          : "text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      }`}
                      title={
                        replyingTo === reply.id
                          ? "Sedang reply ke komentar ini"
                          : "Balas komentar ini"
                      }
                    >
                      <FontAwesomeIcon icon={faReply} className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {replyingTo === reply.id ? "Sedang Reply..." : "Balas"}
                      </span>
                    </button>

                    {/* Tombol Tampilkan/Sembunyikan Balasan Per Komentar - DI SEBELAH KANAN */}
                    {reply.children && reply.children.length > 0 && (
                      <button
                        onClick={() => {
                          setHiddenReplies((prev) => {
                            const newSet = new Set(prev);
                            if (newSet.has(reply.id)) {
                              newSet.delete(reply.id);
                            } else {
                              newSet.add(reply.id);
                            }
                            return newSet;
                          });
                        }}
                        className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        title={
                          hiddenReplies.has(reply.id)
                            ? "Tampilkan balasan"
                            : "Sembunyikan balasan"
                        }
                      >
                        <FontAwesomeIcon
                          icon={
                            hiddenReplies.has(reply.id) ? faEye : faEyeSlash
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-blue-600 dark:text-blue-400">
                          {hiddenReplies.has(reply.id)
                            ? `Tampilkan Balasan (${countTotalReplies(
                                reply.children
                              )})`
                            : `Sembunyikan Balasan (${countTotalReplies(
                                reply.children
                              )})`}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Icon Delete di Pojok Bawah */}
                {canDeleteReply(reply) && (
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => showDeleteConfirmation(reply)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Hapus komentar"
                    >
                      <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Edit Form untuk Komentar Ini */}
                {editingReplyId === reply.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        Edit komentar
                      </h4>
                      <button
                        onClick={cancelEditReply}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/20"
                      >
                        <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mb-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={4}
                        placeholder="Edit komentar Anda..."
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={cancelEditReply}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => handleEditReply(reply.id)}
                        disabled={!editContent.trim()}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        Simpan
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Form Reply untuk Komentar Ini */}
                {replyingTo === reply.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        Balas ke komentar {reply.user.name}
                      </h4>
                      <button
                        onClick={cancelReply}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/20"
                      >
                        <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleSubmitReply}>
                      <div className="mb-3">
                        <div className="flex items-center space-x-3">
                          {/* Upload Button */}
                          <div className="upload-dropdown-container">
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  console.log(
                                    "🔍 DEBUG: Toggle upload dropdown, current state:",
                                    showUploadDropdown
                                  );
                                  setShowUploadDropdown(!showUploadDropdown);
                                }}
                                className="p-2 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors"
                                title="Upload file"
                              >
                                <FontAwesomeIcon
                                  icon={faPlus}
                                  className="w-4 h-4"
                                />
                              </button>

                              {/* Upload Dropdown */}
                              {showUploadDropdown && (
                                <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                                  <div className="py-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        console.log(
                                          "🔍 DEBUG: Clicking image upload button"
                                        );
                                        const imageInput =
                                          document.getElementById(
                                            "image-upload-reply"
                                          );
                                        if (imageInput) {
                                          imageInput.click();
                                          console.log(
                                            "🔍 DEBUG: Image input clicked"
                                          );
                                        } else {
                                          console.error(
                                            "🔍 DEBUG: Image input not found!"
                                          );
                                        }
                                        setShowUploadDropdown(false);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      <FontAwesomeIcon
                                        icon={faImage}
                                        className="mr-3 w-4 h-4 text-green-600"
                                      />
                                      Images
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        console.log(
                                          "🔍 DEBUG: Clicking file upload button"
                                        );
                                        const fileInput =
                                          document.getElementById(
                                            "file-upload-reply"
                                          );
                                        if (fileInput) {
                                          fileInput.click();
                                          console.log(
                                            "🔍 DEBUG: File input clicked"
                                          );
                                        } else {
                                          console.error(
                                            "🔍 DEBUG: File input not found!"
                                          );
                                        }
                                        setShowUploadDropdown(false);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      <FontAwesomeIcon
                                        icon={faFile}
                                        className="mr-3 w-4 h-4 text-blue-600"
                                      />
                                      Files
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Textarea */}
                          <div className="flex-1">
                            <textarea
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              rows={2}
                              className="block w-full px-3 py-2 border border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                              placeholder={`Balas ke komentar ${reply.user.name}...`}
                              required
                            />
                          </div>
                        </div>

                        {/* Hidden file inputs untuk reply ke komentar */}
                        <input
                          id="image-upload-reply"
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <input
                          id="file-upload-reply"
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                        />

                        {/* Uploaded files preview */}
                        {uploadedFiles.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">
                              File ({uploadedFiles.length}):
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {uploadedFiles.map((file, index) => (
                                <div
                                  key={index}
                                  className="inline-block p-2 bg-white dark:bg-gray-600 rounded border dark:border-gray-500 relative"
                                >
                                  {file.type.startsWith("image/") ? (
                                    <img
                                      src={URL.createObjectURL(file)}
                                      alt={file.name}
                                      className="w-24 h-24 object-cover rounded border"
                                    />
                                  ) : (
                                    <div className="text-center">
                                      <FontAwesomeIcon
                                        icon={faFile}
                                        className="w-16 h-16 text-gray-500 mb-2"
                                      />
                                      <div className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate max-w-20">
                                        {file.name}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {formatFileSize(file.size)}
                                      </div>
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => removeUploadedFile(index)}
                                    className="absolute -top-2 -right-2 text-red-500 hover:text-red-700 bg-white dark:bg-gray-600 rounded-full p-1 hover:bg-red-50 dark:hover:bg-red-900 border dark:border-gray-500 shadow-sm"
                                  >
                                    <FontAwesomeIcon
                                      icon={faTimes}
                                      className="w-3 h-3"
                                    />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={cancelReply}
                          className="px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/20 text-sm"
                        >
                          Selesai
                        </button>
                        <button
                          type="submit"
                          disabled={submittingReply || !replyContent.trim()}
                          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                        >
                          {submittingReply ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                          ) : (
                            <FontAwesomeIcon
                              icon={faPaperPlane}
                              className="mr-2 w-3 h-3"
                            />
                          )}
                          {submittingReply ? "Mengirim..." : "Kirim Balasan"}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* Children Replies (Nested Replies) */}
                {reply.children &&
                  reply.children.length > 0 &&
                  !hiddenReplies.has(reply.id) && (
                    <div className="mt-4 ml-8 space-y-3 border-l-2 border-blue-300 pl-4">
                      <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2 flex items-center">
                        <FontAwesomeIcon
                          icon={faReply}
                          className="mr-2 text-blue-500"
                        />
                        Balasan ({countTotalReplies(reply.children)}):
                      </div>
                      {reply.children.map((childReply) => (
                        <motion.div
                          key={childReply.id}
                          id={`reply-${childReply.id}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-3 hover:shadow-md transition-shadow"
                        >
                          {/* Recursive Reply Component - Unlimited Nesting */}
                          <RecursiveReplyComponent
                            reply={childReply}
                            level={2}
                            onLike={handleLikeReply}
                            likedReplies={likedReplies}
                            onReply={startReply}
                            replyingTo={replyingTo}
                            onCancelReply={cancelReply}
                            onSubmitReply={handleSubmitReply}
                            uploadedFiles={uploadedFiles}
                            setUploadedFiles={setUploadedFiles}
                            replyContent={replyContent}
                            setReplyContent={setReplyContent}
                            submittingReply={submittingReply}
                            showUploadDropdown={showUploadDropdown}
                            setShowUploadDropdown={setShowUploadDropdown}
                            handleImageUpload={handleImageUpload}
                            handleFileUpload={handleFileUpload}
                            removeUploadedFile={removeUploadedFile}
                            formatFileSize={formatFileSize}
                            onEdit={startEditReply}
                            onDelete={showDeleteConfirmation}
                            canEdit={canEditReply}
                            canDelete={canDeleteReply}
                            handleReplyBookmark={handleReplyBookmark}
                          />
                        </motion.div>
                      ))}
                    </div>
                  )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FontAwesomeIcon
              icon={faComments}
              className="h-12 w-12 text-gray-400 mb-4"
            />
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery
                ? "Tidak ada komentar yang ditemukan."
                : "Belum ada balasan. Jadilah yang pertama untuk membalas!"}
            </p>
          </div>
        )}
      </motion.div>

      {/* Image Preview Mode */}
      {showImagePreview && previewImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-gray-500/30 dark:bg-gray-500/50 backdrop-blur-md flex items-center justify-center z-[100000]"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-4xl w-full mx-4 border border-gray-100 dark:border-gray-700 relative"
          >
            {/* Close Button */}
            <button
              onClick={closeImagePreview}
              className="absolute top-4 right-4 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Tutup"
            >
              <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
            </button>

            {/* Image Content */}
            <div className="text-center">
              <img
                src={previewImage}
                alt="Forum image preview"
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Image Modal Popup */}
      {showImageModal && selectedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 flex items-center justify-center z-[100000]"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-4xl w-full mx-4 border border-gray-100 dark:border-gray-700 relative"
          >
            {/* Close Button */}
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Tutup"
            >
              <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
            </button>

            {/* Image Content */}
            <div className="text-center">
              <img
                src={selectedImage}
                alt="Forum image"
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Edit Forum Modal */}
      <AnimatePresence>
        {showEditForumModal && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            {/* Overlay */}
            <div
              className="fixed inset-0 z-[100000] bg-gray-500/30 dark:bg-gray-500/50 backdrop-blur-md"
              onClick={() => setShowEditForumModal(false)}
            ></div>

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-[100001]"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Edit Forum
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
                    value={editForumTitle}
                    onChange={(e) => setEditForumTitle(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Masukkan judul forum yang menarik..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Konten/Deskripsi
                  </label>
                  <QuillEditor
                    value={editForumContent}
                    onChange={(content) => setEditForumContent(content)}
                    placeholder="Edit konten forum..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipe Akses
                  </label>
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="public"
                        checked={editForumAccessType === "public"}
                        onChange={() => handleEditAccessTypeChange("public")}
                        className="mr-1"
                      />
                      Publik
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="private"
                        checked={editForumAccessType === "private"}
                        onChange={() => handleEditAccessTypeChange("private")}
                        className="mr-1"
                      />
                      Privat
                    </label>
                  </div>
                </div>

                {editForumAccessType === "private" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Pilih Pengguna yang Berhak Akses
                    </label>
                    <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="text-blue-800 dark:text-blue-300 text-sm font-medium mb-1">
                        ℹ️ Info Forum Private
                      </div>
                      <div className="text-blue-700 dark:text-blue-400 text-xs">
                        Forum private hanya bisa diakses oleh Anda (sebagai
                        pembuat) dan pengguna yang dipilih. Pengguna lain tidak
                        akan bisa melihat atau mengakses forum ini.
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <input
                        type="text"
                        placeholder="Cari pengguna (opsional)..."
                        value={editUserSearchQuery}
                        onChange={handleEditSearchInputChange}
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleEditUserSearch(editUserSearchQuery)
                        }
                        className="ml-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        disabled={editSearchingUsers}
                      >
                        {editSearchingUsers ? (
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
                            id="editSelectAllDosen"
                            checked={editSelectAllDosen}
                            onChange={handleEditSelectAllDosen}
                            className="mr-2"
                          />
                          <label
                            htmlFor="editSelectAllDosen"
                            className="text-sm text-gray-700"
                          >
                            Pilih Semua Dosen
                          </label>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Total: {editSearchableUsers.length} pengguna
                        </span>
                      </div>

                      {editSearchingUsers ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <span className="ml-2 text-gray-600 dark:text-gray-300">
                            Memuat pengguna...
                          </span>
                        </div>
                      ) : (
                        <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                          {editSearchableUsers.length > 0 ? (
                            editSearchableUsers.map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                              >
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={editForumSelectedUsers.includes(
                                      user.id
                                    )}
                                    onChange={() =>
                                      toggleEditUserSelection(user.id)
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
                              {editUserSearchQuery
                                ? "Tidak ada pengguna yang cocok"
                                : "Memuat daftar pengguna..."}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {editForumSelectedUsers.length > 0 && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Pengguna yang Dipilih ({editForumSelectedUsers.length}
                          )
                        </label>
                        <div className="flex flex-wrap gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          {editForumSelectedUsers.map((userId) => {
                            const user = editSearchableUsers.find(
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
                                  onClick={() =>
                                    toggleEditUserSelection(user.id)
                                  }
                                  className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
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
                    setShowEditForumModal(false);
                    setEditForumTitle("");
                    setEditForumContent("");
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleEditForum}
                  disabled={!editForumTitle.trim() || !editForumContent.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Forum Modal */}
      {showDeleteForumModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-gray-500/30 dark:bg-gray-500/50 backdrop-blur-md flex items-center justify-center z-[100000]"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4 border border-gray-100 dark:border-gray-700"
          >
            <div className="text-center">
              <FontAwesomeIcon
                icon={faTrash}
                className="w-12 h-12 text-red-500 mx-auto mb-3"
              />
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                Hapus Forum
              </h3>

              {/* Info Balasan yang Akan Dihapus */}
              {forum && forum.replies_count > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="text-yellow-800 dark:text-yellow-300 text-sm font-medium mb-1">
                    ⚠️ Perhatian!
                  </div>
                  <div className="text-yellow-700 dark:text-yellow-400 text-xs">
                    Forum ini memiliki{" "}
                    <span className="font-semibold">
                      {forum.replies_count} balasan
                    </span>{" "}
                    yang akan ikut terhapus.
                  </div>
                </div>
              )}

              <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                Apakah Anda yakin ingin menghapus forum ini? Tindakan ini tidak
                dapat dibatalkan.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteForumModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteForum}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                >
                  Hapus
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && replyToDelete && replyToDeleteInfo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-gray-500/30 dark:bg-gray-500/50 backdrop-blur-md flex items-center justify-center z-[100000]"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4 border border-gray-100 dark:border-gray-700"
          >
            <div className="text-center">
              <FontAwesomeIcon
                icon={faTrash}
                className="w-12 h-12 text-red-500 mx-auto mb-3"
              />
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                Hapus Komentar
              </h3>

              {/* Info Balasan yang Akan Dihapus */}
              {replyToDeleteInfo.totalReplies > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="text-yellow-800 dark:text-yellow-300 text-sm font-medium mb-1">
                    ⚠️ Perhatian!
                  </div>
                  <div className="text-yellow-700 dark:text-yellow-400 text-xs">
                    Komentar ini memiliki{" "}
                    <span className="font-semibold">
                      {replyToDeleteInfo.totalReplies} balasan
                    </span>{" "}
                    yang akan ikut terhapus.
                  </div>
                </div>
              )}

              <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                Apakah Anda yakin ingin menghapus komentar ini? Tindakan ini
                tidak dapat dibatalkan.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setReplyToDelete(null);
                    setReplyToDeleteInfo(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleDeleteReply(replyToDelete.id)}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                >
                  Hapus
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ForumDetail;
