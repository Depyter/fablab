"use client";

import * as React from "react";
import { User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UserProfileCard() {
  return (
    <Card className="w-full sm:max-w-2xl border-none bg-color">
      <CardContent className="pt-6">
        {/* Avatar and Upload Section */}
        <div className="flex items-center gap-6 mb-8">
          <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
            <User className="h-10 w-10 text-gray-400" />
          </div>
          <Button variant="default" className="bg-chart-4 text-white hover:bg-gray-800 rounded-md shadow-sm">
            Upload image
          </Button>
        </div>

        {/* Username Input Section */}
        <div className="space-y-2 mb-5">
            <Label htmlFor="username" className="font-semibold text-gray-900">
                Username
            </Label>
            <Input
                id="username"
                placeholder="Username"
                className="w-full"
            />

            <Label htmlFor="email" className="font-semibold text-gray-900">
                Email
            </Label>
            <Input
                id="email"
                placeholder="Email@gmail.com"
                className="w-full"
            />

        
        </div>
        <Button variant="default" className="bg-primary text-white hover:bg-primary-muted hover:text-chart-2 rounded-md shadow-sm font-semibold">
            Save Changes
        </Button>
    
      </CardContent>
    </Card>
  );
}