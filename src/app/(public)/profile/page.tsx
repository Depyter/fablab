"use client";

import { UserProfileCard } from "@/components/profile/profile-card";

export default function ProfilePage() {
  return (
    <main className="container mx-auto p-6 space-y-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-500">
          Manage your public display name and account avatar.
        </p>
      </header>

      <div className="grid gap-6">
        <UserProfileCard />
      </div>
    </main>
  );
}
