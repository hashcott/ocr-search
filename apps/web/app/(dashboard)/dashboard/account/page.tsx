"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Lock, Save } from "lucide-react";

export default function AccountPage() {
    const { toast } = useToast();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Fetch user data
    const { data: user, refetch } = trpc.auth.me.useQuery(undefined, {
        onSuccess: (data) => {
            setName(data.name || "");
            setEmail(data.email || "");
        },
    });

    // Update profile mutation
    const updateProfileMutation = trpc.auth.updateProfile.useMutation({
        onSuccess: () => {
            toast({
                title: "Profile Updated",
                description: "Your profile has been updated successfully.",
            });
            refetch();
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Change password mutation
    const changePasswordMutation = trpc.auth.changePassword.useMutation({
        onSuccess: () => {
            toast({
                title: "Password Changed",
                description: "Your password has been changed successfully.",
            });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleUpdateProfile = (e: React.FormEvent) => {
        e.preventDefault();
        updateProfileMutation.mutate({
            name: name || undefined,
            email: email || undefined,
        });
    };

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast({
                title: "Error",
                description: "New passwords do not match",
                variant: "destructive",
            });
            return;
        }
        changePasswordMutation.mutate({
            currentPassword,
            newPassword,
        });
    };

    // Get user initials for avatar
    const getInitials = (name?: string, email?: string) => {
        if (name) {
            return name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
        }
        if (email) {
            return email[0].toUpperCase();
        }
        return "U";
    };

    return (
        <div className="p-8 space-y-8 max-w-4xl">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-semibold text-foreground">
                    Cài đặt tài khoản
                </h1>
                <p className="text-muted-foreground mt-2">
                    Quản lý thông tin tài khoản và bảo mật
                </p>
            </div>

            {/* Profile Information */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Thông tin cá nhân</CardTitle>
                    </div>
                    <CardDescription>
                        Cập nhật thông tin cá nhân và tài khoản của bạn
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Tên</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Tên của bạn"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your.email@example.com"
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Vai trò</Label>
                            <Input
                                value={user?.role === "admin" ? "Quản trị viên" : "Người dùng"}
                                disabled
                                className="bg-muted"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={updateProfileMutation.isLoading}
                            className="w-full sm:w-auto"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {updateProfileMutation.isLoading
                                ? "Đang lưu..."
                                : "Lưu thay đổi"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Đổi mật khẩu</CardTitle>
                    </div>
                    <CardDescription>
                        Cập nhật mật khẩu để bảo vệ tài khoản của bạn
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleChangePassword} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">
                                Mật khẩu hiện tại
                            </Label>
                            <Input
                                id="currentPassword"
                                type="password"
                                value={currentPassword}
                                onChange={(e) =>
                                    setCurrentPassword(e.target.value)
                                }
                                placeholder="Nhập mật khẩu hiện tại"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="newPassword">Mật khẩu mới</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">
                                Xác nhận mật khẩu mới
                            </Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                                placeholder="Xác nhận mật khẩu mới"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={changePasswordMutation.isLoading}
                            className="w-full sm:w-auto"
                        >
                            <Lock className="h-4 w-4 mr-2" />
                            {changePasswordMutation.isLoading
                                ? "Đang đổi..."
                                : "Đổi mật khẩu"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

