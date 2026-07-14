import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";

type ProjectPdfRow = {
    id: string;
    client_id: string;
    client_name: string;
    title: string;
    status: string;
    priority: string;
    due_date: string | null;
    created_at: string;
};

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function monthStartISOFromParam(month?: string) {
    const m = (month ?? "").trim();
    if (!/^\d{4}-\d{2}$/.test(m)) return null;
    return `${m}-01`;
}

function parseMonthStart(isoStart: string) {
    const y = Number(isoStart.slice(0, 4));
    const m = Number(isoStart.slice(5, 7));
    return { y, m };
}

function addMonthsStartISO(isoStart: string, delta: number) {
    const { y, m } = parseMonthStart(isoStart);
    let mm = m - 1 + delta;
    let yy = y;

    while (mm < 0) {
        mm += 12;
        yy -= 1;
    }
    while (mm > 11) {
        mm -= 12;
        yy += 1;
    }

    return `${yy}-${pad2(mm + 1)}-01`;
}

function monthLabelFromStartISO(isoStart: string) {
    const { y, m } = parseMonthStart(isoStart);
    const d = new Date(Date.UTC(y, m - 1, 1));
    return d.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
}

function fmtDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
}

function normalizeStatus(status: string | null | undefined) {
    return String(status ?? "").trim().toLowerCase();
}

function normalizePriority(priority: string | null | undefined) {
    return String(priority ?? "").trim().toLowerCase();
}

function prettyStatus(status: string | null | undefined) {
    const s = normalizeStatus(status);
    if (s === "in-progress") return "In Progress";
    if (s === "onboarding") return "Onboarding";
    if (s === "review") return "Review";
    if (s === "blocked") return "Blocked";
    if (s === "done") return "Done";
    if (s === "lead") return "Lead";
    return status || "—";
}

function prettyPriority(priority: string | null | undefined) {
    const p = normalizePriority(priority);
    if (p === "high") return "High";
    if (p === "medium") return "Medium";
    if (p === "low") return "Low";
    return priority || "—";
}

