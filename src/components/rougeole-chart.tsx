"use client";

import { useMemo } from "react";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FRENCH_DEPARTMENTS } from "@/lib/constants";

const ROUGEOLE_COLOR = "hsl(0, 70%, 50%)";

interface RougeoleChartProps {
  department: string | null;
}

export function RougeoleChart({ department }: RougeoleChartProps) {
  const { data, isPending, isError } =
    trpc.rougeole.getIndicators.useQuery({
      department: department ?? undefined,
    });

  const departmentLabel = useMemo(() => {
    if (!department) return "France entière";
    const dept = FRENCH_DEPARTMENTS.find((d) => d.code === department);
    return dept ? `${dept.code} — ${dept.name}` : department;
  }, [department]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.map((d) => ({
      year: d.year,
      rate: d.notificationRate,
    }));
  }, [data]);

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Rougeole — Taux de notification (déclarations obligatoires)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Erreur lors du chargement des données rougeole.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Rougeole — Taux de notification (déclarations obligatoires)
        </CardTitle>
        <p className="text-muted-foreground text-xs">{departmentLabel}</p>
        <a
          href="https://www.santepubliquefrance.fr/maladies-et-traumatismes/maladies-a-prevention-vaccinale/rougeole"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
        >
          Voir le dernier bulletin rougeole&nbsp;→
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              label={{
                value: "/100 000 hab.",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 11 },
              }}
            />
            <Tooltip
              formatter={(value: number) => [
                value != null ? value.toFixed(2) : "—",
                "Taux de notification",
              ]}
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke={ROUGEOLE_COLOR}
              strokeWidth={2}
              dot
              name="Taux de notification"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
