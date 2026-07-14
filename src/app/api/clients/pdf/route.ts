import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";

type ClientPdfRow = {
    id: string;
    name: string;
    contact_person: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    created_at: string;
};

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

    const q = (request.nextUrl.searchParams.get("q") ?? "").trim();

    const { data: company, error: companyErr } = await supabase
        .from("company_profile")
        .select(
            "company_name,trading_name,email,phone,address,vat_number,reg_number,invoice_prefix,account_holder,bank_name,branch_code,account_number"
        )
        .maybeSingle();

    if (companyErr) {
        return NextResponse.json({ error: companyErr.message }, { status: 400 });
    }

    let query = supabase
        .from("clients")
        .select("id,name,contact_person,email,phone,status,created_at")
        .order("created_at", { ascending: false });

    if (q) {
        const like = `%${q}%`;
        query = query.or(
            `name.ilike.${like},contact_person.ilike.${like},email.ilike.${like},phone.ilike.${like}`
        );
    }

    const { data: clientsData, error: clientsErr } = await query;

    if (clientsErr) {
        return NextResponse.json({ error: clientsErr.message }, { status: 400 });
    }

    const clients = (clientsData ?? []) as ClientPdfRow[];

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28; // A4 width
    const pageHeight = 841.89; // A4 height
    const margin = 48;
    const footerHeightReserve = 72;

    const companyName = company?.company_name ?? "Dream in Color Studios";
    const tradingName = company?.trading_name ? `(${company.trading_name})` : "";
    const companyEmail = company?.email ?? "";
    const companyPhone = company?.phone ?? "";
    const generatedAt = new Date().toLocaleString("en-ZA");

    const contactLines = [
        tradingName || null,
        company?.reg_number ? `Reg No: ${company.reg_number}` : null,
    ].filter(Boolean) as string[];

    function addPage() {
        return pdf.addPage([pageWidth, pageHeight]);
    }

    function drawText(
        page: any,
        str: string,
        x: number,
        y: number,
        size = 11,
        bold = false,
        color = rgb(0, 0, 0)
    ) {
        const activeFont = bold ? fontBold : font;
        page.drawText(str, { x, y, size, font: activeFont, color });
    }

    function centerText(
        page: any,
        str: string,
        centerX: number,
        y: number,
        size = 11,
        bold = false,
        color = rgb(0, 0, 0)
    ) {
        const activeFont = bold ? fontBold : font;
        const textWidth = activeFont.widthOfTextAtSize(str, size);
        page.drawText(str, {
            x: centerX - textWidth / 2,
            y,
            size,
            font: activeFont,
            color,
        });
    }

    function rightText(
        page: any,
        str: string,
        x: number,
        y: number,
        size = 11,
        bold = false,
        color = rgb(0, 0, 0)
    ) {
        const activeFont = bold ? fontBold : font;
        const w = activeFont.widthOfTextAtSize(str, size);
        page.drawText(str, { x: x - w, y, size, font: activeFont, color });
    }

    function fitText(str: string, maxWidth: number, size: number, bold = false) {
        const activeFont = bold ? fontBold : font;
        if (activeFont.widthOfTextAtSize(str, size) <= maxWidth) return str;

        let out = str;
        while (out.length > 1 && activeFont.widthOfTextAtSize(`${out}…`, size) > maxWidth) {
            out = out.slice(0, -1);
        }
        return `${out}…`;
    }

    function drawWatermark(page: any) {
        const watermark = "CONFIDENTIAL";
        const size = 64;
        const textWidth = fontBold.widthOfTextAtSize(watermark, size);

        page.drawText(watermark, {
            x: pageWidth / 2 - textWidth / 2,
            y: pageHeight / 2 - 20,
            size,
            font: fontBold,
            color: rgb(0.88, 0.88, 0.9),
            rotate: degrees(45),
            opacity: 0.18,
        });
    }

    async function drawHeader(page: any) {
        const topY = pageHeight - margin - 8;

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

        drawText(page, companyName, companyX, companyNameY, 17, true, rgb(0.08, 0.08, 0.08));

        let companyInfoY = companyNameY - 22;
        for (const line of contactLines) {
            drawText(page, line, companyX, companyInfoY, 10, false, rgb(0.28, 0.28, 0.28));
            companyInfoY -= 16;
        }

        const rightX = pageWidth - margin;
        const titleY = topY - 6;

        rightText(page, "CLIENT LIST", rightX, titleY, 18, true, rgb(0.08, 0.08, 0.08));
        rightText(page, generatedAt, rightX, titleY - 28, 11, true, rgb(0.08, 0.08, 0.08));

        const separatorY = Math.min(companyInfoY, titleY - 44) - 18;

        page.drawLine({
            start: { x: margin, y: separatorY },
            end: { x: pageWidth - margin, y: separatorY },
            thickness: 1,
            color: rgb(0.85, 0.85, 0.85),
        });

        drawText(page, "CLIENT LIST", margin, separatorY - 30, 11, true, rgb(0.08, 0.08, 0.08));

        return separatorY - 58;
    }

    function drawFooter(page: any) {
        const separatorY = 54;

        page.drawLine({
            start: { x: margin, y: separatorY },
            end: { x: pageWidth - margin, y: separatorY },
            thickness: 1,
            color: rgb(0.85, 0.85, 0.85),
        });

        const footerTextParts = [
            companyEmail ? `Email: ${companyEmail}` : null,
            companyPhone ? `Phone: ${companyPhone}` : null,
        ].filter(Boolean) as string[];

        const footerText = footerTextParts.length ? footerTextParts.join("   |   ") : "Dream in Color Studios";

        centerText(page, footerText, pageWidth / 2, 34, 10, false, rgb(0.32, 0.32, 0.32));
    }

    function drawTableHeader(page: any, y: number) {
        const tableX = margin;
        const tableWidth = pageWidth - margin * 2;
        const rowHeight = 22;

        const colWidths = [140, 115, 140, 80, 72];
        const headers = ["Name", "Contact", "Email", "Phone", "Status"];

        page.drawRectangle({
            x: tableX,
            y: y - rowHeight + 4,
            width: tableWidth,
            height: rowHeight,
            color: rgb(0.92, 0.92, 0.95),
        });

        let currentX = tableX;
        headers.forEach((header, index) => {
            drawText(page, header, currentX + 6, y - 11, 9, true, rgb(0.15, 0.15, 0.2));
            currentX += colWidths[index];
        });

        return y - rowHeight;
    }

    function drawRow(page: any, row: ClientPdfRow, y: number, index: number) {
        const tableX = margin;
        const rowHeight = 22;
        const colWidths = [140, 115, 140, 80, 72];

        if (index % 2 === 1) {
            page.drawRectangle({
                x: tableX,
                y: y - rowHeight + 4,
                width: pageWidth - margin * 2,
                height: rowHeight,
                color: rgb(0.975, 0.98, 0.99),
            });
        }

        const values = [
            row.name ?? "—",
            row.contact_person ?? "—",
            row.email ?? "—",
            row.phone ?? "—",
            row.status ?? "—",
        ];

        let currentX = tableX;

        values.forEach((value, index2) => {
            const text = fitText(String(value), colWidths[index2] - 12, 8.5, false);
            drawText(page, text, currentX + 6, y - 11, 8.5, false, rgb(0.25, 0.25, 0.25));
            currentX += colWidths[index2];
        });

        page.drawLine({
            start: { x: tableX, y: y - rowHeight + 4 },
            end: { x: pageWidth - margin, y: y - rowHeight + 4 },
            thickness: 0.6,
            color: rgb(0.9, 0.9, 0.92),
        });

        return y - rowHeight;
    }

    let page = addPage();
    drawWatermark(page);
    drawFooter(page);
    let cursorY = await drawHeader(page);

    cursorY = drawTableHeader(page, cursorY);

    clients.forEach((client, index) => {
        if (cursorY < footerHeightReserve + 32) {
            page = addPage();
            drawWatermark(page);
            drawFooter(page);
            cursorY = pageHeight - margin;
            cursorY = drawTableHeader(page, cursorY);
        }

        cursorY = drawRow(page, client, cursorY, index);
    });

    if (clients.length === 0) {
        drawText(page, "No clients found.", margin, cursorY - 8, 10, false, rgb(0.35, 0.35, 0.35));
    }

    const pdfBytes = await pdf.save();
    const filename = `client-list-${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}