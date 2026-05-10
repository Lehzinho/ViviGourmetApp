/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  transpilePackages: ["@vivi-gourmet/shared"],
};

export default nextConfig;
