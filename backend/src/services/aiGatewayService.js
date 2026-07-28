const axios = require('axios');

const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8000';

class AiGatewayService {
  /**
   * Phase 24: DL Ticket Classification
   */
  static async predictCategory(text) {
    try {
      const response = await axios.post(`${AI_MICROSERVICE_URL}/predict/category`, { text });
      return response.data;
    } catch (error) {
      console.error('AI Gateway Error (Category):', error.message);
      return null;
    }
  }

  /**
   * Phase 25: ML Priority Prediction
   */
  static async predictPriority(ticketContext) {
    try {
      const response = await axios.post(`${AI_MICROSERVICE_URL}/predict/priority`, ticketContext);
      return response.data;
    } catch (error) {
      console.error('AI Gateway Error (Priority):', error.message);
      return null;
    }
  }

  /**
   * Phase 26: AI Engineer Recommendation
   */
  static async recommendEngineer(routingPayload) {
    try {
      const response = await axios.post(`${AI_MICROSERVICE_URL}/recommend/engineer`, routingPayload);
      return response.data;
    } catch (error) {
      console.error('AI Gateway Error (Engineer):', error.message);
      return null;
    }
  }

  /**
   * Phase 28: Semantic Search
   */
  static async semanticSearch(query, top_k = 5) {
    try {
      const response = await axios.post(`${AI_MICROSERVICE_URL}/search/semantic`, { query, top_k });
      return response.data;
    } catch (error) {
      console.error('AI Gateway Error (Semantic Search):', error.message);
      return null;
    }
  }

  /**
   * Phase 29: Enterprise RAG
   */
  static async ragGenerate(query, context = null) {
    try {
      const response = await axios.post(`${AI_MICROSERVICE_URL}/rag/generate`, { query, context });
      return response.data;
    } catch (error) {
      console.error('AI Gateway Error (RAG):', error.message);
      return null;
    }
  }

  /**
   * Phase 31: OCR + Document AI
   */
  static async extractOcr(fileBuffer, filename) {
    try {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', fileBuffer, filename);
      
      const response = await axios.post(`${AI_MICROSERVICE_URL}/ocr/extract`, form, {
        headers: form.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('AI Gateway Error (OCR):', error.message);
      return null;
    }
  }

  /**
   * Phase 32: Predictive Analytics
   */
  static async getForecast() {
    try {
      const response = await axios.get(`${AI_MICROSERVICE_URL}/analytics/forecast`);
      return response.data;
    } catch (error) {
      console.error('AI Gateway Error (Forecast):', error.message);
      return null;
    }
  }

  /**
   * Phase 33: Root Cause Analysis
   */
  static async analyzeRootCause(text) {
    try {
      const response = await axios.post(`${AI_MICROSERVICE_URL}/analyze/root-cause`, { text });
      return response.data;
    } catch (error) {
      console.error('AI Gateway Error (RCA):', error.message);
      return null;
    }
  }

  /**
   * Phase 36/37: MLOps Training
   */
  static async triggerTraining(datasetName, modelType) {
    try {
      const response = await axios.post(`${AI_MICROSERVICE_URL}/mlops/train?dataset_name=${datasetName}&model_type=${modelType}`);
      return response.data;
    } catch (error) {
      console.error('AI Gateway Error (Training):', error.message);
      return null;
    }
  }

  /**
   * Phase 37: MLOps Metrics
   */
  static async getMlOpsMetrics() {
    try {
      const response = await axios.get(`${AI_MICROSERVICE_URL}/mlops/metrics`);
      return response.data;
    } catch (error) {
      console.error('AI Gateway Error (MLOps Metrics):', error.message);
      return null;
    }
  }

  /**
   * Phase 38: Explainable AI
   */
  static async explainPrediction(modelName, features) {
    try {
      const response = await axios.post(`${AI_MICROSERVICE_URL}/explain/prediction`, { model_name: modelName, features });
      return response.data;
    } catch (error) {
      console.error('AI Gateway Error (XAI):', error.message);
      return null;
    }
  }

  /**
   * Phase 39: AI Monitoring Drift
   */
  static async checkDrift() {
    try {
      const response = await axios.get(`${AI_MICROSERVICE_URL}/monitoring/drift`);
      return response.data;
    } catch (error) {
      console.error('AI Gateway Error (Drift):', error.message);
      return null;
    }
  }
}

module.exports = AiGatewayService;
