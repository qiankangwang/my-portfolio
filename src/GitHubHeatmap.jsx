import { useState, useEffect, useRef } from "react";

const API = "https://github-contributions-api.deno.dev/xiaole5211314.json";
const COLOR_LEVELS = 5;
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function cellColor(level, theme) {
  if (level === 0) return theme === "dark" ? "#161b22" : "#ebedf0";
  const greens = theme === "dark"
    ? ["#0e4429","#006d32","#26a641","#39d353"]
    : ["#9be9a8","#40c463","#30a14e","#216e39"];
  return greens[Math.min(level - 1, 3)];
}

function buildWeeks(contributions) {
  if (!contributions || !contributions.length) return { weeks: [], months: [] };

  const byDate = {};
  contributions.forEach((c) => { byDate[c.date] = c.level || (c.count > 0 ? Math.min(4, Math.ceil(c.count / 3)) : 0); });

  // Find date range
  const sorted = contributions.map((c) => c.date).sort();
  const endDate = new Date(sorted[sorted.length - 1]);
  const startDate = new Date(sorted[0]);

  // Align start to Sunday
  const start = new Date(startDate);
  start.setDate(start.getDate() - start.getDay());

  // Align end to Saturday
  const end = new Date(endDate);
  end.setDate(end.getDate() + (6 - end.getDay()));

  const weeks = [];
  const monthMarkers = [];
  let current = new Date(start);
  let lastMonth = -1;

  while (current <= end) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const ds = current.toISOString().slice(0, 10);
      const level = byDate[ds] || 0;
      week.push({ date: ds, level });
      // Track month start positions
      const month = current.getMonth();
      if (month !== lastMonth && d === 0) {
        monthMarkers.push({ week: weeks.length, label: MONTH_NAMES[month] });
        lastMonth = month;
      }
      current.setDate(current.getDate() + 1);
    }
    if (week.some((d) => d.level > 0 || byDate[d.date] !== undefined)) {
      weeks.push(week);
    } else if (weeks.length > 0) {
      weeks.push(week);
    }
  }

  // If no weeks yet, just push everything
  if (weeks.length === 0) {
    current = new Date(start);
    while (current <= end) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const ds = current.toISOString().slice(0, 10);
        week.push({ date: ds, level: byDate[ds] || 0 });
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
    }
  }

  return { weeks, months: monthMarkers };
}

export default function GitHubHeatmap({ theme }) {
  const [contributions, setContributions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hoveredCell, setHoveredCell] = useState(null);
  const containerRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch(API)
      .then((r) => { if (!r.ok) throw new Error("fetch failed"); return r.json(); })
      .then((data) => {
        if (cancelled) return;
        setContributions(Array.isArray(data) ? data : (data.contributions || []));
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) { setError(true); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <article className="heatmap-card">
        <div className="heatmap-header">
          <h3>GitHub Activity</h3>
        </div>
        <div className="heatmap-loading">Loading contributions...</div>
      </article>
    );
  }

  if (error || !contributions) {
    return null;
  }

  const { weeks, months } = buildWeeks(contributions);
  const totalContributions = contributions.reduce((s, c) => s + (c.count || 0), 0);

  return (
    <article className="heatmap-card" ref={containerRef}>
      <div className="heatmap-header">
        <h3>GitHub Activity</h3>
        <span className="heatmap-total">
          {totalContributions.toLocaleString()} contributions in the last year
        </span>
      </div>

      <div className="heatmap-scroll" ref={scrollRef}>
        <div className="heatmap-grid-wrapper">
          {/* Month labels */}
          <div className="heatmap-months">
            <div className="heatmap-day-spacer" />
            <div className="heatmap-month-row">
              {months.map((m, i) => (
                <span
                  key={m.label}
                  className="heatmap-month-label"
                  style={{ gridColumnStart: m.week + 1 }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          <div className="heatmap-body">
            {/* Day labels */}
            <div className="heatmap-days">
              {DAY_LABELS.map((label, i) => (
                <span key={i} className="heatmap-day-label">{label}</span>
              ))}
            </div>

            {/* Cell grid */}
            <div
              className="heatmap-grid"
              style={{ "--cols": weeks.length }}
              onMouseLeave={() => setHoveredCell(null)}
            >
              {weeks.map((week, wi) =>
                week.map((day, di) => (
                  <div
                    key={`${wi}-${di}`}
                    className={"heatmap-cell" + (day.level > 0 ? " has-contrib" : "")}
                    style={{ background: cellColor(day.level, theme) }}
                    data-date={day.date}
                    data-level={day.level}
                    onMouseEnter={() => setHoveredCell(day)}
                  >
                    <span className="cell-tooltip">
                      {day.level > 0 ? `${day.level} contribution${day.level > 1 ? "s" : ""}` : "No contributions"} on {day.date}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="heatmap-legend">
        <span className="legend-label">Less</span>
        {Array.from({ length: COLOR_LEVELS }, (_, i) => (
          <div
            key={i}
            className="legend-cell"
            style={{ background: cellColor(i, theme) }}
          />
        ))}
        <span className="legend-label">More</span>
      </div>

      {hoveredCell && (
        <div className="heatmap-tooltip">
          <strong>{hoveredCell.level} contribution{hoveredCell.level !== 1 ? "s" : ""}</strong>
          {" "}on {hoveredCell.date}
        </div>
      )}
    </article>
  );
}
