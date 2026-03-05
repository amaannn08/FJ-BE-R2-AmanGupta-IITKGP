const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function getGeminiModel({ model = "gemini-2.0-flash", systemInstruction } = {}) {
  const modelParams = { model };
  if (systemInstruction) {
    modelParams.systemInstruction = systemInstruction;
  }
  return genAI.getGenerativeModel(modelParams);
}

module.exports = {
  getGeminiModel,
};
