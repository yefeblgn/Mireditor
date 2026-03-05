import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const API_URL = 'http://localhost:8000';

interface AuthPageProps {
  onSuccess: () => void;
}

type AuthMode = 'login' | 'register';

export function AuthPage({ onSuccess }: AuthPageProps) {
  const { setToken, setUser, isAuthenticated, rememberMe, setRememberMe } =
    useAuthStore();

  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Ardarda yanlış giriş kontrolü
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Remember Me ile zaten giriş yapılmışsa dashboard'a yönlendir
  useEffect(() => {
    if (isAuthenticated) {
      onSuccess();
    }
  }, [isAuthenticated]);

  // Lockout timer
  useEffect(() => {
    if (!lockoutUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, lockoutUntil - Date.now());
      setLockoutRemaining(remaining);
      if (remaining <= 0) {
        setLockoutUntil(null);
        setFailedAttempts(0);
        setError('');
      }
    }, 100);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Input değiştiğinde error'u temizle (bug fix)
  const clearErrors = () => {
    setError('');
    setSuccess('');
  };

  // Mod değiştirme (animasyonlu)
  const switchMode = (newMode: AuthMode) => {
    if (newMode === mode || isTransitioning) return;
    setIsTransitioning(true);
    setError('');
    setSuccess('');

    // Fade out
    setTimeout(() => {
      setMode(newMode);
      // Form alanlarını temizle
      setUsername('');
      setEmail('');
      setFullName('');
      setPassword('');
      setConfirmPassword('');
      setFailedAttempts(0);
      setLockoutUntil(null);

      // Fade in
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 300);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Lockout kontrolü
    if (lockoutUntil && Date.now() < lockoutUntil) {
      return;
    }

    if (!username.trim() || !password.trim()) {
      setError('Kullanıcı adı ve şifre gereklidir.');
      return;
    }

    // Loading zaten aktifse tekrar basılmasını engelle
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${API_URL}/login`, {
        username: username.trim(),
        password: password.trim(),
      });

      setFailedAttempts(0);
      setToken(res.data.token);
      setUser(res.data.user);
      onSuccess();
    } catch (err: any) {
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);

      // 5 yanlış denemeden sonra 30 saniye kilitle
      if (newFailedAttempts >= 5) {
        const lockTime = Date.now() + 30000;
        setLockoutUntil(lockTime);
        setError(
          `Çok fazla başarısız deneme. 30 saniye bekleyin.`
        );
      } else if (err.response?.status === 401) {
        setError(
          `Geçersiz kullanıcı adı veya şifre. (${newFailedAttempts}/5)`
        );
      } else if (err.code === 'ERR_NETWORK') {
        setError('Sunucuya bağlanılamadı. Backend çalışıyor mu?');
      } else {
        setError('Beklenmeyen bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Tüm alanları doldurun.');
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Geçerli bir email adresi girin.');
      return;
    }

    if (loading) return;

    setLoading(true);
    setError('');

    try {
      await axios.post(`${API_URL}/register`, {
        full_name: fullName.trim(),
        email: email.trim(),
        password: password.trim(),
      });

      setSuccess('Hesap başarıyla oluşturuldu! Giriş yapabilirsiniz.');
      // 1.5 saniye sonra login moduna geç
      setTimeout(() => {
        switchMode('login');
      }, 1500);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('Bu email adresi zaten kayıtlı.');
      } else if (err.response?.status === 422) {
        setError('Geçersiz bilgiler. Lütfen kontrol edin.');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Sunucuya bağlanılamadı. Backend çalışıyor mu?');
      } else {
        setError(err.response?.data?.detail || 'Kayıt sırasında bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil;
  const lockoutSeconds = Math.ceil(lockoutRemaining / 1000);

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#0f0f0f] relative overflow-hidden">

      <div
        className={`w-full max-w-sm px-8 auth-form-container ${
          isTransitioning ? 'auth-fade-out' : 'auth-fade-in'
        }`}
      >
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <img
              src="./assets/icon-nobg.png"
              alt="Mireditor"
              className="w-20 h-20 mx-auto mb-4 opacity-80"
              draggable={false}
            />
          </div>
          <h1 className="text-white text-2xl font-bold tracking-[6px] uppercase">
            Mireditor
          </h1>
          <p className="text-[#555] text-[10px] mt-1 uppercase tracking-[3px]">
            Yaratıcılığınızı Serbest Bırakın
          </p>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex mb-8 bg-[#111] rounded-xl p-1 relative">
          <div
            className="auth-tab-indicator"
            style={{ transform: mode === 'login' ? 'translateX(0)' : 'translateX(100%)' }}
          />
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2.5 text-[10px] uppercase font-bold tracking-[3px] rounded-lg z-10 transition-colors duration-300 ${
              mode === 'login' ? 'text-white' : 'text-[#555] hover:text-[#777]'
            }`}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-2.5 text-[10px] uppercase font-bold tracking-[3px] rounded-lg z-10 transition-colors duration-300 ${
              mode === 'register' ? 'text-white' : 'text-[#555] hover:text-[#777]'
            }`}
          >
            Kayıt Ol
          </button>
        </div>

        {/* ========== LOGIN FORM ========== */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} ref={formRef} className="space-y-4 auth-fields-stagger">
            <div className="auth-field" style={{ animationDelay: '0.05s' }}>
              <label className="block text-[#666] text-[10px] mb-2 uppercase font-semibold tracking-widest">
                Kullanıcı Adı
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); clearErrors(); }}
                placeholder="Kullanıcı adı giriniz..."
                autoComplete="username"
                disabled={isLockedOut}
                className="auth-input"
              />
            </div>

            <div className="auth-field" style={{ animationDelay: '0.1s' }}>
              <label className="block text-[#666] text-[10px] mb-2 uppercase font-semibold tracking-widest">
                Şifre
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearErrors(); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isLockedOut}
                  className="auth-input pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#999] transition-colors"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Beni Hatırla + Şifremi Unuttum */}
            <div className="flex items-center justify-between pt-1 auth-field" style={{ animationDelay: '0.15s' }}>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-blue-500 cursor-pointer"
                />
                <span className="text-[#666] text-[10px] uppercase font-medium tracking-wider group-hover:text-[#888] transition-colors">
                  Beni Hatırla
                </span>
              </label>
              <button
                type="button"
                className="text-[#3b82f6] text-[10px] uppercase font-medium tracking-wider hover:text-blue-400 transition-colors"
              >
                Şifremi Unuttum?
              </button>
            </div>

            {/* Error / Lockout */}
            {error && (
              <div className="auth-error-slide">
                <div className="bg-red-900/20 border border-red-900/40 rounded-lg p-3">
                  <p className="text-red-400 text-xs text-center">
                    {error}
                    {isLockedOut && (
                      <span className="block mt-1 text-red-300 font-mono text-[11px]">
                        {lockoutSeconds}s
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="auth-field" style={{ animationDelay: '0.2s' }}>
              <button
                type="submit"
                disabled={loading || isLockedOut}
                className={`auth-submit-btn ${
                  loading || isLockedOut
                    ? 'bg-[#1a1a1a] text-[#444] cursor-not-allowed'
                    : 'bg-[#3b82f6] text-white hover:bg-blue-600 active:scale-[0.98] shadow-lg shadow-blue-500/20'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    GİRİŞ YAPILIYOR...
                  </span>
                ) : isLockedOut ? (
                  `KİLİTLİ (${lockoutSeconds}s)`
                ) : (
                  'GİRİŞ YAP'
                )}
              </button>
            </div>
          </form>
        )}

        {/* ========== REGISTER FORM ========== */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} ref={formRef} className="space-y-4 auth-fields-stagger">
            <div className="auth-field" style={{ animationDelay: '0.05s' }}>
              <label className="block text-[#666] text-[10px] mb-2 uppercase font-semibold tracking-widest">
                Kullanıcı Adı
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); clearErrors(); }}
                placeholder="Kullanıcı adı giriniz..."
                autoComplete="name"
                className="auth-input"
              />
            </div>

            <div className="auth-field" style={{ animationDelay: '0.1s' }}>
              <label className="block text-[#666] text-[10px] mb-2 uppercase font-semibold tracking-widest">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearErrors(); }}
                placeholder="E-postanızı giriniz..."
                autoComplete="email"
                className="auth-input"
              />
            </div>

            <div className="auth-field" style={{ animationDelay: '0.15s' }}>
              <label className="block text-[#666] text-[10px] mb-2 uppercase font-semibold tracking-widest">
                Şifre
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearErrors(); }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="auth-input pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#999] transition-colors"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className="auth-field" style={{ animationDelay: '0.2s' }}>
              <label className="block text-[#666] text-[10px] mb-2 uppercase font-semibold tracking-widest">
                Şifre Tekrar
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); clearErrors(); }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="auth-input pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#999] transition-colors"
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Password strength indicator */}
            {password.length > 0 && (
              <div className="auth-field" style={{ animationDelay: '0.22s' }}>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => {
                    const strength = getPasswordStrength(password);
                    return (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                          strength >= level
                            ? level <= 1 ? 'bg-red-500' : level <= 2 ? 'bg-orange-500' : level <= 3 ? 'bg-yellow-500' : 'bg-green-500'
                            : 'bg-[#222]'
                        }`}
                      />
                    );
                  })}
                </div>
                <p className="text-[10px] mt-1 text-[#555]">
                  {getPasswordStrengthLabel(password)}
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="auth-error-slide">
                <div className="bg-red-900/20 border border-red-900/40 rounded-lg p-3">
                  <p className="text-red-400 text-xs text-center">{error}</p>
                </div>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="auth-error-slide">
                <div className="bg-green-900/20 border border-green-900/40 rounded-lg p-3">
                  <p className="text-green-400 text-xs text-center">{success}</p>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="auth-field" style={{ animationDelay: '0.25s' }}>
              <button
                type="submit"
                disabled={loading}
                className={`auth-submit-btn ${
                  loading
                    ? 'bg-[#1a1a1a] text-[#444] cursor-not-allowed'
                    : 'bg-[#3b82f6] text-white hover:bg-blue-600 active:scale-[0.98] shadow-lg shadow-blue-500/20'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    KAYIT YAPILIYOR...
                  </span>
                ) : (
                  'KAYIT OL'
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <p className="text-center text-[#333] text-[9px] mt-8 uppercase tracking-[2px]">
          © 2026 Mireditor. Tüm hakları saklıdır.
        </p>
      </div>
    </div>
  );
}

// Şifre güç hesaplama
function getPasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function getPasswordStrengthLabel(password: string): string {
  const s = getPasswordStrength(password);
  if (s <= 1) return 'Zayıf';
  if (s === 2) return 'Orta';
  if (s === 3) return 'Güçlü';
  return 'Çok Güçlü';
}

// Eye icons
function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

