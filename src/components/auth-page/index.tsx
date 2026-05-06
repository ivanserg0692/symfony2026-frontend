"use client";
import { Turnstile } from "@marsidev/react-turnstile";
import type { AuthPageProps } from "@refinedev/core";
import {
  AuthPage as AuthPageBase,
  useLogin,
  useTranslate,
} from "@refinedev/core";
import type { FormEvent } from "react";
import { useState } from "react";

type LoginVariables = {
  email: string;
  password: string;
  turnstileToken: string;
};

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export const AuthPage = (props: AuthPageProps) => {
  if (props.type === "login") {
    return <LoginPage />;
  }

  return (
    <AuthPageBase
      {...props}
      renderContent={(content) => (
        <div>
          <p
            style={{
              padding: 10,
              color: "#004085",
              backgroundColor: "#cce5ff",
              borderColor: "#b8daff",
              textAlign: "center",
            }}
          >
            email: demo@refine.dev
            <br /> password: demodemo
          </p>
          {content}
        </div>
      )}
    />
  );
};

const LoginPage = () => {
  const login = useLogin<LoginVariables>();
  const translate = useTranslate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const isSubmitDisabled =
    login.isPending ||
    !email.trim() ||
    !password ||
    !turnstileToken ||
    !turnstileSiteKey;
  const loginError = login.data?.error ?? login.error;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitDisabled) {
      return;
    }

    login.mutate({
      email,
      password,
      turnstileToken,
    });
  };

  return (
    <main
      style={{
        alignItems: "center",
        background: "#f6f7f9",
        display: "flex",
        justifyContent: "center",
        minHeight: "100vh",
        padding: 24,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#ffffff",
          border: "1px solid #d9dde3",
          borderRadius: 8,
          boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
          maxWidth: 420,
          padding: 32,
          width: "100%",
        }}
      >
        <h1
          style={{
            fontSize: 24,
            lineHeight: "32px",
            margin: "0 0 24px",
          }}
        >
          {translate("auth.login.title")}
        </h1>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <label
            htmlFor="email-input"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {translate("auth.login.email")}
            <input
              autoCapitalize="off"
              autoComplete="email"
              autoCorrect="off"
              id="email-input"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              spellCheck={false}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                fontSize: 16,
                height: 44,
                padding: "0 12px",
                width: "100%",
              }}
              type="email"
              value={email}
            />
          </label>

          <label
            htmlFor="password-input"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {translate("auth.login.password")}
            <input
              autoComplete="current-password"
              id="password-input"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                fontSize: 16,
                height: 44,
                padding: "0 12px",
                width: "100%",
              }}
              type="password"
              value={password}
            />
          </label>

          <div
            style={{
              minHeight: 65,
            }}
          >
            {turnstileSiteKey ? (
              <Turnstile
                onError={() => setTurnstileToken("")}
                onExpire={() => setTurnstileToken("")}
                onSuccess={setTurnstileToken}
                siteKey={turnstileSiteKey}
              />
            ) : (
              <p
                style={{
                  color: "#b45309",
                  fontSize: 14,
                  lineHeight: "20px",
                  margin: 0,
                }}
              >
                {translate("auth.login.turnstileMissing")}
              </p>
            )}
          </div>

          {loginError && (
            <p
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 6,
                color: "#991b1b",
                fontSize: 14,
                lineHeight: "20px",
                margin: 0,
                padding: "10px 12px",
              }}
            >
              {loginError.message}
            </p>
          )}

          <button
            disabled={isSubmitDisabled}
            style={{
              background: isSubmitDisabled ? "#e5e7eb" : "#111827",
              border: "1px solid transparent",
              borderRadius: 6,
              color: isSubmitDisabled ? "#6b7280" : "#ffffff",
              cursor: isSubmitDisabled ? "not-allowed" : "pointer",
              fontSize: 16,
              fontWeight: 600,
              height: 44,
              marginTop: 4,
              width: "100%",
            }}
            type="submit"
          >
            {login.isPending
              ? translate("auth.login.pending")
              : translate("auth.login.submit")}
          </button>
        </div>
      </form>
    </main>
  );
};
