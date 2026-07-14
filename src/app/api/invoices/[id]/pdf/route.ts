// FILE: src/app/api/invoices/[id]/pdf/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
    request: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    const { id } = await ctx.params;
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

    const { data: company, error: companyErr } = await supabase
        .from("company_profile")
        .select(
            "company_name,trading_name,email,phone,address,vat_number,reg_number,invoice_prefix,account_holder,bank_name,branch_code,account_number"
        )
        .maybeSingle();

    if (companyErr) {
        return NextResponse.json({ error: companyErr.message }, { status: 400 });
    }

    const { data: inv, error: invErr } = await supabase
        .from("invoices_search")
        .select("id,invoice_number,status,issue_date,due_date,subtotal,tax,total,notes,client_id,client_name,project_title")
        .eq("id", id)
        .maybeSingle();

    if (invErr) {
        return NextResponse.json({ error: invErr.message }, { status: 400 });
    }

    if (!inv) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const { data: client } = await supabase
        .from("clients")
        .select("email,phone,contact_person")
        .eq("id", inv.client_id)
        .maybeSingle();

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

    function money(n: any) {
        const v = Number(n ?? 0);
        return v.toLocaleString("en-ZA", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    const companyName = company?.company_name ?? "Dream in Color Studios";
    const tradingName = company?.trading_name ? `(${company.trading_name})` : "";

    const contactLines = [
        company?.email ? `Email: ${company.email}` : null,
        company?.phone ? `Phone: ${company.phone}` : null,
        company?.reg_number ? `Reg No: ${company.reg_number}` : null,
    ].filter(Boolean) as string[];

    // ========= HEADER =========
    const topY = height - margin - 8;

    // Left: logo + company
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

    if (tradingName) {
        drawText(tradingName, companyX, companyInfoY, 10, false, rgb(0.28, 0.28, 0.28));
        companyInfoY -= 16;
    }

    for (const line of contactLines) {
        drawText(line, companyX, companyInfoY, 10, false, rgb(0.28, 0.28, 0.28));
        companyInfoY -= 16;
    }

    // Right: invoice block aligned to same top line as logo
    const invoiceRightX = width - margin;
    const invoiceTitleY = topY - 6;

    rightText("INVOICE", invoiceRightX, invoiceTitleY, 18, true, rgb(0.08, 0.08, 0.08));
    rightText(inv.invoice_number, invoiceRightX, invoiceTitleY - 28, 11, true, rgb(0.08, 0.08, 0.08));

    // Bill To sits below invoice block, still ABOVE separator
    const billToTitleY = invoiceTitleY - 74;

    rightText("BILL TO", invoiceRightX, billToTitleY, 11, true, rgb(0.08, 0.08, 0.08));

    let billToY = billToTitleY - 22;

    rightText(inv.client_name ?? "—", invoiceRightX, billToY, 12, true, rgb(0.08, 0.08, 0.08));
    billToY -= 18;

    if (client?.contact_person) {
        rightText(`Attn: ${client.contact_person}`, invoiceRightX, billToY, 10, false, rgb(0.28, 0.28, 0.28));
        billToY -= 16;
    }

    if (client?.email) {
        rightText(`Email: ${client.email}`, invoiceRightX, billToY, 10, false, rgb(0.28, 0.28, 0.28));
        billToY -= 16;
    }

    if (client?.phone) {
        rightText(`Phone: ${client.phone}`, invoiceRightX, billToY, 10, false, rgb(0.28, 0.28, 0.28));
        billToY -= 16;
    }

    // Separator goes BELOW bill to and company info
    const separatorY = Math.min(companyInfoY, billToY) - 18;

    page.drawLine({
        start: { x: margin, y: separatorY },
        end: { x: width - margin, y: separatorY },
        thickness: 1,
        color: rgb(0.85, 0.85, 0.85),
    });

    // Left middle: project details
    const projectTitleY = separatorY - 30;

    drawText("PROJECT DETAILS", margin, projectTitleY, 11, true, rgb(0.08, 0.08, 0.08));
    drawText(inv.project_title ?? "—", margin, projectTitleY - 20, 10, false, rgb(0.28, 0.28, 0.28));

    // Bank details section
    const bankTitleY = projectTitleY - 400;
    drawText("BANK DETAILS", margin, bankTitleY, 11, true, rgb(0.08, 0.08, 0.08));

    let bankY = bankTitleY - 20;

    if (company?.account_holder) {
        drawText(`Account Holder: ${company.account_holder}`, margin, bankY, 10, false, rgb(0.28, 0.28, 0.28));
        bankY -= 16;
    }

    if (company?.bank_name) {
        drawText(`Bank Name: ${company.bank_name}`, margin, bankY, 10, false, rgb(0.28, 0.28, 0.28));
        bankY -= 16;
    }

    if (company?.branch_code) {
        drawText(`Branch Code: ${company.branch_code}`, margin, bankY, 10, false, rgb(0.28, 0.28, 0.28));
        bankY -= 16;
    }

    if (company?.account_number) {
        drawText(`Account Number: ${company.account_number}`, margin, bankY, 10, false, rgb(0.28, 0.28, 0.28));
        bankY -= 16;
    }

    // Bottom right: totals
    const totalsLabelX = width - margin - 140;
    const totalsValueRightX = width - margin;
    let totalsY = 165;

    drawText("Subtotal", totalsLabelX, totalsY, 10, false, rgb(0.28, 0.28, 0.28));
    rightText(`R ${money(inv.subtotal)}`, totalsValueRightX, totalsY, 10, false, rgb(0.08, 0.08, 0.08));

    totalsY -= 20;
    drawText("Tax", totalsLabelX, totalsY, 10, false, rgb(0.28, 0.28, 0.28));
    rightText(`R ${money(inv.tax)}`, totalsValueRightX, totalsY, 10, false, rgb(0.08, 0.08, 0.08));

    totalsY -= 34;
    drawText("Total", totalsLabelX, totalsY, 12, true, rgb(0.08, 0.08, 0.08));
    rightText(`R ${money(inv.total)}`, totalsValueRightX, totalsY, 12, true, rgb(0.08, 0.08, 0.08));

    // Bottom left: notes
    const notesTitleY = 60;

    drawText("NOTES", margin, notesTitleY, 11, true, rgb(0.08, 0.08, 0.08));

    const notes = (inv.notes ?? "").trim();
    const notesText = notes ? notes : "—";

    drawWrappedText(
        page,
        notesText,
        margin,
        notesTitleY - 20,
        260,
        10,
        font
    );

    const pdfBytes = await pdf.save();
    const filename = `${inv.invoice_number}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}

function drawWrappedText(
    page: any,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    size: number,
    font: any
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
                color: rgb(0.25, 0.25, 0.25),
            });
            yy -= size + 6;
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
            color: rgb(0.25, 0.25, 0.25),
        });
    }
}