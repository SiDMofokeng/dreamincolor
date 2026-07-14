// FILE: src/app/page.tsx
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowRight,
  Briefcase,
  Facebook,
  FolderKanban,
  Image as ImageIcon,
  Images,
  Instagram,
  LogIn,
  Palette,
  Rocket,
  Sparkles,
  WandSparkles,
  MonitorSmartphone,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LeadForm from "@/components/public/lead-form";
import ArtworkCarousel from "@/components/public/artwork-carousel";

type PortfolioItem = {
  id: string;
  title: string;
  item_type: string | null;
  category: string | null;
  description: string | null;
  image_url: string | null;
  project_url: string | null;
  sort_order: number;
};

type ArtworkImage = {
  id: string;
  portfolio_item_id: string;
  image_url: string;
  sort_order: number;
};

function supabasePublic() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

function normalizeItemType(v: string | null | undefined) {
  return String(v ?? "project").trim().toLowerCase() === "artwork" ? "artwork" : "project";
}

function DreamInColorBackdrop() {
  return (
    <>
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="/hero-bg.jpg"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover opacity-75"
        />
      </div>

      {/* Dark + color atmospheric overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(122,60,255,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(0,229,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,46,136,0.18),transparent_28%),linear-gradient(180deg,rgba(9,9,20,0.82)_0%,rgba(13,13,24,0.92)_100%)]" />

      {/* Orbit / system lines */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute left-[8%] top-[12%] h-72 w-72 rounded-full border border-white/10" />
        <div className="absolute left-[14%] top-[18%] h-48 w-48 rounded-full border border-white/10" />
        <div className="absolute right-[10%] top-[16%] h-80 w-80 rounded-full border border-white/10" />
        <div className="absolute bottom-[12%] left-[18%] h-56 w-56 rounded-full border border-white/10" />
        <div className="absolute bottom-[10%] right-[14%] h-40 w-40 rounded-full border border-white/10" />

        <div className="absolute left-[20%] top-[42%] h-3 w-3 rounded-sm bg-white/60" />
        <div className="absolute left-[34%] top-[24%] h-2 w-2 rounded-full bg-cyan-300/80" />
        <div className="absolute right-[28%] top-[34%] h-3 w-3 rounded-full bg-fuchsia-400/70" />
        <div className="absolute bottom-[24%] right-[22%] h-3 w-3 rounded-sm bg-white/50" />
      </div>
    </>
  );
}

export default async function LandingPage() {
  const supabase = supabasePublic();

  const [{ data: items }, { data: artworkImagesData }] = await Promise.all([
    supabase
      .from("portfolio_items")
      .select("id,title,item_type,category,description,image_url,project_url,sort_order")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .limit(24),

    supabase
      .from("portfolio_item_images")
      .select("id,portfolio_item_id,image_url,sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const portfolio = (items ?? []) as PortfolioItem[];
  const artworkImages = (artworkImagesData ?? []) as ArtworkImage[];

  const projects = portfolio.filter((x) => normalizeItemType(x.item_type) === "project");
  const artworks = portfolio.filter((x) => normalizeItemType(x.item_type) === "artwork");

  const artworkSlides = [
    ...artworks
      .filter((x) => x.image_url)
      .map((x) => ({
        id: `cover-${x.id}`,
        title: x.title,
        image_url: x.image_url as string,
        sort_order: x.sort_order ?? 0,
      })),
    ...artworkImages
      .filter((x) => !!x.image_url)
      .map((x) => {
        const parent = artworks.find((a) => a.id === x.portfolio_item_id);
        return {
          id: x.id,
          title: parent?.title ?? "Artwork",
          image_url: x.image_url,
          sort_order: x.sort_order ?? 0,
        };
      }),
  ].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090914]/20 backdrop-blur-xl supports-[backdrop-filter]:bg-[#090914]/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-4xl border bg-background">
              <img
                src="/logo.png"
                alt="Dream in Color logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-white">Dream in Color</div>
              <div className="text-xs text-white">Creative Ecosystem</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="#projects" className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4" />
                Projects
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="#artwork" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Artwork
              </Link>
            </Button>

            <Button
              asChild
              className="border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-md shadow-fuchsia-500/20 hover:from-fuchsia-500/85 hover:to-purple-600/85"
            >
              <Link href="/login" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Enter Portal
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden text-white">
        <DreamInColorBackdrop />
        <div className="relative mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <Badge className="mb-3 border-0 bg-gradient-to-r from-fuchsia-500/90 via-purple-500/90 to-cyan-400/90 text-white shadow-lg shadow-fuchsia-500/20 backdrop-blur-sm hover:from-fuchsia-500/90 hover:via-purple-500/90 hover:to-cyan-400/90">
                <Palette className="mr-1 h-3.5 w-3.5" />
                Branding • Web • Content • Systems
              </Badge>

              <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
                We design brands that feel alive —
                <span className="text-white/60"> and build the systems that run them.</span>
              </h1>

              <p className="mt-4 text-base text-white/70 md:text-lg">
                Dream in Color is a creative ecosystem blending strategy, design, and development
                to help businesses launch, grow, and stay consistent.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="#contact" className="flex items-center gap-2">
                    <Rocket className="h-4 w-4" />
                    Start a Project
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/pricing" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    View Pricing
                  </Link>
                </Button>

                <Button
                  asChild
                  className="border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-md shadow-fuchsia-500/20 hover:from-fuchsia-500/85 hover:to-purple-600/85"
                >
                  <Link href="/login" className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Client Portal Login
                  </Link>
                </Button>
              </div>
            </div>

            <Card className="overflow-hidden border-white/10 bg-white/8 text-white shadow-2xl backdrop-blur-xl">
              <CardContent className="py-8">
                <div className="relative h-[320px] w-full">
                  <div className="absolute inset-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Sparkles className="h-4 w-4" />
                        Ecosystem Snapshot
                      </div>

                      <Badge className="border-0 bg-gradient-to-r from-cyan-400/90 to-blue-500/90 text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400/90 hover:to-blue-500/90">
                        <WandSparkles className="mr-1 h-3.5 w-3.5" />
                        Fast + consistent
                      </Badge>
                    </div>

                    <div className="mt-6 grid gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-xs text-white/60">
                          <ShieldCheck className="h-4 w-4 text-fuchsia-300" />
                          Experience
                        </div>
                        <div className="mt-2 text-lg font-semibold">10+ yrs experience</div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-xs text-white/60">
                          <Images className="h-4 w-4 text-cyan-300" />
                          Artwork
                        </div>
                        <div className="mt-2 text-lg font-semibold">1000+ artworks produced</div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-xs text-white/60">
                          <MonitorSmartphone className="h-4 w-4 text-violet-300" />
                          Web Projects & Systems
                        </div>
                        <div className="mt-2 text-lg font-semibold">20+ projects & systems delivered</div>
                      </div>
                    </div>

                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="artwork" className="relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400" />
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                <h2 className="text-2xl font-semibold">Artwork</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Selected design and visual work. Click any piece to view it full size.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border bg-muted/20">
            <ArtworkCarousel slides={artworkSlides} />
          </div>
        </div>
      </section>

      <section id="projects" className="relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500" />
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                <h2 className="text-2xl font-semibold">Projects</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Published project work from the database.
              </p>
            </div>

            <Button asChild variant="outline">
              <Link href="/pricing" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Pricing
              </Link>
            </Button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {projects.length === 0 ? (
              <Card className="md:col-span-3">
                <CardContent className="p-6 text-sm text-muted-foreground">
                  No project items published yet.
                </CardContent>
              </Card>
            ) : (
              projects.map((x) => (
                <Card key={x.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-semibold">{x.title}</div>
                      <FolderKanban className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{x.category ?? "—"}</div>
                    <div className="mt-2 text-sm text-muted-foreground">{x.description ?? ""}</div>

                    <div className="mt-4 h-40 overflow-hidden rounded-lg border bg-muted/40">
                      {x.image_url ? (
                        <img
                          src={x.image_url}
                          alt={x.title}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="mt-4 flex gap-2">
                      {x.project_url ? (
                        <Button asChild size="sm" variant="outline">
                          <a
                            href={x.project_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2"
                          >
                            <ArrowRight className="h-4 w-4" />
                            View
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </section>

      <section id="contact" className="relative overflow-hidden text-white">
        <div className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400" />
        <DreamInColorBackdrop />
        <div className="relative mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-6 md:grid-cols-2 md:items-start">
            <div>
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                <h2 className="text-2xl font-semibold">Start a project</h2>
              </div>
              <p className="mt-1 text-sm text-white/70">
                Send a quick brief. This form stores your request so the admin can track it.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/pricing" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    View pricing
                  </Link>
                </Button>

                <Button asChild className="bg-white text-black hover:bg-white/90">
                  <Link href="/login" className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Enter Portal
                  </Link>
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="border-[#1877F2]/30 bg-[#1877F2]/15 text-white hover:bg-[#1877F2]/25 hover:text-white"
                >
                  <a
                    href="https://www.facebook.com/creativethyself"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2"
                  >
                    <Facebook className="h-4 w-4" />
                    Facebook
                  </a>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="border-pink-400/30 bg-gradient-to-r from-fuchsia-500/20 via-pink-500/20 to-orange-400/20 text-white hover:from-fuchsia-500/30 hover:via-pink-500/30 hover:to-orange-400/30 hover:text-white"
                >
                  <a
                    href="https://www.instagram.com/dreamincolor.online/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2"
                  >
                    <Instagram className="h-4 w-4" />
                    Instagram
                  </a>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/8 p-1 shadow-2xl backdrop-blur-xl">
              <LeadForm />
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
            <Link className="text-muted-foreground hover:underline" href="/pricing">
              Pricing
            </Link>
            <Link className="text-muted-foreground hover:underline" href="/login">
              Portal
            </Link>
            <Link className="text-muted-foreground hover:underline" href="#contact">
              Contact
            </Link>
          </div>
        </div>
      </footer>

      <a
        href="https://wa.me/27813408126"
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300/30 bg-[#25D366] text-white shadow-xl shadow-emerald-500/30 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/40"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-7 w-7 fill-current"
        >
          <path d="M19.05 4.91A9.82 9.82 0 0 0 12.03 2C6.62 2 2.21 6.4 2.2 11.82c0 1.74.45 3.44 1.31 4.94L2 22l5.4-1.41a9.86 9.86 0 0 0 4.62 1.18h.01c5.41 0 9.82-4.4 9.83-9.82a9.75 9.75 0 0 0-2.81-7.04ZM12.03 20.1h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.2.84.86-3.12-.2-.32a8.13 8.13 0 0 1-1.25-4.34c0-4.5 3.67-8.17 8.19-8.17 2.18 0 4.22.84 5.77 2.39a8.1 8.1 0 0 1 2.39 5.78c0 4.5-3.68 8.17-8.18 8.17Zm4.48-6.12c-.25-.12-1.47-.72-1.7-.8-.23-.08-.39-.12-.56.12-.17.25-.64.8-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.38-2-1.21-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07s.89 2.39 1.01 2.56c.12.17 1.75 2.68 4.24 3.75.59.26 1.05.41 1.41.52.59.19 1.12.16 1.54.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.1-.23-.16-.48-.29Z" />
        </svg>
      </a>

      <style>{`
        @keyframes dic-carousel-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </main>
  );
}