function drawWrappedText(
    page: any,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    size: number,
    font: any,
    color = rgb(0.25, 0.25, 0.25)
) {
    const words = text.split(/\s+/);
    let line = "";
    let yy = y;

    for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        const width = font.widthOfTextAtSize(test, size);

        if (width > maxWidth && line) {
            page.drawText(line, { x, y: yy, size, font, color });
            yy -= size + 6;
            line = w;
        } else {
            line = test;
        }
    }

    if (line) {
        page.drawText(line, { x, y: yy, size, font, color });
    }

    return yy;
}

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: any) {
                    cookieStore.set({ name, value, ...options });
                },
                remove(name: string, options: any) {
                    cookieStore.set({ name, value: "", ...options });
                },
            },
        }
    );

    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const monthParam = searchParams.get("month") ?? undefined;
    const q = (searchParams.get("q") ?? "").trim();
    const statusFilter = (searchParams.get("status") ?? "").trim();
    const clientFilter = (searchParams.get("client") ?? "").trim();

    const now = new Date();
    const currentMonthStart = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-01`;
    const selectedMonthStart = monthStartISOFromParam(monthParam) ?? currentMonthStart;
    const nextMonthStart = addMonthsStartISO(selectedMonthStart, 1);

    const { data: company, error: companyErr } = await supabase
        .from("company_profile")
        .select("company_name,trading_name,email,phone,reg_number")
        .maybeSingle();

    if (companyErr) {
        return NextResponse.json({ error: companyErr.message }, { status: 400 });
    }

    let query = supabase
        .from("projects_search")
        .select("id,client_id,client_name,title,status,priority,due_date,created_at")
        .order("created_at", { ascending: false });

    if (clientFilter) query = query.eq("client_id", clientFilter);
    if (statusFilter && statusFilter !== "all") query = query.eq("status", statusFilter);

    if (q) {
        const like = `%${q}%`;
        query = query.or(`title.ilike.${like},client_name.ilike.${like}`);
    }

    const { data: rawProjects, error: projectsErr } = await query;
    if (projectsErr) {
        return NextResponse.json({ error: projectsErr.message }, { status: 400 });
    }

    const projects = ((rawProjects ?? []) as ProjectPdfRow[]).filter((p) => {
        return p.created_at < `${nextMonthStart}T00:00:00.000Z`;
    });

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const margin = 48;
    const width = page.getWidth();
    const height = page.getHeight();

    function drawText(
        str: string,
        x: number,
        y: number,
        size = 11,
        bold = false,
        color = rgb(0, 0, 0)
    ) {
        const f = bold ? fontBold : font;
        page.drawText(str, { x, y, size, font: f, color });
    }

    function rightText(
        str: string,
        x: number,
        y: number,
        size = 11,
        bold = false,
        color = rgb(0, 0, 0)
    ) {
        const f = bold ? fontBold : font;
        const w = f.widthOfTextAtSize(str, size);
        page.drawText(str, { x: x - w, y, size, font: f, color });
    }

    const companyName = company?.company_name ?? "Dream in Color Studios";
    const tradingName = company?.trading_name ? `(${company.trading_name})` : "";

    const companyLines = [
        tradingName || null,
        company?.reg_number ? `Reg No: ${company.reg_number}` : null,
    ].filter(Boolean) as string[];

    const footerLines = [
        company?.email ? `Email: ${company.email}` : null,
        company?.phone ? `Phone: ${company.phone}` : null,
    ].filter(Boolean) as string[];

    const topY = height - margin - 8;
    const logoX = margin;
    const logoTopY = topY;

    let logoWidth = 0;
    let logoHeight = 0;

    try {
        const logoPath = path.join(process.cwd(), "public", "logo.png");
        const logoBytes = await readFile(logoPath);
        const logoImage = await pdf.embedPng(logoBytes);

        const maxLogoWidth = 64;
        const maxLogoHeight = 64;

        const logoScale = Math.min(
            maxLogoWidth / logoImage.width,
            maxLogoHeight / logoImage.height
        );

        logoWidth = logoImage.width * logoScale;
        logoHeight = logoImage.height * logoScale;

        page.drawImage(logoImage, {
            x: logoX,
            y: logoTopY - logoHeight,
            width: logoWidth,
            height: logoHeight,
        });
    } catch {
        logoWidth = 0;
        logoHeight = 0;
    }

    const companyX = logoX;
    const companyNameY = topY - logoHeight - 26;

    drawText(companyName, companyX, companyNameY, 17, true, rgb(0.08, 0.08, 0.08));

    let companyInfoY = companyNameY - 22;
    for (const line of companyLines) {
        drawText(line, companyX, companyInfoY, 10, false, rgb(0.28, 0.28, 0.28));
        companyInfoY -= 16;
    }

    const titleRightX = width - margin;
    const titleY = topY - 6;
    const generatedAt = new Date().toLocaleString("en-ZA");

    rightText("PROJECT LIST", titleRightX, titleY, 18, true, rgb(0.08, 0.08, 0.08));
    rightText(generatedAt, titleRightX, titleY - 28, 11, true, rgb(0.08, 0.08, 0.08));

    const separatorY = Math.min(companyInfoY, titleY - 42) - 18;
    page.drawLine({
        start: { x: margin, y: separatorY },
        end: { x: width - margin, y: separatorY },
        thickness: 1,
        color: rgb(0.85, 0.85, 0.85),
    });

    page.drawText("CONFIDENTIAL", {
        x: 150,
        y: 390,
        size: 56,
        font: fontBold,
        color: rgb(0.92, 0.92, 0.92),
        rotate: degrees(45),
        opacity: 0.35,
    });

    const sectionTitleY = separatorY - 30;
    drawText("PROJECT LIST", margin, sectionTitleY, 11, true, rgb(0.08, 0.08, 0.08));
    drawText(monthLabelFromStartISO(selectedMonthStart), margin, sectionTitleY - 20, 10, false, rgb(0.28, 0.28, 0.28));

    const tableTopY = sectionTitleY - 52;
    const rowHeight = 22;

    const colProjectX = margin;
    const colClientX = 205;
    const colStatusX = 330;
    const colPriorityX = 410;
    const colDueX = 485;

    page.drawRectangle({
        x: margin,
        y: tableTopY - 4,
        width: width - margin * 2,
        height: 22,
        color: rgb(0.92, 0.94, 0.98),
    });

    drawText("Project", colProjectX + 6, tableTopY + 2, 10, true, rgb(0.18, 0.22, 0.32));
    drawText("Client", colClientX + 6, tableTopY + 2, 10, true, rgb(0.18, 0.22, 0.32));
    drawText("Status", colStatusX + 6, tableTopY + 2, 10, true, rgb(0.18, 0.22, 0.32));
    drawText("Priority", colPriorityX + 6, tableTopY + 2, 10, true, rgb(0.18, 0.22, 0.32));
    drawText("Due", colDueX + 6, tableTopY + 2, 10, true, rgb(0.18, 0.22, 0.32));

    let y = tableTopY - rowHeight;

    const maxRowsFirstPage = 22;
    const rows = projects.slice(0, maxRowsFirstPage);

    rows.forEach((project, index) => {
        if (index % 2 === 1) {
            page.drawRectangle({
                x: margin,
                y: y - 4,
                width: width - margin * 2,
                height: rowHeight,
                color: rgb(0.97, 0.98, 1),
            });
        }

        const titleText = project.title.length > 26 ? `${project.title.slice(0, 23)}...` : project.title;
        const clientText = (project.client_name ?? "—").length > 18
            ? `${(project.client_name ?? "—").slice(0, 15)}...`
            : (project.client_name ?? "—");

        drawText(titleText, colProjectX + 6, y + 3, 9, false, rgb(0.18, 0.18, 0.18));
        drawText(clientText, colClientX + 6, y + 3, 9, false, rgb(0.28, 0.28, 0.28));
        drawText(prettyStatus(project.status), colStatusX + 6, y + 3, 9, false, rgb(0.28, 0.28, 0.28));
        drawText(prettyPriority(project.priority), colPriorityX + 6, y + 3, 9, false, rgb(0.28, 0.28, 0.28));
        drawText(fmtDate(project.due_date), colDueX + 6, y + 3, 9, false, rgb(0.28, 0.28, 0.28));

        y -= rowHeight;
    });

    if (projects.length > maxRowsFirstPage) {
        drawText(
            `+ ${projects.length - maxRowsFirstPage} more project(s) not shown on this page`,
            margin,
            y - 6,
            9,
            false,
            rgb(0.45, 0.45, 0.45)
        );
    }

    const footerSeparatorY = 76;
    page.drawLine({
        start: { x: margin, y: footerSeparatorY },
        end: { x: width - margin, y: footerSeparatorY },
        thickness: 1,
        color: rgb(0.85, 0.85, 0.85),
    });

    const footerText = footerLines.join("   |   ");
    const footerFontSize = 10;
    const footerWidth = font.widthOfTextAtSize(footerText, footerFontSize);
    const footerX = (width - footerWidth) / 2;
    const footerY = footerSeparatorY - 40;

    page.drawText(footerText, {
        x: footerX,
        y: footerY,
        size: footerFontSize,
        font,
        color: rgb(0.28, 0.28, 0.28),
    });

    const pdfBytes = await pdf.save();
    const filename = `project-list-${selectedMonthStart}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}