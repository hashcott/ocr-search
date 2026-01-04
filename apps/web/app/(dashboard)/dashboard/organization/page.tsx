"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Building2,
    GraduationCap,
    Users,
    User,
    Plus,
    Settings,
    Crown,
    Shield,
    Edit3,
    Eye,
    UserMinus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

const orgTypeIcons: Record<string, React.ReactNode> = {
    company: <Building2 className="h-5 w-5" />,
    school: <GraduationCap className="h-5 w-5" />,
    team: <Users className="h-5 w-5" />,
    personal: <User className="h-5 w-5" />,
};

const roleIcons: Record<string, React.ReactNode> = {
    owner: <Crown className="h-4 w-4 text-yellow-500" />,
    admin: <Shield className="h-4 w-4 text-purple-500" />,
    editor: <Edit3 className="h-4 w-4 text-blue-500" />,
    member: <Users className="h-4 w-4 text-green-500" />,
    viewer: <Eye className="h-4 w-4 text-slate-500" />,
    guest: <UserMinus className="h-4 w-4 text-slate-400" />,
};

const roleBadgeColors: Record<string, string> = {
    owner: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    editor: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    member: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    viewer: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
    guest: "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-500",
};

export default function OrganizationPage() {
    const { toast } = useToast();
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newOrg, setNewOrg] = useState({
        name: "",
        slug: "",
        type: "team" as "company" | "school" | "team" | "personal",
        description: "",
    });

    const { data: organizations, isLoading, refetch } = trpc.organization.list.useQuery();

    const createMutation = trpc.organization.create.useMutation({
        onSuccess: () => {
            toast({ title: "Success", description: "Organization created successfully!" });
            setCreateDialogOpen(false);
            setNewOrg({ name: "", slug: "", type: "team", description: "" });
            refetch();
        },
        onError: (error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const handleCreateOrg = () => {
        if (!newOrg.name || !newOrg.slug) {
            toast({ title: "Error", description: "Name and slug are required", variant: "destructive" });
            return;
        }
        createMutation.mutate(newOrg);
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .substring(0, 50);
    };

    return (
        <div className="p-6 space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                        Organizations
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage your organizations and team access
                    </p>
                </div>

                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gradient-primary border-0">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Organization
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Create Organization</DialogTitle>
                            <DialogDescription>
                                Create a new organization to collaborate with your team
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Organization Name</Label>
                                <Input
                                    id="name"
                                    placeholder="My Company"
                                    value={newOrg.name}
                                    onChange={(e) => {
                                        setNewOrg({
                                            ...newOrg,
                                            name: e.target.value,
                                            slug: generateSlug(e.target.value),
                                        });
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slug">URL Slug</Label>
                                <Input
                                    id="slug"
                                    placeholder="my-company"
                                    value={newOrg.slug}
                                    onChange={(e) =>
                                        setNewOrg({ ...newOrg, slug: e.target.value })
                                    }
                                />
                                <p className="text-xs text-slate-500">
                                    This will be used in URLs: /org/{newOrg.slug || "slug"}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type">Type</Label>
                                <Select
                                    value={newOrg.type}
                                    onValueChange={(value: any) =>
                                        setNewOrg({ ...newOrg, type: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="company">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4" />
                                                Company
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="school">
                                            <div className="flex items-center gap-2">
                                                <GraduationCap className="h-4 w-4" />
                                                School
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="team">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4" />
                                                Team
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="personal">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                Personal
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description (optional)</Label>
                                <Input
                                    id="description"
                                    placeholder="A brief description..."
                                    value={newOrg.description}
                                    onChange={(e) =>
                                        setNewOrg({ ...newOrg, description: e.target.value })
                                    }
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setCreateDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateOrg}
                                disabled={createMutation.isLoading}
                                className="gradient-primary border-0"
                            >
                                {createMutation.isLoading ? "Creating..." : "Create"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Organizations Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : organizations?.length === 0 ? (
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-12 text-center">
                        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-6">
                            <Building2 className="h-10 w-10 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                            No organizations yet
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                            Create your first organization to start collaborating with your team
                        </p>
                        <Button
                            onClick={() => setCreateDialogOpen(true)}
                            className="gradient-primary border-0"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Organization
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {organizations?.map((org) => (
                        <Link key={org.id} href={`/dashboard/organization/${org.id}`}>
                            <Card className="border-0 shadow-sm card-hover cursor-pointer h-full">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                            {orgTypeIcons[org.type] || <Building2 className="h-6 w-6 text-blue-600" />}
                                        </div>
                                        <span
                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                roleBadgeColors[org.role] || roleBadgeColors.member
                                            }`}
                                        >
                                            {roleIcons[org.role]}
                                            {org.role}
                                        </span>
                                    </div>

                                    <h3 className="font-semibold text-slate-800 dark:text-white mb-1">
                                        {org.name}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                        /{org.slug}
                                    </p>

                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                        <span className="capitalize">{org.type}</span>
                                        {org.joinedAt && (
                                            <span>
                                                Joined{" "}
                                                {new Date(org.joinedAt).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {/* Role Legend */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Role Permissions</CardTitle>
                    <CardDescription>
                        Understanding what each role can do
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { role: "owner", desc: "Full control, can delete organization" },
                            { role: "admin", desc: "Manage members, all CRUD operations" },
                            { role: "editor", desc: "Create, read, update, delete documents" },
                            { role: "member", desc: "Create and read documents" },
                            { role: "viewer", desc: "Read-only access" },
                            { role: "guest", desc: "Limited read access" },
                        ].map(({ role, desc }) => (
                            <div
                                key={role}
                                className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                            >
                                <div className="mt-0.5">{roleIcons[role]}</div>
                                <div>
                                    <p className="font-medium text-slate-800 dark:text-white capitalize">
                                        {role}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

