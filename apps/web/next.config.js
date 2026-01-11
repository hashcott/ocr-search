/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ["@search-pdf/shared"],
    output: "standalone",
};

module.exports = nextConfig;
