const { getGeminiModel } = require('../config/gemini');
const transactionModel = require('../models/transaction.model');

async function analyzeTransactions(req, res, next) {
  let transactionSummary = '';
  
  try {
    const userId = req.user && req.user.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);

    const transactions = await transactionModel.getTransactionsByUser({
      user_id: userId,
      fromDate: startDate.toISOString().split('T')[0],
      toDate: endDate.toISOString().split('T')[0],
    });

    if (!transactions || transactions.length === 0) {
      return res.json({
        success: true,
        data: { analysis: "You don't have enough transaction history for analysis yet. Add some income and expenses to get started!" },
      });
    }

    transactionSummary = transactions.map(t => 
      `- ${t.transaction_date}: ${t.type} of ${t.currency_code} ${t.amount} for "${t.description || 'Uncategorized'}" (Category: ${t.category_id})`
    ).join('\n');


    const model = getGeminiModel({
      model: "gemini-2.0-flash", 
      systemInstruction: "You are a helpful financial advisor. Analyze transaction history to identify spending patterns, potential savings, and provide actionable advice. Always respond in Markdown format."
    });

    const prompt = `
      Here is the user's transaction history for the last 3 months:
      ${transactionSummary}

      Please provide a detailed analysis focusing on:
      1. Spending Habits Analysis
      2. Areas for Cost Reduction
      3. Budgeting Recommendations
      4. Positive Reinforcement (what they are doing well)

      Use headers, bullet points, and bold text for readability.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.json({ success: true, data: { analysis: text } });

  } catch (err) {
    console.error("Error in AI analysis:", err);
    
    if (err.message?.includes('404') || err.message?.includes('not found')) {
      try {
        console.log("Falling back to gemini-2.0-flash-lite due to 404 on flash...");

        if (!transactionSummary) {
           throw new Error("Transaction summary not available for fallback.");
        }

        const fallbackModel = getGeminiModel({ model: "gemini-2.0-flash-lite" }); // Fallback to lite model
        const fallbackPrompt = `
          You are a helpful financial advisor. Analyze the following transaction history for the user. 
          Identify spending patterns, potential savings, and provide actionable advice on how to better manage their finances.
          
          Transaction History (Last 3 months):
          ${transactionSummary}

          Please provide your response in Markdown format. Use headers, bullet points, and bold text for readability.
          Focus on:
          1. Spending Habits Analysis
          2. Areas for Cost Reduction
          3. Budgeting Recommendations
          4. Positive Reinforcement (what they are doing well)
        `;
        const fallbackResult = await fallbackModel.generateContent(fallbackPrompt);
        const fallbackResponse = await fallbackResult.response;
        return res.json({ success: true, data: { analysis: fallbackResponse.text() } });
      } catch (fallbackErr) {
         console.error("Error in fallback AI analysis:", fallbackErr);
         return res.status(500).json({ success: false, message: `AI analysis failed: ${fallbackErr.message}` });
      }
    }

    if (err.message?.includes('API key') || err.message?.includes('403')) {
        return res.status(500).json({ success: false, message: 'AI service configuration error. Please check API key.' });
    }
    return res.status(500).json({ success: false, message: `AI analysis failed: ${err.message}` });
  }
}

module.exports = {
  analyzeTransactions,
};
