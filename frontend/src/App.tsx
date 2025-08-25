import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { useEffect } from "react";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import MataKuliah from "./pages/MataKuliah";
import CSR from "./pages/CSR";
import Dosen from "./pages/Dosen";
import Mahasiswa from "./pages/Mahasiswa";
import TimAkademik from "./pages/TimAkademik";
import TahunAjaran from "./pages/TahunAjaran";
import Ruangan from "./pages/Ruangan";
import Profile from "./pages/Profile";
import SignIn from "./pages/AuthPages/SignIn";
import RequireAuth from "./components/common/RequireAuth";
import RequireDosenRole from "./components/common/RequireDosenRole";
import RoleBasedRedirect from "./components/common/RoleBasedRedirect";
import RedirectIfAuth from "./components/common/RedirectIfAuth";
import { SessionProvider, useSession } from "./context/SessionContext";
import SessionExpiredModal from "./components/common/SessionExpiredModal";
import PetaAkademikPage from "./pages/PetaAkademikPage";
import Kelas from "./pages/Kelas";
import KelompokBesar from "./pages/KelompokBesar";
import Kelompok from "./pages/Kelompok";
import KelompokKecil from "./pages/KelompokKecil";
import KelasDetail from "./pages/KelasDetail";
import Histori from "./pages/Histori";
import ReportingDosen from "./pages/ReportingDosen";
import PBLDetail from "./pages/PBL-detail";
import PBLList from "./pages/PBL";
import PBLGenerate from "./pages/PBLGenerate";
import MataKuliahKeahlian from "./pages/MataKuliahKeahlian";
import CSRDetail from "./pages/CSRDetail";
import DetailBlok from "./pages/DetailBlok";
import DetailNonBlokCSR from "./pages/DetailNonBlokCSR";
import DetailNonBlokNonCSR from "./pages/DetailNonBlokNonCSR";
import PilihPetaBlok from "./pages/PilihPetaBlok";
import PetaBlok from "./pages/PetaBlok";
import PenilaianPBLPage from "./pages/PenilaianPBLPage";
import PenilaianJurnalPage from "./pages/PenilaianJurnalPage";
import DosenRiwayat from "./pages/DosenRiwayat";
import DashboardDosen from "./pages/DashboardDosen";
import MataKuliahDosen from "./pages/MataKuliahDosen";
import AdminNotifications from "./pages/AdminNotifications";

