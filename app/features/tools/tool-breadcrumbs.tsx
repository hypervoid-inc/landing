import { Link } from "react-router";

const crumbLink = "transition-colors hover:text-[#01b4c8]";

export function Breadcrumbs({
  current,
  parent,
}: {
  current: string;
  parent?: { label: string; to: string };
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-[13px] leading-5 text-[#8a9aa2]"
    >
      <ol className="flex flex-wrap items-center gap-2">
        {[{ label: "Home", to: "/" }, ...(parent ? [parent] : [])].map(
          (crumb) => (
            <li key={crumb.to} className="flex items-center gap-2">
              <Link to={crumb.to} className={crumbLink}>
                {crumb.label}
              </Link>
              <span aria-hidden>/</span>
            </li>
          ),
        )}
        <li aria-current="page">{current}</li>
      </ol>
    </nav>
  );
}
