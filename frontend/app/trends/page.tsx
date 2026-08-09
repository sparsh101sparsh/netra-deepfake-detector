import React from 'react'

export default function ScamTrendsPage() {
  const trends = [
    { title: "Voice Cloning on WhatsApp", severity: "High", affected: "1.2M", description: "Scammers clone voices of family members requesting urgent UPI transfers." },
    { title: "Deepfake Investment Gurus", severity: "Critical", affected: "3.4M", description: "Fake videos of Elon Musk & Ratan Tata endorsing crypto scams." },
    { title: "Election Misinformation", severity: "High", affected: "5M+", description: "AI-generated speeches of politicians circulating in local languages." },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-4xl font-bold text-gradient mb-2">Recent Scam Trends</h1>
        <p className="text-slate-400 text-lg">Stay informed about the latest AI-driven deepfake and scam tactics circulating on WhatsApp and Telegram.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trends.map((trend, i) => (
          <div key={i} className="glass-card p-6 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-semibold text-white">{trend.title}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${trend.severity === 'Critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`}>
                {trend.severity}
              </span>
            </div>
            <p className="text-slate-300 flex-1">{trend.description}</p>
            <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center text-sm">
              <span className="text-slate-400">Estimated Reach:</span>
              <span className="font-mono text-blue-400">{trend.affected} Users</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="glass-panel p-8 mt-8">
        <h2 className="text-2xl font-bold mb-4">Report a New Trend</h2>
        <p className="text-slate-400 mb-6">Have you noticed a new type of deepfake or scam message? Submit it securely for our AI to analyze.</p>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors w-fit">
          Submit Evidence
        </button>
      </div>
    </div>
  )
}
