import { NextResponse } from "next/server";

const BASE = "https://www.institutoi10.com.br/better-financeiro";

async function fetchJS(file: string): Promise<string> {
  const res = await fetch(`${BASE}/${file}`, { next: { revalidate: 3600 } });
  return res.text();
}

function parseJSVar(js: string, varName: string): unknown {
  const regex = new RegExp(`var ${varName}\\s*=\\s*`);
  const cleaned = js.replace(regex, "").replace(/;\s*$/, "");
  return JSON.parse(cleaned);
}

interface Despesa {
  data: string;
  mes: string;
  ano: string;
  fornecedor: string;
  categoria: string;
  valor_pago: number;
  situacao: string;
  fonte?: string;
}

interface BmaEntry {
  data: string;
  mes: string;
  ano: string;
  fornecedor: string;
  categoria: string;
  valor_pago: number;
  situacao: string;
  fonte?: string;
}

const MESES_2026 = [
  "Jan/2026", "Fev/2026", "Mar/2026", "Abr/2026", "Mai/2026",
  "Jun/2026", "Jul/2026", "Ago/2026", "Set/2026", "Out/2026", "Nov/2026", "Dez/2026",
];

export async function GET() {
  try {
    const [despesasJS, bmaJS, dashJS] = await Promise.all([
      fetchJS("despesas_all_data.js"),
      fetchJS("bma_data.js"),
      fetchJS("dashboard_data.js"),
    ]);

    const betterData = parseJSVar(despesasJS, "data") as Despesa[];
    const bmaAll = parseJSVar(
      bmaJS.split("var bmaAll = ")[1]?.split(";\n")[0] || "[]",
      ""
    ) as BmaEntry[];

    let bmaAllParsed: BmaEntry[];
    try {
      const bmaAllRaw = bmaJS.split("var bmaAll = ")[1];
      if (bmaAllRaw) {
        const jsonStr = bmaAllRaw.replace(/;\s*(var\s|$)[\s\S]*/, "");
        bmaAllParsed = JSON.parse(jsonStr);
      } else {
        bmaAllParsed = [];
      }
    } catch {
      bmaAllParsed = [];
    }

    const all2026: Despesa[] = [];

    betterData
      .filter((d) => d.mes && MESES_2026.some((m) => d.mes === m))
      .forEach((d) => all2026.push({ ...d, fonte: d.fonte || "Better" }));

    bmaAllParsed
      .filter((d) => d.mes && MESES_2026.some((m) => d.mes === m))
      .forEach((d) => {
        const isDup = all2026.some(
          (x) =>
            x.fornecedor === d.fornecedor &&
            x.mes === d.mes &&
            Math.abs(x.valor_pago - d.valor_pago) < 0.01 &&
            x.categoria === d.categoria
        );
        if (!isDup) {
          all2026.push({ ...d, fonte: "BMA" });
        }
      });

    const activeMeses = MESES_2026.filter((m) =>
      all2026.some((d) => d.mes === m)
    );

    const byFornecedor: Record<
      string,
      { meses: Record<string, number>; total: number }
    > = {};

    all2026.forEach((d) => {
      const key = d.fornecedor.toUpperCase().trim();
      if (!byFornecedor[key]) {
        byFornecedor[key] = { meses: {}, total: 0 };
        activeMeses.forEach((m) => (byFornecedor[key].meses[m] = 0));
      }
      byFornecedor[key].meses[d.mes] =
        (byFornecedor[key].meses[d.mes] || 0) + d.valor_pago;
      byFornecedor[key].total += d.valor_pago;
    });

    const sorted = Object.entries(byFornecedor)
      .map(([nome, data]) => ({ nome, ...data }))
      .sort((a, b) => b.total - a.total);

    const dashData = parseJSVar(dashJS, "dashData") as Array<{
      m: string;
      rec: number;
      desp: number;
      res: number;
      pend: number;
      bma_desp: number;
    }>;

    const resumoMensal = dashData
      .filter((d) => MESES_2026.some((m) => d.m === m))
      .map((d) => ({
        mes: d.m,
        receita: d.rec,
        despesa: d.desp,
        resultado: d.res,
        inadimplencia: d.pend,
        bma: d.bma_desp,
      }));

    return NextResponse.json({
      ok: true,
      atualizado: new Date().toISOString(),
      mesesAtivos: activeMeses,
      fornecedores: sorted,
      resumoMensal,
      totais: {
        totalGeral: sorted.reduce((s, f) => s + f.total, 0),
        totalFornecedores: sorted.length,
        totalRegistros: all2026.length,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
