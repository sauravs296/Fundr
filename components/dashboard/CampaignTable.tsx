import Link from "next/link";

interface CampaignRow {
  id: string;
  title: string;
  status: string;
  raised: string;
  goal: string;
}

interface CampaignTableProps {
  rows: CampaignRow[];
}

export function CampaignTable({ rows }: CampaignTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] bg-[var(--surface-soft)]">
            <th className="px-4 py-3 font-semibold">Campaign</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Raised</th>
            <th className="px-4 py-3 font-semibold">Goal</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[var(--line)] last:border-none">
              <td className="px-4 py-3">{row.title}</td>
              <td className="px-4 py-3">{row.status}</td>
              <td className="px-4 py-3">{row.raised}</td>
              <td className="px-4 py-3">{row.goal}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/fundraising/manage/${row.id}`}
                  className="text-sm font-semibold text-[var(--brand)] transition hover:underline"
                >
                  Manage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
