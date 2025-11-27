"use client";

import dynamic from "next/dynamic";

// Dynamically import the shader scene with SSR disabled since Three.js needs browser APIs
const ShaderScene = dynamic(() => import("@/components/shader-scene"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="h-screen overflow-y-auto snap-y snap-mandatory">
      {/* Landing Section - Shader Scene */}
      <section className="h-screen w-full snap-start snap-always relative">
        <ShaderScene />
      </section>

      {/* Second Section - Empty for now */}
      <section className="h-screen w-full snap-start snap-always bg-[#0a0a0a]">
        {/* Content goes here */}
      </section>
    </main>
  );
}
