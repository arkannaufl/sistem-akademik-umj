import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import { ThemeToggleButton } from "../../components/common/ThemeToggleButton";
import api from "../../utils/api";

export default function SignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await api.post("/login", { login, password });
      const { access_token, user } = response.data;

      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));

      switch (user.role) {
        case "super_admin":
          navigate("/");
          break;
        case "tim_akademik":
          navigate("/tim-akademik");
          break;
        case "dosen":
          navigate("/dashboard-dosen");
          break;
        case "mahasiswa":
          navigate("/mahasiswa");
          break;
        default:
          navigate("/");
      }
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.response?.data?.message;

      if (status === 401 && message === "Username/NIP/NID/NIM atau password salah.") {
        setError("Username/NIP/NID/NIM atau password salah. Silakan coba lagi.");
      } else if (status === 403) {
        setError("Akun ini sedang digunakan di perangkat lain. Silakan logout terlebih dahulu.");
      } else if (status === 422) {
        setError("Format data tidak valid. Pastikan semua field telah diisi dengan benar.");
      } else if (status === 500) {
        setError("Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.");
      } else {
        setError(message || "Login gagal. Silakan coba lagi.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 z-0">
        <img
          src="/images/background/background-umj.jpg"
          alt="Background UMJ"
          className="object-cover w-full h-full blur-sm opacity-50"
        />
      </div>

      <div className="relative z-10 flex justify-center items-center min-h-screen px-4">
        <div className="flex w-full max-w-7xl rounded-2xl shadow-lg auth-card">
          <div className="flex flex-col justify-center w-full md:w-1/2">
            <div className="p-8 md:p-12">
              <div className="mb-5 sm:mb-8">
                <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                  Login
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enter your username and password to sign in!
                </p>
              </div>

              <form onSubmit={handleLogin}>
                <div className="space-y-5">
                  {error && (
                    <div className="text-sm text-red-500 bg-red-100 rounded p-2">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block mb-1 text-gray-700 dark:text-gray-300 font-medium">
                      Username / NIP / NID / NIM<span className="text-error-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      placeholder="Masukkan username, NIP, NID, atau NIM"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-gray-700 dark:text-gray-300 font-medium">
                      Password<span className="text-error-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      />
                      <span
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                      >
                        {showPassword ? (
                          <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                        ) : (
                          <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Checklist 'Keep me logged in' dihapus */}
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 ${
                        isLoading ? "opacity-70 cursor-not-allowed" : ""
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <svg
                            className="w-5 h-5 mr-2 animate-spin text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            ></path>
                          </svg>
                          Memproses...
                        </>
                      ) : (
                        "Login"
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Right: Logo & Grid */}
          <div className="hidden w-1/2 md:flex flex-col justify-center">
            <div className="relative flex items-center justify-center z-1">
              <div className="flex flex-col items-center max-w-xs">
                <Link to="/" className="block mb-4">
                  <img width={151} height={48} src="/images/logo/logo.svg" alt="Logo" />
                </Link>
                <div className="absolute right-0 top-0 -z-1 w-full max-w-[250px] xl:max-w-[450px]">
                  <img src="/images/shape/grid-01.svg" alt="grid" />
                </div>
                <div className="absolute bottom-0 left-0 -z-1 w-full max-w-[250px] rotate-180 xl:max-w-[450px]">
                  <img src="/images/shape/grid-01.svg" alt="grid" />
                </div>
                <p className="text-center text-gray-800 dark:text-white text-2xl mb-3">
                  Sistem Akademik Universitas Muhammadiyah Jakarta
                </p>
                <p className="text-center text-gray-400 dark:text-white/60">
                  Platform Terintegrasi untuk Presensi, Jadwal dan Evaluasi
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Toggle Button */}
      <div className="absolute z-20 bottom-4 right-4 lg:right-10 lg:bottom-10">
        <ThemeToggleButton />
      </div>
    </div>
  );
}
