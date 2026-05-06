"use client";
import { Turnstile } from "@marsidev/react-turnstile";
import type { AuthPageProps } from "@refinedev/core";
import {
  AuthPage as AuthPageBase,
  useLogin,
  useTranslate,
} from "@refinedev/core";
import { Alert, Button, Card, Form, Input, Typography, theme } from "antd";
import { useState } from "react";

type LoginVariables = {
  email: string;
  password: string;
  turnstileToken: string;
};

type LoginFormValues = {
  email?: string;
  password?: string;
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
  const { token } = theme.useToken();
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

  const handleFinish = (values: LoginFormValues) => {
    if (isSubmitDisabled) {
      return;
    }

    login.mutate({
      email: values.email ?? "",
      password: values.password ?? "",
      turnstileToken,
    });
  };

  return (
    <main
      style={{
        alignItems: "center",
        background: token.colorBgLayout,
        display: "flex",
        justifyContent: "center",
        minHeight: "100vh",
        padding: 24,
      }}
    >
      <Card
        style={{
          maxWidth: 420,
          width: "100%",
        }}
      >
        <Typography.Title level={2} style={{ marginTop: 0 }}>
          {translate("auth.login.title")}
        </Typography.Title>

        <Form<LoginFormValues>
          layout="vertical"
          onFinish={handleFinish}
          onValuesChange={(_, values) => {
            setEmail(values.email ?? "");
            setPassword(values.password ?? "");
          }}
        >
          <Form.Item
            label={translate("auth.login.email")}
            name="email"
            rules={[
              {
                required: true,
                message: translate("auth.login.emailRequired"),
              },
            ]}
          >
            <Input
              autoCapitalize="off"
              autoComplete="email"
              autoCorrect="off"
              spellCheck={false}
              type="email"
            />
          </Form.Item>

          <Form.Item
            label={translate("auth.login.password")}
            name="password"
            rules={[
              {
                required: true,
                message: translate("auth.login.passwordRequired"),
              },
            ]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>

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
              <Alert
                message={translate("auth.login.turnstileMissing")}
                showIcon
                type="warning"
              />
            )}
          </div>

          {loginError && (
            <Form.Item>
              <Alert message={loginError.message} showIcon type="error" />
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              block
              disabled={isSubmitDisabled}
              htmlType="submit"
              loading={login.isPending}
              type="primary"
            >
              {login.isPending
                ? translate("auth.login.pending")
                : translate("auth.login.submit")}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </main>
  );
};
