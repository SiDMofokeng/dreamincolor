// FILE: src/app/admin/pricing/page.tsx

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import {
    BadgeDollarSign,
    Bot,
    BriefcaseBusiness,
    Camera,
    Check,
    Database,
    Eye,
    EyeOff,
    FileText,
    ChevronDown,
    Globe2,
    Image as ImageIcon,
    Layers3,
    Mail,
    MonitorSmartphone,
    PackagePlus,
    Palette,
    Printer,
    Save,
    SearchCheck,
    Server,
    Share2,
    Shapes,
    Smartphone,
    Sparkles,
    Ticket,
    Trash2,
    Type,
    AtSign,
    BookOpen,
} from "lucide-react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type PricingPackage = {
    id: string;
    name: string;
    description: string | null;
    price: string | null;
    billing_note: string | null;
    features: unknown;
    icon_name: string;
    is_published: boolean;
    sort_order: number;
    created_at: string;
};

const ICON_OPTIONS = [
    {
        value: "letterhead",
        label: "Editable Letterhead",
        icon: FileText,
        styles: "border-blue-200 bg-blue-50 text-blue-700",
    },
    {
        value: "email-signature",
        label: "Email Signature",
        icon: Mail,
        styles: "border-cyan-200 bg-cyan-50 text-cyan-700",
    },
    {
        value: "logo",
        label: "Logo Design",
        icon: Shapes,
        styles: "border-purple-200 bg-purple-50 text-purple-700",
    },
    {
        value: "website",
        label: "Website",
        icon: Globe2,
        styles: "border-indigo-200 bg-indigo-50 text-indigo-700",
    },
    {
        value: "cms",
        label: "Content Management System",
        icon: Database,
        styles: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    {
        value: "blog",
        label: "Blog",
        icon: BookOpen,
        styles: "border-orange-200 bg-orange-50 text-orange-700",
    },
    {
        value: "invites",
        label: "Invites",
        icon: Ticket,
        styles: "border-pink-200 bg-pink-50 text-pink-700",
    },
    {
        value: "posters",
        label: "Posters",
        icon: ImageIcon,
        styles: "border-red-200 bg-red-50 text-red-700",
    },
    {
        value: "social-media",
        label: "Social Media Management",
        icon: Share2,
        styles: "border-sky-200 bg-sky-50 text-sky-700",
    },
    {
        value: "web-app",
        label: "Web App",
        icon: MonitorSmartphone,
        styles: "border-violet-200 bg-violet-50 text-violet-700",
    },
    {
        value: "mobile-app",
        label: "Mobile App",
        icon: Smartphone,
        styles: "border-green-200 bg-green-50 text-green-700",
    },
    {
        value: "company-profile",
        label: "Company Profile",
        icon: BriefcaseBusiness,
        styles: "border-slate-200 bg-slate-50 text-slate-700",
    },
    {
        value: "mockups",
        label: "Mockups",
        icon: Layers3,
        styles: "border-amber-200 bg-amber-50 text-amber-700",
    },
    {
        value: "typesetting",
        label: "Typesetting",
        icon: Type,
        styles: "border-teal-200 bg-teal-50 text-teal-700",
    },
    {
        value: "print-products",
        label: "Print Products",
        icon: Printer,
        styles: "border-rose-200 bg-rose-50 text-rose-700",
    },
    {
        value: "seo",
        label: "SEO",
        icon: SearchCheck,
        styles: "border-lime-200 bg-lime-50 text-lime-700",
    },
    {
        value: "hosting",
        label: "Hosting",
        icon: Server,
        styles: "border-blue-200 bg-blue-50 text-blue-700",
    },
    {
        value: "domain-registration",
        label: "Domain Registration",
        icon: AtSign,
        styles: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    },
    {
        value: "photography",
        label: "Photography",
        icon: Camera,
        styles: "border-yellow-200 bg-yellow-50 text-yellow-700",
    },
    {
        value: "ai-automation",
        label: "AI Automation",
        icon: Bot,
        styles: "border-purple-200 bg-purple-50 text-purple-700",
    },
    {
        value: "general",
        label: "General Service",
        icon: Sparkles,
        styles: "border-slate-200 bg-slate-50 text-slate-700",
    },
] as const;

function featuresToArray(value: FormDataEntryValue | null) {
    return String(value ?? "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
}

function featuresToText(features: unknown) {
    if (!Array.isArray(features)) return "";

    return features.map((feature) => String(feature)).join("\n");
}

function getIconOption(iconName: string | null | undefined) {
    return (
        ICON_OPTIONS.find((option) => option.value === iconName) ??
        ICON_OPTIONS.find((option) => option.value === "general")!
    );
}

function PricingIcon({
    iconName,
    size = "large",
}: {
    iconName: string;
    size?: "small" | "large";
}) {
    const option = getIconOption(iconName);
    const Icon = option.icon;

    return (
        <div
            className={
                size === "large"
                    ? `flex h-14 w-14 items-center justify-center rounded-2xl border ${option.styles}`
                    : `flex h-9 w-9 items-center justify-center rounded-xl border ${option.styles}`
            }
        >
            <Icon className={size === "large" ? "h-7 w-7" : "h-4 w-4"} />
        </div>
    );
}

export default async function AdminPricingPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    async function createPackageAction(formData: FormData) {
        "use server";

        const supabase = await createClient();

        const name = String(formData.get("name") ?? "").trim();
        const description =
            String(formData.get("description") ?? "").trim() || null;
        const price = String(formData.get("price") ?? "").trim() || null;
        const billing_note =
            String(formData.get("billing_note") ?? "").trim() || null;
        const icon_name =
            String(formData.get("icon_name") ?? "general").trim() || "general";
        const features = featuresToArray(formData.get("features"));

        const rawSortOrder = Number(formData.get("sort_order") ?? 0);
        const sort_order = Number.isFinite(rawSortOrder) ? rawSortOrder : 0;

        const is_published = formData.get("is_published") === "on";

        if (!name) {
            redirect("/admin/pricing?error=name-required");
        }

        const allowedIcons = ICON_OPTIONS.map((option) => option.value);

        if (!allowedIcons.includes(icon_name as any)) {
            redirect("/admin/pricing?error=invalid-icon");
        }

        const { error } = await supabase.from("pricing_packages").insert({
            name,
            description,
            price,
            billing_note,
            features,
            icon_name,
            sort_order,
            is_published,
        });

        if (error) {
            redirect(
                `/admin/pricing?error=${encodeURIComponent(error.message)}`
            );
        }

        revalidatePath("/admin/pricing");
        revalidatePath("/pricing");
        revalidatePath("/");

        redirect("/admin/pricing?saved=created");
    }

    async function updatePackageAction(
        packageId: string,
        formData: FormData
    ) {
        "use server";

        const supabase = await createClient();

        const name = String(formData.get("name") ?? "").trim();
        const description =
            String(formData.get("description") ?? "").trim() || null;
        const price = String(formData.get("price") ?? "").trim() || null;
        const billing_note =
            String(formData.get("billing_note") ?? "").trim() || null;
        const icon_name =
            String(formData.get("icon_name") ?? "general").trim() || "general";
        const features = featuresToArray(formData.get("features"));

        const rawSortOrder = Number(formData.get("sort_order") ?? 0);
        const sort_order = Number.isFinite(rawSortOrder) ? rawSortOrder : 0;

        const is_published = formData.get("is_published") === "on";

        if (!name) {
            redirect("/admin/pricing?error=name-required");
        }

        const allowedIcons = ICON_OPTIONS.map((option) => option.value);

        if (!allowedIcons.includes(icon_name as any)) {
            redirect("/admin/pricing?error=invalid-icon");
        }

        const { error } = await supabase
            .from("pricing_packages")
            .update({
                name,
                description,
                price,
                billing_note,
                features,
                icon_name,
                sort_order,
                is_published,
                updated_at: new Date().toISOString(),
            })
            .eq("id", packageId);

        if (error) {
            redirect(
                `/admin/pricing?error=${encodeURIComponent(error.message)}`
            );
        }

        revalidatePath("/admin/pricing");
        revalidatePath("/pricing");
        revalidatePath("/");

        redirect("/admin/pricing?saved=updated");
    }

    async function togglePublishedAction(
        packageId: string,
        currentValue: boolean
    ) {
        "use server";

        const supabase = await createClient();

        const { error } = await supabase
            .from("pricing_packages")
            .update({
                is_published: !currentValue,
                updated_at: new Date().toISOString(),
            })
            .eq("id", packageId);

        if (error) {
            redirect(
                `/admin/pricing?error=${encodeURIComponent(error.message)}`
            );
        }

        revalidatePath("/admin/pricing");
        revalidatePath("/pricing");
        revalidatePath("/");

        redirect("/admin/pricing?saved=visibility");
    }

    async function deletePackageAction(packageId: string) {
        "use server";

        const supabase = await createClient();

        const { error } = await supabase
            .from("pricing_packages")
            .delete()
            .eq("id", packageId);

        if (error) {
            redirect(
                `/admin/pricing?error=${encodeURIComponent(error.message)}`
            );
        }

        revalidatePath("/admin/pricing");
        revalidatePath("/pricing");
        revalidatePath("/");

        redirect("/admin/pricing?saved=deleted");
    }

    const { data, error } = await supabase
        .from("pricing_packages")
        .select(
            "id,name,description,price,billing_note,features,icon_name,is_published,sort_order,created_at"
        )
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

    const packages = (data ?? []) as PricingPackage[];

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-white shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500/90 to-purple-600/90 px-3 py-1 text-xs font-medium text-white shadow-lg shadow-fuchsia-500/20">
                            <BadgeDollarSign className="h-3.5 w-3.5" />
                            Pricing management
                        </div>

                        <h1 className="text-2xl font-semibold tracking-tight">
                            Pricing
                        </h1>

                        <p className="mt-1 text-sm text-white/65">
                            Add, update, publish and arrange pricing packages.
                        </p>
                    </div>

                    <Button
                        asChild
                        variant="outline"
                        className="cursor-pointer border-white/15 bg-white/5 text-white transition hover:bg-white/10 hover:text-white"
                    >
                        <a
                            href="/pricing"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2"
                        >
                            <Eye className="h-4 w-4" />
                            View Public Pricing
                        </a>
                    </Button>
                </div>
            </div>

            {error ? (
                <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                    {error.message}
                </div>
            ) : null}

            <Card className="border-0 bg-white shadow-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PackagePlus className="h-5 w-5 text-fuchsia-600" />
                        Add Pricing Package
                    </CardTitle>

                    <CardDescription>
                        Create a new package for the public pricing page.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form action={createPackageAction} className="space-y-5">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Package Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="e.g. Editable Letterhead"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="price">Price</Label>
                                <Input
                                    id="price"
                                    name="price"
                                    placeholder="e.g. R375"
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="icon_name">
                                    Package Icon
                                </Label>

                                <select
                                    id="icon_name"
                                    name="icon_name"
                                    defaultValue="general"
                                    className="h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                                >
                                    {ICON_OPTIONS.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>

                                <p className="text-xs text-muted-foreground">
                                    Select the visual that best represents this
                                    package.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sort_order">
                                    Sort Order
                                </Label>

                                <Input
                                    id="sort_order"
                                    name="sort_order"
                                    type="number"
                                    defaultValue="0"
                                />

                                <p className="text-xs text-muted-foreground">
                                    Lower numbers appear first.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Short description of this package..."
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="billing_note">
                                Billing Note
                            </Label>

                            <Input
                                id="billing_note"
                                name="billing_note"
                                placeholder="e.g. Once-off payment"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="features">Features</Label>

                            <Textarea
                                id="features"
                                name="features"
                                placeholder={`Editable Microsoft Word document\nCustom branded layout\nPrint-ready PDF included`}
                                rows={6}
                            />

                            <p className="text-xs text-muted-foreground">
                                Add one feature per line.
                            </p>
                        </div>

                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                name="is_published"
                                className="h-4 w-4 cursor-pointer"
                            />
                            Publish this package immediately
                        </label>

                        <Button
                            type="submit"
                            className="cursor-pointer border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white transition hover:from-fuchsia-500/85 hover:to-purple-600/85"
                        >
                            <PackagePlus className="mr-2 h-4 w-4" />
                            Add Package
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-0 bg-white shadow-xl">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-cyan-600" />
                            Pricing Packages
                        </CardTitle>

                        <CardDescription>
                            {packages.length} package
                            {packages.length === 1 ? "" : "s"} total
                        </CardDescription>
                    </div>

                    <Badge
                        variant="outline"
                        className="w-fit border-cyan-200 bg-cyan-50 text-cyan-700"
                    >
                        {
                            packages.filter((item) => item.is_published)
                                .length
                        }{" "}
                        published
                    </Badge>
                </CardHeader>

                <CardContent>
                    {packages.length === 0 ? (
                        <div className="rounded-xl border bg-background p-6">
                            <div className="text-sm font-medium">
                                No pricing packages yet
                            </div>

                            <div className="mt-1 text-sm text-muted-foreground">
                                Use the form above to create your first package.
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
    {packages.map((pricingPackage) => {
        const iconOption = getIconOption(
            pricingPackage.icon_name
        );

        return (
            <details
                key={pricingPackage.id}
                className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition open:shadow-lg"
            >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-slate-50 px-5 py-4 transition hover:bg-slate-100 [&::-webkit-details-marker]:hidden">
                    <div className="flex min-w-0 items-center gap-3">
                        <PricingIcon
                            iconName={pricingPackage.icon_name}
                            size="small"
                        />

                        <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">
                                {pricingPackage.name}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <span>
                                    {pricingPackage.price ??
                                        "Custom pricing"}
                                </span>

                                <span>•</span>

                                <span>{iconOption.label}</span>

                                <span>•</span>

                                <span>
                                    Sort order:{" "}
                                    {pricingPackage.sort_order}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                        <Badge
                            className={
                                pricingPackage.is_published
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 bg-slate-100 text-slate-600"
                            }
                            variant="outline"
                        >
                            {pricingPackage.is_published
                                ? "Published"
                                : "Draft"}
                        </Badge>

                        <ChevronDown className="h-5 w-5 text-slate-500 transition-transform duration-200 group-open:rotate-180" />
                    </div>
                </summary>

                <div className="border-t p-5">
                    <form
                        action={async (formData) => {
                            "use server";

                            return updatePackageAction(
                                pricingPackage.id,
                                formData
                            );
                        }}
                        className="space-y-4"
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label
                                    htmlFor={`name-${pricingPackage.id}`}
                                >
                                    Package Name
                                </Label>

                                <Input
                                    id={`name-${pricingPackage.id}`}
                                    name="name"
                                    defaultValue={
                                        pricingPackage.name
                                    }
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor={`price-${pricingPackage.id}`}
                                >
                                    Price
                                </Label>

                                <Input
                                    id={`price-${pricingPackage.id}`}
                                    name="price"
                                    defaultValue={
                                        pricingPackage.price ?? ""
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label
                                    htmlFor={`icon-${pricingPackage.id}`}
                                >
                                    Package Icon
                                </Label>

                                <select
                                    id={`icon-${pricingPackage.id}`}
                                    name="icon_name"
                                    defaultValue={
                                        pricingPackage.icon_name ||
                                        "general"
                                    }
                                    className="h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                                >
                                    {ICON_OPTIONS.map(
                                        (option) => (
                                            <option
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor={`sort-${pricingPackage.id}`}
                                >
                                    Sort Order
                                </Label>

                                <Input
                                    id={`sort-${pricingPackage.id}`}
                                    name="sort_order"
                                    type="number"
                                    defaultValue={
                                        pricingPackage.sort_order
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor={`description-${pricingPackage.id}`}
                            >
                                Description
                            </Label>

                            <Textarea
                                id={`description-${pricingPackage.id}`}
                                name="description"
                                defaultValue={
                                    pricingPackage.description ?? ""
                                }
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor={`billing-${pricingPackage.id}`}
                            >
                                Billing Note
                            </Label>

                            <Input
                                id={`billing-${pricingPackage.id}`}
                                name="billing_note"
                                defaultValue={
                                    pricingPackage.billing_note ?? ""
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor={`features-${pricingPackage.id}`}
                            >
                                Features
                            </Label>

                            <Textarea
                                id={`features-${pricingPackage.id}`}
                                name="features"
                                defaultValue={featuresToText(
                                    pricingPackage.features
                                )}
                                rows={6}
                            />

                            <p className="text-xs text-muted-foreground">
                                Add one feature per line.
                            </p>
                        </div>

                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                name="is_published"
                                defaultChecked={
                                    pricingPackage.is_published
                                }
                                className="h-4 w-4 cursor-pointer"
                            />
                            Published
                        </label>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="submit"
                                className="cursor-pointer border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white transition hover:from-fuchsia-500/85 hover:to-purple-600/85"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </Button>
                        </div>
                    </form>

                    <div className="mt-5 border-t pt-4">
                        <div className="flex flex-wrap gap-2">
                            <form
                                action={async () => {
                                    "use server";

                                    return togglePublishedAction(
                                        pricingPackage.id,
                                        pricingPackage.is_published
                                    );
                                }}
                            >
                                <Button
                                    type="submit"
                                    variant="outline"
                                    className={
                                        pricingPackage.is_published
                                            ? "cursor-pointer border-amber-200 text-amber-700 transition hover:bg-amber-50 hover:text-amber-800"
                                            : "cursor-pointer border-emerald-200 text-emerald-700 transition hover:bg-emerald-50 hover:text-emerald-800"
                                    }
                                >
                                    {pricingPackage.is_published ? (
                                        <>
                                            <EyeOff className="mr-2 h-4 w-4" />
                                            Unpublish
                                        </>
                                    ) : (
                                        <>
                                            <Check className="mr-2 h-4 w-4" />
                                            Publish
                                        </>
                                    )}
                                </Button>
                            </form>

                            <form
                                action={async () => {
                                    "use server";

                                    return deletePackageAction(
                                        pricingPackage.id
                                    );
                                }}
                            >
                                <Button
                                    type="submit"
                                    variant="outline"
                                    className="cursor-pointer border-red-200 text-red-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </details>
        );
    })}
</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}