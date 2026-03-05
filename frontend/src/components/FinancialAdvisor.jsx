import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { analyzeTransactions } from '../api/analysis';

export default function FinancialAdvisor() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeTransactions();
      if (result && result.analysis) {
        setAnalysis(result.analysis);
      } else {
        setAnalysis("No analysis could be generated.");
      }
    } catch (err) {
      setError(err.message || "Failed to analyze finances.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      if (!analysis && !loading) {
        fetchAnalysis();
      }
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 sm:p-6">
        <button 
          onClick={handleToggle}
          className="w-full flex items-center justify-between focus:outline-none group"
        >
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span>✨ AI Financial Advisor</span>
          </div>
          <div className="flex items-center gap-2">
            {isOpen ? (
               <span className="text-sm text-slate-500 font-medium">Close</span>
            ) : (
               <span className="text-sm text-emerald-600 font-medium group-hover:text-emerald-700">
                 {analysis ? 'Show Analysis' : 'Get Analysis'}
               </span>
            )}
             <svg 
               className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
               fill="none" 
               stroke="currentColor" 
               viewBox="0 0 24 24"
             >
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
             </svg>
          </div>
        </button>

        {isOpen && (
          <div className="mt-4 pt-4 border-t border-slate-100 animate-fade-in">
             {loading ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                  <svg className="animate-spin h-8 w-8 text-emerald-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p>Analyzing your transaction history...</p>
                </div>
             ) : error ? (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">
                  {error}
                  <button 
                    onClick={fetchAnalysis}
                    className="ml-2 underline hover:text-red-700"
                  >
                    Try Again
                  </button>
                </div>
             ) : (
               <div className="prose prose-slate prose-sm max-w-none">
                 <ReactMarkdown>{analysis}</ReactMarkdown>
                 <div className="mt-4 flex justify-end">
                    <button 
                      onClick={fetchAnalysis}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      Refresh Analysis
                    </button>
                 </div>
               </div>
             )}
          </div>
        )}
      </div>
    </section>
  );
}
