"use client";
import { Blocks } from "@/components/blocks";
import type { Page } from "@/lib/types";
import ErrorBoundary from "@/components/error-boundary";

export default function ClientPage({ page }: { page: Page }) {
  return (
    <ErrorBoundary>
      <Blocks {...page} />
    </ErrorBoundary>
  );
}
