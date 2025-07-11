<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ActivityLogService
{
    public static function log(
        string $action,
        string $module,
        string $description,
        array $oldData = null,
        array $newData = null,
        string $fileName = null,
        int $recordsCount = null,
        Request $request = null
    ): void {
        $request = $request ?? request();
        
        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'module' => $module,
            'description' => $description,
            'old_data' => $oldData,
            'new_data' => $newData,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'file_name' => $fileName,
            'records_count' => $recordsCount,
        ]);
    }

    public static function logCreate(string $module, string $description, array $newData = null, Request $request = null): void
    {
        self::log('CREATE', $module, $description, null, $newData, null, null, $request);
    }

    public static function logUpdate(string $module, string $description, array $oldData = null, array $newData = null, Request $request = null): void
    {
        self::log('UPDATE', $module, $description, $oldData, $newData, null, null, $request);
    }

    public static function logDelete(string $module, string $description, array $oldData = null, Request $request = null): void
    {
        self::log('DELETE', $module, $description, $oldData, null, null, null, $request);
    }

    public static function logImport(string $module, string $description, string $fileName, int $recordsCount, Request $request = null): void
    {
        self::log('IMPORT', $module, $description, null, null, $fileName, $recordsCount, $request);
    }

    public static function logLogin(string $description, Request $request = null): void
    {
        self::log('LOGIN', 'AUTH', $description, null, null, null, null, $request);
    }

    public static function logLogout(string $description, Request $request = null): void
    {
        self::log('LOGOUT', 'AUTH', $description, null, null, null, null, $request);
    }
} 