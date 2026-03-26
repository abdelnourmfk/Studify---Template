import React from 'react';

export default function MaterialsList({ materialsList = [], baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000') }) {
  return (
    <div className="mt-6">
      <h4 className="font-bold text-gray-800 mb-3">Existing Materials</h4>
      {materialsList.length === 0 ? (
        <div className="text-sm text-gray-600">No materials uploaded yet.</div>
      ) : (
        <ul className="space-y-3">
          {materialsList.map(m => (
            <li key={m.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
              <div>
                <div className="font-semibold">{m.title || (m.material_type || 'Material')}</div>
                <div className="text-xs text-gray-500">{m.description}</div>
              </div>
              <div className="flex items-center gap-3">
                <a href={`${baseUrl}/api/teachers/material/${m.id}/download`} target="_blank" rel="noreferrer" className="text-sm text-green-600 font-semibold">Download</a>
                <div className="text-xs text-gray-400">{new Date(m.uploaded_at || m.created_at || Date.now()).toLocaleString()}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
