<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * Get notifications for a specific user (dosen)
     */
    public function getUserNotifications($userId)
    {
        $user = Auth::user();
        
        // Users can only access their own notifications
        if ($user->id != $userId && $user->role !== 'super_admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $notifications = Notification::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($notifications);
    }

    /**
     * Get notifications for admin (super_admin)
     */
    public function getAdminNotifications($userId)
    {
        $user = User::findOrFail($userId);
        
        // Only super_admin can access admin notifications
        if ($user->role !== 'super_admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $notifications = Notification::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($notifications);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead($notificationId)
    {
        $notification = Notification::findOrFail($notificationId);
        $user = Auth::user();
        
        // Super admin can mark any notification as read
        if ($user->role === 'super_admin') {
            $notification->update([
                'is_read' => true,
                'read_at' => now()
            ]);
            return response()->json(['message' => 'Notification marked as read']);
        }
        
        // Regular users can only mark their own notifications as read
        if ($notification->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $notification->update([
            'is_read' => true,
            'read_at' => now()
        ]);

        return response()->json(['message' => 'Notification marked as read']);
    }

    /**
     * Mark all notifications as read for a user
     */
    public function markAllAsRead($userId)
    {
        $user = Auth::user();
        
        // Super admin can mark all notifications as read
        if ($user->role === 'super_admin') {
            Notification::where('is_read', false)
                ->update([
                    'is_read' => true,
                    'read_at' => now()
                ]);
            return response()->json(['message' => 'All notifications marked as read']);
        }
        
        // Regular users can only mark their own notifications as read
        if ($userId != $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        Notification::where('user_id', $userId)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now()
            ]);

        return response()->json(['message' => 'All notifications marked as read']);
    }

    /**
     * Create notification for PBL assignment
     */
    public function createPBLAssignmentNotification($userId, $pblData)
    {
        $user = User::findOrFail($userId);
        
        $notification = Notification::create([
            'user_id' => $userId,
            'title' => 'Jadwal PBL Baru',
            'message' => "Anda telah di-assign untuk mengajar PBL {$pblData['mata_kuliah_nama']} - Modul {$pblData['modul_ke']}. Silakan konfirmasi ketersediaan Anda.",
            'type' => 'info',
            'data' => [
                'pbl_id' => $pblData['pbl_id'],
                'mata_kuliah_kode' => $pblData['mata_kuliah_kode'],
                'mata_kuliah_nama' => $pblData['mata_kuliah_nama'],
                'modul_ke' => $pblData['modul_ke'],
                'nama_modul' => $pblData['nama_modul'],
            ],
        ]);

        return $notification;
    }

    /**
     * Create consolidated notification for PBL block assignment
     */
    public function createPBLBlockAssignmentNotification($userId, $blockData)
    {
        $user = User::findOrFail($userId);
        
        // Format message yang lebih informatif
        // Semester disimpan sebagai integer: 1 = Ganjil, 2 = Genap
        $semesterText = '';
        if (is_numeric($blockData['semester'])) {
            $semesterText = $blockData['semester'] == 1 ? 'Semester Ganjil' : 'Semester Genap';
        } else {
            // Fallback untuk string (jika ada yang masih menggunakan format lama)
            $semesterText = $blockData['semester'] === 'ganjil' ? 'Semester Ganjil' : 'Semester Genap';
        }
        
        // Log untuk debugging
        \Log::info("Notification semester mapping", [
            'raw_semester' => $blockData['semester'],
            'semester_type' => gettype($blockData['semester']),
            'semester_text' => $semesterText,
            'is_numeric' => is_numeric($blockData['semester'])
        ]);
        
        $modulCount = count($blockData['moduls']);
        $kelompokCount = $blockData['total_kelompok'] ?? 0;
        
        $notification = Notification::create([
            'user_id' => $userId,
            'title' => "🎯 Assignment PBL Baru - Blok {$blockData['blok']} {$semesterText}",
            'message' => "Assignment PBL untuk Blok {$blockData['blok']} {$semesterText}", // Message disederhanakan
            'type' => 'info',
            'data' => [
                'blok' => $blockData['blok'],
                'tipe_peran' => $blockData['tipe_peran'],
                'mata_kuliah_kode' => $blockData['mata_kuliah_kode'],
                'mata_kuliah_nama' => $blockData['mata_kuliah_nama'],
                'moduls' => $blockData['moduls'],
                'total_kelompok' => $kelompokCount,
                // Field semester dihapus untuk menghindari inkonsistensi
            ],
        ]);

        return $notification;
    }

    /**
     * Get unread notifications count
     */
    public function getUnreadCount($userId)
    {
        $count = Notification::where('user_id', $userId)
            ->where('is_read', false)
            ->count();

        return response()->json(['count' => $count]);
    }

    /**
     * Get all notifications with read status for admin
     */
    public function getAllNotificationsForAdmin(Request $request)
    {
        // Check if user is admin (you can customize this logic)
        if (!Auth::user() || !in_array(Auth::user()->role, ['admin', 'super_admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Get search query
        $search = $request->get('search', '');
        $userType = $request->get('user_type', 'all'); // all, dosen, mahasiswa
        
        // Build query with search and user type filter
        $query = Notification::with('user');
        
        // Filter by user type
        if ($userType === 'dosen') {
            $query->whereHas('user', function($q) {
                $q->whereIn('role', ['dosen', 'koordinator', 'tim_blok', 'dosen_mengajar']);
            });
        } elseif ($userType === 'mahasiswa') {
            $query->whereHas('user', function($q) {
                $q->where('role', 'mahasiswa');
            });
        }
        
        // Apply search filter
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('message', 'like', "%{$search}%")
                  ->orWhereHas('user', function($userQuery) use ($search) {
                      $userQuery->where('name', 'like', "%{$search}%");
                  });
            });
        }
        
        $notifications = $query->orderBy('created_at', 'desc')->get()
            ->map(function ($notification) {
                // Determine user type
                $userRole = $notification->user->role ?? 'unknown';
                $isDosen = in_array($userRole, ['dosen', 'koordinator', 'tim_blok', 'dosen_mengajar']);
                $userTypeLabel = $isDosen ? 'Dosen' : 'Mahasiswa';
                
                return [
                    'id' => $notification->id,
                    'user_name' => $notification->user->name ?? 'Unknown User',
                    'user_id' => $notification->user_id,
                    'user_role' => $userRole,
                    'user_type' => $userTypeLabel,
                    'title' => $notification->title,
                    'message' => $notification->message,
                    'type' => $notification->type,
                    'is_read' => $notification->is_read,
                    'read_at' => $notification->read_at,
                    'created_at' => $notification->created_at,
                    'read_status' => $notification->is_read ? 'Sudah Dibaca' : 'Belum Dibaca',
                    'read_time' => $notification->read_at ? $notification->read_at->setTimezone('Asia/Jakarta')->format('d M Y, H:i') : '-',
                    'time_since_read' => $notification->read_at ? $notification->read_at->diffForHumans() : '-',
                    'created_time' => $notification->created_at->setTimezone('Asia/Jakarta')->format('d M Y, H:i'),
                    'created_time_ago' => $notification->created_at->diffForHumans()
                ];
            });

        return response()->json($notifications);
    }

    /**
     * Get notification statistics for admin dashboard
     */
    public function getNotificationStats(Request $request)
    {
        // Check if user is admin
        if (!Auth::user() || !in_array(Auth::user()->role, ['admin', 'super_admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Get user type filter
        $userType = $request->get('user_type', 'all');
        
        // Build base query
        $baseQuery = Notification::query();
        
        // Apply user type filter
        if ($userType === 'dosen') {
            $baseQuery->whereHas('user', function($q) {
                $q->whereIn('role', ['dosen', 'koordinator', 'tim_blok', 'dosen_mengajar']);
            });
        } elseif ($userType === 'mahasiswa') {
            $baseQuery->whereHas('user', function($q) {
                $q->where('role', 'mahasiswa');
            });
        }
        
        // Clone queries for different counts
        $totalQuery = clone $baseQuery;
        $readQuery = clone $baseQuery;
        $unreadQuery = clone $baseQuery;
        $recentQuery = clone $baseQuery;
        $recentReadsQuery = clone $baseQuery;
        
        $totalNotifications = $totalQuery->count();
        $readNotifications = $readQuery->where('is_read', true)->count();
        $unreadNotifications = $unreadQuery->where('is_read', false)->count();
        
        // Get read rate percentage
        $readRate = $totalNotifications > 0 ? round(($readNotifications / $totalNotifications) * 100, 1) : 0;
        
        // Get recent activity (last 7 days)
        $recentNotifications = $recentQuery->where('created_at', '>=', now()->subDays(7))->count();
        $recentReads = $recentReadsQuery->where('read_at', '>=', now()->subDays(7))->count();
        
        // Get breakdown by user type
        $dosenNotifications = Notification::whereHas('user', function($q) {
            $q->whereIn('role', ['dosen', 'koordinator', 'tim_blok', 'dosen_mengajar']);
        })->count();
        
        $mahasiswaNotifications = Notification::whereHas('user', function($q) {
            $q->where('role', 'mahasiswa');
        })->count();

        return response()->json([
            'total_notifications' => $totalNotifications,
            'read_notifications' => $readNotifications,
            'unread_notifications' => $unreadNotifications,
            'read_rate_percentage' => $readRate,
            'recent_notifications' => $recentNotifications,
            'recent_reads' => $recentReads,
            'user_type_breakdown' => [
                'dosen' => $dosenNotifications,
                'mahasiswa' => $mahasiswaNotifications
            ],
            'last_7_days' => [
                'notifications_sent' => $recentNotifications,
                'notifications_read' => $recentReads
            ]
        ]);
    }

    /**
     * Delete all notifications for a user
     */
    public function clearAllNotifications($userId)
    {
        // Check if user is clearing their own notifications
        if ($userId != Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $deleted = Notification::where('user_id', $userId)->delete();

        return response()->json([
            'message' => 'All notifications cleared',
            'deleted_count' => $deleted
        ]);
    }

    /**
     * Delete a specific notification
     */
    public function deleteNotification($notificationId)
    {
        $notification = Notification::findOrFail($notificationId);
        
        // Check if user owns this notification
        if ($notification->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $notification->delete();

        return response()->json(['message' => 'Notification deleted']);
    }
}
