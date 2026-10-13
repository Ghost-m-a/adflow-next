import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/dashboard",                 destination: "/advertiser",                  permanent: false },
      { source: "/dashboard/campaigns",       destination: "/advertiser/campaigns",        permanent: false },
      { source: "/dashboard/campaigns/:path*",destination: "/advertiser/campaigns/:path*", permanent: false },
      { source: "/dashboard/applications",    destination: "/advertiser/applications",     permanent: false },
      { source: "/dashboard/analytics",       destination: "/advertiser/analytics",        permanent: false },
      { source: "/dashboard/settings",        destination: "/advertiser/settings",         permanent: false },
      { source: "/dashboard/organizations",   destination: "/organizations",               permanent: false },
      { source: "/dashboard/organizations/:path*", destination: "/organizations/:path*",   permanent: false },
      { source: "/marketplace",               destination: "/creator/marketplace",         permanent: false },
    ];
  },
};

export default nextConfig;
