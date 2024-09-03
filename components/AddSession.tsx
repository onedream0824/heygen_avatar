// components/AddSessionDialog.tsx
import React, { useState } from 'react';

interface AddSessionDialogProps {
  open: boolean;
  onClose: () => void;
}

const AddSessionDialog: React.FC<AddSessionDialogProps> = ({ open, onClose }) => {
  const [filterValue, setFilterValue] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70">
      <div className="bg-gray-900 rounded-lg p-6 shadow-lg w-96">
        <h2 className="text-lg font-semibold mb-4 text-white">Add Session</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="border border-gray-700 rounded-md px-3 py-2 w-full mb-4 bg-gray-800 text-white placeholder-gray-400"
            placeholder="Enter filter value"
            required
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-600 text-white px-4 py-2 rounded-md mr-2 hover:bg-gray-500 transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-500 transition duration-200"
            >
              Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSessionDialog;