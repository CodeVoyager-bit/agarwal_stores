/** Label/value rows for the policy pages; a blank value is left out (owners fill them in on /admin/shop). */
export function Rows({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="legal-rows">
      {rows
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}
