"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useState } from "react";
import { Id } from "@convex/_generated/dataModel";

export default function ChatDebugPage() {
  const [roomId, setRoomId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [sender, setSender] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sendMessage = useMutation(api.chat.mutate.sendMessage);

  // Only fetch messages if we have a valid room ID
  const messages = useQuery(
    api.chat.query.getRoomMessages,
    roomId
      ? {
          room: roomId as Id<"rooms">,
          paginationOpts: { numItems: 20, cursor: null },
        }
      : "skip",
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!roomId.trim()) {
      setError("Room ID is required");
      return;
    }

    if (!message.trim()) {
      setError("Message content is required");
      return;
    }

    if (!sender.trim()) {
      setError("Sender name is required");
      return;
    }

    try {
      await sendMessage({
        content: message,
        sender: sender,
        room: roomId as Id<"rooms">,
      });
      setMessage("");
      setSuccess("Message sent successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    }
  };

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          Chat Debug Page
        </h1>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {Array.from({ length: 24 }).map((_, index) => (
            <div
              key={index}
              className="bg-muted/50 aspect-video h-12 w-full rounded-lg"
            />
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {Array.from({ length: 24 }).map((_, index) => (
            <div
              key={index}
              className="bg-muted/50 aspect-video h-12 w-full rounded-lg"
            />
          ))}
        </div>
        {/* Configuration Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Configuration
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room ID
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter room ID (e.g., jh7..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                You need a valid room ID from your Convex database
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sender Name
              </label>
              <input
                type="text"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Send Message Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Send Message
          </h2>
          <form onSubmit={handleSendMessage} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                <strong>Error:</strong> {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                {success}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Send Message
            </button>
          </form>
        </div>

        {/* Messages Display Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Messages</h2>

          {!roomId ? (
            <p className="text-gray-500 text-center py-8">
              Enter a Room ID to view messages
            </p>
          ) : messages === undefined ? (
            <p className="text-gray-500 text-center py-8">
              Loading messages...
            </p>
          ) : messages.page.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No messages in this room yet
            </p>
          ) : (
            <div className="space-y-4">
              {messages.page.map((msg) => (
                <div
                  key={msg._id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-gray-900">
                      {msg.sender}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg._creationTime).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {msg.content}
                  </p>
                  {msg.file && (
                    <div className="mt-2 text-sm text-blue-600">
                      File: {msg.file}
                    </div>
                  )}
                </div>
              ))}
              {messages.continueCursor && (
                <p className="text-center text-sm text-gray-500">
                  More messages available...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Debug Info */}
        <div className="bg-gray-800 rounded-lg shadow-md p-6 text-white mb-8">
          <h2 className="text-xl font-semibold mb-4">Debug Info</h2>
          <div className="space-y-2 text-sm font-mono">
            <p>
              <span className="text-gray-400">Room ID:</span>{" "}
              {roomId || "Not set"}
            </p>
            <p>
              <span className="text-gray-400">Sender:</span>{" "}
              {sender || "Not set"}
            </p>
            <p>
              <span className="text-gray-400">Messages loaded:</span>{" "}
              {messages?.page.length ?? 0}
            </p>
            <p>
              <span className="text-gray-400">Has more messages:</span>{" "}
              {messages?.continueCursor ? "Yes" : "No"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
