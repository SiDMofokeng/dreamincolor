// FILE: src/app/api/reports/pdf/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function pad2(n: number) {
    return String(n).padStart(2, "0");
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

function isoToUtcStart(d: string) {
    return `${d}T00:00:00.000Z`;
}

function isPaidStatus(s: any) {
    return String(s ?? "").trim().toLowerCase() === "paid";
}

function money(v: any) {
    const n = Number(v ?? 0);
    return n.toLocaleString("en-ZA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const monthParam = (url.searchParams.get("month") ?? "").trim();
    const mode = (url.searchParams.get("mode") ?? "month").trim().toLowerCase();

    const monthStart = /^\d{4}-\d{2}$/.test(monthParam) ? `${monthParam}-01` : null;
    if (!monthStart) {
        return NextResponse.json(
            { error: "Missing or invalid month. Use ?month=YYYY-MM" },
            { status: 400 }
        );
    }

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

    const nextMonthStart = addMonthsStartISO(monthStart, 1);
    const { y: selectedYear } = parseMonthStart(monthStart);
    const yearStart = `${selectedYear}-01-01`;

    const invFrom = mode === "ytd" ? yearStart : monthStart;
    const createdFrom = mode === "ytd" ? yearStart : monthStart;

    const { data: periodRow } = await supabase
        .from("reporting_periods")
        .select("status,generated_at")
        .eq("period_start", monthStart)
        .maybeSingle();

    const periodStatus = (periodRow?.status ?? "open") as "open" | "closed";

    const [{ data: invRows }, { data: projRows }, { data: leadRows }] = await Promise.all([
        supabase
            .from("invoices")
            .select("id,status,total,due_date")
            .gte("due_date", invFrom)
            .lt("due_date", nextMonthStart)
            .neq("status", "cancelled"),

        supabase
            .from("projects")
            .select("id,created_at,completed_at")
            .lt("created_at", isoToUtcStart(nextMonthStart)),

        supabase
            .from("leads")
            .select("id,created_at,closed_at,status")
            .lt("created_at", isoToUtcStart(nextMonthStart)),
    ]);

    const invoices = (invRows ?? []) as { status: string; total: number }[];
    const invoiceCount = invoices.length;
    const invoiceTotal = invoices.reduce((s, r) => s + Number(r.total ?? 0), 0);
    const paidCount = invoices.filter((i) => isPaidStatus(i.status)).length;
    const paidTotal = invoices
        .filter((i) => isPaidStatus(i.status))
        .reduce((s, r) => s + Number(r.total ?? 0), 0);
    const unpaidCount = invoices.filter((i) => !isPaidStatus(i.status)).length;
    const unpaidTotal = invoices
        .filter((i) => !isPaidStatus(i.status))
        .reduce((s, r) => s + Number(r.total ?? 0), 0);

    const projects = (projRows ?? []) as {
        created_at: string;
        completed_at: string | null;
    }[];

    const projectsOpened =
        mode === "ytd"
            ? projects.filter(
                (p) =>
                    p.created_at >= isoToUtcStart(yearStart) &&
                    p.created_at < isoToUtcStart(nextMonthStart)
            ).length
            : projects.filter(
                (p) =>
                    p.created_at >= isoToUtcStart(monthStart) &&
                    p.created_at < isoToUtcStart(nextMonthStart)
            ).length;

    const projectsCompleted =
        mode === "ytd"
            ? projects.filter(
                (p) =>
                    !!p.completed_at &&
                    p.completed_at >= isoToUtcStart(yearStart) &&
                    p.completed_at < isoToUtcStart(nextMonthStart)
            ).length
            : projects.filter(
                (p) =>
                    !!p.completed_at &&
                    p.completed_at >= isoToUtcStart(monthStart) &&
                    p.completed_at < isoToUtcStart(nextMonthStart)
            ).length;

    const projectsActive = projects.filter((p) => {
        const createdBeforeRangeEnd = p.created_at < isoToUtcStart(nextMonthStart);
        const notCompletedBeforeRangeStart =
            !p.completed_at ||
            p.completed_at >= isoToUtcStart(mode === "ytd" ? yearStart : monthStart);
        return createdBeforeRangeEnd && notCompletedBeforeRangeStart;
    }).length;

    const leads = (leadRows ?? []) as {
        created_at: string;
        closed_at: string | null;
        status: string;
    }[];

    const leadsReceived =
        mode === "ytd"
            ? leads.filter(
                (l) =>
                    l.created_at >= isoToUtcStart(yearStart) &&
                    l.created_at < isoToUtcStart(nextMonthStart)
            ).length
            : leads.filter(
                (l) =>
                    l.created_at >= isoToUtcStart(monthStart) &&
                    l.created_at < isoToUtcStart(nextMonthStart)
            ).length;

    const leadsClosed =
        mode === "ytd"
            ? leads.filter(
                (l) =>
                    !!l.closed_at &&
                    l.closed_at >= isoToUtcStart(yearStart) &&
                    l.closed_at < isoToUtcStart(nextMonthStart)
            ).length
            : leads.filter(
                (l) =>
                    !!l.closed_at &&
                    l.closed_at >= isoToUtcStart(monthStart) &&
                    l.closed_at < isoToUtcStart(nextMonthStart)
            ).length;

    const leadsActive = leads.filter((l) => {
        const createdBeforeRangeEnd = l.created_at < isoToUtcStart(nextMonthStart);
        const notClosedBeforeRangeStart =
            !l.closed_at ||
            l.closed_at >= isoToUtcStart(mode === "ytd" ? yearStart : monthStart);
        return createdBeforeRangeEnd && notClosedBeforeRangeStart;
    }).length;

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const margin = 48;
    const width = page.getWidth();
    let y = page.getHeight() - margin;

    function drawText(
        text: string,
        size = 11,
        isBold = false,
        color = rgb(0, 0, 0),
        x = margin
    ) {
        page.drawText(text, {
            x,
            y,
            size,
            font: isBold ? bold : font,
            color,
        });
        y -= size + 6;
    }

    function drawLine() {
        y -= 6;
        page.drawLine({
            start: { x: margin, y },
            end: { x: width - margin, y },
            thickness: 1,
            color: rgb(0.85, 0.85, 0.85),
        });
        y -= 14;
    }

    const monthLabel = monthLabelFromStartISO(monthStart);

    drawText("Dream in Color Studios", 16, true);

    if (mode === "ytd") {
        drawText("Year-to-date (YTD) Report", 13, true, rgb(0.2, 0.2, 0.2));
        drawText(`Period: 01 Jan ${selectedYear} → end of ${monthLabel}`, 11, false, rgb(0.25, 0.25, 0.25));
    } else {
        drawText("Monthly Report", 13, true, rgb(0.2, 0.2, 0.2));
        drawText(`Period: ${monthLabel}`, 11, false, rgb(0.25, 0.25, 0.25));
        drawText(
            `Status: ${periodStatus}${periodRow?.generated_at
                ? ` • Generated: ${new Date(periodRow.generated_at).toLocaleString("en-ZA")}`
                : ""
            }`,
            10,
            false,
            rgb(0.35, 0.35, 0.35)
        );
    }

    drawLine();

    drawText("Invoices", 12, true);
    drawText(
        `Rule: due date within ${mode === "ytd" ? "YTD range" : "month"} (excluding cancelled)`,
        9,
        false,
        rgb(0.35, 0.35, 0.35)
    );
    drawText(`Count: ${invoiceCount}`, 10);
    drawText(`Total: R ${money(invoiceTotal)}`, 10);
    drawText(`Paid: ${paidCount} • R ${money(paidTotal)}`, 10);
    drawText(`Unpaid: ${unpaidCount} • R ${money(unpaidTotal)}`, 10);

    drawLine();

    drawText("Projects", 12, true);
    drawText(
        `Rule: active during ${mode === "ytd" ? "YTD range" : "month"}`,
        9,
        false,
        rgb(0.35, 0.35, 0.35)
    );
    drawText(`Opened: ${projectsOpened}`, 10);
    drawText(`Active during ${mode === "ytd" ? "period" : "month"}: ${projectsActive}`, 10);
    drawText(`Completed: ${projectsCompleted}`, 10);

    drawLine();

    drawText("Leads", 12, true);
    drawText(
        `Rule: active during ${mode === "ytd" ? "YTD range" : "month"}`,
        9,
        false,
        rgb(0.35, 0.35, 0.35)
    );
    drawText(`Received: ${leadsReceived}`, 10);
    drawText(`Active during ${mode === "ytd" ? "period" : "month"}: ${leadsActive}`, 10);
    drawText(`Closed: ${leadsClosed}`, 10);

    const pdfBytes = await pdf.save();

    const filename =
        mode === "ytd"
            ? `DIC-YTD-${selectedYear}-to-${monthParam}.pdf`
            : `DIC-Report-${monthParam}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}