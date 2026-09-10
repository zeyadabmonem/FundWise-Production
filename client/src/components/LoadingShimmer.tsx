export function LoadingShimmer() {
  return (
    <div className="animate-pulse flex flex-col gap-4 p-4 w-full">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted"></div>
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-3 bg-muted rounded w-1/4"></div>
          </div>
          <div className="w-16 h-4 bg-muted rounded"></div>
        </div>
      ))}
    </div>
  );
}
