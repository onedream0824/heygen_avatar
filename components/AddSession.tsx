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
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 shadow-lg w-96">
        <h2 className="text-lg font-semibold mb-4 text-black">Add Session</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 w-full mb-4"
            placeholder="Enter filter value"
            required
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md mr-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-md"
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