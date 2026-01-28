'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/lib/hooks/useAuth';
import type { ApiError } from '@/types/api';

/**
 * Extract error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as ApiError).message || 'Erro ao fazer login';
  }
  return 'Erro ao fazer login';
}

export function LoginForm() {
  const { login, isLoading, loginError } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Verificar se a sessão expirou (parâmetro do middleware)
  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setError('Sua sessão expirou. Por favor, faça login novamente.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    try {
      await login({ email, password });
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Erro ao fazer login');
    }
  };

  const errorMessage = error || (loginError ? getErrorMessage(loginError) : null);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto flex items-center justify-center">
          <Image
            src="/astro_logo_branco.svg"
            alt="Astro"
            width={180}
            height={40}
            priority
            className="dark:invert-0 invert"
          />
        </div>
        <CardDescription>Faça login para acessar o assistente inteligente</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={errorMessage ? 'login-error' : undefined}>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoComplete="email"
              aria-required="true"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Senha
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
              aria-required="true"
              required
            />
          </div>

          {errorMessage && (
            <div
              id="login-error"
              role="alert"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {errorMessage}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
