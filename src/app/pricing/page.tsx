// FILE: src/app/pricing/page.tsx

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

import {
    AtSign,
    Bot,
    BookOpen,
    Briefcase,
    BriefcaseBusiness,
    Camera,
    Check,
    Database,
    FileText,
    FolderKanban,
    Globe2,
    Image as ImageIcon,
    Layers3,
    LogIn,
    Mail,
    MessageCircle,
    MessageSquare,
    MonitorSmartphone,
    Palette,
    Printer,
    Rocket,
    SearchCheck,
    Server,
    Share2,
    Shapes,
    Smartphone,
    Sparkles,
    Ticket,
    Type,
} from "lucide-react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Package = {
    id: string;
    name: string;
    description: string | null;
    price: string | null;
    billing_note: string | null;
    features: unknown;
    icon_name: string;
};

const ICON_OPTIONS = [
    {
        value: "letterhead",
        label: "Editable Letterhead",
        icon: FileText,
        gradient: "from-blue-500 to-cyan-500",
        glow: "shadow-blue-500/20",
        soft: "bg-blue-50 text-blue-700",
    },
    {
        value: "email-signature",
        label: "Email Signature",
        icon: Mail,
        gradient: "from-cyan-500 to-sky-500",
        glow: "shadow-cyan-500/20",
        soft: "bg-cyan-50 text-cyan-700",
    },
    {
        value: "logo",
        label: "Logo Design",
        icon: Shapes,
        gradient: "from-purple-500 to-fuchsia-500",
        glow: "shadow-purple-500/20",
        soft: "bg-purple-50 text-purple-700",
    },
    {
        value: "website",
        label: "Website",
        icon: Globe2,
        gradient: "from-indigo-500 to-violet-500",
        glow: "shadow-indigo-500/20",
        soft: "bg-indigo-50 text-indigo-700",
    },
    {
        value: "cms",
        label: "Content Management System",
        icon: Database,
        gradient: "from-emerald-500 to-teal-500",
        glow: "shadow-emerald-500/20",
        soft: "bg-emerald-50 text-emerald-700",
    },
    {
        value: "blog",
        label: "Blog",
        icon: BookOpen,
        gradient: "from-orange-500 to-amber-500",
        glow: "shadow-orange-500/20",
        soft: "bg-orange-50 text-orange-700",
    },
    {
        value: "invites",
        label: "Invites",
        icon: Ticket,
        gradient: "from-pink-500 to-rose-500",
        glow: "shadow-pink-500/20",
        soft: "bg-pink-50 text-pink-700",
    },
    {
        value: "posters",
        label: "Posters",
        icon: ImageIcon,
        gradient: "from-red-500 to-orange-500",
        glow: "shadow-red-500/20",
        soft: "bg-red-50 text-red-700",
    },
    {
        value: "social-media",
        label: "Social Media Management",
        icon: Share2,
        gradient: "from-sky-500 to-blue-500",
        glow: "shadow-sky-500/20",
        soft: "bg-sky-50 text-sky-700",
    },
    {
        value: "web-app",
        label: "Web App",
        icon: MonitorSmartphone,
        gradient: "from-violet-500 to-purple-500",
        glow: "shadow-violet-500/20",
        soft: "bg-violet-50 text-violet-700",
    },
    {
        value: "mobile-app",
        label: "Mobile App",
        icon: Smartphone,
        gradient: "from-green-500 to-emerald-500",
        glow: "shadow-green-500/20",
        soft: "bg-green-50 text-green-700",
    },
    {
        value: "company-profile",
        label: "Company Profile",
        icon: BriefcaseBusiness,
        gradient: "from-slate-600 to-slate-800",
        glow: "shadow-slate-500/20",
        soft: "bg-slate-100 text-slate-700",
    },
    {
        value: "mockups",
        label: "Mockups",
        icon: Layers3,
        gradient: "from-amber-500 to-yellow-500",
        glow: "shadow-amber-500/20",
        soft: "bg-amber-50 text-amber-700",
    },
    {
        value: "typesetting",
        label: "Typesetting",
        icon: Type,
        gradient: "from-teal-500 to-cyan-500",
        glow: "shadow-teal-500/20",
        soft: "bg-teal-50 text-teal-700",
    },
    {
        value: "print-products",
        label: "Print Products",
        icon: Printer,
        gradient: "from-rose-500 to-pink-500",
        glow: "shadow-rose-500/20",
        soft: "bg-rose-50 text-rose-700",
    },
    {
        value: "seo",
        label: "SEO",
        icon: SearchCheck,
        gradient: "from-lime-500 to-emerald-500",
        glow: "shadow-lime-500/20",
        soft: "bg-lime-50 text-lime-700",
    },
    {
        value: "hosting",
        label: "Hosting",
        icon: Server,
        gradient: "from-blue-600 to-indigo-600",
        glow: "shadow-blue-500/20",
        soft: "bg-blue-50 text-blue-700",
    },
    {
        value: "domain-registration",
        label: "Domain Registration",
        icon: AtSign,
        gradient: "from-fuchsia-500 to-purple-600",
        glow: "shadow-fuchsia-500/20",
        soft: "bg-fuchsia-50 text-fuchsia-700",
    },
    {
        value: "photography",
        label: "Photography",
        icon: Camera,
        gradient: "from-yellow-500 to-orange-500",
        glow: "shadow-yellow-500/20",
        soft: "bg-yellow-50 text-yellow-700",
    },
    {
        value: "ai-automation",
        label: "AI Automation",
        icon: Bot,
        gradient: "from-purple-600 to-indigo-600",
        glow: "shadow-purple-500/20",
        soft: "bg-purple-50 text-purple-700",
    },
    {
        value: "general",
        label: "Creative Service",
        icon: Sparkles,
        gradient: "from-fuchsia-500 to-purple-600",
        glow: "shadow-fuchsia-500/20",
        soft: "bg-fuchsia-50 text-fuchsia-700",
    },
] as const;

