// FILE: src/components/admin/reports-trend-charts.tsx
"use client";

import {
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type TrendRow = {
    month: string;
    invoice_total: number;
    paid_total: number;
    leads_received: number;
    projects_opened: number;
    projects_completed: number;
};

type Props = {
    data: TrendRow[];
};

function money(v: any) {
    const n = Number(v ?? 0);
    return `R ${n.toLocaleString("en-ZA", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })}`;
}

export default function ReportsTrendCharts({ data }: Props) {
    return (
        <div className="grid gap-4 lg:grid-cols-3">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Invoice trend</CardTitle>
                    <CardDescription>Total vs paid</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[260px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="month" />
                                <YAxis tickFormatter={money} />
                                <Tooltip formatter={(value: any) => money(value)} />
                                <Legend />
                                <Line type="monotone" dataKey="invoice_total" name="Invoice total" stroke="#111827" strokeWidth={2} />
                                <Line type="monotone" dataKey="paid_total" name="Paid total" stroke="#6b7280" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Lead trend</CardTitle>
                    <CardDescription>Received per month</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[260px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="leads_received" name="Leads received" stroke="#111827" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Project flow</CardTitle>
                    <CardDescription>Opened vs completed</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[260px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="projects_opened" name="Projects opened" stroke="#111827" strokeWidth={2} />
                                <Line type="monotone" dataKey="projects_completed" name="Projects completed" stroke="#6b7280" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}