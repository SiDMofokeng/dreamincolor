// FILE: src/app/(admin)/admin/settings/page.tsx
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Mail, MapPin, Phone, Settings2 } from "lucide-react";
import SettingsSubmitButton from "@/components/admin/settings-submit-button";

type Profile = {
    id: string;
    company_name: string;
    trading_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    vat_number: string | null;
    reg_number: string | null;
    invoice_prefix: string;
    account_holder: string | null;
    bank_name: string | null;
    branch_code: string | null;
    account_number: string | null;
};

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) redirect("/login");

    const { data: profile } = await supabase
        .from("company_profile")
        .select(
            "id,company_name,trading_name,email,phone,address,vat_number,reg_number,invoice_prefix,account_holder,bank_name,branch_code,account_number"
        )
        .maybeSingle();

    async function saveProfileAction(formData: FormData) {
        "use server";

        const supabase = await createClient();

        const { data: existing } = await supabase
            .from("company_profile")
            .select("id")
            .maybeSingle();

        const company_name = String(formData.get("company_name") ?? "").trim();
        const trading_name = String(formData.get("trading_name") ?? "").trim() || null;
        const email = String(formData.get("email") ?? "").trim() || null;
        const phone = String(formData.get("phone") ?? "").trim() || null;
        const address = String(formData.get("address") ?? "").trim() || null;
        const vat_number = String(formData.get("vat_number") ?? "").trim() || null;
        const reg_number = String(formData.get("reg_number") ?? "").trim() || null;
        const invoice_prefix = String(formData.get("invoice_prefix") ?? "DIC").trim() || "DIC";
        const account_holder = String(formData.get("account_holder") ?? "").trim() || null;
        const bank_name = String(formData.get("bank_name") ?? "").trim() || null;
        const branch_code = String(formData.get("branch_code") ?? "").trim() || null;
        const account_number = String(formData.get("account_number") ?? "").trim() || null;

        if (!company_name) return { ok: false, message: "Company name is required." };

        if (existing?.id) {
            const { error } = await supabase
                .from("company_profile")
                .update({
                    company_name,
                    trading_name,
                    email,
                    phone,
                    address,
                    vat_number,
                    reg_number,
                    invoice_prefix,
                    account_holder,
                    bank_name,
                    branch_code,
                    account_number,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", existing.id);

            if (error) return { ok: false, message: error.message };
        } else {
            const { error } = await supabase.from("company_profile").insert({
                company_name,
                trading_name,
                email,
                phone,
                address,
                vat_number,
                reg_number,
                invoice_prefix,
                account_holder,
                bank_name,
                branch_code,
                account_number,
            });

            if (error) return { ok: false, message: error.message };
        }

        revalidatePath("/admin/settings");
        return { ok: true as const };
    }

    const p = (profile ?? null) as Profile | null;

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-white shadow-2xl backdrop-blur-xl">
                <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500/90 to-blue-600/90 px-3 py-1 text-xs font-medium text-white shadow-lg shadow-cyan-500/20">
                        <Settings2 className="h-3.5 w-3.5" />
                        Company settings
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
                    <p className="mt-1 text-sm text-white/65">
                        Company details used on invoices and templates.
                    </p>
                </div>
            </div>

            <Card className="border-0 bg-white shadow-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-cyan-600" />
                        Company Profile
                    </CardTitle>
                    <CardDescription>Fill this once — we’ll use it everywhere.</CardDescription>
                </CardHeader>

                <CardContent>
                    <form
    action={async (formData: FormData) => {
        "use server";
        await saveProfileAction(formData);
    }}
    className="space-y-4"
>
                        <div className="space-y-2">
                            <Label htmlFor="company_name">Company Name</Label>
                            <Input
                                id="company_name"
                                name="company_name"
                                defaultValue={p?.company_name ?? "Dream in Color Studios"}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="trading_name">Trading Name (optional)</Label>
                            <Input
                                id="trading_name"
                                name="trading_name"
                                defaultValue={p?.trading_name ?? ""}
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-cyan-600" />
                                    Email
                                </Label>
                                <Input id="email" name="email" type="email" defaultValue={p?.email ?? ""} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-fuchsia-600" />
                                    Phone
                                </Label>
                                <Input id="phone" name="phone" defaultValue={p?.phone ?? ""} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address" className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-violet-600" />
                                Address
                            </Label>
                            <Textarea id="address" name="address" defaultValue={p?.address ?? ""} rows={3} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="reg_number">Reg Number</Label>
                                <Input id="reg_number" name="reg_number" defaultValue={p?.reg_number ?? ""} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="vat_number">VAT Number</Label>
                                <Input id="vat_number" name="vat_number" defaultValue={p?.vat_number ?? ""} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="invoice_prefix">Invoice Prefix</Label>
                                <Input
                                    id="invoice_prefix"
                                    name="invoice_prefix"
                                    defaultValue={p?.invoice_prefix ?? "DIC"}
                                />
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                                <Building2 className="h-4 w-4 text-cyan-600" />
                                Banking Details
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="account_holder">Account Holder</Label>
                                    <Input
                                        id="account_holder"
                                        name="account_holder"
                                        defaultValue={p?.account_holder ?? ""}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="bank_name">Bank Name</Label>
                                    <Input
                                        id="bank_name"
                                        name="bank_name"
                                        defaultValue={p?.bank_name ?? ""}
                                    />
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="branch_code">Branch Code</Label>
                                    <Input
                                        id="branch_code"
                                        name="branch_code"
                                        defaultValue={p?.branch_code ?? ""}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="account_number">Account Number</Label>
                                    <Input
                                        id="account_number"
                                        name="account_number"
                                        defaultValue={p?.account_number ?? ""}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <SettingsSubmitButton />
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}