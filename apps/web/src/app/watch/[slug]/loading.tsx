export default function WatchLoading() {
  return (
    <div className="bg-[#0b0c10] min-h-screen text-foreground pb-20 pt-20">
      <div className="container mx-auto px-4 lg:px-8 flex flex-col space-y-6 max-w-[1400px]">
        <div className="h-10 bg-white/5 shimmer rounded-xl w-64" />
        <div className="bg-black w-full aspect-video rounded-2xl bg-white/5 shimmer" />
        <div className="h-16 bg-white/5 shimmer rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 flex flex-col space-y-6">
            <div className="h-40 bg-white/5 shimmer rounded-2xl" />
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white/5 shimmer rounded-xl" />)}
            </div>
            <div className="grid grid-cols-6 gap-2">
              {[...Array(24)].map((_, i) => <div key={i} className="h-10 bg-white/5 shimmer rounded-xl" />)}
            </div>
          </div>
          <div className="lg:col-span-4 space-y-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-white/5 shimmer rounded-xl" />)}
          </div>
        </div>
      </div>
    </div>
  );
}
