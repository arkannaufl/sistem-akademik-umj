<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ReportingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ActivityLog::with('user')
            ->orderBy('created_at', 'desc');

        // Filter by action
        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        // Filter by module
        if ($request->filled('module')) {
            $query->where('module', $request->module);
        }

        // Filter by user
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by date range
        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        // Search by description
        if ($request->filled('search')) {
            $query->where('description', 'like', '%' . $request->search . '%');
        }

        $perPage = $request->get('per_page', 15);
        $logs = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $logs,
            'filters' => [
                'actions' => ActivityLog::distinct()->pluck('action'),
                'modules' => ActivityLog::distinct()->pluck('module'),
            ]
        ]);
    }

    public function summary(Request $request): JsonResponse
    {
        $query = ActivityLog::query();

        // Filter by date range
        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        $summary = [
            'total_activities' => (clone $query)->count(),
            'activities_by_action' => (clone $query)->select('action', DB::raw('count(*) as count'))
                ->groupBy('action')
                ->get(),
            'activities_by_module' => (clone $query)->select('module', DB::raw('count(*) as count'))
                ->groupBy('module')
                ->get(),
            'activities_by_date' => (clone $query)->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as count'))
                ->groupBy('date')
                ->orderBy('date', 'desc')
                ->limit(30)
                ->get(),
            'top_users' => (clone $query)->select('user_id', DB::raw('count(*) as count'))
                ->with('user:id,name')
                ->groupBy('user_id')
                ->orderBy('count', 'desc')
                ->limit(10)
                ->get(),
        ];

        return response()->json([
            'success' => true,
            'data' => $summary
        ]);
    }

    public function export(Request $request): JsonResponse
    {
        $query = ActivityLog::with('user')
            ->orderBy('created_at', 'desc');

        // Apply same filters as index method
        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        if ($request->filled('module')) {
            $query->where('module', $request->module);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        if ($request->filled('search')) {
            $query->where('description', 'like', '%' . $request->search . '%');
        }

        $logs = $query->get();

        // Transform data for export
        $exportData = $logs->map(function ($log) {
            return [
                'ID' => $log->id,
                'Tanggal' => $log->created_at->format('Y-m-d H:i:s'),
                'User' => $log->user ? $log->user->name : 'System',
                'Aksi' => $log->action,
                'Modul' => $log->module,
                'Deskripsi' => $log->description,
                'IP Address' => $log->ip_address,
                'File Name' => $log->file_name,
                'Records Count' => $log->records_count,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $exportData,
            'filename' => 'activity_logs_' . now()->format('Y-m-d_H-i-s') . '.json'
        ]);
    }

    public function dosenCsrReport()
    {
        // Ambil data mapping dosen ke CSR beserta semester & blok
        $mappings = \App\Models\CSRMapping::with(['dosen', 'csr'])->get();

        $result = [];
        foreach ($mappings as $mapping) {
            if (!$mapping->dosen || !$mapping->csr) continue;
            $dosenId = $mapping->dosen->id;
            $dosenName = $mapping->dosen->name;
            $nid = $mapping->dosen->nid;
            $keahlian = $mapping->dosen->keahlian ?? [];
            $csr = $mapping->csr;
            $semester = $csr->semester;
            $blok = $csr->nomor_csr;
            $tanggal_mulai = $csr->tanggal_mulai ? $csr->tanggal_mulai->format('Y-m-d') : null;
            $tanggal_akhir = $csr->tanggal_akhir ? $csr->tanggal_akhir->format('Y-m-d') : null;

            if (!isset($result[$dosenId])) {
                $result[$dosenId] = [
                    'dosen_id' => $dosenId,
                    'dosen_name' => $dosenName,
                    'nid' => $nid,
                    'keahlian' => $keahlian,
                    'total_csr' => 0,
                    'per_semester' => [],
                    'all_tanggal_mulai' => [],
                    'all_tanggal_akhir' => [],
                ];
            }
            $result[$dosenId]['total_csr'] += 1;
            $result[$dosenId]['all_tanggal_mulai'][] = $tanggal_mulai;
            $result[$dosenId]['all_tanggal_akhir'][] = $tanggal_akhir;
            // Group by semester
            $found = false;
            foreach ($result[$dosenId]['per_semester'] as &$sem) {
                if ($sem['semester'] == $semester) {
                    $sem['jumlah'] += 1;
                    $sem['blok_csr'][] = $blok;
                    $sem['tanggal_mulai'][] = $tanggal_mulai;
                    $sem['tanggal_akhir'][] = $tanggal_akhir;
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $result[$dosenId]['per_semester'][] = [
                    'semester' => $semester,
                    'jumlah' => 1,
                    'blok_csr' => [$blok],
                    'tanggal_mulai' => [$tanggal_mulai],
                    'tanggal_akhir' => [$tanggal_akhir],
                ];
            }
        }
        // Reset array keys dan hitung tanggal mulai/akhir terawal/terakhir
        $result = array_map(function($d) {
            $allMulai = array_filter($d['all_tanggal_mulai']);
            $allAkhir = array_filter($d['all_tanggal_akhir']);
            $d['tanggal_mulai'] = $allMulai ? min($allMulai) : null;
            $d['tanggal_akhir'] = $allAkhir ? max($allAkhir) : null;
            unset($d['all_tanggal_mulai'], $d['all_tanggal_akhir']);
            // Untuk setiap per_semester, ambil tanggal terawal/terakhir di semester tsb
            foreach ($d['per_semester'] as &$sem) {
                $mulai = array_filter($sem['tanggal_mulai']);
                $akhir = array_filter($sem['tanggal_akhir']);
                $sem['tanggal_mulai'] = $mulai ? min($mulai) : null;
                $sem['tanggal_akhir'] = $akhir ? max($akhir) : null;
            }
            return $d;
        }, array_values($result));

        return response()->json(['data' => $result]);
    }
}
