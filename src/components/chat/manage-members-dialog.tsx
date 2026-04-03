"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { toast } from "sonner";
import { Users, UserPlus, UserMinus, Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ManageMembersDialogProps {
  roomId: Id<"rooms">;
  roomName: string;
}

export function ManageMembersDialog({
  roomId,
  roomName,
}: ManageMembersDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const members = useQuery(api.chat.query.getRoomMembers, { roomId });
  const addableUsers = useQuery(api.chat.query.getAddableUsers, { roomId });

  const addMember = useMutation(api.chat.mutate.addNewMember);
  const removeMember = useMutation(api.chat.mutate.removeMember);

  const handleAdd = async (userId: Id<"userProfile">) => {
    try {
      await addMember({ roomId, userId });
      toast.success("Member added to workspace");
    } catch (error) {
      toast.error("Failed to add member");
    }
  };

  const handleRemove = async (userId: Id<"userProfile">) => {
    try {
      await removeMember({ roomId, userId });
      toast.success("Member removed from workspace");
    } catch (error) {
      toast.error("Failed to remove member");
    }
  };

  const filteredAddable = addableUsers?.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-sidebar-accent/50 text-sidebar-foreground/50 hover:text-sidebar-foreground z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <Users className="h-3.5 w-3.5" />
          <span className="sr-only">Manage Members</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-background text-foreground border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Manage {roomName} Members
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 pt-4">
          {/* Current Members Section */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current Members ({members?.length || 0})
            </h4>
            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-2">
              {members === undefined ? (
                <div className="text-xs text-muted-foreground/50">
                  Loading members...
                </div>
              ) : members.length === 0 ? (
                <div className="text-xs text-muted-foreground/50">
                  No members found.
                </div>
              ) : (
                members.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border/40"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{member.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                        {member.role}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(member._id)}
                      className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <UserMinus className="h-3.5 w-3.5 mr-1" />
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Members Section */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Add Members
            </h4>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/50" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 bg-muted/40 shadow-none border-border/40"
              />
            </div>
            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-2">
              {addableUsers === undefined ? (
                <div className="text-xs text-muted-foreground/50">
                  Loading available users...
                </div>
              ) : filteredAddable?.length === 0 ? (
                <div className="text-xs text-muted-foreground/50 text-center py-4">
                  No available users to add.
                </div>
              ) : (
                filteredAddable?.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/40 border border-transparent hover:border-border/40 transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{user.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                        {user.role}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAdd(user._id)}
                      className="h-7 px-2 text-primary hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