function getIconOption(iconName: string | null | undefined) {
    return (
        ICON_OPTIONS.find((option) => option.value === iconName) ??
        ICON_OPTIONS.find((option) => option.value === "general")!
    );
}

function supabasePublic() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
}

function DreamInColorBackdrop({
    image,
    video,
}: {
    image?: string;
    video?: string;
}) {
    return (
        <>
            <div className="absolute inset-0 overflow-hidden">
                {video ? (
                    <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        poster={image}
                        className="h-full w-full object-cover object-center"
                    >
                        <source src={video} type="video/mp4" />
                    </video>
                ) : image ? (
                    <img
                        src={image}
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-cover object-center"
                    />
                ) : null}
            </div>

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(122,60,255,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(0,229,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,46,136,0.18),transparent_28%),linear-gradient(180deg,rgba(9,9,20,0.78)_0%,rgba(13,13,24,0.92)_100%)]" />

            <div className="absolute inset-0 opacity-30">
                <div className="absolute left-[8%] top-[12%] h-72 w-72 rounded-full border border-white/10" />
                <div className="absolute left-[14%] top-[18%] h-48 w-48 rounded-full border border-white/10" />
                <div className="absolute right-[10%] top-[16%] h-80 w-80 rounded-full border border-white/10" />
                <div className="absolute bottom-[12%] left-[18%] h-56 w-56 rounded-full border border-white/10" />
                <div className="absolute bottom-[10%] right-[14%] h-40 w-40 rounded-full border border-white/10" />
            </div>
        </>
    );
}

