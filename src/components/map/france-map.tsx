"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const FranceMapInner = dynamic(
  () =>
    import("./france-map-inner").then((mod) => ({
      default: mod.FranceMapInner,
    })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[400px] w-full rounded-lg lg:h-[500px]" />,
  }
);

export function FranceMap() {
  return <FranceMapInner />;
}
