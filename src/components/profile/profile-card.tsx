"use client";

import { User, Camera, Mail, AtSign } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function UserProfileCard() {
  return (
    <Card className="w-full border-sidebar-border/50 bg-background shadow-xl rounded-2xl overflow-hidden">
      <CardHeader className="pb-4 border-b border-sidebar-border/30 bg-sidebar-accent/30">
        <CardTitle className="text-xl font-bold tracking-tight font-sans">
          Profile Settings
        </CardTitle>
        <CardDescription className="text-sm font-sans">
          Manage your account details and display preferences.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-8 space-y-8">
        {/* Avatar and Upload Section */}
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <div className="relative group">
            <div className="h-28 w-28 rounded-2xl bg-sidebar-accent/50 flex items-center justify-center overflow-hidden border-2 border-sidebar-border shadow-inner transition-colors group-hover:border-primary/30">
              <User className="h-14 w-14 text-sidebar-foreground/30 transition-colors group-hover:text-primary/50" />
            </div>
            <button className="absolute -bottom-2 -right-2 p-2 bg-primary text-primary-foreground rounded-xl shadow-lg hover:scale-105 transition-transform active:scale-95">
              <Camera className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 text-center sm:text-left">
            <div className="space-y-1">
              <h4 className="text-sm font-bold uppercase tracking-widest text-sidebar-foreground/60">
                Profile Picture
              </h4>
              <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">
                Square JPG, PNG or GIF. Recommended size 400x400.
              </p>
            </div>
            <div className="flex gap-2 justify-center sm:justify-start">
              <Button
                variant="outline"
                size="sm"
                className="font-sans font-semibold border-sidebar-border hover:bg-sidebar-accent transition-colors"
              >
                Upload new
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 font-sans font-semibold"
              >
                Remove
              </Button>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="grid gap-6">
          <div className="space-y-2">
            <Label
              htmlFor="username"
              className="text-sm font-bold uppercase tracking-wider text-sidebar-foreground/70 flex items-center gap-2"
            >
              <AtSign className="h-3.5 w-3.5 text-primary" />
              Username
            </Label>
            <Input
              id="username"
              placeholder="Your display name"
              className="h-11 bg-sidebar-accent/30 border-sidebar-border/50 focus-visible:ring-primary/20 focus-visible:bg-sidebar-accent transition-all rounded-xl font-sans"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-bold uppercase tracking-wider text-sidebar-foreground/70 flex items-center gap-2"
            >
              <Mail className="h-3.5 w-3.5 text-primary" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              className="h-11 bg-sidebar-accent/30 border-sidebar-border/50 focus-visible:ring-primary/20 focus-visible:bg-sidebar-accent transition-all rounded-xl font-sans"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-sidebar-border/30">
          <Button className="bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/20 rounded-xl px-10 h-11 font-bold transition-all active:scale-[0.98]">
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function UserProfileDialog({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-none bg-transparent shadow-none">
        <DialogHeader className="sr-only">
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>
        <UserProfileCard />
      </DialogContent>
    </Dialog>
  );
}