export default async function PricingPage() {
    const supabase = supabasePublic();

    const { data, error } = await supabase
        .from("pricing_packages")
        .select(
            "id,name,description,price,billing_note,features,icon_name"
        )
        .eq("is_published", true)
        .order("sort_order", { ascending: true });

    const packages = (data ?? []) as Package[];

    return (
        <main className="min-h-screen bg-background">
            <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090914]/95 backdrop-blur-xl">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
                    <Link
                        href="/"
                        className="flex cursor-pointer items-center gap-3"
                    >
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-background">
                            <img
                                src="/logo.png"
                                alt="Dream in Color logo"
                                className="h-full w-full object-contain"
                            />
                        </div>

                        <div className="leading-tight">
                            <div className="font-semibold text-white">
                                Dream in Color
                            </div>

                            <div className="text-xs text-white">
                                Creative Ecosystem
                            </div>
                        </div>
                    </Link>

                    <div className="flex items-center gap-2">
    <Button
        asChild
        variant="outline"
        className="cursor-pointer border-white/15 bg-white/5 text-white transition hover:bg-white/10 hover:text-white"
    >
        <Link
            href="/pricing"
            className="flex items-center gap-2"
        >
            <Briefcase className="h-4 w-4" />
            Pricing
        </Link>
    </Button>

    <Button
        asChild
        variant="outline"
        className="cursor-pointer border-white/15 bg-white/5 text-white transition hover:bg-white/10 hover:text-white"
    >
        <Link
            href="/#projects"
            className="flex items-center gap-2"
        >
            <FolderKanban className="h-4 w-4" />
            Projects
        </Link>
    </Button>

    <Button
        asChild
        variant="outline"
        className="cursor-pointer border-white/15 bg-white/5 text-white transition hover:bg-white/10 hover:text-white"
    >
        <Link
            href="/#artwork"
            className="flex items-center gap-2"
        >
            <ImageIcon className="h-4 w-4" />
            Artwork
        </Link>
    </Button>

    <Button
        asChild
        className="cursor-pointer border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-md shadow-fuchsia-500/20 transition hover:from-fuchsia-500/85 hover:to-purple-600/85"
    >
        <Link
            href="/login"
            className="flex items-center gap-2"
        >
            <LogIn className="h-4 w-4" />
            Enter Portal
        </Link>
    </Button>
</div>
                </div>
            </header>

            <section className="relative overflow-hidden text-white">
                <DreamInColorBackdrop
                    video="/pricing-hero-video.mp4"
                    image="/pricing-hero.jpg"
                />

                <div className="relative mx-auto max-w-6xl px-4 py-14 md:py-20">
                    <div className="max-w-3xl">
                        <Badge className="mb-4 border-0 bg-gradient-to-r from-fuchsia-500/90 via-purple-500/90 to-cyan-400/90 text-white">
                            <Palette className="mr-1 h-3.5 w-3.5" />
                            Flexible creative packages
                        </Badge>

                        <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
                            Pricing built around
                            <span className="text-white/60">
                                {" "}
                                what your business needs.
                            </span>
                        </h1>

                        <p className="mt-5 max-w-2xl text-base text-white/70 md:text-lg">
                            Choose a package that matches your current goals, or
                            contact us for a custom solution designed around your
                            brand, project or digital system.
                        </p>

                        <div className="mt-7 flex flex-wrap gap-2">
                            <Button
                                asChild
                                className="cursor-pointer border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white transition hover:from-fuchsia-500/85 hover:to-purple-600/85"
                            >
                                <Link
                                    href="/#contact"
                                    className="flex items-center gap-2"
                                >
                                    <Rocket className="h-4 w-4" />
                                    Request a Quote
                                </Link>
                            </Button>

                            <Button
                                asChild
                                variant="outline"
                                className="cursor-pointer border-white/15 bg-white/5 text-white transition hover:bg-white/10 hover:text-white"
                            >
                                <Link
                                    href="/#projects"
                                    className="flex items-center gap-2"
                                >
                                    <Briefcase className="h-4 w-4" />
                                    View Projects
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="relative bg-background">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400" />

                <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-fuchsia-500" />

                            <h2 className="text-2xl font-semibold">
                                Pricing Packages
                            </h2>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            Select a package below or request a custom quote.
                        </p>
                    </div>

                    {error ? (
                        <div className="mt-8 rounded-2xl border border-red-300 bg-red-50 p-5 text-sm text-red-700">
                            {error.message}
                        </div>
                    ) : null}

                    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {packages.length === 0 ? (
                            <Card className="md:col-span-2 lg:col-span-3">
                                <CardContent className="p-8">
                                    <div className="text-sm font-medium">
                                        No pricing packages published yet
                                    </div>

                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Published packages will appear here
                                        automatically.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            packages.map((pricingPackage) => {
                                const features = Array.isArray(
                                    pricingPackage.features
                                )
                                    ? pricingPackage.features
                                    : [];

                                const iconOption = getIconOption(
                                    pricingPackage.icon_name
                                );

                                const Icon = iconOption.icon;

                                return (
                                    <Card
    key={pricingPackage.id}
    className="group flex h-full flex-col overflow-hidden border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
>
    <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-4">
            <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${iconOption.gradient} text-white shadow-lg ${iconOption.glow}`}
            >
                <Icon className="h-7 w-7" />
            </div>

            <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold leading-tight">
                    {pricingPackage.name}
                </div>

                <div className="mt-2 text-2xl font-semibold tracking-tight">
                    {pricingPackage.price ?? "Custom"}
                </div>

                {pricingPackage.billing_note ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                        {pricingPackage.billing_note}
                    </div>
                ) : null}
            </div>
        </div>

        {pricingPackage.description ? (
            <p className="mt-4 text-sm text-muted-foreground">
                {pricingPackage.description}
            </p>
        ) : null}

        <div className="mt-4 space-y-2">
            {features.length ? (
                features.map(
                    (
                        feature: unknown,
                        featureIndex: number
                    ) => (
                        <div
                            key={featureIndex}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                            <div
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${iconOption.soft}`}
                            >
                                <Check className="h-3.5 w-3.5" />
                            </div>

                            <span>{String(feature)}</span>
                        </div>
                    )
                )
            ) : (
                <div className="text-sm text-muted-foreground">
                    Contact us for the full package details.
                </div>
            )}
        </div>

        <div className="mt-auto space-y-2 pt-5">
            <Button
                asChild
                className={`w-full cursor-pointer border-0 bg-gradient-to-r ${iconOption.gradient} text-white shadow-md ${iconOption.glow} transition hover:opacity-90`}
            >
                <Link
                    href={`/?package=${encodeURIComponent(
                        pricingPackage.name
                    )}#contact`}
                    className="flex items-center justify-center gap-2"
                >
                    <Rocket className="h-4 w-4" />
                    Request This Package
                </Link>
            </Button>

            <Button
                asChild
                variant="outline"
                className="w-full cursor-pointer border-emerald-500/30 bg-emerald-50 text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-800"
            >
                <a
                    href={`https://wa.me/27813408126?text=${encodeURIComponent(
                        `Hello Dream in Color Studios. I would like to enquire about the following package:\n\nPackage: ${pricingPackage.name}\nPrice: ${pricingPackage.price ?? "Custom"}\n\nPlease send me more information about this package.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2"
                >
                    <MessageCircle className="h-4 w-4" />
                    Enquire on WhatsApp
                </a>
            </Button>
        </div>
    </CardContent>
</Card>
                                );
                            })
                        )}
                    </div>
                </div>
            </section>

            <section className="relative overflow-hidden text-white">
                <DreamInColorBackdrop image="/pricing-contact-bg.jpg" />

                <div className="relative mx-auto max-w-6xl px-4 py-12">
                    <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl md:p-8">
                        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5 text-cyan-300" />

                                    <h2 className="text-2xl font-semibold">
                                        Need something custom?
                                    </h2>
                                </div>

                                <p className="mt-2 max-w-2xl text-sm text-white/70">
                                    Tell us what you need and we will create a
                                    custom quote for your project.
                                </p>
                            </div>

                            <Button
                                asChild
                                className="cursor-pointer border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white transition hover:from-fuchsia-500/85 hover:to-purple-600/85"
                            >
                                <Link
                                    href="/#contact"
                                    className="flex items-center gap-2"
                                >
                                    <Rocket className="h-4 w-4" />
                                    Start a Project
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="relative">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400" />

                <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} Dream in Color Studios
                    </div>

                    <div className="flex gap-3 text-sm">
                        <Link
                            href="/"
                            className="cursor-pointer text-muted-foreground hover:text-foreground hover:underline"
                        >
                            Home
                        </Link>

                        <Link
                            href="/#projects"
                            className="cursor-pointer text-muted-foreground hover:text-foreground hover:underline"
                        >
                            Projects
                        </Link>

                        <Link
                            href="/#artwork"
                            className="cursor-pointer text-muted-foreground hover:text-foreground hover:underline"
                        >
                            Artwork
                        </Link>

                        <Link
                            href="/#contact"
                            className="cursor-pointer text-muted-foreground hover:text-foreground hover:underline"
                        >
                            Contact
                        </Link>

                        <Link
                            href="/login"
                            className="cursor-pointer text-muted-foreground hover:text-foreground hover:underline"
                        >
                            Portal
                        </Link>
                    </div>
                </div>
            </footer>

            <a
                href="https://wa.me/27813408126"
                target="_blank"
                rel="noreferrer"
                aria-label="Chat on WhatsApp"
                className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-emerald-300/30 bg-[#25D366] text-white shadow-xl shadow-emerald-500/30 transition-all hover:scale-105"
            >
                <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-7 w-7 fill-current"
                >
                    <path d="M19.05 4.91A9.82 9.82 0 0 0 12.03 2C6.62 2 2.21 6.4 2.2 11.82c0 1.74.45 3.44 1.31 4.94L2 22l5.4-1.41a9.86 9.86 0 0 0 4.62 1.18h.01c5.41 0 9.82-4.4 9.83-9.82a9.75 9.75 0 0 0-2.81-7.04ZM12.03 20.1h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.2.84.86-3.12-.2-.32a8.13 8.13 0 0 1-1.25-4.34c0-4.5 3.67-8.17 8.19-8.17 2.18 0 4.22.84 5.77 2.39a8.1 8.1 0 0 1 2.39 5.78c0 4.5-3.68 8.17-8.18 8.17Zm4.48-6.12c-.25-.12-1.47-.72-1.7-.8-.23-.08-.39-.12-.56.12-.17.25-.64.8-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.38-2-1.21-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07s.89 2.39 1.01 2.56c.12.17 1.75 2.68 4.24 3.75.59.26 1.05.41 1.41.52.59.19 1.12.16 1.54.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.1-.23-.16-.48-.29Z" />
                </svg>
            </a>
        </main>
    );
}