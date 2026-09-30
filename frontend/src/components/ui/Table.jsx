export default function Table({ columns, rows, rowKey, empty }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            {columns.map((column) => (
              <th
                key={column.key}
                className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3.5 align-middle text-slate-700">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
