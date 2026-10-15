export function Orb({ count }: { count: number }) {
  return (
    <span className="orb" aria-hidden="true">
      <span className="orb__count">{count}</span>
    </span>
  );
}
