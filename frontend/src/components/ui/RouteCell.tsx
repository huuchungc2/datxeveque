import { formatRouteCell, type RouteLike } from "../../lib/routeDisplay";

export function RouteCell({
  route,
  fallback = "—",
  className = "",
}: {
  route?: RouteLike | null;
  fallback?: string;
  className?: string;
}) {
  const { primary, secondary } = formatRouteCell(route, fallback);
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="font-medium leading-snug text-ink-900 line-clamp-2">{primary}</p>
      {secondary ? <p className="mt-0.5 text-xs leading-snug text-slate-500 line-clamp-1">{secondary}</p> : null}
    </div>
  );
}
