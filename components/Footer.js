export default function Footer() {
  return (
    <footer className="mt-24 border-t border-[#E7DDD6] bg-[#F9F6F0]">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="font-heading font-bold text-[16px] text-[#2C1E21]">CraftChain</div>
          <p className="text-[13px] text-[#6E5A5E] mt-1 max-w-md">Every piece you buy comes with an on-chain certificate. Verifiable on Ethereum Sepolia. Made by artisans across India.</p>
        </div>
        <div className="text-[12px] text-[#6E5A5E]">
          <div>Contract: <span className="hash-mono">0x3435...9e76</span></div>
          <div className="mt-1">© 2025 CraftChain. Heritage, verified.</div>
        </div>
      </div>
    </footer>
  )
}
