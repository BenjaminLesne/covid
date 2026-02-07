"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { FranceMapInnerProps } from "./france-map-inner";

const FranceMapInner = dynamic(
  () =>
    import("./france-map-inner").then((mod) => ({
      default: mod.FranceMapInner,
    })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[400px] w-full rounded-lg md:h-[450px] lg:h-[500px]" />,
  }
);

export function FranceMap(props: FranceMapInnerProps) {
  return <FranceMapInner {...props} />;
}
