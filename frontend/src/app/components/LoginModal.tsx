import { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { TrendingUp, Mail, Lock, Eye, EyeOff, X } from 'lucide-react';
import { Input } from './ui/input';
import { jwtDecode } from 'jwt-decode';
import { buildApiUrl, fetchWithTimeout, API_CONFIG } from '../config/api';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: () => void;
}

interface GoogleJWT {
    email: string;
    name: string;
    picture?: string;
    sub: string;
}

export function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetStep, setResetStep] = useState<'email' | 'code' | 'password'>('email');
    const [successMessage, setSuccessMessage] = useState('');
    const [resendTimer, setResendTimer] = useState(0);
    const [hasRequestedCode, setHasRequestedCode] = useState(false);

    // Countdown timer for resend OTP
    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendTimer]);

    if (!isOpen) return null;

    const handleGoogleLogin = async (credentialResponse: any) => {
        try {
            // Decode the JWT token
            const decoded = jwtDecode<GoogleJWT>(credentialResponse.credential);
            console.log('Google user:', decoded);

            // Send to backend
            const res = await fetchWithTimeout(
                buildApiUrl(API_CONFIG.ENDPOINTS.GOOGLE_LOGIN),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: decoded.email,
                        name: decoded.name,
                        googleId: decoded.sub
                    }),
                }
            );

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('userEmail', data.user.email);
                localStorage.setItem('userName', data.user.name);
                onLogin();
                onClose();
            } else {
                setError(data.error || 'Google login failed');
            }
        } catch (err) {
            console.error('Google login error:', err);
            setError('Failed to process Google login');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const endpoint = isRegister ? API_CONFIG.ENDPOINTS.REGISTER : API_CONFIG.ENDPOINTS.LOGIN;
        const payload = isRegister ? { email, password, name } : { email, password };

        try {
            const res = await fetchWithTimeout(
                buildApiUrl(endpoint),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }
            );
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('userEmail', data.user.email);
                onLogin();
                onClose();
                setEmail('');
                setPassword('');
                setName('');
            } else {
                setError(data.error || `${isRegister ? 'Registration' : 'Login'} failed`);
            }
        } catch (err) {
            console.error('Auth error:', err);
            setError('Failed to connect to server');
        }
    };

    const sendResetEmail = async () => {
        if (!email) {
            setError('Please enter your email');
            return;
        }

        try {
            const res = await fetchWithTimeout(
                buildApiUrl(API_CONFIG.ENDPOINTS.FORGOT_PASSWORD),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                }
            );
            const data = await res.json();

            if (res.ok) {
                setSuccessMessage(data.message);
                // Only advance step if we are on email step
                if (resetStep === 'email') {
                    setResetStep('code');
                }
                setResendTimer(60); // Start 60 second countdown
                setHasRequestedCode(true);
            } else {
                setError(data.error || 'Failed to send reset code');
            }
        } catch (err) {
            console.error('Forgot password error:', err);
            setError('Failed to connect to server');
        }
    };

    const handleForgotPassword = async () => {
        setError('');
        setSuccessMessage('');

        if (resetStep === 'email') {
            await sendResetEmail();
        } else if (resetStep === 'code') {
            // Verify code with backend
            if (!resetCode) {
                setError('Please enter the 6-digit code');
                return;
            }

            try {
                const res = await fetchWithTimeout(
                    buildApiUrl(API_CONFIG.ENDPOINTS.VERIFY_RESET_CODE),
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, code: resetCode }),
                    }
                );
                const data = await res.json();

                if (res.ok) {
                    setSuccessMessage('Code verified! Now set your new password.');
                    setResetStep('password');
                    setError('');
                } else {
                    setError(data.error || 'Invalid code');
                }
            } catch (err) {
                console.error('Check code error:', err);
                setError('Failed to connect to server');
            }
        } else {
            // Password reset step
            // Password reset step
            if (!newPassword || !confirmPassword) {
                setError('Please enter and confirm your new password');
                return;
            }

            if (newPassword !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }

            try {
                const res = await fetchWithTimeout(
                    buildApiUrl(API_CONFIG.ENDPOINTS.RESET_PASSWORD),
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, code: resetCode, newPassword }),
                    }
                );
                const data = await res.json();

                if (res.ok) {
                    setSuccessMessage('Password reset successful! You can now login.');
                    setTimeout(() => {
                        setIsForgotPassword(false);
                        setResetStep('email');
                        setResetCode('');
                        setNewPassword('');
                        setPassword('');
                    }, 2000);
                } else {
                    setError(data.error || 'Failed to reset password');
                }
            } catch (err) {
                console.error('Reset password error:', err);
                setError('Failed to connect to server');
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-card rounded-xl shadow-lg border border-border animate-in zoom-in-95 duration-200 p-8">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Logo and Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 bg-primary overflow-hidden">
                        <img
                            src="/IPO_RADAR_Logo.png"
                            alt="IPO Radar Logo"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2 text-foreground">
                        {isForgotPassword ? 'Reset Password' : (isRegister ? 'Create Account' : 'Welcome Back')}
                    </h2>
                    <p className="text-muted-foreground">
                        {isForgotPassword
                            ? (resetStep === 'email'
                                ? 'Enter your email to receive a reset code'
                                : resetStep === 'code'
                                    ? 'Enter the 6-digit code sent to your email'
                                    : 'Enter your new password')
                            : (isRegister ? 'Sign up to start tracking IPOs' : 'Sign in to access your personalized radar')}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg text-center">
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div className="mb-4 p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg text-center">
                        {successMessage}
                    </div>
                )}

                {/* Forgot Password Form */}
                {isForgotPassword ? (
                    <div className="space-y-6">{resetStep === 'email' ? (
                        <div>
                            <label htmlFor="reset-email" className="block text-sm font-medium mb-2 text-foreground">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <Input
                                    id="reset-email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-11 bg-input-background border-border"
                                    required
                                />
                            </div>
                        </div>
                    ) : resetStep === 'code' ? (
                        <div>
                            <label htmlFor="reset-code" className="block text-sm font-medium mb-2 text-foreground">
                                Reset Code
                            </label>
                            <Input
                                id="reset-code"
                                type="text"
                                placeholder="Enter 6-digit code"
                                value={resetCode}
                                onChange={(e) => setResetCode(e.target.value)}
                                className="bg-input-background border-border text-center text-2xl letter-spacing-[5px]"
                                maxLength={6}
                                required
                            />
                            {/* Resend OTP Link */}
                            <div className="flex justify-end mt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (resendTimer === 0) {
                                            sendResetEmail();
                                        }
                                    }}
                                    disabled={resendTimer > 0}
                                    className={`text-sm font-medium transition-colors ${resendTimer > 0
                                        ? 'text-muted-foreground cursor-not-allowed'
                                        : 'text-primary hover:underline'
                                        }`}
                                >
                                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="new-password" className="block text-sm font-medium mb-2 text-foreground">
                                New Password <span className="text-muted-foreground text-xs">(min 6 characters)</span>
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <Input
                                    id="new-password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="pl-11 pr-11 bg-input-background border-border"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            <div className="mt-4">
                                <label htmlFor="confirm-password" className="block text-sm font-medium mb-2 text-foreground">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <Input
                                        id="confirm-password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pl-11 pr-11 bg-input-background border-border"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                        <button
                            type="button"
                            onClick={handleForgotPassword}
                            disabled={resetStep === 'email' && resendTimer > 0}
                            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {resetStep === 'email'
                                ? (hasRequestedCode ? 'Resend OTP' : 'Send Reset Code')
                                : resetStep === 'code'
                                    ? 'Verify Code'
                                    : 'Reset Password'}
                        </button>

                        {/* Timer display for email step */}
                        {resendTimer > 0 && resetStep === 'email' && (
                            <div className="text-center text-sm text-muted-foreground mt-2">
                                Resend available in {resendTimer}s
                            </div>
                        )}

                        <div className="text-center text-sm">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsForgotPassword(false);
                                    setResetStep('email');
                                    setError('');
                                    setSuccessMessage('');
                                }}
                                className="text-primary hover:underline font-medium"
                            >
                                Back to Login
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Login/Register Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {isRegister && (
                                <div>
                                    <label htmlFor="modal-name" className="block text-sm font-medium mb-2 text-foreground">
                                        Name
                                    </label>
                                    <Input
                                        id="modal-name"
                                        type="text"
                                        placeholder="Your name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="bg-input-background border-border"
                                        required={isRegister}
                                    />
                                </div>
                            )}

                            <div>
                                <label htmlFor="modal-email" className="block text-sm font-medium mb-2 text-foreground">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <Input
                                        id="modal-email"
                                        type="email"
                                        placeholder="your@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-11 bg-input-background border-border"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="modal-password" className="block text-sm font-medium mb-2 text-foreground">
                                    Password {isRegister && <span className="text-muted-foreground text-xs">(min 6 characters)</span>}
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <Input
                                        id="modal-password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-11 pr-11 bg-input-background border-border"
                                        required
                                        minLength={isRegister ? 6 : undefined}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                            >
                                {isRegister ? 'Create Account' : 'Sign In'}
                            </button>

                            {/* Toggle between login and register */}
                            <div className="text-center text-sm">
                                <span className="text-muted-foreground">
                                    {isRegister ? 'Already have an account? ' : "Don't have an account? "}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsRegister(!isRegister);
                                        setError('');
                                    }}
                                    className="text-primary hover:underline font-medium"
                                >
                                    {isRegister ? 'Sign in' : 'Sign up'}
                                </button>
                            </div>
                        </form>

                        {/* Forgot Password Link */}
                        {!isRegister && (
                            <div className="text-center text-sm mt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsForgotPassword(true);
                                        setError('');
                                    }}
                                    className="text-primary hover:underline font-medium"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        )}

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
                            </div>
                        </div>

                        <div className="flex justify-center w-full">
                            <GoogleLogin
                                onSuccess={handleGoogleLogin}
                                onError={() => {
                                    console.log('Login Failed');
                                    setError('Google Login Failed');
                                }}
                                theme="filled_blue"
                                shape="circle"
                                width="100%"
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
