"use client";
import DrawingBoard from "@/app/components/DrawingBoard";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-4">Live Collaborative Drawing</h1>
      <p className="text-gray-500 mb-6">Draw with others in real-time!</p>
      {/* Full-Screen Drawing Board */}
      <div className="w-full h-full bg-white shadow-lg rounded-lg">
        <DrawingBoard />
      </div>
    </main>
  );
}
