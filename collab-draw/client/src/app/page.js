"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { FaPencilAlt, FaUsers } from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";
import { DrawingProvider } from "./context/DrawingContext";
import Toolbar from "./components/Toolbar";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";

const DrawingCanvas = dynamic(() => import("./components/DrawingCanvas"), {
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
  const [mounted, setMounted] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const { isSignedIn } = useUser();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Log the active component whenever it changes
  useEffect(() => {
    console.log("Active Component:", activeComponent);
  }, [activeComponent]);

  const handleCardClick = (component) => {
    if (component === "CollaborativeCanvas" && !isSignedIn) {
      toast.error("You must be logged in to access the Collaborative Space.");
      return;
    }
    if (component === "CollaborativeCanvas" && isSignedIn) {
      setShowModel(true);
    } else {
      // setActiveComponent(component);
    }
  };

  const handleCreateRoom = () => {
    setShowModel(false);
    setActiveComponent("CollaborativeCanvas");
  };

  const handleJoinRoom = () => {
    setShowModel(false);
    setActiveComponent("CollaborativeCanvas");
  };

  return (
    <>
      <Toaster position="top-center" />

      <div className="min-h-screen bg-black text-white">
        {/* Navbar */}
        {activeComponent === null ? (
          <nav className="flex justify-between items-center mx-5 py-6">
            <h1 className="text-2xl font-bold">Sync Draw</h1>
            <div>
              {/* <SignUpButton>
                <button className="mr-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md">
                  Sign up
                </button>
              </SignUpButton>
              <SignInButton mode="model">
                <button className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-md">
                  Log in
                </button>
              </SignInButton> */}

              {isSignedIn ? (
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "custom-avatar-size",
                    },
                  }}
                />
              ) : (
                <>
                  <SignUpButton>
                    <button className="mr-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md">
                      Sign up
                    </button>
                  </SignUpButton>
                  <SignInButton>
                    <button className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-md">
                      Log in
                    </button>
                  </SignInButton>
                </>
              )}
            </div>
          </nav>
        ) : (
          <p></p>
        )}

        {showModel && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white text-black rounded-2xl p-8 relative max-w-full shadow-2xl w-xl">
              {/* Cross Button */}
              <button
                className="absolute top-4 right-4 text-gray-600 hover:text-black text-2xl font-bold cursor-pointer"
                onClick={() => setShowModel(false)}
              >
                &times;
              </button>
              <h2 className="text-4xl font-bold text-center mb-8">
                Choose an option
              </h2>
              <div className="flex justify-center space-x-6">
                <button
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-2xl cursor-pointer"
                  onClick={handleJoinRoom}
                >
                  Join Room
                </button>
                <button
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-white text-2xl cursor-pointer"
                  onClick={handleCreateRoom}
                >
                  Create Room
                </button>
              </div>
            </div>
          </div>
        )}

        {activeComponent ? (
          <div className="w-full h-screen bg-white shadow-lg rounded-lg relative">
            <DrawingProvider>
              {activeComponent === "DrawingCanvas" && mounted && (
                <>
                  <DrawingCanvas isSocketEnabled={false} />
                  <Toolbar />
                </>
              )}
              {activeComponent === "CollaborativeCanvas" && mounted && (
                <>
                  <DrawingCanvas isSocketEnabled={true} />
                  <Toolbar />
                </>
              )}
              <button
                className="absolute top-4 right-4 bg-gray-200 px-8 py-4 rounded-lg text-black"
                onClick={() => setActiveComponent(null)}
              >
                Close
              </button>
            </DrawingProvider>
          </div>
        ) : (
          <>
            <div className="text-center mt-12">
              <h1 className="text-4xl font-bold pb-4">Welcome to Sync Draw</h1>
              <p className="text-gray-400">Choose your workspace below</p>
            </div>
            <div className="flex justify-center items-center mt-10 space-x-6">
              <Card
                icon={
                  <FaPencilAlt className="text-purple-400 text-3xl" size={50} />
                }
                title="Personal Canvas"
                description="Work on your diagrams privately. All your work is saved locally."
                onClick={() => setActiveComponent("DrawingCanvas")}
              />
              <Card
                icon={<FaUsers className="text-pink-400 text-3xl" size={50} />}
                title="Collaborative Space"
                description="Create or join a room to collaborate with others in real-time."
                onClick={() => handleCardClick("CollaborativeCanvas")}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