function AppContent() {
  const { isSessionExpired, setSessionExpired } = useSession();

  useEffect(() => {
    const handleSessionExpired = () => {
      setSessionExpired(true);
    };

    window.addEventListener("sessionExpired", handleSessionExpired);
    return () => {
      window.removeEventListener("sessionExpired", handleSessionExpired);
    };
  }, [setSessionExpired]);

  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Protected Routes */}
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              {/* Default route - redirect based on role */}
              <Route index path="/" element={<RoleBasedRedirect />} />
              
              {/* Super Admin Routes */}
              <Route path="/tahun-ajaran" element={
                <RequireDosenRole allowedRoles={["super_admin"]}>
                  <TahunAjaran />
                </RequireDosenRole>
              } />
              <Route path="/mata-kuliah" element={
                <RequireDosenRole allowedRoles={["super_admin"]}>
                  <MataKuliah />
                </RequireDosenRole>
              } />
              
              {/* Dosen Routes */}
              <Route path="/mata-kuliah-dosen" element={
                <RequireDosenRole allowedRoles={["dosen"]}>
                  <MataKuliahDosen />
                </RequireDosenRole>
              } />
              
              <Route path="/dashboard-dosen" element={
                <RequireDosenRole allowedRoles={["dosen"]}>
                  <DashboardDosen />
                </RequireDosenRole>
              } />
              <Route path="/dosen-riwayat" element={
                <RequireDosenRole allowedRoles={["dosen"]}>
                  <DosenRiwayat />
                </RequireDosenRole>
              } />
              {/* Super Admin Only Routes */}
              <Route path="/pbl" element={
                <RequireDosenRole allowedRoles={["super_admin"]}>
                  <PBLList />
                </RequireDosenRole>
              } />
              <Route path="/pbl/blok/:blokId" element={
                <RequireDosenRole allowedRoles={["super_admin"]}>
                  <PBLDetail />
                </RequireDosenRole>
              } />
              <Route path="/pbl/generate/:blokId" element={
                <RequireDosenRole allowedRoles={["super_admin"]}>
                  <PBLGenerate />
                </RequireDosenRole>
              } />
              <Route path="/pbl/keahlian" element={
                <RequireDosenRole allowedRoles={["super_admin"]}>
                  <MataKuliahKeahlian />
                </RequireDosenRole>
              } />
              <Route path="/csr" element={
                <RequireDosenRole allowedRoles={["super_admin"]}>
                  <CSR />
                </RequireDosenRole>
              } />
              <Route path="/csr/:csrId" element={
                <RequireDosenRole allowedRoles={["super_admin"]}>
                  <CSRDetail />
                </RequireDosenRole>
              } />
              <Route path="/dosen" element={
                <RequireDosenRole allowedRoles={["super_admin"]}>
                  <Dosen />
                </RequireDosenRole>
              } />
              <Route path="/dosen/:id/riwayat" element={
                <RequireDosenRole allowedRoles={["super_admin"]}>
                  <DosenRiwayat />
                </RequireDosenRole>
              } />
              <Route path="/mahasiswa" element={
                <RequireDosenRole allowedRoles={["super_admin"]}>
                  <Mahasiswa />
                </RequireDosenRole>
              } />
              <Route path="/tim-akademik" element={
                <RequireDosenRole allowedRoles={["super_admin"]}>
                  <TimAkademik />
                </RequireDosenRole>
              } />
              <Route path="/tahun-ajaran" element={
                <RequireDosenRole allowedRoles={["super_admin"]}>
                  <TahunAjaran />
                </RequireDosenRole>
              } />
              <Route path="/ruangan" element={
                <RequireDosenRole allowedRoles={["super_admin"]}>
                  <Ruangan />
                </RequireDosenRole>
              } />
              <Route path="/profile" element={<Profile />} />
              
              {/* Peta Routes - Available for both super_admin and dosen */}
              <Route path="/peta-akademik" element={
                <RequireDosenRole allowedRoles={["super_admin", "dosen"]}>
                  <PetaAkademikPage />
                </RequireDosenRole>
              } />
              <Route path="/peta-blok" element={
                <RequireDosenRole allowedRoles={["super_admin", "dosen"]}>
                  <PilihPetaBlok />
                </RequireDosenRole>
              } />
              <Route path="/peta-blok/:semester/:blok" element={
                <RequireDosenRole allowedRoles={["super_admin", "dosen"]}>
                  <PetaBlok />
                </RequireDosenRole>
              } />
              
              {/* Super Admin Only Routes */}
              <Route
                path="/generate/kelompok-besar/:semester"
                element={
                  <RequireDosenRole allowedRoles={["super_admin"]}>
                    <KelompokBesar />
                  </RequireDosenRole>
                }
              />
              <Route path="/generate/kelompok" element={
                <RequireDosenRole allowedRoles={["super_admin"]}>
                  <Kelompok />
                </RequireDosenRole>
              } />
              <Route path="/generate/kelas" element={
                <RequireDosenRole allowedRoles={["super_admin"]}>
                  <Kelas />
                </RequireDosenRole>
              } />
              <Route path="/reporting/dosen" element={
                <RequireDosenRole allowedRoles={["super_admin"]}>
                  <ReportingDosen />
                </RequireDosenRole>
              } />
              <Route path="/reporting/histori" element={
                <RequireDosenRole allowedRoles={["super_admin"]}>
                  <Histori />
                </RequireDosenRole>
              } />
              <Route path="/admin-notifications" element={
                <RequireDosenRole allowedRoles={["super_admin"]}>
                  <AdminNotifications />
                </RequireDosenRole>
              } />
              <Route
                path="/generate/kelompok/:semester"
                element={
                  <RequireDosenRole allowedRoles={["super_admin"]}>
                    <KelompokKecil />
                  </RequireDosenRole>
                }
              />
              <Route
                path="/generate/kelas/:semester"
                element={
                  <RequireDosenRole allowedRoles={["super_admin"]}>
                    <KelasDetail />
                  </RequireDosenRole>
                }
              />
              <Route path="/mata-kuliah/blok/:kode" element={
                <RequireDosenRole allowedRoles={["super_admin"]}>
                  <DetailBlok />
                </RequireDosenRole>
              } />
              <Route
                path="/mata-kuliah/non-blok-csr/:kode"
                element={
                  <RequireDosenRole allowedRoles={["super_admin"]}>
                    <DetailNonBlokCSR />
                  </RequireDosenRole>
                }
              />
              <Route
                path="/mata-kuliah/non-blok-non-csr/:kode"
                element={
                  <RequireDosenRole allowedRoles={["super_admin"]}>
                    <DetailNonBlokNonCSR />
                  </RequireDosenRole>
                }
              />
              <Route
                path="/penilaian-pbl/:kode_blok/:kelompok/:pertemuan"
                element={
                  <RequireDosenRole allowedRoles={["super_admin"]}>
                    <PenilaianPBLPage />
                  </RequireDosenRole>
                }
              />
              <Route
                path="/penilaian-jurnal/:kode_blok/:kelompok/:jurnal_id"
                element={
                  <RequireDosenRole allowedRoles={["super_admin"]}>
                    <PenilaianJurnalPage />
                  </RequireDosenRole>
                }
              />
              
              {/* Catch-all route for invalid URLs */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>

          {/* Public Route: Login only, with redirect if already logged in */}
          <Route
            path="/login"
            element={
              <RedirectIfAuth>
                <SignIn />
              </RedirectIfAuth>
            }
          />
        </Routes>
        <SessionExpiredModal isOpen={isSessionExpired} />
      </Router>
    </>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}
