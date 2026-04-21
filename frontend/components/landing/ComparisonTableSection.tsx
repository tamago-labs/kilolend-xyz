 
const features = [
  {
    category: "Core Lending",
    items: [
      { name: "Supply & Earn Interest", aave: true, compound: true, kilolend: true },
      { name: "Borrow Against Collateral", aave: true, compound: true, kilolend: true },
      { name: "Dynamic Interest Rates", aave: true, compound: true, kilolend: true },
    ],
  },
  {
    category: "Risk Model",
    items: [
      { name: "Shared Liquidity Pools", aave: true, compound: true, kilolend: false },
      { name: "Isolated Markets (Per Vault)", aave: false, compound: false, kilolend: true },
      { name: "Cascading Liquidation Risk", aave: true, compound: true, kilolend: false },
    ],
  },
  {
    category: "Capital Efficiency",
    items: [
      { name: "Permissionless Market Creation", aave: false, compound: false, kilolend: true },
      { name: "AI-Curated Liquidity", aave: false, compound: false, kilolend: true },
      { name: "Adaptive Yield Optimization", aave: false, compound: false, kilolend: true },
    ],
  },
];

function CheckMark() {
  return (
    <span className="text-[#06C755] text-xl font-bold">✓</span>
  );
}

function CrossMark() {
  return (
    <span className="text-[#cbd5e1] text-xl">—</span>
  );
}

export const ComparisonTableSection = () => {
  return (
    <section className="px-8 py-20 bg-white border-b border-[#e2e8f0]">
      <div className="max-w-[1000px] mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-[32px] font-bold text-[#1e293b] mb-4">
            Why KiloLend?
          </h2>
          <p className="text-[18px] text-[#475569] max-w-[700px] mx-auto">
            The new KiloLend replaces shared pools with isolated markets, , designed to remove systemic risk and enable AI-driven capital allocation
          </p>
        </div>

        {/* Comparison Table */}
        <div className="rounded-2xl border border-[#e2e8f0] overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_100px_100px_100px] bg-[#f8fafc] border-b border-[#e2e8f0]">
            <div className="p-4 text-sm font-bold text-[#1e293b]">Feature</div>
            <div className="p-4 text-sm font-bold text-[#64748b] text-center">Aave</div>
            <div className="p-4 text-sm font-bold text-[#64748b] text-center">Compound</div>
            <div className="p-4 text-sm font-bold text-[#06C755] text-center flex items-center justify-center gap-2">
              KiloLend
            </div>
          </div>

          {/* Table Body */}
          {features.map((feature) => (
            <div key={feature.category}>
              {/* Category Header */}
              <div className="bg-[#f1f5f9] px-4 py-3 border-b border-[#e2e8f0]">
                <span className="text-sm font-bold text-[#475569]">
                  {feature.category}
                </span>
              </div>
              {/* Feature Rows */}
              {feature.items.map((item) => (
                <div
                  key={item.name}
                  className="grid grid-cols-[1fr_100px_100px_100px] border-b border-[#e2e8f0] last:border-b-0 hover:bg-[#f8fafc] transition-colors"
                >
                  <div className="p-4 text-sm text-[#475569]">{item.name}</div>
                  <div className="p-4 flex items-center justify-center">
                    {item.aave ? <CheckMark /> : <CrossMark />}
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    {item.compound ? <CheckMark /> : <CrossMark />}
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    {item.kilolend ? (
                      <span className="text-[#06C755] text-xl font-bold">✓</span>
                    ) : (
                      <span className="text-[#cbd5e1] text-xl">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};