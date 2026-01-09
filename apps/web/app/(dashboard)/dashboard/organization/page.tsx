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
        <div className="p-8 sm:p-10 space-y-10 max-w-6xl mx-auto animate-fadeIn">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Collaboration Hub</h1>
                    <p className="text-muted-foreground mt-2 text-lg font-medium">
                        Manage your neural networks and team permissions.
                    </p>
                </div>

                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-ai-gradient shadow-ai border-none rounded-2xl h-14 px-8 font-bold hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]">
                            <Plus className="h-5 w-5 mr-3" />
                            Launch New Org
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="glass border-white/10 rounded-[2rem] shadow-3xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">Initialize Organization</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Create a new shared workspace for your collective intelligence.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-6">
                            <div className="space-y-3">
                                <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest opacity-70">Legacy Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Deep Research Lab"
                                    value={newOrg.name}
                                    className="h-12 rounded-xl bg-black/5 dark:bg-background/50 border-black/5 dark:border-white/5 shadow-inner"
                                    onChange={(e) => {
                                        setNewOrg({
                                            ...newOrg,
                                            name: e.target.value,
                                            slug: generateSlug(e.target.value),
                                        });
                                    }}
                                />
                            </div>
                            <div className="space-y-3">
                                <Label htmlFor="slug" className="text-xs font-black uppercase tracking-widest opacity-70">Network Identifier (Slug)</Label>
                                <Input
                                    id="slug"
                                    placeholder="deep-research-lab"
                                    value={newOrg.slug}
                                    className="h-12 rounded-xl bg-black/5 dark:bg-background/50 border-black/5 dark:border-white/5 shadow-inner font-mono"
                                    onChange={(e) =>
                                        setNewOrg({ ...newOrg, slug: e.target.value })
                                    }
                                />
                                <p className="text-[10px] font-bold text-primary/50 uppercase tracking-tighter">
                                    Static Route: /org/{newOrg.slug || "identifier"}
                                </p>
                            </div>
                            <div className="space-y-3">
                                <Label htmlFor="type" className="text-xs font-black uppercase tracking-widest opacity-70">Operational Type</Label>
                                <Select
                                    value={newOrg.type}
                                    onValueChange={(value: any) =>
                                        setNewOrg({ ...newOrg, type: value })
                                    }
                                >
                                    <SelectTrigger className="h-12 rounded-xl bg-black/5 dark:bg-background/50 border-black/5 dark:border-white/5 shadow-inner">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="glass border-black/5 dark:border-white/10 rounded-xl">
                                        <SelectItem value="company" className="rounded-lg focus:bg-primary/10">
                                            <div className="flex items-center gap-3">
                                                <Building2 className="h-4 w-4 text-primary" />
                                                Enterprise Corporation
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="school" className="rounded-lg focus:bg-primary/10">
                                            <div className="flex items-center gap-3">
                                                <GraduationCap className="h-4 w-4 text-primary" />
                                                Academic Institution
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="team" className="rounded-lg focus:bg-primary/10">
                                            <div className="flex items-center gap-3">
                                                <Users className="h-4 w-4 text-primary" />
                                                Collaborative Team
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter className="gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => setCreateDialogOpen(false)}
                                className="rounded-xl font-bold"
                            >
                                Abort
                            </Button>
                            <Button
                                onClick={handleCreateOrg}
                                disabled={createMutation.isPending}
                                className="bg-ai-gradient border-none rounded-xl h-12 px-8 font-bold shadow-ai"
                            >
                                {createMutation.isPending ? "Connecting..." : "Initialize"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Organizations Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center h-80">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-3xl border-2 border-primary border-t-transparent animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        </div>
                    </div>
                </div>
            ) : organizations?.length === 0 ? (
                <Card className="glass border-none shadow-2xl rounded-[3rem]">
                    <CardContent className="p-24 text-center space-y-8">
                        <div className="w-32 h-32 rounded-[2.5rem] bg-accent/50 flex items-center justify-center mx-auto shadow-inner relative group">
                            <div className="absolute inset-0 bg-primary/10 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Building2 className="h-16 w-16 text-muted-foreground/30 relative z-10" />
                        </div>
                        <div className="space-y-4 max-w-md mx-auto">
                            <h3 className="text-3xl font-bold">No Active Networks</h3>
                            <p className="text-muted-foreground text-lg font-medium opacity-80">
                                You are currently operating as a lone intelligence. Create an organization to expand your reach.
                            </p>
                        </div>
                        <Button
                            onClick={() => setCreateDialogOpen(true)}
                            className="bg-ai-gradient shadow-ai border-none rounded-2xl h-14 px-10 font-bold hover:scale-105 active:scale-95 transition-all"
                        >
                            <Plus className="h-5 w-5 mr-3" />
                            Create Organization
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {organizations?.map((org) => (
                        <Link key={org.id} href={`/dashboard/organization/${org.id}`}>
                            <Card className="glass border-none shadow-xl card-hover cursor-pointer h-full rounded-[2rem] group">
                                <CardContent className="p-8">
                                    <div className="flex items-start justify-between mb-8">
                                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner">
                                            {orgTypeIcons[org.type] || <Building2 className="h-8 w-8 text-primary" />}
                                        </div>
                                        <div
                                            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${roleBadgeColors[org.role] || roleBadgeColors.member
                                                }`}
                                        >
                                            {roleIcons[org.role]}
                                            {org.role}
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-8">
                                        <h3 className="text-2xl font-bold truncate group-hover:text-primary transition-colors">
                                            {org.name}
                                        </h3>
                                        <p className="text-sm font-mono text-muted-foreground/60">
                                            org_id://{org.slug}
                                        </p>
                                    </div>

                                    <div className="pt-6 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Nexus Type</span>
                                            <span className="text-xs font-bold capitalize">{org.type}</span>
                                        </div>
                                        {org.joinedAt && (
                                            <div className="flex flex-col items-end text-right">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Joined On</span>
                                                <span className="text-xs font-bold">{new Date(org.joinedAt).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {/* Role Legend - Professional Reference */}
            <Card className="glass border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-10 pb-2 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Shield className="h-4 w-4 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Neural Permission Mapping</CardTitle>
                    </div>
                    <CardDescription className="text-base font-medium opacity-60">
                        Understanding the hierarchical access levels within organizations.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { role: "owner", desc: "Absolute master control. Capable of total network termination." },
                            { role: "admin", desc: "High-level orchestration. Full CRUD operations over all assets." },
                            { role: "editor", desc: "Knowledge creation. Authorized to modify or ingest new assets." },
                            { role: "member", desc: "Standard intelligence. Can ingest and query documents." },
                            { role: "viewer", desc: "Passive synchronization. Read-only access to neural maps." },
                            { role: "guest", desc: "Restricted sandbox. Minimal read access for external nodes." },
                        ].map(({ role, desc }) => (
                            <div
                                key={role}
                                className="flex items-start gap-4 p-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors group"
                            >
                                <div className="mt-1 transition-transform group-hover:scale-125">{roleIcons[role]}</div>
                                <div className="space-y-1">
                                    <p className="font-bold text-foreground/90 capitalize tracking-tight group-hover:text-primary transition-colors">
                                        {role}
                                    </p>
                                    <p className="text-xs text-muted-foreground font-medium leading-relaxed opacity-60">
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

