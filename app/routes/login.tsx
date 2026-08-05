import type { MetaDescriptor } from "react-router";
import { LoginPage } from "../features/auth/login-page";
import { siteUrl } from "../lib/route-manifest";

export function meta(): MetaDescriptor[] {
  return [
    { title: "Sign in · Construct Computer" },
    {
      name: "description",
      content: "Sign in to Construct Computer to manage your account and billing.",
    },
    { name: "robots", content: "noindex, nofollow" },
    { tagName: "link", rel: "canonical", href: `${siteUrl}/login/` },
  ];
}

export default LoginPage;
