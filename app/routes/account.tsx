import type { MetaDescriptor } from "react-router";
import { AccountPage } from "../features/account/account-page";
import { siteUrl } from "../lib/route-manifest";

export function meta(): MetaDescriptor[] {
  return [
    { title: "Account · Construct Computer" },
    {
      name: "description",
      content: "Manage your Construct subscription, billing, and account.",
    },
    { name: "robots", content: "noindex, nofollow" },
    { tagName: "link", rel: "canonical", href: `${siteUrl}/account/` },
  ];
}

export default AccountPage;
