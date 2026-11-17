import type { MetadataRoute } from "next";
import { construireRobots } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return construireRobots();
}
