import React from 'react'

export default function RecentlyReportedPage() {
  const reports = [
    { id: "REP-9021", date: "2 hours ago", type: "Video Deepfake", source: "WhatsApp", status: "Verified Fake", confidence: "98%" },
    { id: "REP-9020", date: "5 hours ago", type: "Phishing Message", source: "Telegram", status: "Scam", confidence: "95%" },
    { id: "REP-9019", date: "1 day ago", type: "Audio Clone", source: "Phone Call", status: "Verified Fake", confidence: "92%" },
    { id: "REP-9018", date: "2 days ago", type: "Video Manipulation", source: "Twitter", status: "Authentic", confidence: "85%" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-4xl font-bold text-gradient mb-2">Recently Reported</h1>
        <p className="text-slate-400 text-lg">Public archive of user-submitted media and messages analyzed by NETRA.</p>
      </div>
      
      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 border-b border-slate-700">
              <th className="p-4 font-semibold text-slate-300">Report ID</th>
              <th className="p-4 font-semibold text-slate-300">Date</th>
              <th className="p-4 font-semibold text-slate-300">Type</th>
              <th className="p-4 font-semibold text-slate-300">Source</th>
              <th className="p-4 font-semibold text-slate-300">Verdict</th>
              <th className="p-4 font-semibold text-slate-300">Confidence</th>
              <th className="p-4 font-semibold text-slate-300">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {reports.map((report) => (
              <tr key={report.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="p-4 font-mono text-sm text-slate-400">{report.id}</td>
                <td className="p-4 text-slate-300">{report.date}</td>
                <td className="p-4 text-slate-300">{report.type}</td>
                <td className="p-4 text-slate-300">{report.source}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    report.status.includes('Fake') || report.status === 'Scam' 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {report.status}
                  </span>
                </td>
                <td className="p-4 text-slate-300">{report.confidence}</td>
                <td className="p-4">
                  <button className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
                    View Report
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
