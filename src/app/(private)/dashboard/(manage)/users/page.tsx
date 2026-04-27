"use client";

import * as React from "react";
import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import {
  DataViewRoot,
  DataViewToolbar,
  DataViewFilters,
  DataViewContent,
  DataViewLoadMore,
} from "@/components/manage/data-view";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MoreHorizontal,
  ShieldAlert,
  UserCog,
  Ban,
  UserCheck,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { UserRole, UserRoleType } from "../../../../../../convex/constants";
import { format } from "date-fns";

export default function UsersPage() {
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 500);

  const { results, status, loadMore } = usePaginatedQuery(
    api.users.listUserProfiles,
    { search: debouncedSearch || undefined },
    { initialNumItems: 10 },
  );

  const updateUserRole = useMutation(api.users.updateUserRole);

  // Modal States
  const [selectedUser, setSelectedUser] = React.useState<
    (typeof results)[number] | null
  >(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = React.useState(false);
  const [isBanDialogOpen, setIsBanDialogOpen] = React.useState(false);
  const [banReason, setBanReason] = React.useState("");
  const [banDuration, setBanDuration] = React.useState("0"); // 0 means permanent

  const handleUpdateRole = async (role: UserRoleType) => {
    if (!selectedUser) return;
    try {
      await updateUserRole({ id: selectedUser._id, role });
      toast.success(`Updated ${selectedUser.name}'s role to ${role}`);
      setIsRoleDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update role",
      );
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;
    try {
      const duration = parseInt(banDuration);
      await authClient.admin.banUser({
        userId: selectedUser.userId,
        banReason: banReason || "No reason provided",
        banExpiresIn: duration > 0 ? duration : undefined,
      });
      toast.success(`User ${selectedUser.name} has been banned`);
      setIsBanDialogOpen(false);
      setBanReason("");
      setBanDuration("0");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to ban user",
      );
    }
  };

  const handleUnbanUser = async (user: (typeof results)[number]) => {
    try {
      await authClient.admin.unbanUser({
        userId: user.userId,
      });
      toast.success(`User ${user.name} has been unbanned`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to unban user",
      );
    }
  };

  return (
    <DataViewRoot defaultView="list">
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <DataViewToolbar
          title="User Management"
          subtitle="Manage roles and access for all users."
        />

        <DataViewFilters
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by email..."
        />

        <DataViewContent
          items={results}
          totalItems={results.length}
          isLoading={status === "LoadingFirstPage"}
          viewSlots={{
            list: (
              <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                <div className="border rounded-lg bg-background overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((user) => (
                        <TableRow key={user._id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.profilePic} />
                                <AvatarFallback>{user.name[0]}</AvatarFallback>
                              </Avatar>
                              <span>{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                user.role === "admin" ? "default" : "secondary"
                              }
                            >
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.banned ? (
                              <div className="flex flex-col gap-1">
                                <Badge
                                  variant="destructive"
                                  className="gap-1 w-fit"
                                >
                                  <ShieldAlert className="h-3 w-3" />
                                  Banned
                                </Badge>
                                {user.banReason && (
                                  <span
                                    className="text-xs text-muted-foreground line-clamp-1"
                                    title={user.banReason}
                                  >
                                    {user.banReason}
                                  </span>
                                )}
                                {user.banExpires && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5" />
                                    Expires:{" "}
                                    {format(user.banExpires, "MMM d, yyyy")}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <Badge
                                variant="outline"
                                className="gap-1 text-green-600 border-green-200 bg-green-50"
                              >
                                <UserCheck className="h-3 w-3" />
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsRoleDialogOpen(true);
                                  }}
                                >
                                  <UserCog className="mr-2 h-4 w-4" />
                                  Change Role
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {user.banned ? (
                                  <DropdownMenuItem
                                    className="text-green-600"
                                    onClick={() => handleUnbanUser(user)}
                                  >
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Unban User
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setIsBanDialogOpen(true);
                                    }}
                                  >
                                    <Ban className="mr-2 h-4 w-4" />
                                    Ban User
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ),
          }}
          renderItem={(user) => null} // Handled by list viewSlot
        />

        <DataViewLoadMore
          canLoadMore={status === "CanLoadMore"}
          onLoadMore={() => loadMore(10)}
        />
      </div>

      {/* Role Update Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update User Role</DialogTitle>
            <DialogDescription>
              Change the access level for {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label>Select Role</Label>
              <div className="flex gap-2">
                {Object.values(UserRole).map((role) => (
                  <Button
                    key={role}
                    variant={
                      selectedUser?.role === role ? "default" : "outline"
                    }
                    className="flex-1"
                    onClick={() => handleUpdateRole(role)}
                  >
                    {role}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Ban User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to ban {selectedUser?.name}? They will be
              immediately signed out and unable to log in.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason for ban</Label>
              <Input
                id="reason"
                placeholder="Spamming, inappropriate behavior, etc."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="duration">Duration</Label>
              <Select value={banDuration} onValueChange={setBanDuration}>
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Permanent</SelectItem>
                  <SelectItem value={(60 * 60 * 24).toString()}>
                    1 Day
                  </SelectItem>
                  <SelectItem value={(60 * 60 * 24 * 7).toString()}>
                    1 Week
                  </SelectItem>
                  <SelectItem value={(60 * 60 * 24 * 30).toString()}>
                    1 Month
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBanUser}>
              Confirm Ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DataViewRoot>
  );
}
