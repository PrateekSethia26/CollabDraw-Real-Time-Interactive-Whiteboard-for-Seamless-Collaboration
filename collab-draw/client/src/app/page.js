"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { FaPencilAlt, FaUsers } from "react-icons/fa";

const DrawingBoard = dynamic(() => import("../app/components/DrawingBoard"), {
  ssr: false, // Disable server-side rendering if necessary
});

const Card = ({ icon, title, description, onClick }) => {
  return (
    <div
      className="bg-gray-900 text-white rounded-2xl p-6 w-128 shadow-md hover:shadow-xl transition-all"
      onClick={onClick}
    >
      <div className="flex items-center justify-center rounded-xl p-20 border border-gray-900">
        {icon}
      </div>
      <h2 className="mt-4 text-4xl font-semibold text-center">{title}</h2>
      <p className="text-gray-400 text-xl mt-4 text-center">{description}</p>
    </div>
  );
};

export default function HomePage() {
  const [activeComponent, setActiveComponent] = useState(null);

  // Log the active component whenever it changes
  useEffect(() => {
    console.log("Active Component:", activeComponent);
  }, [activeComponent]);

  return (
    // <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
    //   <h1 className="text-3xl font-bold mb-4">Live Collaborative Drawing</h1>
    //   <p className="text-gray-500 mb-6">Draw with others in real-time!</p>
    //   {/* Full-Screen Drawing Board */}
    //   <div className="w-full h-full bg-white shadow-lg rounded-lg">
    //     <DrawingBoard />
    //   </div>
    // </main>

    <div className="min-h-screen bg-black text-white">
      {/* Navbar */}
      {activeComponent === null ? (
        <nav className="flex justify-between items-center mx-5 py-6">
          <h1 className="text-2xl font-bold">Collab Draw</h1>
          <div>
            <button className="mr-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md">
              Sign up
            </button>
            <button className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-md">
              Log in
            </button>
          </div>
        </nav>
      ) : (
        <p></p>
      )}

      {activeComponent ? (
        <div className="w-full h-screen bg-white shadow-lg rounded-lg relative">
          {activeComponent === "DrawingBoard" && <DrawingBoard />}
          <button className="" onClick={() => setActiveComponent(null)}>
            Close
          </button>
        </div>
      ) : (
        <>
          <div className="text-center mt-12">
            <h1 className="text-4xl font-bold pb-4">Welcome to Collab Draw</h1>
            <p className="text-gray-400">Choose your workspace below</p>
          </div>
          <div className="flex justify-center items-center mt-10 space-x-6">
            <Card
              icon={<FaPencilAlt className="text-purple-400 text-3xl" />}
              title="Personal Canvas"
              description="Work on your diagrams privately. All your work is saved locally."
              onClick={() => setActiveComponent("DrawingBoard")}
            />
            <Card
              icon={<FaUsers className="text-pink-400 text-3xl" />}
              title="Collaborative Space"
              description="Create or join a room to collaborate with others in real-time."
            />
          </div>
        </>
      )}
    </div>
  );
}
