import { BrowserRouter as Router, Routes, Route } from "react-router";
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
import DetailBlok from "./pages/DetailBlok";
import DetailNonBlokCSR from "./pages/DetailNonBlokCSR";
import DetailNonBlokNonCSR from "./pages/DetailNonBlokNonCSR";
import PetaBlok from "./pages/PetaBlok";
import PilihPetaBlok from "./pages/PilihPetaBlok";
import PenilaianPBLPage from "./pages/PenilaianPBLPage";
import PenilaianJurnalPage from "./pages/PenilaianJurnalPage";

function AppContent() {
  const { isSessionExpired, setSessionExpired } = useSession();

  useEffect(() => {
    const handleSessionExpired = () => {
      setSessionExpired(true);
    };

    window.addEventListener('sessionExpired', handleSessionExpired);
    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpired);
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
              <Route index path="/" element={<TahunAjaran />} />
              <Route path="/mata-kuliah" element={<MataKuliah />} />
              <Route path="/mata-kuliah/blok/:kode" element={<DetailBlok />} />
              <Route path="/mata-kuliah/non-blok-csr/:kode" element={<DetailNonBlokCSR />} />
              <Route path="/mata-kuliah/non-blok-non-csr/:kode" element={<DetailNonBlokNonCSR />} />
              <Route path="/penilaian-pbl/:kode_blok/:kelompok/:pertemuan" element={<PenilaianPBLPage />} />
              <Route path="/penilaian-jurnal/:kode_blok/:kelompok/:pertemuan/:rowIndex" element={<PenilaianJurnalPage />} />
              <Route path="/pbl" element={<PBLList />} />
              <Route path="/pbl/blok/:blokId" element={<PBLDetail />} />
              <Route path="/pbl/generate/:blokId" element={<PBLGenerate />} />
              <Route path="/pbl/keahlian" element={<MataKuliahKeahlian />} />
              <Route path="/csr" element={<CSR />} />
              <Route path="/dosen" element={<Dosen />} />
              <Route path="/mahasiswa" element={<Mahasiswa />} />
              <Route path="/tim-akademik" element={<TimAkademik />} />
              <Route path="/tahun-ajaran" element={<TahunAjaran />} />
              <Route path="/ruangan" element={<Ruangan />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/peta-akademik" element={<PetaAkademikPage />} />
              <Route path="/peta-blok" element={<PilihPetaBlok />} />
              <Route path="/peta-blok/:semester/:blok" element={<PetaBlok />} />
              <Route path="/generate/kelompok-besar/:semester" element={<KelompokBesar />} />
              <Route path="/generate/kelompok" element={<Kelompok />} />
              <Route path="/generate/kelas" element={<Kelas />} />
              <Route path="/reporting/dosen" element={<ReportingDosen />} />
              <Route path="/reporting/histori" element={<Histori />} />
              <Route path="/generate/kelompok/:semester" element={<KelompokKecil />} />
              <Route path="/generate/kelas/:semester" element={<KelasDetail />} />
            </Route>
          </Route>

          {/* Public Route: Login only, with redirect if already logged in */}
          <Route path="/login" element={<RedirectIfAuth><SignIn /></RedirectIfAuth>} />
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
