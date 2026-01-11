'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Lock, Save, Loader2 } from 'lucide-react';

export default function AccountPage() {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { data: user, refetch } = trpc.auth.me.useQuery(undefined, {
    onSuccess: (data) => {
      setName(data.name || '');
      setEmail(data.email || '');
    },
  });

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast({
        title: 'Password Changed',
        description: 'Your password has been changed successfully.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
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
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive',
      });
      return;
    }
    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  return (
    <div className="custom-scrollbar mx-auto h-full max-w-2xl space-y-6 overflow-y-auto p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your account information and security
        </p>
      </div>

      {/* Profile Information */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="text-primary h-5 w-5" />
            <CardTitle className="text-lg">Profile Information</CardTitle>
          </div>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="bg-accent border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="bg-accent border-border pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                value={user?.role === 'admin' ? 'Administrator' : 'User'}
                disabled
                className="bg-muted border-border"
              />
            </div>

            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="bg-primary rounded-lg"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="text-primary h-5 w-5" />
            <CardTitle className="text-lg">Change Password</CardTitle>
          </div>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="bg-accent border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                className="bg-accent border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="bg-accent border-border"
              />
            </div>

            <Button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="bg-primary rounded-lg"
            >
              {changePasswordMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Change Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
