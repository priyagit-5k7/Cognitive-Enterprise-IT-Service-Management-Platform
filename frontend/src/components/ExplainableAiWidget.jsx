import React, { useState, useEffect } from 'react';
import { Activity, Info, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';

const ExplainableAiWidget = ({ prediction }) => {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prediction && prediction.dlMetadata?.priority_model) {
      fetchExplanation();
    }
  }, [prediction]);

  const fetchExplanation = async () => {
    setLoading(true);
    try {
      // Sending a mock request to the Node.js API (which calls the Python Microservice)
      const response = await api.post('/enterprise-ai/explain/prediction', {
        modelName: prediction.dlMetadata.priority_model,
        features: {
          title_length: 45,
          sentiment: -0.8,
          urgency_keywords: 3
        }
      });
      setExplanation(response.data);
    } catch (err) {
      console.error('XAI Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!prediction || !prediction.dlMetadata) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-500" />
          Explainable AI (SHAP)
        </h3>
        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-mono font-bold">
          {prediction.dlMetadata.priority_model}
        </span>
      </div>
      
      {loading ? (
        <div className="text-center py-4 text-sm text-gray-500">Generating SHAP explanation...</div>
      ) : explanation ? (
        <div className="space-y-4">
          <div className="flex gap-2 items-start p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg text-sm">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p><strong>Decision Path:</strong> {explanation.decision_path || 'Priority elevated due to high sentiment negativity and urgency keywords.'}</p>
          </div>
          
          <div className="h-48 w-full mt-4">
            <ResponsiveContainer>
              <BarChart data={explanation.feature_importance || []} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="feature" type="category" axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="shap_value" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">SHAP (SHapley Additive exPlanations) values show feature contribution to the prediction.</p>
        </div>
      ) : (
        <div className="text-center py-4 text-sm text-gray-500">Explanation unavailable for this model.</div>
      )}
    </div>
  );
};

export default ExplainableAiWidget;
