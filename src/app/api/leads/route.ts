// FILE: src/app/api/leads/route.ts

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
}

function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const name = String(body?.name ?? "").trim();
        const email = String(body?.email ?? "").trim().toLowerCase();
        const phone = String(body?.phone ?? "").trim() || null;
        const message = String(body?.message ?? "").trim();
        const source = String(body?.source ?? "landing").trim();

        if (!name || !email || !message) {
            return NextResponse.json(
                {
                    ok: false,
                    message: "Name, email and message are required.",
                },
                { status: 400 }
            );
        }

        const validEmail =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
            email.length <= 254;

        if (!validEmail) {
            return NextResponse.json(
                {
                    ok: false,
                    message: "Please enter a valid email address.",
                },
                { status: 400 }
            );
        }

        if (name.length > 150) {
            return NextResponse.json(
                {
                    ok: false,
                    message: "The supplied name is too long.",
                },
                { status: 400 }
            );
        }

        if (message.length > 5000) {
            return NextResponse.json(
                {
                    ok: false,
                    message: "The message is too long.",
                },
                { status: 400 }
            );
        }

        const supabase = getSupabase();

        /*
         * First save the lead in Supabase.
         * This means the enquiry is not lost if email delivery later fails.
         */
        const { error: databaseError } = await supabase.from("leads").insert({
            name,
            email,
            phone,
            message,
            source,
        });

        if (databaseError) {
            console.error("Lead database error:", databaseError);

            return NextResponse.json(
                {
                    ok: false,
                    message: databaseError.message,
                },
                { status: 400 }
            );
        }

        const resendApiKey = process.env.RESEND_API_KEY;
        const recipientEmail = process.env.CONTACT_TO_EMAIL;
        const senderEmail = process.env.RESEND_FROM_EMAIL;

        if (!resendApiKey || !recipientEmail || !senderEmail) {
            console.error(
                "The lead was saved, but email environment variables are missing."
            );

            return NextResponse.json({
                ok: true,
                emailSent: false,
                message:
                    "Your request was received, but the email notification could not be sent.",
            });
        }

        const resend = new Resend(resendApiKey);

        const safeName = escapeHtml(name);
        const safeEmail = escapeHtml(email);
        const safePhone = escapeHtml(phone ?? "Not supplied");
        const safeMessage = escapeHtml(message).replaceAll("\n", "<br />");
        const safeSource = escapeHtml(source);

        const submittedAt = new Date().toLocaleString("en-ZA", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: "Africa/Johannesburg",
        });

        const { error: emailError } = await resend.emails.send({
            from: senderEmail,
            to: recipientEmail,
            replyTo: email,
            subject: `New website enquiry from ${name}`,
            html: `
                <!doctype html>
                <html lang="en">
                    <head>
                        <meta charset="utf-8" />
                        <meta
                            name="viewport"
                            content="width=device-width, initial-scale=1"
                        />
                    </head>

                    <body
                        style="
                            margin: 0;
                            padding: 0;
                            background: #f4f4f7;
                            font-family: Arial, Helvetica, sans-serif;
                            color: #16161d;
                        "
                    >
                        <div style="padding: 32px 16px;">
                            <div
                                style="
                                    max-width: 640px;
                                    margin: 0 auto;
                                    overflow: hidden;
                                    border: 1px solid #e5e7eb;
                                    border-radius: 18px;
                                    background: #ffffff;
                                "
                            >
                                <div
                                    style="
                                        padding: 26px 30px;
                                        background:
                                            linear-gradient(
                                                135deg,
                                                #d946ef,
                                                #9333ea
                                            );
                                        color: #ffffff;
                                    "
                                >
                                    <div
                                        style="
                                            margin-bottom: 6px;
                                            font-size: 13px;
                                            opacity: 0.85;
                                        "
                                    >
                                        Dream in Color Studios
                                    </div>

                                    <h1
                                        style="
                                            margin: 0;
                                            font-size: 24px;
                                            line-height: 1.3;
                                        "
                                    >
                                        New website enquiry
                                    </h1>
                                </div>

                                <div style="padding: 30px;">
                                    <p
                                        style="
                                            margin: 0 0 24px;
                                            color: #6b7280;
                                            font-size: 14px;
                                            line-height: 1.6;
                                        "
                                    >
                                        Someone submitted the Start a Project
                                        form on your website.
                                    </p>

                                    <table
                                        role="presentation"
                                        style="
                                            width: 100%;
                                            border-collapse: collapse;
                                            font-size: 14px;
                                        "
                                    >
                                        <tr>
                                            <td
                                                style="
                                                    width: 125px;
                                                    padding: 10px 0;
                                                    color: #6b7280;
                                                    vertical-align: top;
                                                "
                                            >
                                                Name
                                            </td>

                                            <td
                                                style="
                                                    padding: 10px 0;
                                                    font-weight: 600;
                                                    vertical-align: top;
                                                "
                                            >
                                                ${safeName}
                                            </td>
                                        </tr>

                                        <tr>
                                            <td
                                                style="
                                                    padding: 10px 0;
                                                    color: #6b7280;
                                                    vertical-align: top;
                                                "
                                            >
                                                Email
                                            </td>

                                            <td
                                                style="
                                                    padding: 10px 0;
                                                    vertical-align: top;
                                                "
                                            >
                                                <a
                                                    href="mailto:${safeEmail}"
                                                    style="
                                                        color: #7e22ce;
                                                        text-decoration: none;
                                                    "
                                                >
                                                    ${safeEmail}
                                                </a>
                                            </td>
                                        </tr>

                                        <tr>
                                            <td
                                                style="
                                                    padding: 10px 0;
                                                    color: #6b7280;
                                                    vertical-align: top;
                                                "
                                            >
                                                Phone
                                            </td>

                                            <td
                                                style="
                                                    padding: 10px 0;
                                                    vertical-align: top;
                                                "
                                            >
                                                ${safePhone}
                                            </td>
                                        </tr>

                                        <tr>
                                            <td
                                                style="
                                                    padding: 10px 0;
                                                    color: #6b7280;
                                                    vertical-align: top;
                                                "
                                            >
                                                Source
                                            </td>

                                            <td
                                                style="
                                                    padding: 10px 0;
                                                    vertical-align: top;
                                                "
                                            >
                                                ${safeSource}
                                            </td>
                                        </tr>

                                        <tr>
                                            <td
                                                style="
                                                    padding: 10px 0;
                                                    color: #6b7280;
                                                    vertical-align: top;
                                                "
                                            >
                                                Submitted
                                            </td>

                                            <td
                                                style="
                                                    padding: 10px 0;
                                                    vertical-align: top;
                                                "
                                            >
                                                ${submittedAt}
                                            </td>
                                        </tr>
                                    </table>

                                    <div
                                        style="
                                            margin-top: 24px;
                                            border-radius: 12px;
                                            background: #f7f4fb;
                                            padding: 20px;
                                        "
                                    >
                                        <div
                                            style="
                                                margin-bottom: 10px;
                                                color: #6b7280;
                                                font-size: 12px;
                                                font-weight: 700;
                                                text-transform: uppercase;
                                                letter-spacing: 0.08em;
                                            "
                                        >
                                            Project request
                                        </div>

                                        <div
                                            style="
                                                font-size: 15px;
                                                line-height: 1.7;
                                            "
                                        >
                                            ${safeMessage}
                                        </div>
                                    </div>

                                    <div style="margin-top: 26px;">
                                        <a
                                            href="mailto:${safeEmail}"
                                            style="
                                                display: inline-block;
                                                border-radius: 9px;
                                                background: #9333ea;
                                                padding: 12px 18px;
                                                color: #ffffff;
                                                font-size: 14px;
                                                font-weight: 700;
                                                text-decoration: none;
                                            "
                                        >
                                            Reply to ${safeName}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </body>
                </html>
            `,
            text: `
New website enquiry

Name: ${name}
Email: ${email}
Phone: ${phone ?? "Not supplied"}
Source: ${source}
Submitted: ${submittedAt}

Project request:
${message}
            `.trim(),
        });

        if (emailError) {
            console.error(
                "The lead was saved, but Resend could not send the email:",
                emailError
            );

            return NextResponse.json({
                ok: true,
                emailSent: false,
                message:
                    "Your request was received, but the email notification could not be sent.",
            });
        }

        return NextResponse.json({
            ok: true,
            emailSent: true,
            message: "Your request was sent successfully.",
        });
    } catch (error) {
        console.error("Lead submission error:", error);

        return NextResponse.json(
            {
                ok: false,
                message: "Invalid request.",
            },
            { status: 400 }
        );
    }
}