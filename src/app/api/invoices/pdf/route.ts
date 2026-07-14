import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";

type InvoicePdfRow = {
    id: string;
    invoice_number: string;
    client_name: string | null;
    project_title: string | null;
    status: string | null;
    issue_date: string | null;
    due_date: string | null;
    total: number | null;
};

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function monthStartISOFromParam(month?: string | null) {
    const m = String(month ?? "").trim();
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

function normalizeStatus(status: string | null | undefined) {
    return String(status ?? "").trim().toLowerCase();
}

function prettyStatus(status: string | null | undefined) {
    const s = normalizeStatus(status);
    if (s === "draft") return "Draft";
    if (s === "sent") return "Sent";
    if (s === "paid") return "Paid";
    if (s === "overdue") return "Overdue";
    if (s === "cancelled") return "Cancelled";
    return status || "—";
}

function fmtDate(d: string | null | undefined) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
}

function money(v: any) {
    const n = Number(v ?? 0);
    return n.toLocaleString("en-ZA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function drawWrappedText(
    page: any,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    size: number,
    font: any,
    color = rgb(0.25, 0.25, 0.25),
    lineGap = 6
) {
    const words = text.split(/\s+/);
    let line = "";
    let yy = y;

    for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        const width = font.widthOfTextAtSize(test, size);

        if (width > maxWidth && line) {
            page.drawText(line, {
                x,
                y: yy,
                size,
                font,
                color,
            });
            yy -= size + lineGap;
            line = w;
        } else {
            line = test;
        }
    }

    if (line) {
        page.drawText(line, {
            x,
            y: yy,
            size,
            font,
            color,
        });
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

    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const statusFilter = (url.searchParams.get("status") ?? "").trim();
    const overdueOnly = url.searchParams.get("overdue") === "1";
    const clientId = (url.searchParams.get("client") ?? "").trim();

    const now = new Date();
    const currentMonthStart = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-01`;
    const selectedMonthStart = monthStartISOFromParam(url.searchParams.get("month")) ?? currentMonthStart;
    const nextMonthStart = addMonthsStartISO(selectedMonthStart, 1);
    const todayIso = new Date().toISOString().slice(0, 10);

    const { data: company, error: companyErr } = await supabase
        .from("company_profile")
        .select("company_name,trading_name,email,phone,reg_number")
        .maybeSingle();

    if (companyErr) {
        return NextResponse.json({ error: companyErr.message }, { status: 400 });
    }

    let invQuery = supabase
        .from("invoices_search")
        .select("id,invoice_number,client_name,project_title,status,issue_date,due_date,total")
        .order("due_date", { ascending: false });

    if (clientId) invQuery = invQuery.eq("client_id", clientId);
    if (statusFilter && statusFilter !== "all") invQuery = invQuery.eq("status", statusFilter);

    if (q) {
        const like = `%${q}%`;
        invQuery = invQuery.or(`invoice_number.ilike.${like},client_name.ilike.${like}`);
    }

    invQuery = invQuery.gte("due_date", selectedMonthStart).lt("due_date", nextMonthStart);

    if (overdueOnly) {
        invQuery = invQuery
            .neq("status", "paid")
            .neq("status", "cancelled")
            .lt("due_date", todayIso);
    }

    const { data, error } = await invQuery;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const invoices = (data ?? []) as InvoicePdfRow[];

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]); // A4

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
    const generatedAt = new Date().toLocaleString("en-ZA");
    const docTitle = "INVOICE LIST";

    const contactLines = [
        tradingName || null,
        company?.reg_number ? `Reg No: ${company.reg_number}` : null,
    ].filter(Boolean) as string[];

    const topY = height - margin - 8;

    page.drawText("CONFIDENTIAL", {
        x: width / 2 - 165,
        y: height / 2,
        size: 52,
        font: fontBold,
        color: rgb(0.92, 0.92, 0.92),
        rotate: degrees(35),
        opacity: 0.18,
    });

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
    for (const line of contactLines) {
        drawText(line, companyX, companyInfoY, 10, false, rgb(0.28, 0.28, 0.28));
        companyInfoY -= 16;
    }

    const titleRightX = width - margin;
    const titleY = topY - 6;

    rightText(docTitle, titleRightX, titleY, 18, true, rgb(0.08, 0.08, 0.08));
    rightText(generatedAt, titleRightX, titleY - 28, 11, true, rgb(0.08, 0.08, 0.08));
    rightText(monthLabelFromStartISO(selectedMonthStart), titleRightX, titleY - 48, 10, false, rgb(0.35, 0.35, 0.35));

    const separatorY = Math.min(companyInfoY, titleY - 62) - 18;

    page.drawLine({
        start: { x: margin, y: separatorY },
        end: { x: width - margin, y: separatorY },
        thickness: 1,
        color: rgb(0.85, 0.85, 0.85),
    });

    const listTitleY = separatorY - 30;
    drawText("INVOICE LIST", margin, listTitleY, 11, true, rgb(0.08, 0.08, 0.08));

    const tableTopY = listTitleY - 28;
    const tableX = margin;
    const tableWidth = width - margin * 2;
    const headerHeight = 22;
    const rowHeight = 20;

    const colWidths = [95, 120, 110, 70, 62, 78];
    const columns = ["Invoice #", "Client", "Project", "Status", "Due", "Total"];

    page.drawRectangle({
        x: tableX,
        y: tableTopY - headerHeight,
        width: tableWidth,
        height: headerHeight,
        color: rgb(0.92, 0.94, 0.97),
    });

    let runningX = tableX + 6;
    columns.forEach((col, i) => {
        drawText(col, runningX, tableTopY - 15, 9, true, rgb(0.20, 0.24, 0.31));
        runningX += colWidths[i];
    });

    let y = tableTopY - headerHeight - 8;

    invoices.slice(0, 24).forEach((inv, index) => {
        const rowYBottom = y - rowHeight + 6;

        if (index % 2 === 1) {
            page.drawRectangle({
                x: tableX,
                y: rowYBottom - 2,
                width: tableWidth,
                height: rowHeight,
                color: rgb(0.97, 0.98, 0.99),
            });
        }

        let x = tableX + 6;

        const cells = [
            inv.invoice_number ?? "—",
            inv.client_name ?? "—",
            inv.project_title ?? "—",
            prettyStatus(inv.status),
            fmtDate(inv.due_date),
            `R ${money(inv.total)}`,
        ];

        cells.forEach((cell, i) => {
            const maxWidth = colWidths[i] - 8;
            const clipped =
                font.widthOfTextAtSize(cell, 8.5) > maxWidth
                    ? `${cell.slice(0, Math.max(0, Math.floor(cell.length * 0.7)))}...`
                    : cell;

            drawText(clipped, x, y - 8, 8.5, false, rgb(0.22, 0.22, 0.22));
            x += colWidths[i];
        });

        y -= rowHeight;
    });

    const infoY = y - 16;
    drawText(`Total records in this export: ${invoices.length}`, margin, infoY, 10, false, rgb(0.35, 0.35, 0.35));

    const footerLineY = 68;
    page.drawLine({
        start: { x: margin, y: footerLineY },
        end: { x: width - margin, y: footerLineY },
        thickness: 1,
        color: rgb(0.85, 0.85, 0.85),
    });

    const footerText = [
        company?.email ? `Email: ${company.email}` : null,
        company?.phone ? `Phone: ${company.phone}` : null,
    ]
        .filter(Boolean)
        .join("   |   ");

    if (footerText) {
        const footerWidth = font.widthOfTextAtSize(footerText, 10);
        drawText(
            footerText,
            (width - footerWidth) / 2,
            44,
            10,
            false,
            rgb(0.38, 0.38, 0.38)
        );
    }

    const pdfBytes = await pdf.save();
    const filename = `invoice-list-${selectedMonthStart}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}