import type { ComparisonRow } from "../../content/comparisons";

function shortName(name: string): string {
  return name.split(" (")[0]?.split(",")[0]?.trim() ?? name;
}

export function ComparisonTable({
  competitor,
  rows,
}: {
  competitor: string;
  rows: readonly ComparisonRow[];
}) {
  return (
    <div
      className="overflow-x-auto"
      role="region"
      aria-label={`Feature comparison between ${competitor} and Construct`}
      tabIndex={0}
    >
      <table className="w-full min-w-[480px] border-collapse text-[14px]">
        <caption className="sr-only">
          Feature comparison between {competitor} and Construct
        </caption>
        <thead>
          <tr className="border-b border-[#e5e7eb]">
            <th scope="col" className="py-3 pr-4 text-left">
              Feature
            </th>
            <th scope="col" className="px-4 py-3 text-left">
              {shortName(competitor)}
            </th>
            <th scope="col" className="py-3 pl-4 text-left text-[#01b4c8]">
              Construct
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.feature} className="border-b border-[#f0f2f3]">
              <th
                scope="row"
                className="py-3 pr-4 text-left font-medium text-[#4e4646]"
              >
                {row.feature}
              </th>
              <td className="px-4 py-3 align-top">{row.competitor}</td>
              <td className="py-3 pl-4 align-top">{row.construct}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WhenToChoose({
  competitor,
  construct,
  competitorReasons,
}: {
  competitor: string;
  construct: readonly string[];
  competitorReasons: readonly string[];
}) {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <Choice title="Choose Construct when" items={construct} accent />
      <Choice
        title={`Choose ${shortName(competitor)} when`}
        items={competitorReasons}
      />
    </div>
  );
}

function Choice({
  title,
  items,
  accent = false,
}: {
  title: string;
  items: readonly string[];
  accent?: boolean;
}) {
  return (
    <div>
      <h3
        className={`mb-3 text-[13px] font-semibold uppercase tracking-[0.1em] ${accent ? "text-[#01b4c8]" : "text-[#4e4646]"}`}
      >
        {title}
      </h3>
      <ul className="list-disc space-y-2 pl-5 marker:text-[#cfd7db]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
