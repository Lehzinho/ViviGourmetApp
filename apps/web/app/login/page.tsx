"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import axios from "axios";
import { apiClient, setStoredTokens } from "@/lib/apiClient";
import { APP_NAME } from "@/lib/constants";

const Page = styled.main`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.surface};
  padding: 1.5rem;
`;

const Card = styled.div`
  width: min(400px, 100%);
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadows.md};
  padding: 2rem;
`;

const Logo = styled.div`
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 0.25rem;
`;

const Heading = styled.h1`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 1.75rem;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
`;

const Label = styled.label`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Input = styled.input`
  padding: 0.6rem 0.75rem;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background};
  transition: border-color ${({ theme }) => theme.transition};
  outline: none;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const PasswordWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const PasswordInput = styled(Input)`
  padding-right: 2.75rem;
`;

const ToggleBtn = styled.button`
  position: absolute;
  right: 0.6rem;
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.muted};
  padding: 0.25rem;
  display: flex;
  align-items: center;
  line-height: 1;

  &:hover {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

const ErrorMsg = styled.p`
  margin: 0 0 1rem;
  padding: 0.6rem 0.75rem;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.primaryMuted};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.8125rem;
  font-weight: 500;
`;

const SubmitBtn = styled.button`
  width: 100%;
  padding: 0.65rem;
  border-radius: ${({ theme }) => theme.radius.md};
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.text.inverse};
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: background ${({ theme }) => theme.transition};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.primaryHover};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await apiClient.post<LoginResponse>("/auth/login", {
        email,
        password,
      });
      setStoredTokens(data.accessToken, data.refreshToken);
      document.cookie = "vivi_logged_in=true; path=/; max-age=604800; SameSite=Lax";
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect") || "/dashboard";
      router.push(redirect);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError("E-mail ou senha incorretos.");
      } else {
        setError("Erro ao conectar com o servidor.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <Card>
        <Logo>{APP_NAME}</Logo>
        <Heading>Entrar na sua conta</Heading>

        <form onSubmit={handleSubmit} noValidate>
          {error && <ErrorMsg role="alert">{error}</ErrorMsg>}

          <Field>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vivi@vivi.com"
              required
            />
          </Field>

          <Field>
            <Label htmlFor="password">Senha</Label>
            <PasswordWrap>
              <PasswordInput
                as="input"
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder="••••••"
                required
              />
              <ToggleBtn
                type="button"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                <EyeIcon open={showPassword} />
              </ToggleBtn>
            </PasswordWrap>
          </Field>

          <SubmitBtn type="submit" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </SubmitBtn>
        </form>
      </Card>
    </Page>
  );
}
