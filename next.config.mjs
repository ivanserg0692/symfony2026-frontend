/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    const gateway = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001/api/v1").replace(/\/$/, "");

    return ["/cart", "/cart/items", "/cart/items/:id(\\d+)"].map((path) => ({
      source: `/api/v1${path}`,
      destination: gateway + path,
    }));
  },
};

export default nextConfig;
