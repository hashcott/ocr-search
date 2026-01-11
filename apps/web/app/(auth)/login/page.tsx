'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { useAuthStore } from '@/lib/stores';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Search, Zap, Shield, Loader2 } from 'lucide-react';
import { Logo, LogoIcon } from '@/components/ui/logo';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const setAuth = useAuthStore((state) => state.setAuth);

  const loginMutation = trpc?.auth?.login?.useMutation?.({
    onSuccess: (data: { user: Parameters<typeof setAuth>[0]; token: string }) => {
      setAuth(data.user, data.token);
      toast({
        title: 'Success',
        description: 'Logged in successfully',
      });
      router.push('/dashboard');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="bg-background flex min-h-screen">
      {/* Left Side - Branding */}
      <div className="bg-foreground relative hidden overflow-hidden lg:flex lg:w-1/2">
        <div className="bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.02%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] absolute inset-0 opacity-50"></div>

        <div className="text-background relative z-10 flex flex-col justify-center px-16">
          {/* Logo */}
          <div className="mb-12">
            <Logo size="lg" className="text-background" />
          </div>

          <h1 className="mb-4 text-4xl font-semibold leading-tight">
            Smart Document
            <br />
            Search Platform
          </h1>
          <p className="text-background/70 mb-8 max-w-md text-lg leading-relaxed">
            Search intelligently in your PDF documents with advanced AI technology. Fast, accurate
            and efficient.
          </p>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="bg-background/10 flex h-10 w-10 items-center justify-center rounded-lg">
                <Search className="text-primary h-5 w-5" />
              </div>
              <span className="text-background/80">Semantic search with AI</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-background/10 flex h-10 w-10 items-center justify-center rounded-lg">
                <Zap className="text-chart-2 h-5 w-5" />
              </div>
              <span className="text-background/80">Fast processing with AI</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-background/10 flex h-10 w-10 items-center justify-center rounded-lg">
                <Shield className="text-chart-3 h-5 w-5" />
              </div>
              <span className="text-background/80">Enterprise-grade security</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex flex-1 items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-[400px]">
          {/* Mobile Logo */}
          <div className="mb-8 lg:hidden">
            <Logo size="md" />
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="mb-2 text-2xl font-semibold">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to continue to your dashboard</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="text-muted-foreground absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-accent border-border placeholder:text-muted-foreground focus:ring-primary/20 focus:border-primary h-12 w-full rounded-lg border pl-12 pr-4 transition-all focus:outline-none focus:ring-2"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="text-muted-foreground absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-accent border-border placeholder:text-muted-foreground focus:ring-primary/20 focus:border-primary h-12 w-full rounded-lg border pl-12 pr-12 transition-all focus:outline-none focus:ring-2"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="border-border text-primary focus:ring-primary/20 h-4 w-4 rounded"
                />
                <span className="text-muted-foreground text-sm">Remember me</span>
              </label>
              <a
                href="#"
                className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
              >
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground flex h-12 w-full items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <p className="text-muted-foreground mt-8 text-center">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
